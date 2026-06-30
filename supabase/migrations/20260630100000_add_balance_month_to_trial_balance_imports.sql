/**
 * Migrare: balance_month pe trial_balance_imports
 *
 * - Coloană balance_month (prima zi din luna balanței)
 * - Backfill din period_end pentru importuri existente
 * - View-uri public/internal + GRANT SELECT parțial
 * - RPC get_company_imports_with_totals + get_balances_with_accounts
 *
 * Data: 30 iunie 2026
 */

-- ============================================================================
-- STEP 1: Coloană balance_month
-- ============================================================================

ALTER TABLE public.trial_balance_imports
ADD COLUMN IF NOT EXISTS balance_month DATE;

UPDATE public.trial_balance_imports
SET balance_month = date_trunc('month', period_end)::date
WHERE balance_month IS NULL;

-- Păstrează un singur import activ per companie/lună (cel mai recent); restul → soft delete
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY company_id, balance_month
            ORDER BY created_at DESC, id DESC
        ) AS rn
    FROM public.trial_balance_imports
    WHERE deleted_at IS NULL
      AND balance_month IS NOT NULL
)
UPDATE public.trial_balance_imports t
SET deleted_at = NOW()
FROM ranked r
WHERE t.id = r.id
  AND r.rn > 1;

ALTER TABLE public.trial_balance_imports
ALTER COLUMN balance_month SET NOT NULL;

ALTER TABLE public.trial_balance_imports
DROP CONSTRAINT IF EXISTS trial_balance_imports_balance_month_first_day;

ALTER TABLE public.trial_balance_imports
ADD CONSTRAINT trial_balance_imports_balance_month_first_day
CHECK (balance_month = date_trunc('month', balance_month)::date);

CREATE INDEX IF NOT EXISTS idx_trial_balance_imports_company_balance_month
ON public.trial_balance_imports(company_id, balance_month);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trial_balance_imports_unique_company_month_active
ON public.trial_balance_imports(company_id, balance_month)
WHERE deleted_at IS NULL;

-- ============================================================================
-- STEP 2: View-uri public + internal
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
    accounts_count,
    created_at,
    updated_at,
    processed_at,
    deleted_at
FROM public.trial_balance_imports
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.trial_balance_imports_public IS
'View public pentru imports — include balance_month, fără internal_error_detail/code.';

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
'View internal pentru debugging — include balance_month și coloane de eroare interne.';

GRANT SELECT ON public.trial_balance_imports_internal TO service_role;

-- GRANT SELECT parțial pe tabel: INSERT ... RETURNING
REVOKE SELECT ON public.trial_balance_imports FROM authenticated;

GRANT SELECT (
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
    accounts_count,
    processing_started_at,
    created_at,
    updated_at,
    processed_at,
    deleted_at
) ON public.trial_balance_imports TO authenticated;

-- ============================================================================
-- STEP 3: RPC get_company_imports_with_totals
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_company_imports_with_totals(_company_id UUID)
RETURNS TABLE (
    import_id UUID,
    source_file_name VARCHAR(255),
    balance_month DATE,
    period_start DATE,
    period_end DATE,
    status public.import_status,
    error_message TEXT,
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
             tbi.status, tbi.error_message, tbi.created_at, tbi.processed_at, tbi.source_file_url
    ORDER BY tbi.created_at DESC
$$;

ALTER FUNCTION public.get_company_imports_with_totals(UUID) OWNER TO postgres;

-- ============================================================================
-- STEP 4: RPC get_balances_with_accounts — include balance_month
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
    SELECT COALESCE(jsonb_agg(balance_data ORDER BY balance_month DESC), '[]'::JSONB)
    INTO result
    FROM (
        SELECT jsonb_build_object(
            'id', tbi.id,
            'company_id', tbi.company_id,
            'balance_month', tbi.balance_month,
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
        ) AS balance_data
        FROM public.trial_balance_imports tbi
        WHERE tbi.company_id = _company_id
          AND tbi.status = 'completed'
          AND tbi.deleted_at IS NULL
        ORDER BY tbi.balance_month DESC
        LIMIT _limit
        OFFSET _offset
    ) subquery;

    RETURN result;
END;
$$;

-- ============================================================================
-- STEP 5: Recreează stale_imports_monitor (dropped cu view-urile)
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
