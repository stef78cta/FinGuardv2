/**
 * Migrare: Format balanță 10 coloane — total_sume_debitoare / total_sume_creditoare
 *
 * Adaugă coloanele G/H din noul format Excel în trial_balance_accounts
 * și actualizează RPC-urile care inserează/citesc conturi.
 */

-- ============================================================================
-- STEP 1: Coloane noi în trial_balance_accounts
-- ============================================================================

ALTER TABLE public.trial_balance_accounts
ADD COLUMN IF NOT EXISTS total_sume_debitoare NUMERIC(15,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_sume_creditoare NUMERIC(15,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.trial_balance_accounts.total_sume_debitoare IS
  'Coloana G: SI_DEBIT + rulaj_d (validat la upload)';

COMMENT ON COLUMN public.trial_balance_accounts.total_sume_creditoare IS
  'Coloana H: SI_CREDIT + rulaj_c (validat la upload)';

-- ============================================================================
-- STEP 2: process_import_accounts — include câmpurile noi
-- ============================================================================

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
  v_accounts JSONB;
  v_requester_id UUID;
BEGIN
  IF p_import_id IS NULL OR p_accounts IS NULL THEN
    RAISE EXCEPTION 'import_id and accounts are required';
  END IF;

  IF jsonb_typeof(p_accounts) = 'string' THEN
    v_accounts := (p_accounts #>> '{}')::jsonb;
  ELSE
    v_accounts := p_accounts;
  END IF;

  IF jsonb_typeof(v_accounts) != 'array' THEN
    RAISE EXCEPTION 'accounts must be a JSON array';
  END IF;

  SELECT company_id, status INTO v_company_id, v_current_status
  FROM public.trial_balance_imports
  WHERE id = p_import_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Import not found';
  END IF;

  v_requester_id := p_requester_user_id;
  IF NOT public.is_company_member(v_requester_id, v_company_id) THEN
    SELECT u.id INTO v_requester_id
    FROM public.users u
    WHERE u.auth_user_id = p_requester_user_id
    LIMIT 1;

    IF v_requester_id IS NULL OR NOT public.is_company_member(v_requester_id, v_company_id) THEN
      RAISE EXCEPTION 'Unauthorized: User does not belong to this company';
    END IF;
  END IF;

  v_lock_acquired := pg_try_advisory_xact_lock(hashtext(p_import_id::TEXT));
  IF NOT v_lock_acquired THEN
    RAISE EXCEPTION 'Import is already being processed by another request';
  END IF;

  IF v_current_status IN ('completed', 'error') THEN
    RAISE EXCEPTION 'Import already % (rerun not allowed)', v_current_status;
  END IF;

  UPDATE public.trial_balance_imports
  SET processing_started_at = COALESCE(processing_started_at, NOW()),
      updated_at = NOW()
  WHERE id = p_import_id
    AND status IN ('draft', 'processing');

  DELETE FROM public.trial_balance_accounts
  WHERE import_id = p_import_id;

  INSERT INTO public.trial_balance_accounts (
    import_id, account_code, account_name,
    opening_debit, opening_credit,
    debit_turnover, credit_turnover,
    total_sume_debitoare, total_sume_creditoare,
    closing_debit, closing_credit
  )
  SELECT
    p_import_id,
    (account->>'code')::VARCHAR,
    (account->>'name')::VARCHAR,
    COALESCE((account->>'opening_debit')::NUMERIC, 0),
    COALESCE((account->>'opening_credit')::NUMERIC, 0),
    COALESCE((account->>'debit_turnover')::NUMERIC, 0),
    COALESCE((account->>'credit_turnover')::NUMERIC, 0),
    COALESCE((account->>'total_sume_debitoare')::NUMERIC, 0),
    COALESCE((account->>'total_sume_creditoare')::NUMERIC, 0),
    COALESCE((account->>'closing_debit')::NUMERIC, 0),
    COALESCE((account->>'closing_credit')::NUMERIC, 0)
  FROM jsonb_array_elements(v_accounts) AS account;

  UPDATE public.trial_balance_imports
  SET status = 'completed',
      accounts_count = jsonb_array_length(v_accounts),
      processed_at = NOW(),
      error_message = NULL,
      internal_error_detail = NULL,
      internal_error_code = NULL,
      updated_at = NOW()
  WHERE id = p_import_id;

  RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
  UPDATE public.trial_balance_imports
  SET status = 'error',
      error_message = 'Processing failed. Please try again.',
      internal_error_detail = SQLERRM,
      internal_error_code = SQLSTATE,
      updated_at = NOW()
  WHERE id = p_import_id;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.process_import_accounts IS
'v2.1: Procesează conturi import — include total_sume_debitoare/creditoare (format 10 coloane)';

REVOKE ALL ON FUNCTION public.process_import_accounts FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_import_accounts TO service_role;

-- ============================================================================
-- STEP 3: get_balances_with_accounts — expune câmpurile noi în JSON
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_balances_with_accounts(
    _company_id UUID,
    _limit INT DEFAULT 10,
    _offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(balance_data ORDER BY period_end DESC), '[]'::JSONB)
    INTO result
    FROM (
        SELECT jsonb_build_object(
            'id', tbi.id,
            'company_id', tbi.company_id,
            'source_file_name', tbi.source_file_name,
            'period_start', tbi.period_start,
            'period_end', tbi.period_end,
            'status', tbi.status,
            'created_at', tbi.created_at,
            'processed_at', tbi.processed_at,
            'accounts', COALESCE(
                (SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', tba.id,
                        'import_id', tba.import_id,
                        'account_code', tba.account_code,
                        'account_name', tba.account_name,
                        'opening_debit', tba.opening_debit,
                        'opening_credit', tba.opening_credit,
                        'debit_turnover', tba.debit_turnover,
                        'credit_turnover', tba.credit_turnover,
                        'total_sume_debitoare', tba.total_sume_debitoare,
                        'total_sume_creditoare', tba.total_sume_creditoare,
                        'closing_debit', tba.closing_debit,
                        'closing_credit', tba.closing_credit
                    ) ORDER BY tba.account_code
                )
                FROM public.trial_balance_accounts tba
                WHERE tba.import_id = tbi.id
                ), '[]'::JSONB
            )
        ) as balance_data
        FROM public.trial_balance_imports tbi
        WHERE tbi.company_id = _company_id
          AND tbi.status = 'completed'
          AND tbi.deleted_at IS NULL
        ORDER BY tbi.period_end DESC
        LIMIT _limit
        OFFSET _offset
    ) subquery;

    RETURN result;
END;
$$;

-- ============================================================================
-- STEP 4: get_accounts_paginated — include câmpurile noi
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_accounts_paginated(
    _import_id UUID,
    _limit INT DEFAULT 50,
    _offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    import_id UUID,
    account_code VARCHAR(20),
    account_name VARCHAR(255),
    opening_debit NUMERIC(15,2),
    opening_credit NUMERIC(15,2),
    debit_turnover NUMERIC(15,2),
    credit_turnover NUMERIC(15,2),
    total_sume_debitoare NUMERIC(15,2),
    total_sume_creditoare NUMERIC(15,2),
    closing_debit NUMERIC(15,2),
    closing_credit NUMERIC(15,2),
    total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        tba.id,
        tba.import_id,
        tba.account_code,
        tba.account_name,
        tba.opening_debit,
        tba.opening_credit,
        tba.debit_turnover,
        tba.credit_turnover,
        tba.total_sume_debitoare,
        tba.total_sume_creditoare,
        tba.closing_debit,
        tba.closing_credit,
        (SELECT COUNT(*) FROM public.trial_balance_accounts WHERE import_id = _import_id)::BIGINT as total_count
    FROM public.trial_balance_accounts tba
    WHERE tba.import_id = _import_id
    ORDER BY tba.account_code
    LIMIT _limit
    OFFSET _offset
$$;

DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: total_sume_debitoare/creditoare columns + RPC updates applied';
END $$;
