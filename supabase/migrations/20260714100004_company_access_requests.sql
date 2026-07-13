/**
 * Migrare: company_access_requests (flow "Solicită acces")
 *
 * Faza 2 (remediere CUI multi-tenant):
 * Când User B introduce un CUI care aparține unei companii existente (unde NU e membru),
 * NU primește acces automat. În schimb poate crea o cerere de acces (pending), pe care
 * un owner/admin al companiei o poate aproba explicit.
 *
 * Anti-enumerare: request_company_access() returnează un rezultat neutru indiferent dacă
 * firma există sau nu, ca să nu confirme existența unei companii pe baza CUI-ului.
 */

-- =============================================================================
-- 1. Helper: user este owner/admin al companiei
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_company_manager(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role IN ('owner', 'admin')
  );
$$;

ALTER FUNCTION public.is_company_manager(UUID, UUID) OWNER TO postgres;

-- =============================================================================
-- 2. Tabel cereri de acces
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.company_access_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'revoked')),
  message      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  resolved_by  UUID REFERENCES public.users(id)
);

-- O singură cerere pending per (companie, user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_car_unique_pending
  ON public.company_access_requests (company_id, user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_car_company_id ON public.company_access_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_car_user_id ON public.company_access_requests(user_id);

DROP TRIGGER IF EXISTS set_company_access_requests_updated_at ON public.company_access_requests;
CREATE TRIGGER set_company_access_requests_updated_at
  BEFORE UPDATE ON public.company_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 3. RLS
-- =============================================================================
ALTER TABLE public.company_access_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own or managed access requests" ON public.company_access_requests;
CREATE POLICY "View own or managed access requests"
ON public.company_access_requests FOR SELECT
TO authenticated
USING (
  user_id = public.get_user_id_from_auth()
  OR public.is_company_manager(public.get_user_id_from_auth(), company_id)
  OR public.has_role(public.get_user_id_from_auth(), 'admin'::public.app_role)
  OR public.has_role(public.get_user_id_from_auth(), 'super_admin'::public.app_role)
);

-- INSERT/UPDATE se fac exclusiv prin RPC (SECURITY DEFINER). Fără policy = blocat pentru authenticated.

-- =============================================================================
-- 4. RPC: creare cerere de acces (anti-enumerare)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.request_company_access(p_cui VARCHAR, p_message TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID;
  v_company_id    UUID;
  v_cui_canonical TEXT;
BEGIN
  v_user_id := public.get_user_id_from_auth();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizator neautentificat.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_cui_canonical := public.normalize_cui(p_cui);

  -- Rezultat neutru dacă CUI invalid (nu diferențiem față de "nu există")
  IF v_cui_canonical = '' THEN
    RETURN 'submitted';
  END IF;

  SELECT id INTO v_company_id
  FROM public.companies
  WHERE public.normalize_cui(cui) = v_cui_canonical
  LIMIT 1;

  -- Companie inexistentă → răspuns neutru (anti-enumerare)
  IF v_company_id IS NULL THEN
    RETURN 'submitted';
  END IF;

  -- User deja membru → semnalăm frontend-ului să facă redirect
  IF EXISTS (
    SELECT 1 FROM public.company_users
    WHERE company_id = v_company_id AND user_id = v_user_id
  ) THEN
    RETURN 'already_member';
  END IF;

  -- Creează cerere pending (idempotent pe indexul parțial)
  INSERT INTO public.company_access_requests (company_id, user_id, message)
  VALUES (v_company_id, v_user_id, p_message)
  ON CONFLICT (company_id, user_id) WHERE (status = 'pending') DO NOTHING;

  RETURN 'submitted';
END;
$$;

REVOKE ALL ON FUNCTION public.request_company_access(VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_company_access(VARCHAR, TEXT) TO authenticated;

-- =============================================================================
-- 5. RPC: aprobare cerere de acces (doar owner/admin al companiei)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.approve_company_access(p_request_id UUID, p_role VARCHAR DEFAULT 'member')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   UUID;
  v_company_id UUID;
  v_target_id  UUID;
  v_status     VARCHAR;
BEGIN
  v_actor_id := public.get_user_id_from_auth();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Utilizator neautentificat.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Rol invalid pentru acordarea accesului.' USING ERRCODE = 'check_violation';
  END IF;

  SELECT company_id, user_id, status
    INTO v_company_id, v_target_id, v_status
  FROM public.company_access_requests
  WHERE id = p_request_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Cererea de acces nu există.' USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT (
    public.is_company_manager(v_actor_id, v_company_id)
    OR public.has_role(v_actor_id, 'admin'::public.app_role)
    OR public.has_role(v_actor_id, 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Nu ai permisiunea de a aproba această cerere.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Cererea a fost deja procesată.' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.company_users (company_id, user_id, role)
  VALUES (v_company_id, v_target_id, p_role)
  ON CONFLICT (company_id, user_id) DO NOTHING;

  UPDATE public.company_access_requests
  SET status = 'approved', resolved_at = NOW(), resolved_by = v_actor_id
  WHERE id = p_request_id;

  RETURN v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_company_access(UUID, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_company_access(UUID, VARCHAR) TO authenticated;

-- =============================================================================
-- 6. RPC: respingere cerere de acces (doar owner/admin al companiei)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reject_company_access(p_request_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   UUID;
  v_company_id UUID;
  v_status     VARCHAR;
BEGIN
  v_actor_id := public.get_user_id_from_auth();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Utilizator neautentificat.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT company_id, status INTO v_company_id, v_status
  FROM public.company_access_requests
  WHERE id = p_request_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Cererea de acces nu există.' USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT (
    public.is_company_manager(v_actor_id, v_company_id)
    OR public.has_role(v_actor_id, 'admin'::public.app_role)
    OR public.has_role(v_actor_id, 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Nu ai permisiunea de a respinge această cerere.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Cererea a fost deja procesată.' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.company_access_requests
  SET status = 'rejected', resolved_at = NOW(), resolved_by = v_actor_id
  WHERE id = p_request_id;

  RETURN v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_company_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_company_access(UUID) TO authenticated;
