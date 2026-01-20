-- =============================================
-- MIGRARE: OPTIMIZĂRI PERFORMANȚĂ ȘI SCALABILITATE
-- Data: 2026-01-20
-- Rezolvă: N+1 queries, totals server-side, soft delete, paginare
-- =============================================

-- =============================================================================
-- 1. SOFT DELETE PENTRU TRIAL_BALANCE_IMPORTS
-- Rezolvă: UNIQUE constraint rigid - permite re-upload pentru aceeași perioadă
-- =============================================================================

-- Adăugăm coloana deleted_at pentru soft delete
ALTER TABLE public.trial_balance_imports 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index pentru filtrare rapidă a înregistrărilor active
CREATE INDEX IF NOT EXISTS idx_trial_balance_imports_deleted_at 
ON public.trial_balance_imports(deleted_at) 
WHERE deleted_at IS NULL;

-- Ștergem constraint-ul UNIQUE vechi și creăm unul nou care exclude înregistrările șterse
ALTER TABLE public.trial_balance_imports 
DROP CONSTRAINT IF EXISTS trial_balance_imports_company_id_period_start_period_end_key;

-- Creăm un index unic parțial care permite re-upload pentru aceeași perioadă
-- (doar înregistrările active trebuie să fie unice)
CREATE UNIQUE INDEX IF NOT EXISTS idx_trial_balance_unique_active_period 
ON public.trial_balance_imports(company_id, period_start, period_end) 
WHERE deleted_at IS NULL;

-- =============================================================================
-- 2. FUNCȚIE PENTRU CALCULAREA TOTALURILOR SERVER-SIDE
-- Rezolvă: N+1 query la încărcarea totalurilor pentru liste
-- =============================================================================

/**
 * Funcție care calculează totalurile pentru un import specific.
 * Evită necesitatea de a încărca toate conturile în client pentru calculul totalurilor.
 * 
 * @param _import_id - ID-ul importului pentru care se calculează totalurile
 * @returns Record cu totaluri și număr de conturi
 */
