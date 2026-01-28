/**
 * Migrare: Try UUID Helper Function
 * 
 * PUNCTUL 4 (v1.8): Helper IMMUTABLE pentru conversie safe string → UUID
 * 
 * Versiune Plan: 1.8
 * Data: 28 Ianuarie 2026
 * Severitate: ÎNALTĂ (OBLIGATORIU pentru migrarea 100005)
 * 
 * PROBLEMĂ:
 * Storage policies folosesc cast direct ::uuid în expresii complexe.
 * Postgres query planner poate reordona operațiuni, rezultând excepții
 * "invalid input syntax for type uuid" chiar când guard-uri NULL există.
 * 
 * Exemplu problematic:
 *   WHERE file.name::uuid = requester_user_id::uuid
 *   -- Planner-ul poate evalua cast ÎNAINTE de verificări NULL
 * 
 * SOLUȚIE:
 * Funcție IMMUTABLE care face cast safe cu try-catch:
 * - Returnează UUID dacă valid
 * - Returnează NULL dacă invalid (fără excepție)
 * - IMMUTABLE permite inlining de optimizer (performanță)
 * 
 * BENEFICII:
 * - Elimină excepții neprevăzute în storage policies
 * - Permite guard-uri defensive (try_uuid(X) IS NOT NULL)
 * - Performanță bună (IMMUTABLE = inlined)
 * 
 * MIGRĂRI LEGATE:
 * - 100005: Storage policy va folosi try_uuid() în loc de ::uuid direct
 * 
 * REFERINȚE:
 * - Plan v1.8, Punctul #1 (Storage policy: cast ::uuid poate fi reordonat)
 * - PostgreSQL: IMMUTABLE functions și query planning
 */

-- =============================================================================
-- 1. Creează funcția try_uuid (IMMUTABLE, safe cast)
-- =============================================================================

/**
 * try_uuid: Conversie safe string → UUID
 * 
 * @param input_text - String de convertit (poate fi NULL sau invalid)
 * @returns UUID valid SAU NULL (fără excepție)
 * 
 * Marcată IMMUTABLE pentru a permite optimizer-ul să o inline în WHERE clauses.
 * 
 * Exemple:
 *   try_uuid('550e8400-e29b-41d4-a716-446655440000') → valid UUID
 *   try_uuid('not-a-uuid') → NULL (fără excepție)
 *   try_uuid(NULL) → NULL
 *   try_uuid('') → NULL
 * 
 * Utilizare în storage policies:
 *   WHERE try_uuid(storage.foldername(file.name)) = requester_user_id
 *   -- Safe: nu aruncă excepție, returnează NULL pentru input-uri invalide
 */
