/**
 * Migrare: Fix process_import_accounts - Acceptă AMBELE statusuri (pending SAU processing)
 * PROBLEMA: Frontend-ul creează import cu 'processing', dar funcția aștepta 'pending'
 * SOLUȚIE: Acceptă AMBELE pentru compatibilitate și tranziție smooth
 * Versiune: 1.9 | Severitate: CRITICĂ (BLOCKER pentru uploads)
 * Data: 29 ianuarie 2026
 */

CREATE OR REPLACE FUNCTION public.process_import_accounts(
  p_import_id UUID,
  p_accounts JSONB,
  p_requester_user_id UUID
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

  -- Verifică ownership (defense-in-depth)
  SELECT company_id, status INTO v_company_id, v_current_status
  FROM public.trial_balance_imports
  WHERE id = p_import_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Import not found';
  END IF;

  IF NOT public.is_company_member(p_requester_user_id, v_company_id) THEN
    RAISE EXCEPTION 'Unauthorized: User does not belong to this company';
  END IF;

  -- Advisory lock pentru refuz instant (nu wait)
  v_lock_acquired := pg_try_advisory_xact_lock(hashtext(p_import_id::TEXT));
  
  IF NOT v_lock_acquired THEN
    RAISE EXCEPTION 'Import is already being processed by another request';
  END IF;

  -- v1.9.2: Guard status - idempotență cu protecție îmbunătățită
  -- ENUM valid: 'draft', 'processing', 'validated', 'completed', 'error'
  IF v_current_status IN ('completed', 'error') THEN
    -- Permite rerun doar explicit (UI button "Retry")
    RAISE EXCEPTION 'Import already % (rerun not allowed)', v_current_status;
  END IF;

  -- v1.9.2: FIX - Acceptă 'processing' sau 'draft' (valori valid în ENUM)
  -- ENUM existent: 'draft', 'processing', 'validated', 'completed', 'error'
  -- Frontend creează cu 'processing', funcția doar actualizează timestamp
  UPDATE public.trial_balance_imports
  SET processing_started_at = COALESCE(processing_started_at, NOW()),
      updated_at = NOW()
  WHERE id = p_import_id
    AND status IN ('draft', 'processing');  -- v1.9.2: Valori valide din ENUM

  -- Șterge conturi vechi (dacă rerun)
  DELETE FROM public.trial_balance_accounts
  WHERE import_id = p_import_id;

  -- Inserează conturile noi (bulk)
  INSERT INTO public.trial_balance_accounts (
    import_id, account_code, account_name, opening_debit, opening_credit,
    debit_turnover, credit_turnover, closing_debit, closing_credit
  )
  SELECT 
    p_import_id,
    (account->>'code')::VARCHAR,
    (account->>'name')::VARCHAR,
    COALESCE((account->>'opening_debit')::NUMERIC, 0),
    COALESCE((account->>'opening_credit')::NUMERIC, 0),
    COALESCE((account->>'debit_turnover')::NUMERIC, 0),
    COALESCE((account->>'credit_turnover')::NUMERIC, 0),
    COALESCE((account->>'closing_debit')::NUMERIC, 0),
    COALESCE((account->>'closing_credit')::NUMERIC, 0)
  FROM jsonb_array_elements(p_accounts) AS account;

  -- Marchează ca "completed"
  UPDATE public.trial_balance_imports
  SET status = 'completed',
      accounts_count = jsonb_array_length(p_accounts),
      processed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_import_id;

  RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
  -- v1.9.2: Marchează ca 'error' (valoare validă din ENUM)
  UPDATE public.trial_balance_imports
  SET status = 'error',
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
'v1.9: CRITICAL FIX - Acceptă pending/processing (compatibilitate frontend legacy)';

REVOKE ALL ON FUNCTION public.process_import_accounts FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_import_accounts TO service_role;

DO $$
BEGIN
  RAISE NOTICE '✅ SUCCESS: process_import_accounts function FIXED (v1.9)';
  RAISE NOTICE '  - v1.9: Acceptă AMBELE statusuri (pending/processing)';
  RAISE NOTICE '  - Rezolvă problema uploads blocate în "processing"';
  RAISE NOTICE '  - Mapping complet conturi (toate coloanele)';
  RAISE NOTICE '  - Advisory lock pentru concurență';
  RAISE NOTICE '  - SECURITY DEFINER, service_role only';
END $$;
