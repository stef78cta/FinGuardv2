/**
 * Migrare: CUI UNIQUE Constraint
 * PUNCTUL 1B (v1.6 + v1.7 + v1.8): Previne duplicate CUI prin race conditions
 * Versiune: 1.8 | Severitate: CRITICĂ
 * 
 * ⚠️ LIMITARE CRITICĂ (v1.8):
 * CREATE INDEX CONCURRENTLY NU poate rula în tranzacție!
 * 
 * SOLUȚIE:
 * A) Staging/Dev (tabele goale/mici): CREATE INDEX normal (acest script)
 * B) Producție: PAS MANUAL separat DUPĂ preflight (vezi PRODUCTION_DEPLOYMENT.md)
 * 
 * PRE-REQUISITES (v1.7 - OBLIGATORII):
 * 1. Rulează query preflight pentru detectare coliziuni (vezi Gate 0 EXTRA)
 * 2. Dacă coliziuni: remediază ÎNAINTE (arhivează duplicate)
 * 3. Testează pe copie staging
 * 4. Estimare: SELECT COUNT(*) FROM companies → decizie CREATE vs CONCURRENTLY
 */

-- =============================================================================
-- PRE-FLIGHT CHECK: Detectează coliziuni CUI
-- =============================================================================

DO $$
DECLARE
  v_collision_count INT;
  v_details TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRE-FLIGHT: Verificare Coliziuni CUI';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Verifică duplicate după normalizare
  WITH normalized AS (
    SELECT 
      id, 
      name, 
      cui,
      UPPER(REGEXP_REPLACE(cui, '[^A-Z0-9]', '', 'gi')) AS cui_normalized
    FROM public.companies
    WHERE cui IS NOT NULL
  ),
  duplicates AS (
    SELECT 
      cui_normalized,
      COUNT(*) AS count,
      STRING_AGG(name || ' (ID: ' || id || ')', ', ' ORDER BY id) AS companies
    FROM normalized
    GROUP BY cui_normalized
    HAVING COUNT(*) > 1
  )
  SELECT 
    COUNT(*), 
    STRING_AGG(cui_normalized || ': ' || companies, E'\n')
  INTO v_collision_count, v_details
  FROM duplicates;

  IF v_collision_count > 0 THEN
    RAISE EXCEPTION E'MIGRATION BLOCKED: Found % CUI collisions:\n%\n\nACTION REQUIRED:\n1. Review collisions above\n2. Archive or merge duplicate companies\n3. Re-run this migration', 
      v_collision_count, v_details;
  ELSE
    RAISE NOTICE '✅ No CUI collisions detected';
    RAISE NOTICE 'Safe to create UNIQUE constraint';
  END IF;

  RAISE NOTICE '';
END $$;

-- =============================================================================
-- DECISION POINT: Staging vs Production
-- =============================================================================

DO $$
DECLARE
  v_company_count INT;
BEGIN
  SELECT COUNT(*) INTO v_company_count FROM public.companies;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DEPLOYMENT DECISION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total companies: %', v_company_count;
  RAISE NOTICE '';

  IF v_company_count < 1000 THEN
    RAISE NOTICE '✅ STAGING/DEV: Table is small (< 1000 rows)';
    RAISE NOTICE '   → CREATE INDEX normal (în tranzacție, lock scurt)';
    RAISE NOTICE '   → Continuă cu migrarea automată';
  ELSE
    RAISE WARNING '⚠️ PRODUCȚIE: Table is large (>= 1000 rows)';
    RAISE WARNING '   → CREATE INDEX CONCURRENTLY recomandat';
    RAISE WARNING '   → MANUAL STEP după această migrare (vezi PRODUCTION_DEPLOYMENT.md)';
    RAISE WARNING '';
    RAISE WARNING 'Această migrare va fi SKIPPED în producție.';
    RAISE WARNING 'Rulează manual: psql -c "CREATE UNIQUE INDEX CONCURRENTLY..."';
  END IF;

  RAISE NOTICE '';
END $$;

-- =============================================================================
-- A) STAGING/DEV: CREATE INDEX normal (în tranzacție)
-- =============================================================================

/**
 * ⚠️ NOTĂ PRODUCȚIE:
 * Dacă rulezi în producție cu > 1000 rânduri, COMENTEAZĂ această secțiune
 * și rulează CONCURRENTLY manual (vezi PRODUCTION_DEPLOYMENT.md)
 */

DO $$
DECLARE
  v_company_count INT;
