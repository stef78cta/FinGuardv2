/**
 * Migrare: create_company_with_member (v1.8.1 — securizat)
 *
 * Faza 1.1 (remediere CUI multi-tenant):
 * - Elimină breșa critică "join by CUI": un user care NU e membru NU mai primește acces
 *   automat la o companie existentă (RAISE 23505 în loc de auto-join).
 * - Elimină parametrul p_user_id (folosește get_user_id_from_auth() — anti-impersonare).
 * - Normalizare canonică CUI (fără RO/spații/case) pentru detectarea aceleiași firme.
 * - Caz B (user DEJA membru): întoarce compania existentă (redirect), fără a acorda acces nou.
 * - Caz C (user NU e membru): RAISE EXCEPTION 23505 cu HINT='request_access'.
 * - Insert atomic companie + membru owner; unicitatea e garantată de indexul canonic.
 *
 * SECURITY DEFINER: rulează ca owner (postgres) → INSERT-urile ocolesc RLS legitim.
 */

-- Drop overload-ul vechi (3 parametri, cu p_user_id + join by CUI)
DROP FUNCTION IF EXISTS public.create_company_with_member(VARCHAR, VARCHAR, UUID);
DROP FUNCTION IF EXISTS public.create_company_with_member(TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.create_company_with_member(
  p_name VARCHAR,
  p_cui VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID;
  v_company_id    UUID;
  v_existing_id   UUID;
  v_cui_canonical TEXT;
BEGIN
  -- Validări
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Denumirea companiei este obligatorie.' USING ERRCODE = 'check_violation';
  END IF;

  IF p_cui IS NULL OR TRIM(p_cui) = '' THEN
    RAISE EXCEPTION 'CUI-ul este obligatoriu.' USING ERRCODE = 'check_violation';
  END IF;

  v_user_id := public.get_user_id_from_auth();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizator neautentificat.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_cui_canonical := public.normalize_cui(p_cui);
  IF v_cui_canonical = '' THEN
    RAISE EXCEPTION 'CUI invalid.' USING ERRCODE = 'check_violation';
  END IF;

  -- Companie deja existentă pentru acest CUI canonic?
  SELECT id INTO v_existing_id
  FROM public.companies
  WHERE public.normalize_cui(cui) = v_cui_canonical
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Caz B: user DEJA membru → redirect către compania existentă (fără acces nou)
    IF EXISTS (
      SELECT 1 FROM public.company_users
      WHERE company_id = v_existing_id AND user_id = v_user_id
    ) THEN
      RETURN v_existing_id;
    END IF;

    -- Caz C: user NU e membru → NU acordăm acces automat
    RAISE EXCEPTION 'Există deja o companie înregistrată cu acest CUI.'
      USING ERRCODE = '23505', HINT = 'request_access';
  END IF;

  -- Caz A: CUI nou → creare atomică companie + owner
  BEGIN
    INSERT INTO public.companies (name, cui)
    VALUES (TRIM(p_name), TRIM(p_cui))
    RETURNING id INTO v_company_id;
  EXCEPTION WHEN unique_violation THEN
    -- Race condition: altcineva a creat aceeași firmă între SELECT și INSERT
    RAISE EXCEPTION 'Există deja o companie înregistrată cu acest CUI.'
      USING ERRCODE = '23505', HINT = 'request_access';
  END;

  INSERT INTO public.company_users (company_id, user_id, role)
  VALUES (v_company_id, v_user_id, 'owner');

  RETURN v_company_id;
END;
$$;

COMMENT ON FUNCTION public.create_company_with_member(VARCHAR, VARCHAR) IS
'v1.8.1: Creare atomică companie + owner. Normalizare canonică CUI. Fără join-by-CUI. Caz B redirect membru existent, caz C RAISE 23505.';

REVOKE ALL ON FUNCTION public.create_company_with_member(VARCHAR, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company_with_member(VARCHAR, VARCHAR) TO authenticated;
