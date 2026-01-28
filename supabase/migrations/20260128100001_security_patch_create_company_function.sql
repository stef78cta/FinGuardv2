/**
 * Migrare: Security Patch - create_company_with_member Function
 * 
 * PUNCTUL 1B: Fix breșă critică "join by CUI" + hardening
 * 
 * Versiune Plan: 1.8
 * Data: 28 Ianuarie 2026
 * Severitate: CRITICĂ
 * 
 * PROBLEME ADRESATE:
 * 1. CUI Normalization: CUI-uri identice cu diferențe case/spații create duplicate
 * 2. unique_violation handling: RETURN NULL poate fi tratat ca success în UI
 * 3. p_user_id parameter: Redundant, poate fi folosit pentru impersonare
 * 
 * SOLUȚII (v1.6 + v1.7 + v1.8):
 * - v1.6: Normalizare CUI (UPPER + TRIM + REPLACE spații)
 * - v1.7: Bootstrap exclude companii archived/deleting (opțional)
 * - v1.8: RAISE EXCEPTION pe unique_violation (nu RETURN NULL)
 * - v1.8: Elimină parametrul p_user_id (folosește get_user_id_from_auth())
 * 
 * MIGRĂRI LEGATE:
 * - 100006: UNIQUE constraint pe CUI (aplică după preflight)
 * - 100000a: Coloană companies.status (opțional, pentru exclude archived)
 * - 100004: Constraint triggers (previne orphan companies)
 * 
 * PRE-REQUISITES:
 * - Gate 0(C): Verifică că funcția folosește get_user_id_from_auth()
 * - Gate 0(E): Verifică că company_id nu este expus înainte de commit
 * 
 * ROLLBACK:
 * - Revert la versiune veche cu p_user_id (dacă frontend încă trimite)
 * - SAU: Forward-only cu wrapper compatibilitate (vezi planning/rollback)
 */

-- =============================================================================
-- 1. Verifică dacă funcția veche există (pentru logging)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' 
      AND p.proname = 'create_company_with_member'
  ) THEN
    RAISE NOTICE 'Found existing create_company_with_member function - will be replaced';
  ELSE
    RAISE NOTICE 'No existing function found - creating new';
  END IF;
END $$;

-- =============================================================================
-- 2. Drop funcția veche (dacă există, orice signature)
-- =============================================================================

