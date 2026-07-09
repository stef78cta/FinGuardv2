/**
 * Migrare: Suport DUAL format balanță (8 / 10 coloane)
 *
 * Adaugă `balance_format` pe trial_balance_imports (per import, NU global pe companie/user).
 * Actualizează:
 *   - grants pentru coloana nouă (INSERT ... RETURNING + view-uri);
 *   - process_import_accounts → param nou p_balance_format (DEFAULT NULL) care setează formatul;
 *   - view-urile trial_balance_imports_public / _internal / active_trial_balance_imports;
 *   - RPC get_company_imports_with_totals → expune balance_format.
 *
 * Backward-compatible: importurile vechi rămân cu balance_format = NULL.
 * Data: 8 iulie 2026
 */

-- ============================================================================
-- STEP 1: Coloană balance_format (per import)
-- ============================================================================

ALTER TABLE public.trial_balance_imports
ADD COLUMN IF NOT EXISTS balance_format TEXT
  CHECK (balance_format IS NULL OR balance_format IN ('8_COLUMNS', '10_COLUMNS'));

COMMENT ON COLUMN public.trial_balance_imports.balance_format IS
  'Formatul balanței detectat la import: 8_COLUMNS sau 10_COLUMNS. Per import, nu global. NULL pentru importuri vechi.';

-- Grants pe coloana nouă: SELECT necesar pentru INSERT ... RETURNING și view-uri.
GRANT SELECT (balance_format), INSERT (balance_format), UPDATE (balance_format)
ON public.trial_balance_imports TO authenticated;

-- ============================================================================
-- STEP 2: process_import_accounts — param nou p_balance_format
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_import_accounts(
  p_import_id UUID,
  p_accounts JSONB,
  p_requester_user_id UUID,
  p_balance_format TEXT DEFAULT NULL
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
  v_balance_format TEXT;
BEGIN
  IF p_import_id IS NULL OR p_accounts IS NULL THEN
    RAISE EXCEPTION 'import_id and accounts are required';
  END IF;

  IF p_balance_format IS NOT NULL AND p_balance_format NOT IN ('8_COLUMNS', '10_COLUMNS') THEN
    RAISE EXCEPTION 'Invalid balance_format: %', p_balance_format;
  END IF;
  v_balance_format := p_balance_format;

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
      balance_format = COALESCE(v_balance_format, balance_format),
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

COMMENT ON FUNCTION public.process_import_accounts(UUID, JSONB, UUID, TEXT) IS
'v3.0: Procesează conturi import — include total_sume_* și balance_format (8/10 coloane).';

REVOKE ALL ON FUNCTION public.process_import_accounts(UUID, JSONB, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_import_accounts(UUID, JSONB, UUID, TEXT) TO service_role;

-- ============================================================================
-- STEP 3: Recreează view-urile pentru a expune balance_format
-- ============================================================================

DROP VIEW IF EXISTS public.trial_balance_imports_public;

CREATE VIEW public.trial_balance_imports_public
WITH (security_invoker = true)
AS
SELECT
    id,
    company_id,
    balance_month,
    period_start,
    period_end,
    source_file_name,
    source_file_url,
    file_size_bytes,
    uploaded_by,
    status,
    error_message,
    validation_errors,
    balance_format,
    accounts_count,
    created_at,
    updated_at,
    processed_at,
    deleted_at
FROM public.trial_balance_imports
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.trial_balance_imports_public IS
'View public pentru imports — include balance_month și balance_format, fără internal_error_detail/code.';

GRANT SELECT ON public.trial_balance_imports_public TO authenticated;

-- RLS: view-ul folosește security_invoker=true; filtrarea se face prin RLS pe trial_balance_imports.
-- Nu recreăm policy pe view (Postgres 17: CREATE POLICY pe view necesită ENABLE ROW LEVEL SECURITY).

DROP VIEW IF EXISTS public.trial_balance_imports_internal;

CREATE VIEW public.trial_balance_imports_internal
WITH (security_invoker = true)
AS
SELECT
    id,
    company_id,
    balance_month,
    period_start,
    period_end,
    source_file_name,
    source_file_url,
    file_size_bytes,
    uploaded_by,
    status,
    error_message,
    validation_errors,
    balance_format,
    accounts_count,
    processing_started_at,
    internal_error_code,
    internal_error_detail,
    created_at,
    updated_at,
    processed_at,
    deleted_at
FROM public.trial_balance_imports;

COMMENT ON VIEW public.trial_balance_imports_internal IS
'View internal pentru debugging — include balance_format și coloane de eroare interne.';

GRANT SELECT ON public.trial_balance_imports_internal TO service_role;

-- active_trial_balance_imports: coloane explicite (tbi.* + accounts_count duplică accounts_count din tabel).
DROP VIEW IF EXISTS public.active_trial_balance_imports;

CREATE OR REPLACE VIEW public.active_trial_balance_imports AS
SELECT
    tbi.id,
    tbi.company_id,
    tbi.balance_month,
    tbi.period_start,
    tbi.period_end,
    tbi.source_file_name,
    tbi.source_file_url,
    tbi.file_size_bytes,
    tbi.uploaded_by,
    tbi.status,
    tbi.error_message,
    tbi.validation_errors,
    tbi.balance_format,
    tbi.created_at,
    tbi.updated_at,
    tbi.processed_at,
    tbi.deleted_at,
    (SELECT COUNT(*) FROM public.trial_balance_accounts WHERE import_id = tbi.id) AS accounts_count
FROM public.trial_balance_imports tbi
WHERE tbi.deleted_at IS NULL;

GRANT SELECT ON public.active_trial_balance_imports TO authenticated;

-- ============================================================================
-- STEP 4: get_company_imports_with_totals — expune balance_format
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_company_imports_with_totals(UUID);

CREATE OR REPLACE FUNCTION public.get_company_imports_with_totals(_company_id UUID)
RETURNS TABLE (
    import_id UUID,
    source_file_name VARCHAR(255),
    balance_month DATE,
    period_start DATE,
    period_end DATE,
    status public.import_status,
    error_message TEXT,
    balance_format TEXT,
    created_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    source_file_url TEXT,
    total_closing_debit NUMERIC(15,2),
    total_closing_credit NUMERIC(15,2),
    accounts_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        tbi.id AS import_id,
        tbi.source_file_name,
        tbi.balance_month,
        tbi.period_start,
        tbi.period_end,
        tbi.status,
        tbi.error_message,
        tbi.balance_format,
        tbi.created_at,
        tbi.processed_at,
        tbi.source_file_url,
        COALESCE(SUM(tba.closing_debit), 0)::NUMERIC(15,2) AS total_closing_debit,
        COALESCE(SUM(tba.closing_credit), 0)::NUMERIC(15,2) AS total_closing_credit,
        COUNT(tba.id)::BIGINT AS accounts_count
    FROM public.trial_balance_imports tbi
    LEFT JOIN public.trial_balance_accounts tba ON tba.import_id = tbi.id
    WHERE tbi.company_id = _company_id
      AND tbi.deleted_at IS NULL
    GROUP BY tbi.id, tbi.source_file_name, tbi.balance_month, tbi.period_start, tbi.period_end,
             tbi.status, tbi.error_message, tbi.balance_format, tbi.created_at, tbi.processed_at, tbi.source_file_url
    ORDER BY tbi.created_at DESC
$$;

ALTER FUNCTION public.get_company_imports_with_totals(UUID) OWNER TO postgres;

DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: balance_format column + dual-format RPC/views applied';
END $$;
