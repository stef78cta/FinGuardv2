/**
 * Gate 0: Verificări Pre-Migrare pentru FinGuard v2
 * 
 * Acest script conține toate verificările obligatorii ce trebuie rulate
 * ÎNAINTE de aplicarea oricărei migrări de securitate.
 * 
 * Versiune: 1.8
 * Data: 28 Ianuarie 2026
 * 
 * INSTRUCȚIUNI:
 * 1. Rulează acest script pe baza de date Supabase
 * 2. Salvează output-ul în planning/gate0_db_state.txt
 * 3. Verifică că toate rezultatele corespund cu "Rezultat așteptat"
 * 4. Remediază orice devieri ÎNAINTE de a aplica migrările
 * 5. BLOCARE DEPLOY dacă Gate 0(E) găsește expunere company_id
 */

-- =============================================================================
-- Query D1: RLS activ pe tabele critice
-- =============================================================================
\echo '========================================='
\echo 'D1: RLS ACTIV PE TABELE CRITICE'
\echo '========================================='
\echo ''

SELECT 
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced,
  CASE 
    WHEN relrowsecurity THEN '✅ RLS activ'
    ELSE '❌ RLS DEZACTIVAT - RISC CRITIC!'
  END AS status
FROM pg_class
WHERE relname IN ('companies', 'company_users', 'trial_balance_imports', 'trial_balance_accounts')
  AND relnamespace = 'public'::regnamespace
ORDER BY relname;

\echo ''
\echo 'REZULTAT AȘTEPTAT:'
\echo '  - Toate tabelele: rls_enabled = true'
\echo '  - trial_balance_imports, trial_balance_accounts: rls_forced = false (OK)'
\echo '  - companies, company_users: rls_forced = false (verificare policy mai jos)'
\echo ''

-- =============================================================================
-- Query D2: Policies pe tabele critice
-- =============================================================================
\echo '========================================='
\echo 'D2: POLICIES PE TABELE CRITICE'
\echo '========================================='
\echo ''

SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd AS command,
  LEFT(COALESCE(qual, ''), 50) AS using_expr_preview,
  LEFT(COALESCE(with_check, ''), 50) AS check_expr_preview
FROM pg_policies
WHERE tablename IN ('companies', 'company_users', 'trial_balance_imports', 'trial_balance_accounts')
ORDER BY tablename, cmd, policyname;

\echo ''
\echo 'VERIFICĂRI OBLIGATORII:'
\echo '  ✓ companies: NU există policy INSERT pentru authenticated (doar prin RPC)'
\echo '  ✓ company_users: Policy bootstrap ("first member") există și e corectă'
\echo '  ✓ trial_balance_imports: Policy verifică company membership'
\echo '  ✓ trial_balance_accounts: Policy verifică ownership prin imports'
\echo ''

-- =============================================================================
-- Query D3: Constrângeri company_users (UNIQUE/FK)
-- =============================================================================
\echo '========================================='
\echo 'D3: CONSTRÂNGERI COMPANY_USERS'
\echo '========================================='
\echo ''

SELECT 
  conname AS constraint_name,
  CASE contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'c' THEN 'CHECK'
    ELSE contype::text
  END AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.company_users'::regclass
ORDER BY contype, conname;

\echo ''
\echo 'REZULTAT AȘTEPTAT:'
\echo '  ✓ UNIQUE (company_id, user_id) - previne duplicate membership'
\echo '  ✓ FOREIGN KEY (company_id) REFERENCES companies(id)'
\echo '  ✓ FOREIGN KEY (user_id) REFERENCES auth.users(id)'
\echo ''

-- =============================================================================
-- Query D4: Constrângeri trial_balance_accounts (UNIQUE import+account)
-- =============================================================================
\echo '========================================='
\echo 'D4: CONSTRÂNGERI TRIAL_BALANCE_ACCOUNTS'
\echo '========================================='
\echo ''

SELECT 
  conname AS constraint_name,
  CASE contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'c' THEN 'CHECK'
    ELSE contype::text
  END AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.trial_balance_accounts'::regclass
ORDER BY contype, conname;

\echo ''
\echo 'REZULTAT AȘTEPTAT:'
\echo '  ✓ UNIQUE (import_id, account_code) - previne duplicate conturi'
\echo '  ✓ FOREIGN KEY (import_id) REFERENCES trial_balance_imports(id) ON DELETE CASCADE'
\echo ''

-- =============================================================================
-- Query D5: Privilegii funcții critice
-- =============================================================================
\echo '========================================='
\echo 'D5: PRIVILEGII FUNCȚII CRITICE'
\echo '========================================='
\echo ''

SELECT 
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_userbyid(p.proowner) AS owner,
  CASE 
    WHEN p.proacl IS NULL THEN '🔓 PUBLIC (default - VERIFICĂ!)'
    ELSE array_to_string(p.proacl, ', ')
  END AS acl,
  CASE 
    WHEN p.proname = 'create_company_with_member' AND p.proacl IS NOT NULL 
         AND array_to_string(p.proacl, ',') LIKE '%authenticated%' THEN '✅'
    WHEN p.proname = 'process_import_accounts' AND p.proacl IS NOT NULL 
         AND array_to_string(p.proacl, ',') LIKE '%service_role%' 
         AND array_to_string(p.proacl, ',') NOT LIKE '%authenticated%' THEN '✅'
    WHEN p.proname = 'check_rate_limit' AND p.proacl IS NOT NULL 
         AND array_to_string(p.proacl, ',') LIKE '%service_role%' 
         AND array_to_string(p.proacl, ',') NOT LIKE '%authenticated%' THEN '✅'
    WHEN p.proname IN ('can_access_import', 'try_uuid') THEN '✅ (helper)'
    ELSE '⚠️ VERIFICĂ'
  END AS security_check
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('create_company_with_member', 'process_import_accounts', 
                     'check_rate_limit', 'can_access_import', 'try_uuid')