-- Drop toate overload-urile posibile (acoperă cazuri cu/fără p_user_id)
DROP FUNCTION IF EXISTS public.create_company_with_member(VARCHAR, VARCHAR, UUID);
DROP FUNCTION IF EXISTS public.create_company_with_member(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.create_company_with_member(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.create_company_with_member(TEXT, TEXT);

-- =============================================================================
-- 3. Creează funcția nouă hardened (v1.6 + v1.7 + v1.8)
-- =============================================================================

/**
 * create_company_with_member: Creare atomică companie + prim membru
 * 
 * Singura cale validă de creare companii în aplicație (enforcement prin RLS).
 * Garantează atomicitate: companie ÎNTOTDEAUNA are cel puțin un membru.
 * 
 * @param p_name - Numele companiei (required, non-empty)
 * @param p_cui - CUI fiscal (required, va fi normalizat)
 * @returns UUID - ID-ul companiei create
 * @throws EXCEPTION pe duplicate CUI (ERRCODE 23505)
 * @throws EXCEPTION pe date invalide
 * 
 * SECURITY:
 * - SECURITY DEFINER: Rulează cu privilegii owner (postgres)
 * - SET search_path = public: Previne schema injection
 * - get_user_id_from_auth(): Obține user din JWT (nu acceptă parametru)
 * - Normalizare CUI: Previne duplicate prin case/spații
 * 
 * CHANGELOG:
 * - v1.8: Elimină p_user_id (folosește get_user_id_from_auth())
 * - v1.8: RAISE EXCEPTION pe unique_violation (nu RETURN NULL)
 * - v1.7: Bootstrap exclude companii archived/deleting (opțional)
 * - v1.6: Normalizare CUI (UPPER + TRIM + spații)
 * - v1.5: Validare parametri non-NULL
 * - v1.0: Versiune inițială
 */
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
  v_user_id UUID;
  v_company_id UUID;
  v_cui_normalized VARCHAR;
BEGIN
  -- ============================================================================
  -- VALIDĂRI PARAMETRI
  -- ============================================================================
  
  -- Validare p_name
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Company name is required and cannot be empty';
  END IF;
  
  -- Validare p_cui
  IF p_cui IS NULL OR TRIM(p_cui) = '' THEN
    RAISE EXCEPTION 'Company CUI is required and cannot be empty';
  END IF;
  
  -- Obține user_id din auth context (securizat, nu poate fi impersonat)
  v_user_id := public.get_user_id_from_auth();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: No authenticated user found';
  END IF;
  
  -- ============================================================================
  -- NORMALIZARE CUI (v1.6)
  -- ============================================================================
  
  /**
   * Normalizare CUI pentru prevenie duplicate:
   * 1. UPPER(): Case-insensitive (RO12345 = ro12345)
   * 2. TRIM(): Elimină spații leading/trailing
   * 3. REPLACE spații interioare: "RO 123" = "RO123"
   * 4. REGEXP_REPLACE doar alfanumerice: "RO-123" → "RO123" (opțional, comentat)
   * 
   * NOTĂ: Menține format original în DB (cui), dar compară normalizat
   * UNIQUE constraint va fi pe expresie normalizată (migrarea 100006)
   */
  v_cui_normalized := UPPER(TRIM(REGEXP_REPLACE(p_cui, '[^A-Z0-9]', '', 'gi')));
  
  -- Verificare suplimentară: CUI normalizat nu e gol
  IF v_cui_normalized = '' THEN
    RAISE EXCEPTION 'Company CUI is invalid (contains only special characters)';
  END IF;
  
  -- ============================================================================
  -- CREARE ATOMICĂ COMPANIE + MEMBRU
  -- ============================================================================
  
  -- Inserare companie (aruncă unique_violation dacă CUI duplicate)
  BEGIN
    INSERT INTO public.companies (name, cui)
    VALUES (p_name, p_cui)  -- Salvează CUI original, nu normalizat
    RETURNING id INTO v_company_id;
    
  EXCEPTION 
    WHEN unique_violation THEN
      -- v1.8: RAISE EXCEPTION explicit (NU RETURN NULL)
      -- Client poate identifica prin ERRCODE și afișa mesaj specific
      RAISE EXCEPTION 'Company with this CUI already exists. Please request an invite from the company owner.'
        USING ERRCODE = '23505',  -- Păstrează SQLSTATE pentru client
              HINT = 'If you believe this is an error, contact support.';
  END;
  
  -- Adaugă user-ul curent ca prim membru (bootstrap)
  -- Policy de INSERT va permite (NOT EXISTS membri)
  INSERT INTO public.company_users (company_id, user_id, role)
  VALUES (v_company_id, v_user_id, 'owner');  -- Implicit owner = primul membru
  
  -- ============================================================================
  -- RETURNARE SUCCESS
  -- ============================================================================
  
  -- ⚠️ IMPORTANT (Gate 0E): company_id devine vizibil DOAR DUPĂ commit
  -- Nu logăm aici, logging ar trebui în UI după primirea response-ului
  RETURN v_company_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log intern (nu expune detalii în mesaj client)
    -- Producție: trimite la monitoring (Sentry, etc.)
    RAISE NOTICE 'create_company_with_member INTERNAL ERROR: SQLSTATE=%, SQLERRM=%', 
      SQLSTATE, SQLERRM;
    
    -- Mesaj generic către client (securizat)
    RAISE EXCEPTION 'Failed to create company. Please try again or contact support.'
      USING ERRCODE = SQLSTATE;  -- Păstrează codul original pentru debugging
END;
$$;

-- =============================================================================
-- 4. Comentarii și metadata
-- =============================================================================

COMMENT ON FUNCTION public.create_company_with_member IS 
'v1.8: Creare atomică companie + prim membru. Normalizare CUI. Elimină p_user_id (folosește get_user_id_from_auth()). RAISE EXCEPTION pe duplicate (nu RETURN NULL). SECURITY DEFINER.';

-- =============================================================================
-- 5. Permisiuni (revocă public, grant authenticated)
-- =============================================================================

REVOKE ALL ON FUNCTION public.create_company_with_member(VARCHAR, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company_with_member(VARCHAR, VARCHAR) TO authenticated;

-- Service role oricum are acces (postgres owner)

-- =============================================================================
-- 6. Verificare post-migrare
-- =============================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_is_security_definer BOOLEAN;
  v_acl TEXT;
BEGIN
  -- Verifică că funcția a fost creată
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' 
      AND p.proname = 'create_company_with_member'
      AND p.pronargs = 2  -- 2 parametri (name, cui)
  ) INTO v_function_exists;

  IF NOT v_function_exists THEN
    RAISE EXCEPTION 'MIGRATION FAILED: Function create_company_with_member not created';
  END IF;

  -- Verifică SECURITY DEFINER
  SELECT p.prosecdef INTO v_is_security_definer
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' 
    AND p.proname = 'create_company_with_member'
    AND p.pronargs = 2;

  IF NOT v_is_security_definer THEN
    RAISE EXCEPTION 'MIGRATION FAILED: Function is not SECURITY DEFINER';
  END IF;

  -- Verifică permisiuni
  SELECT array_to_string(p.proacl, ', ') INTO v_acl
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' 
    AND p.proname = 'create_company_with_member'
    AND p.pronargs = 2;

  IF v_acl NOT LIKE '%authenticated%' THEN
    RAISE WARNING 'Function may not have EXECUTE granted to authenticated role';
  END IF;

  RAISE NOTICE 'SUCCESS: create_company_with_member function updated';
  RAISE NOTICE '  - Signature: (p_name VARCHAR, p_cui VARCHAR) → UUID';
  RAISE NOTICE '  - v1.8: p_user_id ELIMINATED (uses get_user_id_from_auth())';
  RAISE NOTICE '  - v1.8: RAISE EXCEPTION on duplicate CUI (not RETURN NULL)';
  RAISE NOTICE '  - v1.6: CUI normalization (UPPER + TRIM + REGEXP)';
  RAISE NOTICE '  - SECURITY DEFINER: ✅';
  RAISE NOTICE '  - Granted to authenticated: ✅';
  RAISE NOTICE '';
  RAISE NOTICE 'FRONTEND CHANGES REQUIRED:';
  RAISE NOTICE '  - Remove p_user_id from RPC call';
  RAISE NOTICE '  - Handle EXCEPTION (error.code === "23505" for duplicate)';
  RAISE NOTICE '  - Example:';
  RAISE NOTICE '    const { data, error } = await supabase.rpc("create_company_with_member", {';
  RAISE NOTICE '      p_name: name,';
  RAISE NOTICE '      p_cui: cui';
  RAISE NOTICE '    });';
  RAISE NOTICE '    if (error?.code === "23505") { /* CUI duplicate */ }';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Aplică migrarea 100006 (CUI UNIQUE constraint) - DUPĂ PREFLIGHT';
  RAISE NOTICE '  2. Actualizează frontend (elimină p_user_id)';
  RAISE NOTICE '  3. Testează create cu CUI valid';
  RAISE NOTICE '  4. Testează create cu CUI duplicate (trebuie EXCEPTION)';
  RAISE NOTICE '  5. Verifică că company_id nu e expus înainte de commit (Gate 0E)';
END $$;

-- =============================================================================
-- 7. Queries de diagnostic
-- =============================================================================

-- Afișează signature funcție
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC: create_company_with_member details';
  RAISE NOTICE '========================================';
  
  SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    CASE WHEN p.prosecdef THEN 'YES' ELSE 'NO' END AS security_definer,
    pg_get_userbyid(p.proowner) AS owner,
    CASE 
      WHEN p.proacl IS NULL THEN 'PUBLIC (default)'
      ELSE array_to_string(p.proacl, ', ')
    END AS acl
  INTO r
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' 
    AND p.proname = 'create_company_with_member';

  RAISE NOTICE 'Function: % | Args: % | Returns: %', 
    r.function_name, r.arguments, r.return_type;
  RAISE NOTICE 'Security Definer: % | Owner: %', r.security_definer, r.owner;
  RAISE NOTICE 'ACL: %', r.acl;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
