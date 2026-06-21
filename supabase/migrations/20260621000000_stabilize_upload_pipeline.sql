/**
 * Migrare: Stabilizare completă pipeline Upload Balanță (v2.0)
 *
 * Rezolvă:
 * - Bucket canonical `balante` (elimină referințe trial-balances)
 * - View public aliniat cu schema reală + accounts_count
 * - GRANT SELECT parțial pe tabel (INSERT RETURNING fără expunere internal_error_*)
 * - process_import_accounts: payload JSONB robust + ownership corect
 * - processing_started_at setat la INSERT din frontend
 *
 * Data: 21 iunie 2026
 */

-- ============================================================================
-- STEP 1: Bucket canonical `balante`
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'balante') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'balante',
            'balante',
            false,
            10485760,
            ARRAY[
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'application/vnd.ms-excel.sheet.macroEnabled.12',
                'application/vnd.ms-excel.sheet.binary.macroEnabled.12'
            ]
        );
    END IF;
END $$;

-- Elimină policies pe bucket legacy trial-balances (dacă există)
DROP POLICY IF EXISTS "Authenticated users can upload trial balances" ON storage.objects;
DROP POLICY IF EXISTS "Users can read trial balances from their companies" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete trial balances from their companies" ON storage.objects;
DROP POLICY IF EXISTS "trial_balances_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "trial_balances_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "trial_balances_delete_policy" ON storage.objects;

-- ============================================================================
-- STEP 2: Coloane necesare pipeline
-- ============================================================================

ALTER TABLE public.trial_balance_imports
ADD COLUMN IF NOT EXISTS accounts_count INTEGER DEFAULT 0;

ALTER TABLE public.trial_balance_imports
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

ALTER TABLE public.trial_balance_imports
ADD COLUMN IF NOT EXISTS internal_error_detail TEXT;

ALTER TABLE public.trial_balance_imports
ADD COLUMN IF NOT EXISTS internal_error_code TEXT;

ALTER TABLE public.trial_balance_imports
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 3: View public — schema aliniată + accounts_count
-- ============================================================================

DROP VIEW IF EXISTS public.stale_imports_monitor;
DROP VIEW IF EXISTS public.trial_balance_imports_internal;
DROP VIEW IF EXISTS public.trial_balance_imports_public;

CREATE VIEW public.trial_balance_imports_public
WITH (security_invoker = true)
AS
SELECT
    id,
    company_id,
    period_start,
    period_end,
    source_file_name,
    source_file_url,
    file_size_bytes,
    uploaded_by,
    status,
    error_message,
    validation_errors,
    accounts_count,
    created_at,
    updated_at,
    processed_at,
    deleted_at
FROM public.trial_balance_imports
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.trial_balance_imports_public IS
'View public pentru imports — fără internal_error_detail/code, processing_started_at.';

GRANT SELECT ON public.trial_balance_imports_public TO authenticated;

DROP POLICY IF EXISTS tbi_public_select ON public.trial_balance_imports_public;

CREATE POLICY tbi_public_select
ON public.trial_balance_imports_public FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.company_users cu
        WHERE cu.company_id = trial_balance_imports_public.company_id
          AND cu.user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    )
);

-- GRANT SELECT parțial pe tabel: permite INSERT ... RETURNING fără coloane interne
GRANT SELECT (
    id,
    company_id,
    period_start,
    period_end,
    source_file_name,
    source_file_url,
    file_size_bytes,
    uploaded_by,
    status,
    error_message,
    validation_errors,
    accounts_count,
    processing_started_at,
    created_at,
    updated_at,
    processed_at,
    deleted_at
) ON public.trial_balance_imports TO authenticated;

-- ============================================================================
-- STEP 4: process_import_accounts — JSONB robust + ownership
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

  -- Normalizează payload: array direct SAU string JSON serializat
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

  -- Acceptă public.users.id SAU auth.users.id (fallback)
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
'v2.0: Procesează conturi import — JSONB robust, ownership public/auth user id';

REVOKE ALL ON FUNCTION public.process_import_accounts FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_import_accounts TO service_role;

-- ============================================================================
-- STEP 5: Recreează stale_imports_monitor (dropped cu view-ul)
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

-- ============================================================================
-- STEP 6: Curăță imports blocate existente
-- ============================================================================

SELECT public.cleanup_stale_imports();

DO $$
BEGIN
  RAISE NOTICE '✅ Migrare v2.0 pipeline upload balanță aplicată';
  RAISE NOTICE '  - Bucket canonical: balante';
  RAISE NOTICE '  - View public actualizat cu accounts_count';
  RAISE NOTICE '  - process_import_accounts: JSONB + ownership fix';
  RAISE NOTICE '  - GRANT SELECT parțial pentru INSERT RETURNING';
END $$;