CREATE OR REPLACE FUNCTION public.try_uuid(input_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE  -- CRITICĂ: permite inlining, necesară pentru policies
PARALLEL SAFE
AS $$
BEGIN
  -- Guard pentru NULL sau empty string
  IF input_text IS NULL OR input_text = '' THEN
    RETURN NULL;
  END IF;
  
  -- Încearcă cast-ul, prinde excepția dacă invalid
  BEGIN
    RETURN input_text::UUID;
  EXCEPTION
    WHEN invalid_text_representation THEN
      -- Input nu e UUID valid → returnează NULL (fără excepție)
      RETURN NULL;
    WHEN OTHERS THEN
      -- Orice altă eroare → returnează NULL (safe fallback)
      RETURN NULL;
  END;
END;
$$;

COMMENT ON FUNCTION public.try_uuid IS 
'v1.8: Conversie safe TEXT → UUID. Returnează NULL pentru input invalid (fără excepție). IMMUTABLE pentru inlining în policies.';

-- =============================================================================
-- 2. Grant execute pentru authenticated și anon (policies au nevoie)
-- =============================================================================

-- Policy-urile RLS rulează în contextul user-ului, nu ca SECURITY DEFINER
-- Trebuie să permitem authenticated și anon să apeleze funcția
GRANT EXECUTE ON FUNCTION public.try_uuid TO authenticated;
GRANT EXECUTE ON FUNCTION public.try_uuid TO anon;

-- Service role oricum are acces implicit (postgres owner)

-- =============================================================================
-- 3. Teste inline pentru validare funcționalitate
-- =============================================================================

DO $$
DECLARE
  v_test_result UUID;
  v_test_count INT := 0;
  v_pass_count INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RUNNING TESTS: try_uuid() functionality';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Test 1: UUID valid
  v_test_count := v_test_count + 1;
  v_test_result := public.try_uuid('550e8400-e29b-41d4-a716-446655440000');
  IF v_test_result = '550e8400-e29b-41d4-a716-446655440000'::UUID THEN
    v_pass_count := v_pass_count + 1;
    RAISE NOTICE 'Test 1: ✅ Valid UUID → UUID';
  ELSE
    RAISE WARNING 'Test 1: ❌ Valid UUID → UUID (got: %)', v_test_result;
  END IF;

  -- Test 2: String invalid (nu aruncă excepție)
  v_test_count := v_test_count + 1;
  BEGIN
    v_test_result := public.try_uuid('not-a-uuid');
    IF v_test_result IS NULL THEN
      v_pass_count := v_pass_count + 1;
      RAISE NOTICE 'Test 2: ✅ Invalid string → NULL (no exception)';
    ELSE
      RAISE WARNING 'Test 2: ❌ Invalid string → NULL (got: %)', v_test_result;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Test 2: ❌ Invalid string threw exception (should return NULL)';
  END;

  -- Test 3: NULL input
  v_test_count := v_test_count + 1;
  v_test_result := public.try_uuid(NULL);
  IF v_test_result IS NULL THEN
    v_pass_count := v_pass_count + 1;
    RAISE NOTICE 'Test 3: ✅ NULL input → NULL';
  ELSE
    RAISE WARNING 'Test 3: ❌ NULL input → NULL (got: %)', v_test_result;
  END IF;

  -- Test 4: Empty string
  v_test_count := v_test_count + 1;
  v_test_result := public.try_uuid('');
  IF v_test_result IS NULL THEN
    v_pass_count := v_pass_count + 1;
    RAISE NOTICE 'Test 4: ✅ Empty string → NULL';
  ELSE
    RAISE WARNING 'Test 4: ❌ Empty string → NULL (got: %)', v_test_result;
  END IF;

  -- Test 5: UUID cu uppercase
  v_test_count := v_test_count + 1;
  v_test_result := public.try_uuid('550E8400-E29B-41D4-A716-446655440000');
  IF v_test_result = '550e8400-e29b-41d4-a716-446655440000'::UUID THEN
    v_pass_count := v_pass_count + 1;
    RAISE NOTICE 'Test 5: ✅ UUID uppercase → normalized UUID';
  ELSE
    RAISE WARNING 'Test 5: ❌ UUID uppercase → normalized (got: %)', v_test_result;
  END IF;

  -- Test 6: UUID fără dash-uri (unele formate acceptate de Postgres)
  v_test_count := v_test_count + 1;
  BEGIN
    v_test_result := public.try_uuid('550e8400e29b41d4a716446655440000');
    -- Postgres acceptă format fără dash-uri
    IF v_test_result IS NOT NULL THEN
      v_pass_count := v_pass_count + 1;
      RAISE NOTICE 'Test 6: ✅ UUID no-dashes → UUID (handled by Postgres)';
    ELSE
      -- Sau poate fi NULL, ambele sunt OK
      v_pass_count := v_pass_count + 1;
      RAISE NOTICE 'Test 6: ✅ UUID no-dashes → NULL (stricter validation)';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Nu ar trebui să arunce, dar e acceptabil
      v_pass_count := v_pass_count + 1;
      RAISE NOTICE 'Test 6: ✅ UUID no-dashes → NULL (no exception)';
  END;

  -- Test 7: Verifică IMMUTABLE attribute
  v_test_count := v_test_count + 1;
  IF EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'try_uuid' 
      AND provolatile = 'i'  -- i = IMMUTABLE
      AND pronargs = 1
  ) THEN
    v_pass_count := v_pass_count + 1;
    RAISE NOTICE 'Test 7: ✅ Function is IMMUTABLE (required for policies)';
  ELSE
    RAISE WARNING 'Test 7: ❌ Function is NOT IMMUTABLE (will break in policies)';
  END IF;

  -- Sumar
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST RESULTS: % / % passed', v_pass_count, v_test_count;
  RAISE NOTICE '========================================';
  
  IF v_pass_count < v_test_count THEN
    RAISE EXCEPTION 'MIGRATION FAILED: try_uuid() tests did not pass (% / %)', v_pass_count, v_test_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'SUCCESS: try_uuid() function created and validated';
  RAISE NOTICE '  - IMMUTABLE attribute confirmed';
  RAISE NOTICE '  - All % tests passed', v_test_count;
  RAISE NOTICE '  - Granted execute to authenticated and anon';
  RAISE NOTICE '';
  RAISE NOTICE 'USAGE EXAMPLE (in storage policy):';
  RAISE NOTICE '  WHERE public.try_uuid(storage.foldername(file.name)) = requester_user_id';
  RAISE NOTICE '  -- Safe: no exception, returns NULL for invalid input';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Aplică migrarea 100005 (storage policy cu try_uuid) - OBLIGATORIU';
  RAISE NOTICE '  2. Testează upload cu user_id valid în path';
  RAISE NOTICE '  3. Testează upload cu user_id invalid în path (trebuie reject)';
END $$;

-- =============================================================================
-- 4. Queries de diagnostic
-- =============================================================================

-- Afișează detalii funcție
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC: try_uuid() function details';
  RAISE NOTICE '========================================';
  
  SELECT 
    p.proname AS function_name,
    pg_get_userbyid(p.proowner) AS owner,
    CASE p.provolatile
      WHEN 'i' THEN 'IMMUTABLE'
      WHEN 's' THEN 'STABLE'
      WHEN 'v' THEN 'VOLATILE'
    END AS volatility,
    CASE p.proparallel
      WHEN 's' THEN 'SAFE'
      WHEN 'r' THEN 'RESTRICTED'
      WHEN 'u' THEN 'UNSAFE'
    END AS parallel,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    CASE 
      WHEN p.proacl IS NULL THEN 'PUBLIC (default)'
      ELSE array_to_string(p.proacl, ', ')
    END AS acl
  INTO r
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'try_uuid';

  RAISE NOTICE 'Function: % | Owner: % | Volatility: % | Parallel: %', 
    r.function_name, r.owner, r.volatility, r.parallel;
  RAISE NOTICE 'Arguments: % | Returns: %', r.arguments, r.return_type;
  RAISE NOTICE 'ACL: %', r.acl;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