BEGIN
  SELECT COUNT(*) INTO v_company_count FROM public.companies;

  -- Doar pentru staging/dev (tabele mici)
  IF v_company_count < 1000 THEN
    RAISE NOTICE 'Creating UNIQUE INDEX (normal, în tranzacție)...';
    
    -- Creează index unique pe CUI normalizat
    CREATE UNIQUE INDEX idx_companies_cui_normalized 
    ON public.companies (UPPER(REGEXP_REPLACE(cui, '[^A-Z0-9]', '', 'gi')));

    RAISE NOTICE '✅ UNIQUE INDEX created successfully';
  ELSE
    RAISE NOTICE '⚠️ Skipping INDEX creation (production, manual step required)';
  END IF;
END $$;

-- =============================================================================
-- B) PRODUCȚIE: Instrucțiuni Manual Step
-- =============================================================================

/**
 * MANUAL STEP pentru PRODUCȚIE (> 1000 companies):
 * 
 * 1. Verifică din nou coliziuni (query preflight din Gate 0 EXTRA)
 * 2. Conectare directă la DB (nu prin pipeline):
 *    
 *    psql $DATABASE_URL -c "
 *    CREATE UNIQUE INDEX CONCURRENTLY idx_companies_cui_normalized 
 *    ON public.companies (UPPER(REGEXP_REPLACE(cui, '[^A-Z0-9]', '', 'gi')));
 *    "
 * 
 * 3. Verifică success:
 *    
 *    psql $DATABASE_URL -c "
 *    SELECT schemaname, tablename, indexname, indexdef 
 *    FROM pg_indexes WHERE indexname = 'idx_companies_cui_normalized';
 *    "
 * 
 * 4. Testează unique constraint:
 *    
 *    psql $DATABASE_URL -c "
 *    SELECT public.create_company_with_member('Test Duplicate', 'RO12345678');
 *    SELECT public.create_company_with_member('Test Duplicate 2', 'RO12345678');
 *    -- Al doilea trebuie să eșueze cu ERRCODE 23505
 *    "
 * 
 * 5. Cleanup test:
 *    DELETE FROM public.companies WHERE name LIKE 'Test Duplicate%';
 */

-- =============================================================================
-- Verificare Post-Migrare
-- =============================================================================

DO $$
DECLARE
  v_index_exists BOOLEAN;
  v_is_unique BOOLEAN;
BEGIN
  -- Verifică dacă indexul a fost creat
  SELECT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'companies'
      AND indexname = 'idx_companies_cui_normalized'
  ) INTO v_index_exists;

  IF v_index_exists THEN
    -- Verifică dacă e UNIQUE
    SELECT indisunique INTO v_is_unique
    FROM pg_index
    JOIN pg_class ON pg_class.oid = pg_index.indexrelid
    WHERE pg_class.relname = 'idx_companies_cui_normalized';

    IF v_is_unique THEN
      RAISE NOTICE '';
      RAISE NOTICE '========================================';
      RAISE NOTICE 'SUCCESS: UNIQUE INDEX created';
      RAISE NOTICE '========================================';
      RAISE NOTICE '  - Index: idx_companies_cui_normalized';
      RAISE NOTICE '  - Expression: UPPER(REGEXP_REPLACE(cui, ...))';
      RAISE NOTICE '  - Unique: ✅ YES';
      RAISE NOTICE '';
      RAISE NOTICE 'EFECTE:';
      RAISE NOTICE '  - Previne duplicate CUI (case + spații)';
      RAISE NOTICE '  - create_company_with_member va arunca ERRCODE 23505';
      RAISE NOTICE '  - Frontend trebuie să trateze error.code === "23505"';
    ELSE
      RAISE WARNING 'Index exists but is NOT UNIQUE!';
    END IF;
  ELSE
    RAISE WARNING '';
    RAISE WARNING '========================================';
    RAISE WARNING 'INDEX NOT CREATED (Manual Step Required)';
    RAISE WARNING '========================================';
    RAISE WARNING '  - Rulează manual CREATE UNIQUE INDEX CONCURRENTLY';
    RAISE WARNING '  - Vezi PRODUCTION_DEPLOYMENT.md pentru instrucțiuni';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Testează duplicate CUI (trebuie să eșueze)';
  RAISE NOTICE '  2. Actualizează frontend pentru tratare error 23505';
  RAISE NOTICE '  3. Documentează în PR că pas manual e necesar pentru producție';
END $$;
