/**
 * Migrare: Stale Imports Cleanup Mechanism
 * SCOP: Detectare și reparare automate pentru imports blocate în 'processing'
 * Versiune: 1.9 | Severitate: ÎNALTĂ
 * Data: 29 ianuarie 2026
 */

-- ============================================================================
-- Funcție: Cleanup Automat pentru Imports Stale (blocate > 10 min)
-- ============================================================================

/**
 * Marchează imports blocate în 'processing' > 10 min ca 'failed'
 * Permite retry manual din UI ulterior
 * 
 * @returns Numărul de imports marcate ca failed
 */
CREATE OR REPLACE FUNCTION public.cleanup_stale_imports()
RETURNS TABLE(
  cleaned_count INT,
  import_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stale_threshold INTERVAL := INTERVAL '10 minutes';
  v_cleaned_ids UUID[];
BEGIN
  -- Selectează imports blocate
  SELECT ARRAY_AGG(id) INTO v_cleaned_ids
  FROM public.trial_balance_imports
  WHERE status = 'processing'
    AND processing_started_at < NOW() - v_stale_threshold
    AND processing_started_at IS NOT NULL;

  -- Dacă nu există imports blocate, returnează 0
  IF v_cleaned_ids IS NULL THEN
    RETURN QUERY SELECT 0::INT, ARRAY[]::UUID[];
    RETURN;
  END IF;

  -- Marchează ca failed cu mesaj explicit
  UPDATE public.trial_balance_imports
  SET 
    status = 'failed',
    error_message = 'Processing timeout - Import blocat peste 10 minute. Încercați din nou.',
    internal_error_detail = 'Stale import detected by cleanup_stale_imports()',
    internal_error_code = 'PROCESSING_TIMEOUT',
    updated_at = NOW()
  WHERE id = ANY(v_cleaned_ids);

  -- Logare pentru monitoring
  RAISE NOTICE '✅ Cleanup: % imports marcate ca failed (timeout)', array_length(v_cleaned_ids, 1);
  
  RETURN QUERY SELECT array_length(v_cleaned_ids, 1)::INT, v_cleaned_ids;
END;
$$;

COMMENT ON FUNCTION public.cleanup_stale_imports IS 
'v1.9: Marchează automat imports blocate > 10 min ca failed pentru retry manual';

REVOKE ALL ON FUNCTION public.cleanup_stale_imports FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_imports TO service_role, authenticated;

-- ============================================================================
-- Funcție: Retry Manual pentru Import Failed
-- ============================================================================

/**
 * Permite retry manual pentru un import failed/error
 * Resetează status la 'pending' pentru reprocessare
 * 
 * @param p_import_id - ID-ul importului de reîncercat
 * @param p_user_id - ID-ul utilizatorului care face retry
 * @returns TRUE dacă retry-ul a reușit
 */
CREATE OR REPLACE FUNCTION public.retry_failed_import(
  p_import_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_current_status VARCHAR;
BEGIN
  -- Verifică ownership
  SELECT company_id, status INTO v_company_id, v_current_status
  FROM public.trial_balance_imports
  WHERE id = p_import_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Import not found';
  END IF;

  IF NOT public.is_company_member(p_user_id, v_company_id) THEN
    RAISE EXCEPTION 'Unauthorized: User does not belong to this company';
  END IF;

  -- Permite retry doar pentru failed/error
  IF v_current_status NOT IN ('failed', 'error') THEN
    RAISE EXCEPTION 'Cannot retry import with status: % (doar failed/error)', v_current_status;
  END IF;

  -- Resetează la pending pentru reprocessare
  UPDATE public.trial_balance_imports
  SET 
    status = 'pending',
    error_message = NULL,
    internal_error_detail = NULL,
    internal_error_code = NULL,
    processing_started_at = NULL,
    updated_at = NOW()
  WHERE id = p_import_id;

  RAISE NOTICE '✅ Import % resetat la pending pentru retry', p_import_id;
  
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.retry_failed_import IS 
'v1.9: Permite retry manual pentru imports failed/error';

REVOKE ALL ON FUNCTION public.retry_failed_import FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_failed_import TO authenticated;

-- ============================================================================
-- View: Imports Stale (pentru monitoring în UI)
-- ============================================================================

CREATE OR REPLACE VIEW public.stale_imports_monitor AS
SELECT 
  i.id,
  i.company_id,
  c.name AS company_name,
  i.source_file_name,
  i.status,
  i.processing_started_at,
  ROUND(EXTRACT(EPOCH FROM (NOW() - i.processing_started_at)) / 60, 2) AS minutes_elapsed,
  i.error_message,
  i.created_at
FROM public.trial_balance_imports i
JOIN public.companies c ON c.id = i.company_id
WHERE i.status = 'processing'
  AND i.processing_started_at IS NOT NULL
  AND i.processing_started_at < NOW() - INTERVAL '5 minutes'
ORDER BY i.processing_started_at ASC;

COMMENT ON VIEW public.stale_imports_monitor IS 
'v1.9: Monitoring view pentru imports blocate > 5 min (warning threshold)';

-- RLS pentru view
ALTER VIEW public.stale_imports_monitor OWNER TO postgres;

-- ============================================================================
-- Scheduled Job: Cleanup Automat (opcional - manual trigger recomandat)
-- ============================================================================

-- NOTĂ: pg_cron poate fi configurat în Supabase Dashboard pentru rulare automată
-- Exemplu: SELECT cron.schedule('cleanup-stale-imports', '*/10 * * * *', 'SELECT cleanup_stale_imports()');
-- Pentru acum, vom rula manual sau din frontend

DO $$
BEGIN
  RAISE NOTICE '✅ SUCCESS: Stale Imports Cleanup Mechanism instalat';
  RAISE NOTICE '  - Funcție: cleanup_stale_imports() pentru cleanup automat';
  RAISE NOTICE '  - Funcție: retry_failed_import() pentru retry manual din UI';
  RAISE NOTICE '  - View: stale_imports_monitor pentru monitoring';
  RAISE NOTICE '  - Threshold: 10 minute pentru cleanup, 5 minute pentru warning';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ACȚIUNE RECOMANDATĂ:';
  RAISE NOTICE '  1. Rulează SELECT * FROM cleanup_stale_imports() pentru imports curente blocate';
  RAISE NOTICE '  2. Configurează pg_cron în Supabase Dashboard pentru rulare automată (opțional)';
  RAISE NOTICE '  3. Adaugă buton Retry în UI pentru imports failed';
END $$;
