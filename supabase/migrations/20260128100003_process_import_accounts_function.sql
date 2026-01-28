/**
 * Migrare: process_import_accounts Function (Idempotență + Hardening)
 * PUNCTUL 2E: Previne concurență și permite rerun safe
 * Versiune: 1.8 | Severitate: ÎNALTĂ
 * DEPENDENCIES: 100002a (processing_started_at), 100002b (view)
 */

CREATE OR REPLACE FUNCTION public.process_import_accounts(
  p_import_id UUID,
  p_accounts JSONB,
  p_requester_user_id UUID  -- v1.5: defense-in-depth ownership
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_current_status VARCHAR;
  v_lock_acquired BOOLEAN;
BEGIN
  -- Validare parametri
  IF p_import_id IS NULL OR p_accounts IS NULL THEN
    RAISE EXCEPTION 'import_id and accounts are required';
  END IF;

  -- v1.5: Verifică ownership (defense-in-depth)
  SELECT company_id, status INTO v_company_id, v_current_status
  FROM public.trial_balance_imports
  WHERE id = p_import_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Import not found';
  END IF;

  IF NOT public.is_company_member(p_requester_user_id, v_company_id) THEN
    RAISE EXCEPTION 'Unauthorized: User does not belong to this company';
  END IF;

  -- v1.7: Advisory lock pentru refuz instant (nu wait)
  v_lock_acquired := pg_try_advisory_xact_lock(hashtext(p_import_id::TEXT));
  
  IF NOT v_lock_acquired THEN
    RAISE EXCEPTION 'Import is already being processed by another request';
  END IF;

  -- Guard status: idempotență
  IF v_current_status IN ('completed', 'failed') THEN
    -- Permite rerun doar explicit (UI button "Retry")
    -- Pentru now: refuz rerun automat
    RAISE EXCEPTION 'Import already % (rerun not allowed)', v_current_status;
  END IF;

  -- Marchează ca "processing" cu timestamp
  UPDATE public.trial_balance_imports
  SET status = 'processing',
      processing_started_at = NOW(),
      updated_at = NOW()
  WHERE id = p_import_id
    AND status = 'pending';  -- Guard: doar dacă e pending

  -- Șterge conturi vechi (dacă rerun)
  DELETE FROM public.trial_balance_accounts
  WHERE import_id = p_import_id;

  -- Inserează conturile noi (bulk)
  INSERT INTO public.trial_balance_accounts (
    import_id, account_code, account_name, debit, credit
  )
  SELECT 
    p_import_id,
    (account->>'code')::VARCHAR,
    (account->>'name')::VARCHAR,
    COALESCE((account->>'debit')::NUMERIC, 0),
    COALESCE((account->>'credit')::NUMERIC, 0)
  FROM jsonb_array_elements(p_accounts) AS account;

  -- Marchează ca "completed"
  UPDATE public.trial_balance_imports
  SET status = 'completed',
      accounts_count = jsonb_array_length(p_accounts),
      updated_at = NOW()
  WHERE id = p_import_id;

  RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
  -- Marchează ca "failed" + salvează eroare
  UPDATE public.trial_balance_imports
  SET status = 'failed',
      error_message = 'Processing failed. Please try again.',
      internal_error_detail = SQLERRM,
      internal_error_code = SQLSTATE,
      updated_at = NOW()
  WHERE id = p_import_id;

  RAISE NOTICE 'process_import_accounts ERROR: %', SQLERRM;
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.process_import_accounts IS 
'v1.7: Process import cu idempotență. Advisory lock pentru refuz instant. Defense-in-depth ownership.';

REVOKE ALL ON FUNCTION public.process_import_accounts FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_import_accounts TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: process_import_accounts function created';
  RAISE NOTICE '  - v1.7: pg_try_advisory_xact_lock pentru refuz instant';
  RAISE NOTICE '  - v1.5: defense-in-depth ownership verification';
  RAISE NOTICE '  - Idempotență: previne rerun automat completed/failed';
  RAISE NOTICE '  - SECURITY DEFINER, service_role only';
END $$;
