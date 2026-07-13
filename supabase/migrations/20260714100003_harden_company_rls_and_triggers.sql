/**
 * Migrare: Hardening RLS + triggere orphan-prevention
 *
 * Faza 1.2-1.4 (remediere CUI multi-tenant):
 * - companies.INSERT: blocat pentru authenticated obișnuit (creare doar via RPC SECURITY DEFINER).
 * - company_users.INSERT: elimină self-insert liber; permite doar membri/admini (RPC ocolește RLS legitim).
 * - Triggere: previn companii orfane (INSERT fără membru + DELETE ultimul membru al companiei active).
 */

-- =============================================================================
-- 1. companies.INSERT — doar admin/super_admin direct (restul doar prin RPC)
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
DROP POLICY IF EXISTS "Only admins can directly insert companies" ON public.companies;

CREATE POLICY "Only admins can directly insert companies"
ON public.companies FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.get_user_id_from_auth(), 'admin'::public.app_role)
  OR public.has_role(public.get_user_id_from_auth(), 'super_admin'::public.app_role)
);

-- =============================================================================
-- 2. company_users.INSERT — fără self-join liber
-- =============================================================================
DROP POLICY IF EXISTS "Users can add themselves to new companies or existing members can add" ON public.company_users;
DROP POLICY IF EXISTS "Company members can add members" ON public.company_users;
DROP POLICY IF EXISTS "Company members can add members (bootstrap allowed)" ON public.company_users;
DROP POLICY IF EXISTS "Company members can add members (hardened)" ON public.company_users;

CREATE POLICY "Company members can add members (hardened)"
ON public.company_users FOR INSERT
TO authenticated
WITH CHECK (
  public.is_company_member(public.get_user_id_from_auth(), company_id)
  OR public.has_role(public.get_user_id_from_auth(), 'admin'::public.app_role)
  OR public.has_role(public.get_user_id_from_auth(), 'super_admin'::public.app_role)
);

-- =============================================================================
-- 3. Trigger: previne INSERT companie fără membru (AFTER INSERT, DEFERRED)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.check_company_has_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Skip dacă compania a fost ștearsă în aceeași tranzacție (seed/test/CASCADE)
  IF NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = NEW.id) THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.company_users cu WHERE cu.company_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'O companie trebuie să aibă cel puțin un membru.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_company_has_member ON public.companies;
CREATE CONSTRAINT TRIGGER enforce_company_has_member
AFTER INSERT ON public.companies
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_company_has_member();

-- =============================================================================
-- 4. Trigger: previne DELETE ultimul membru al unei companii active
-- =============================================================================
CREATE OR REPLACE FUNCTION public.prevent_last_member_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_remaining_count INT;
  v_company_status  VARCHAR;
BEGIN
  -- Permite CASCADE delete de la companies
  IF NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = OLD.company_id) THEN
    RETURN OLD;
  END IF;

  SELECT status INTO v_company_status FROM public.companies WHERE id = OLD.company_id;

  IF v_company_status IN ('archived', 'deleting') THEN
    RETURN OLD;
  END IF;

  SELECT COUNT(*) INTO v_remaining_count
  FROM public.company_users WHERE company_id = OLD.company_id;

  IF v_remaining_count = 0 THEN
    RAISE EXCEPTION 'Nu poți elimina ultimul membru al unei companii active. Arhivează compania sau transferă proprietatea.';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS enforce_company_has_member_on_delete ON public.company_users;
CREATE CONSTRAINT TRIGGER enforce_company_has_member_on_delete
AFTER DELETE ON public.company_users
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_member_removal();

DROP TRIGGER IF EXISTS enforce_company_has_member_on_update ON public.company_users;
CREATE CONSTRAINT TRIGGER enforce_company_has_member_on_update
AFTER UPDATE OF company_id ON public.company_users
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_member_removal();
