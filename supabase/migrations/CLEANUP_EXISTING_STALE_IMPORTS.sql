/**
 * Script Manual: Cleanup Imports Blocate Existente
 * ================================================
 * 
 * SCOP: Curăță imports blocate în 'processing' din cauza bug-ului de inconsistență status
 * EXECUTARE: Rulează MANUAL în Supabase SQL Editor DUPĂ aplicarea migrărilor 20260129100000 și 20260129100001
 * DATA: 29 ianuarie 2026
 * 
 * PAȘI:
 * 1. Verifică imports blocate
 * 2. Rulează cleanup automat
 * 3. Verifică rezultate
 * 4. (Opțional) Permite retry manual pentru utilizatori
 */

-- ============================================================================
-- PAS 1: VERIFICARE - Afișează imports blocate în 'processing'
-- ============================================================================

-- Afișează toate imports blocate > 5 minute
SELECT 
  id,
  company_id,
  source_file_name,
  status,
  processing_started_at,
  ROUND(EXTRACT(EPOCH FROM (NOW() - processing_started_at)) / 60, 2) AS minutes_elapsed,
  error_message,
  created_at
FROM public.trial_balance_imports
WHERE status = 'processing'
  AND processing_started_at IS NOT NULL
  AND processing_started_at < NOW() - INTERVAL '5 minutes'
ORDER BY processing_started_at ASC;

-- NOTĂ: Dacă vezi imports aici, continuă cu Pas 2

-- ============================================================================
-- PAS 2: CLEANUP AUTOMAT - Marchează imports stale ca 'failed'
-- ============================================================================

-- Rulează funcția de cleanup (marchează automat imports > 10 min ca 'failed')
SELECT * FROM public.cleanup_stale_imports();

-- Rezultat așteptat:
-- cleaned_count | import_ids
-- --------------+------------
--             2 | {uuid1, uuid2}

-- ============================================================================
-- PAS 3: VERIFICARE POST-CLEANUP - Confirmă că nu mai există imports blocate
-- ============================================================================

-- Verifică din nou imports blocate (ar trebui să fie 0)
SELECT COUNT(*) AS imports_still_stale
FROM public.trial_balance_imports
WHERE status = 'processing'
  AND processing_started_at < NOW() - INTERVAL '10 minutes';

-- Afișează imports marcate ca 'failed' recent (ultimele 24h)
SELECT 
  id,
  company_id,
  source_file_name,
  status,
  error_message,
  internal_error_code,
  updated_at
FROM public.trial_balance_imports
WHERE status = 'failed'
  AND internal_error_code = 'PROCESSING_TIMEOUT'
  AND updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC;

-- ============================================================================
-- PAS 4 (OPȚIONAL): STATISTICI CLEANUP
-- ============================================================================

-- Statistici generale despre imports și statusurile lor
SELECT 
  status,
  COUNT(*) AS total_imports,
  COUNT(CASE WHEN internal_error_code = 'PROCESSING_TIMEOUT' THEN 1 END) AS timeout_errors
FROM public.trial_balance_imports
GROUP BY status
ORDER BY status;

-- ============================================================================
-- INSTRUCȚIUNI PENTRU UTILIZATORI
-- ============================================================================

-- Utilizatorii pot acum:
-- 1. Vedea imports cu status 'Eroare' în UI
-- 2. Apăsa butonul 'Reîncearcă procesarea' (RotateCcw icon)
-- 3. Sistemul va reîncerca automat procesarea fișierului

-- NOTĂ: Butonul de retry este disponibil doar pentru imports cu status 'failed' sau 'error'

-- ============================================================================
-- MONITORING CONTINUU (OPȚIONAL - Configurare pg_cron)
-- ============================================================================

-- Dacă dorești monitoring automat periodic, activează în Supabase Dashboard:
-- Extensions → pg_cron → Enable

-- Apoi rulează:
-- SELECT cron.schedule(
--   'cleanup-stale-imports-hourly',
--   '0 * * * *',  -- La fiecare oră
--   'SELECT public.cleanup_stale_imports()'
-- );

-- Pentru a verifica job-uri active:
-- SELECT * FROM cron.job;

-- Pentru a dezactiva:
-- SELECT cron.unschedule('cleanup-stale-imports-hourly');

-- ============================================================================
-- REZUMAT
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Script de cleanup executat cu succes!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 VERIFICARE:';
  RAISE NOTICE '  - Rulează din nou Pas 3 pentru a confirma că nu mai există imports blocate';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 ACȚIUNI UTILIZATORI:';
  RAISE NOTICE '  - Utilizatorii vor vedea butonul Retry (RotateCcw) în UI pentru imports failed';
  RAISE NOTICE '  - Click pe buton va reîncerca automat procesarea';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️  CONFIGURARE AUTOMATĂ (OPȚIONAL):';
  RAISE NOTICE '  - Configurează pg_cron în Supabase Dashboard pentru cleanup periodic';
  RAISE NOTICE '  - Vezi secțiunea "MONITORING CONTINUU" din acest script';
END $$;