ORDER BY p.proname;

\echo ''
\echo 'REZULTAT AȘTEPTAT:'
\echo '  ✓ create_company_with_member: GRANT EXECUTE TO authenticated'
\echo '  ✓ process_import_accounts: GRANT EXECUTE TO service_role (NU authenticated)'
\echo '  ✓ check_rate_limit: GRANT EXECUTE TO service_role (NU authenticated)'
\echo '  ✓ can_access_import: poate fi authenticated (helper policies)'
\echo '  ✓ try_uuid: GRANT EXECUTE TO authenticated (helper policies - v1.8)'
\echo ''

-- =============================================================================
-- Query D6: Grants pe trial_balance_imports (view-only strategy v1.7)
-- =============================================================================
\echo '========================================='
\echo 'D6: GRANTS PE TRIAL_BALANCE_IMPORTS'
\echo '========================================='
\echo ''

SELECT 
  grantee,
  privilege_type,
  is_grantable,
  CASE 
    WHEN grantee = 'authenticated' AND privilege_type = 'SELECT' 
      THEN '⚠️ RISC: authenticated poate vedea internal_error_detail'
    WHEN grantee = 'service_role' THEN '✅ OK (owner)'
    ELSE '✅'
  END AS security_note
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'trial_balance_imports'
ORDER BY grantee, privilege_type;

\echo ''
\echo 'REZULTAT AȘTEPTAT (v1.7+):'
\echo '  ✓ authenticated: NU are SELECT pe tabel direct (REVOKE aplicat)'
\echo '  ✓ authenticated: ARE SELECT pe view trial_balance_imports_public'
\echo '  ✓ service_role: ARE toate privilegiile (owner implicit)'
\echo ''

-- =============================================================================
-- Query BONUS: Verificare existență view trial_balance_imports_public (v1.7)
-- =============================================================================
\echo '========================================='
\echo 'BONUS: VIEW TRIAL_BALANCE_IMPORTS_PUBLIC'
\echo '========================================='
\echo ''

SELECT 
  schemaname,
  viewname,
  viewowner,
  CASE 
    WHEN viewname = 'trial_balance_imports_public' THEN '✅ View există (v1.7+)'
    ELSE viewname
  END AS status
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname LIKE '%trial_balance%'
ORDER BY viewname;

\echo ''
\echo 'REZULTAT AȘTEPTAT (v1.7+):'
\echo '  ✓ View trial_balance_imports_public există'
\echo '  ✓ View NU expune coloana internal_error_detail'
\echo ''

-- =============================================================================
-- Query EXTRA: Verificare coliziuni CUI (pre-flight pentru migrare 100006)
-- =============================================================================
\echo '========================================='
\echo 'EXTRA: PRE-FLIGHT COLIZIUNI CUI (v1.7)'
\echo '========================================='
\echo ''

WITH normalized_cui AS (
  SELECT 
    id,
    name,
    cui,
    UPPER(REGEXP_REPLACE(cui, '[^A-Z0-9]', '', 'gi')) AS normalized_cui,
    created_at
  FROM public.companies
  WHERE cui IS NOT NULL
),
duplicates AS (
  SELECT 
    normalized_cui,
    COUNT(*) AS count,
    STRING_AGG(name || ' (ID: ' || id || ')', ', ' ORDER BY created_at) AS companies
  FROM normalized_cui
  GROUP BY normalized_cui
  HAVING COUNT(*) > 1
)
SELECT 
  normalized_cui,
  count AS duplicate_count,
  companies
FROM duplicates
ORDER BY count DESC, normalized_cui;

\echo ''
\echo 'REZULTAT AȘTEPTAT:'
\echo '  ✓ Zero rânduri (nicio coliziune CUI)'
\echo '  ⚠️ DACĂ există coliziuni: REMEDIAZĂ ÎNAINTE de migrarea 100006'
\echo '     Plan remediere:'
\echo '     1. Identifică compania legitimă (verifică documente fiscale)'
\echo '     2. Șterge/arhivează companiile duplicate'
\echo '     3. Rulează din nou această query'
\echo '     4. Doar după 0 coliziuni, aplică migrarea cu UNIQUE constraint'
\echo ''

-- =============================================================================
-- SUMAR FINAL
-- =============================================================================
\echo '========================================='
\echo 'SUMAR VERIFICĂRI GATE 0'
\echo '========================================='
\echo ''
\echo 'Ai rulat cu succes toate queries Gate 0 (D1-D6 + BONUS + EXTRA)'
\echo ''
\echo 'ACȚIUNI URMĂTOARE:'
\echo '  1. Salvează acest output în planning/gate0_db_state.txt'
\echo '  2. Verifică manual fiecare "REZULTAT AȘTEPTAT"'
\echo '  3. Remediază orice deviere (❌ sau ⚠️)'
\echo '  4. Rulează verificările bash din Gate 0 (A, C, E)'
\echo '  5. DOAR după toate verificările OK, aplică migrările'
\echo ''
\echo '⚠️ BLOCARE CRITICĂ:'
\echo '  - Gate 0(E): Dacă găsești expunere company_id necomitat → BLOCAT'
\echo '  - Query EXTRA: Dacă găsești coliziuni CUI → REMEDIAZĂ ÎNAINTE'
\echo ''
\echo 'Notează hash-ul commit curent pentru rollback:'
SELECT NOW() AS verification_timestamp;
\echo ''
