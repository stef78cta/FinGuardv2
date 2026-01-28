/**
 * Migrare: Security Patch - Company Users RLS Policy
 * 
 * PUNCTUL 1A: Fix breșă critică auto-join la orice companie
 * 
 * Versiune Plan: 1.8
 * Data: 28 Ianuarie 2026
 * Severitate: CRITICĂ
 * 
 * PROBLEMĂ:
 * Policy-ul curent permite oricărui user autentificat să se insereze ca membru
 * la ORICE companie prin simpla cunoaștere a company_id.
 * 
 * SOLUȚIE:
 * Permite auto-join DOAR pentru "bootstrap" (primul membru al unei companii noi)
 * + membri existenți pot adăuga alți membri + admin/super_admin pot adăuga.
 * 
 * IMPACT:
 * - Protejează împotriva escaladării de privilegii
 * - Menține funcționalitatea bootstrap (create_company_with_member)
 * - Defense in depth cu Gate 0 verification
 * 
 * PRE-REQUISITES:
 * - Gate 0 trebuie rulat și validat (vezi planning/gate0_verificari.sql)
 * - Verificare că create_company_with_member() este SINGURUL INSERT în companies
 * - RLS trebuie să fie activ pe toate tabelele
 * 
 * ROLLBACK:
 * - Vezi planning/rollback_snippets.sql pentru policy vechi
 * - SAU forward-only: păstrează noul policy (mai sigur)
 */

-- =============================================================================
-- 1. Elimină policy-ul vulnerabil
-- =============================================================================

DROP POLICY IF EXISTS "Users can add themselves to new companies or existing members can add" 
  ON public.company_users;

-- Elimină și alte variante ale policy-ului dacă există
DROP POLICY IF EXISTS "Company members can add members" 
  ON public.company_users;

DROP POLICY IF EXISTS "Company members can add members (bootstrap allowed)" 
  ON public.company_users;

-- =============================================================================
-- 2. Creează noul policy securizat cu bootstrap limitat
-- =============================================================================

/**
 * Policy: Company members can add members (bootstrap allowed)
 * 
 * Permite INSERT în company_users DOAR în următoarele cazuri:
 * 
 * 1. BOOTSTRAP: User-ul se adaugă ca prim membru al unei companii FĂRĂ membri
 *    - Condiție: user_id = get_user_id_from_auth() AND
 *                NOT EXISTS (membri pentru company_id)
 *    - Scenariu: create_company_with_member() RPC
 * 
 * 2. MEMBRU EXISTENT: Un membru al companiei poate adăuga alți membri
 *    - Condiție: is_company_member(current_user, company_id)
 *    - Scenariu: Invite flow (v2.0)
 * 
 * 3. ADMIN/SUPER_ADMIN: Poate adăuga membri la orice companie
 *    - Condiție: has_role('admin') OR has_role('super_admin')
 *    - Scenariu: Suport tehnic, management
 * 
 * DEFENSE IN DEPTH:
 * - Gate 0(A): Verifică că NU există alte INSERT-uri în companies
 * - Gate 0(B): Verifică că RLS pe companies NU permite INSERT authenticated
 * - Migrare 100004: Constraint triggers (prevent orphan companies)
 * - Migrare 100001: create_company_with_member hardening (v1.8)
 */
CREATE POLICY "Company members can add members (bootstrap allowed)"
ON public.company_users
FOR INSERT
TO authenticated
WITH CHECK (
  -- CALE 1: Bootstrap - prim membru al companiei noi
  (
    user_id = public.get_user_id_from_auth()
    AND NOT EXISTS (
      SELECT 1 
      FROM public.company_users cu2 
      WHERE cu2.company_id = company_users.company_id
    )
  )
  -- CALE 2: Membru existent poate adăuga
  OR public.is_company_member(public.get_user_id_from_auth(), company_users.company_id)
  -- CALE 3: Admin poate adăuga la orice companie
  OR public.has_role(public.get_user_id_from_auth(), 'admin'::public.app_role)
  -- CALE 4: Super admin poate adăuga la orice companie
  OR public.has_role(public.get_user_id_from_auth(), 'super_admin'::public.app_role)
);

-- =============================================================================
-- 3. Comentarii și metadata pentru tracking
-- =============================================================================

COMMENT ON POLICY "Company members can add members (bootstrap allowed)" 
  ON public.company_users IS 
'v1.8: Fix breșă critică auto-join. Bootstrap limitat la companii fără membri. Verificat prin Gate 0(A,B). Completat cu constraint triggers în migrarea 100004.';

-- =============================================================================
-- 4. Verificare post-migrare (va rula automat)
-- =============================================================================

DO $$
DECLARE
  v_policy_count INT;
  v_policy_name TEXT;
BEGIN
  -- Verifică că policy-ul a fost creat
  SELECT COUNT(*), MAX(policyname)
  INTO v_policy_count, v_policy_name
  FROM pg_policies
  WHERE tablename = 'company_users'
    AND cmd = 'INSERT'
    AND policyname = 'Company members can add members (bootstrap allowed)';

  IF v_policy_count = 0 THEN
    RAISE EXCEPTION 'MIGRATION FAILED: Policy "Company members can add members (bootstrap allowed)" was not created';
  END IF;

  -- Verifică că policy-ul vechi a fost șters
  SELECT COUNT(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'company_users'
    AND cmd = 'INSERT'
    AND policyname LIKE '%can add themselves to new companies%';

  IF v_policy_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION FAILED: Old vulnerable policy still exists';
  END IF;

  -- Verifică că RLS este activ
  IF NOT (
    SELECT relrowsecurity 
    FROM pg_class 
    WHERE relname = 'company_users' 
      AND relnamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'MIGRATION FAILED: RLS is not enabled on company_users table';
  END IF;

  RAISE NOTICE 'SUCCESS: Security patch applied to company_users RLS policy';
  RAISE NOTICE '  - Old vulnerable policy removed';
  RAISE NOTICE '  - New bootstrap-limited policy created';
  RAISE NOTICE '  - RLS confirmed active';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Verifică că Gate 0(A,B) a fost completat';
  RAISE NOTICE '  2. Aplică migrarea 100000a (companies.status) - OPȚIONAL dar RECOMANDAT';
  RAISE NOTICE '  3. Aplică migrarea 100004 (constraint triggers) - OBLIGATORIU';
  RAISE NOTICE '  4. Testează create_company_with_member() - trebuie să funcționeze';
  RAISE NOTICE '  5. Testează tentativă auto-join la companie existentă - trebuie să eșueze';
END $$;

-- =============================================================================
-- 5. Queries de diagnostic (copie Gate 0 pentru confirmare)
-- =============================================================================

-- Afișează toate policies pentru company_users
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC: Policies pe company_users';
  RAISE NOTICE '========================================';
  
  FOR r IN 
    SELECT 
      policyname,
      cmd,
      LEFT(COALESCE(qual, '(none)'), 50) AS using_expr,
      LEFT(COALESCE(with_check, '(none)'), 50) AS check_expr
    FROM pg_policies
    WHERE tablename = 'company_users'
    ORDER BY cmd, policyname
  LOOP
    RAISE NOTICE 'Policy: % | Command: % | Using: % | Check: %', 
      r.policyname, r.cmd, r.using_expr, r.check_expr;
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