CREATE OR REPLACE FUNCTION public.get_import_totals(_import_id UUID)
RETURNS TABLE (
    total_opening_debit NUMERIC(15,2),
    total_opening_credit NUMERIC(15,2),
    total_debit_turnover NUMERIC(15,2),
    total_credit_turnover NUMERIC(15,2),
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
        COALESCE(SUM(opening_debit), 0)::NUMERIC(15,2) as total_opening_debit,
        COALESCE(SUM(opening_credit), 0)::NUMERIC(15,2) as total_opening_credit,
        COALESCE(SUM(debit_turnover), 0)::NUMERIC(15,2) as total_debit_turnover,
        COALESCE(SUM(credit_turnover), 0)::NUMERIC(15,2) as total_credit_turnover,
        COALESCE(SUM(closing_debit), 0)::NUMERIC(15,2) as total_closing_debit,
        COALESCE(SUM(closing_credit), 0)::NUMERIC(15,2) as total_closing_credit,
        COUNT(*)::BIGINT as accounts_count
    FROM public.trial_balance_accounts
    WHERE import_id = _import_id
$$;

ALTER FUNCTION public.get_import_totals(UUID) OWNER TO postgres;

-- =============================================================================
-- 3. FUNCȚIE BATCH PENTRU TOTALURILE MULTIPLE IMPORTURI
-- Rezolvă: N+1 query când afișăm lista de importuri cu totaluri
-- =============================================================================

/**
 * Funcție care calculează totalurile pentru multiple importuri dintr-o dată.
 * Folosită pentru afișarea listei de balanțe cu totaluri fără N+1 queries.
 * 
 * @param _company_id - ID-ul companiei
 * @returns Set de recorduri cu totaluri pentru fiecare import
 */
CREATE OR REPLACE FUNCTION public.get_company_imports_with_totals(_company_id UUID)
RETURNS TABLE (
    import_id UUID,
    source_file_name VARCHAR(255),
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
        tbi.id as import_id,
        tbi.source_file_name,
        tbi.period_start,
        tbi.period_end,
        tbi.status,
        tbi.error_message,
        tbi.created_at,
        tbi.processed_at,
        tbi.source_file_url,
        COALESCE(SUM(tba.closing_debit), 0)::NUMERIC(15,2) as total_closing_debit,
        COALESCE(SUM(tba.closing_credit), 0)::NUMERIC(15,2) as total_closing_credit,
        COUNT(tba.id)::BIGINT as accounts_count
    FROM public.trial_balance_imports tbi
    LEFT JOIN public.trial_balance_accounts tba ON tba.import_id = tbi.id
    WHERE tbi.company_id = _company_id
      AND tbi.deleted_at IS NULL
    GROUP BY tbi.id, tbi.source_file_name, tbi.period_start, tbi.period_end, 
             tbi.status, tbi.error_message, tbi.created_at, tbi.processed_at, tbi.source_file_url
    ORDER BY tbi.created_at DESC
$$;

ALTER FUNCTION public.get_company_imports_with_totals(UUID) OWNER TO postgres;

-- =============================================================================
-- 4. FUNCȚIE PENTRU OBȚINEREA BALANȚELOR CU CONTURI (BATCH)
-- Rezolvă: N+1 query în getAllBalancesWithAccounts din useBalante.tsx
-- =============================================================================

/**
 * Funcție care returnează toate balanțele completate cu conturile lor.
 * Un singur query în loc de N+1 queries.
 * 
 * @param _company_id - ID-ul companiei
 * @param _limit - Numărul maxim de balanțe de returnat (pentru paginare)
 * @param _offset - Offset pentru paginare
 * @returns JSON array cu balanțele și conturile lor
 */
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

ALTER FUNCTION public.get_balances_with_accounts(UUID, INT, INT) OWNER TO postgres;

-- =============================================================================
-- 5. FUNCȚIE PENTRU CONTURI CU PAGINARE
-- Rezolvă: Lipsa paginării la afișarea conturilor
-- =============================================================================

/**
 * Funcție care returnează conturile unui import cu paginare.
 * 
 * @param _import_id - ID-ul importului
 * @param _limit - Numărul de conturi per pagină
 * @param _offset - Offset pentru paginare
 * @returns Table cu conturi și total_count pentru paginare
 */
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
        tba.closing_debit,
        tba.closing_credit,
        (SELECT COUNT(*) FROM public.trial_balance_accounts WHERE import_id = _import_id)::BIGINT as total_count
    FROM public.trial_balance_accounts tba
    WHERE tba.import_id = _import_id
    ORDER BY tba.account_code
    LIMIT _limit
    OFFSET _offset
$$;

ALTER FUNCTION public.get_accounts_paginated(UUID, INT, INT) OWNER TO postgres;

-- =============================================================================
-- 6. ACTUALIZARE RLS PENTRU NOILE FUNCȚII
-- =============================================================================

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION public.get_import_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_imports_with_totals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_balances_with_accounts(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accounts_paginated(UUID, INT, INT) TO authenticated;

-- =============================================================================
-- 7. ACTUALIZARE POLITICI RLS PENTRU SOFT DELETE
-- =============================================================================

-- Actualizăm politica de SELECT pentru a exclude înregistrările șterse
DROP POLICY IF EXISTS "Company members can view imports" ON public.trial_balance_imports;

CREATE POLICY "Company members can view imports"
    ON public.trial_balance_imports FOR SELECT
    TO authenticated
    USING (
        public.is_company_member(public.get_user_id_from_auth(), company_id)
        AND deleted_at IS NULL
    );

-- Politică pentru soft delete în loc de hard delete
DROP POLICY IF EXISTS "Uploader or admin can delete imports" ON public.trial_balance_imports;

CREATE POLICY "Uploader or admin can soft delete imports"
    ON public.trial_balance_imports FOR UPDATE
    TO authenticated
    USING (
        (uploaded_by = public.get_user_id_from_auth()
        OR public.has_role(public.get_user_id_from_auth(), 'admin'))
        AND deleted_at IS NULL
    )
    WITH CHECK (
        (uploaded_by = public.get_user_id_from_auth()
        OR public.has_role(public.get_user_id_from_auth(), 'admin'))
    );

-- =============================================================================
-- 8. INDEX PENTRU PERFORMANȚĂ
-- =============================================================================

-- Index compus pentru query-urile frecvente
CREATE INDEX IF NOT EXISTS idx_trial_balance_imports_company_status_active 
ON public.trial_balance_imports(company_id, status, period_end DESC) 
WHERE deleted_at IS NULL;

-- Index pentru accounts cu import_id și account_code
CREATE INDEX IF NOT EXISTS idx_trial_balance_accounts_import_code 
ON public.trial_balance_accounts(import_id, account_code);

-- =============================================================================
-- 9. FUNCȚIE HELPER PENTRU SOFT DELETE
-- =============================================================================

/**
 * Funcție pentru ștergerea soft a unui import și a fișierului asociat.
 * Marchează importul ca șters fără a elimina datele.
 * 
 * @param _import_id - ID-ul importului de șters
 * @returns Boolean - succes sau eșec
 */
CREATE OR REPLACE FUNCTION public.soft_delete_import(_import_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
    _can_delete BOOLEAN;
BEGIN
    -- Get current user
    _user_id := public.get_user_id_from_auth();
    
    -- Check if user can delete
    SELECT EXISTS (
        SELECT 1 FROM public.trial_balance_imports
        WHERE id = _import_id
        AND (uploaded_by = _user_id OR public.has_role(_user_id, 'admin'))
        AND deleted_at IS NULL
    ) INTO _can_delete;
    
    IF NOT _can_delete THEN
        RETURN FALSE;
    END IF;
    
    -- Perform soft delete
    UPDATE public.trial_balance_imports
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = _import_id
    AND deleted_at IS NULL;
    
    RETURN FOUND;
END;
$$;

ALTER FUNCTION public.soft_delete_import(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.soft_delete_import(UUID) TO authenticated;

-- =============================================================================
-- 10. VIEW PENTRU IMPORTURI ACTIVE (OPTIMIZARE)
-- =============================================================================

CREATE OR REPLACE VIEW public.active_trial_balance_imports AS
SELECT 
    tbi.*,
    (SELECT COUNT(*) FROM public.trial_balance_accounts WHERE import_id = tbi.id) as accounts_count
FROM public.trial_balance_imports tbi
WHERE tbi.deleted_at IS NULL;

-- Grant access to view
GRANT SELECT ON public.active_trial_balance_imports TO authenticated;
