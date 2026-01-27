-- ============================================================================
-- MIGRARE COMPLETA (Plan Final v3.3)
-- Data: 2026-01-27
-- ============================================================================
-- Include:
-- - EXTENSION btree_gist (pentru EXCLUDE pe UUID + daterange)
-- - chart_of_accounts
-- - account_mappings (history + split + EXCLUDE non-overlap)
-- - triggers: validate_mapping_allocation (gard prezent), validate_mapping_continuity (warning), block generation on insert FS
-- - assert_mappings_complete_for_import (v3.3: access hardening + filtre conturi relevante)
-- - financial_statements (versionare + is_current)
-- - lines: balance_sheet_lines, income_statement_lines, cash_flow_lines
-- - kpi_definitions, kpi_values
-- - reports, report_statements + trigger cross-tenant
-- - RLS policies pentru toate
--
-- PRESUPUNE că există deja:
-- - public.update_updated_at_column()
-- - public.get_user_id_from_auth()
-- - public.is_company_member(uuid, uuid)
-- - public.has_role(uuid, app_role)
-- - tabelele: companies, users, trial_balance_imports, trial_balance_accounts

-- ============================================================================
-- 0) EXTENSII
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- 1) HELPER: acces la trial_balance_account (pentru RLS account_mappings)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_access_trial_balance_account(_user_id UUID, _tb_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.trial_balance_accounts tba
        JOIN public.trial_balance_imports tbi ON tbi.id = tba.import_id
        WHERE tba.id = _tb_account_id
          AND public.is_company_member(_user_id, tbi.company_id)
    )
$$;

ALTER FUNCTION public.can_access_trial_balance_account(UUID, UUID) OWNER TO postgres;

-- ============================================================================
-- 2) CHART_OF_ACCOUNTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES public.companies(id) ON DELETE CASCADE,

    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,

    account_type VARCHAR(50) NOT NULL
        CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),

    parent_id UUID
        REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,

    is_postable BOOLEAN NOT NULL DEFAULT TRUE,
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (company_id, account_code)
);

CREATE INDEX IF NOT EXISTS idx_coa_company_code
    ON public.chart_of_accounts(company_id, account_code);

CREATE INDEX IF NOT EXISTS idx_coa_parent_id
    ON public.chart_of_accounts(parent_id);

CREATE INDEX IF NOT EXISTS idx_coa_type
    ON public.chart_of_accounts(account_type);

DROP TRIGGER IF EXISTS update_chart_of_accounts_updated_at ON public.chart_of_accounts;

CREATE TRIGGER update_chart_of_accounts_updated_at
BEFORE UPDATE ON public.chart_of_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coa_select ON public.chart_of_accounts;
DROP POLICY IF EXISTS coa_insert ON public.chart_of_accounts;
DROP POLICY IF EXISTS coa_update ON public.chart_of_accounts;
DROP POLICY IF EXISTS coa_delete ON public.chart_of_accounts;

CREATE POLICY coa_select
ON public.chart_of_accounts
FOR SELECT
TO authenticated
USING (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

CREATE POLICY coa_insert
ON public.chart_of_accounts
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
);

CREATE POLICY coa_update
ON public.chart_of_accounts
FOR UPDATE
TO authenticated
USING (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
)
WITH CHECK (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
);

CREATE POLICY coa_delete
ON public.chart_of_accounts
FOR DELETE
TO authenticated
USING (
    public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

-- ============================================================================
-- 3) ACCOUNT_MAPPINGS (history + split + non-overlap)
--    - Mapari curente: valid_to IS NULL (editabile)
--    - Mapari active la ref_date: valid_from <= ref_date AND (valid_to IS NULL OR valid_to >= ref_date)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.account_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    trial_balance_account_id UUID NOT NULL
        REFERENCES public.trial_balance_accounts(id) ON DELETE CASCADE,

    chart_account_id UUID NOT NULL
        REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,

    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to   DATE,

    allocation_pct NUMERIC(9,6) NOT NULL DEFAULT 1.0
        CHECK (allocation_pct > 0 AND allocation_pct <= 1),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (valid_to IS NULL OR valid_to >= valid_from),

    -- Non-overlap pe aceeasi pereche (tb_account_id, chart_account_id)
    EXCLUDE USING gist (
        trial_balance_account_id WITH =,
        chart_account_id WITH =,
        daterange(valid_from, COALESCE(valid_to, 'infinity'::date), '[]') WITH &&
    )
);

-- Unicitate pereche + valid_from (utila pentru idempotenta / importuri)
CREATE UNIQUE INDEX IF NOT EXISTS ux_map_pair_validity
ON public.account_mappings(trial_balance_account_id, chart_account_id, valid_from);

CREATE INDEX IF NOT EXISTS idx_account_mappings_tb
    ON public.account_mappings(trial_balance_account_id);

CREATE INDEX IF NOT EXISTS idx_account_mappings_chart
    ON public.account_mappings(chart_account_id);

CREATE INDEX IF NOT EXISTS idx_account_mappings_validity
    ON public.account_mappings(valid_from, valid_to);

-- ============================================================================
-- 3a) TRIGGER "GARD" (prezent): validate_mapping_allocation pe mapari curente
--     - controleaza DOAR valid_to IS NULL
--     - blocheaza doar depasirea 100% (nu impune 100% la scriere)
--     - lock pe trial_balance_accounts pentru concurenta
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_mapping_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_allocation NUMERIC(9,6);
BEGIN
    -- Lock explicit pentru concurenta (serialization pe cont)
    PERFORM 1
    FROM public.trial_balance_accounts
    WHERE id = NEW.trial_balance_account_id
    FOR UPDATE;

    -- Suma maparilor CURENTE (valid_to IS NULL), excluzand randul curent la UPDATE
    SELECT COALESCE(SUM(allocation_pct), 0)
      INTO total_allocation
    FROM public.account_mappings
    WHERE trial_balance_account_id = NEW.trial_balance_account_id
      AND valid_to IS NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

    total_allocation := total_allocation + NEW.allocation_pct;

    IF total_allocation > 1.000001 THEN
        RAISE EXCEPTION
            'Suma alocarilor curente pentru contul % depaseste 100%% (actual: %.4f%%)',
            NEW.trial_balance_account_id, (total_allocation * 100);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_mapping_allocation ON public.account_mappings;

CREATE TRIGGER trg_validate_mapping_allocation
BEFORE INSERT OR UPDATE ON public.account_mappings
FOR EACH ROW
WHEN (NEW.valid_to IS NULL)
EXECUTE FUNCTION public.validate_mapping_allocation();

-- ============================================================================
-- 3b) WARNING optional: validate_mapping_continuity (valid_to + 1 day)
--     - NU blocheaza; doar semnalizeaza
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_mapping_continuity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    has_coverage_next_day BOOLEAN;
    check_date DATE;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.valid_to IS NULL AND NEW.valid_to IS NOT NULL THEN
        check_date := (NEW.valid_to + 1);

        SELECT EXISTS (
            SELECT 1
            FROM public.account_mappings am
            WHERE am.trial_balance_account_id = NEW.trial_balance_account_id
              AND am.id != NEW.id
              AND am.valid_from <= check_date
              AND (am.valid_to IS NULL OR am.valid_to >= check_date)
        ) INTO has_coverage_next_day;

        IF NOT has_coverage_next_day THEN
            RAISE WARNING
                '[DETECTARE GAP] Contul %: maparea se inchide la %, dar nu exista acoperire pentru ziua urmatoare (%). Generarea va fi blocata daca ref_date cade in acel gap.',
                NEW.trial_balance_account_id, NEW.valid_to, check_date;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_mapping_continuity ON public.account_mappings;

CREATE TRIGGER trg_validate_mapping_continuity
BEFORE UPDATE ON public.account_mappings
FOR EACH ROW
EXECUTE FUNCTION public.validate_mapping_continuity();

-- ============================================================================
-- 3c) RLS: ACCOUNT_MAPPINGS
-- ============================================================================
ALTER TABLE public.account_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_mappings_select ON public.account_mappings;
DROP POLICY IF EXISTS account_mappings_insert ON public.account_mappings;
DROP POLICY IF EXISTS account_mappings_update ON public.account_mappings;
DROP POLICY IF EXISTS account_mappings_delete ON public.account_mappings;

CREATE POLICY account_mappings_select
ON public.account_mappings
FOR SELECT
TO authenticated
USING (
    public.can_access_trial_balance_account(public.get_user_id_from_auth(), trial_balance_account_id)
);

CREATE POLICY account_mappings_insert
ON public.account_mappings
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_trial_balance_account(public.get_user_id_from_auth(), trial_balance_account_id)
);

CREATE POLICY account_mappings_update
ON public.account_mappings
FOR UPDATE
TO authenticated
USING (
    public.can_access_trial_balance_account(public.get_user_id_from_auth(), trial_balance_account_id)
)
WITH CHECK (
    public.can_access_trial_balance_account(public.get_user_id_from_auth(), trial_balance_account_id)
);

CREATE POLICY account_mappings_delete
ON public.account_mappings
FOR DELETE
TO authenticated
USING (
    public.can_access_trial_balance_account(public.get_user_id_from_auth(), trial_balance_account_id)
);

-- ============================================================================
-- 4) assert_mappings_complete_for_import (v3.3)
--    - HARDENING: verifica acces la compania importului
--    - Verifica doar conturi RELEVANTE (sold/rulaj nenul)
--    - Valideaza suma alocarilor ACTIVE la ref_date = trial_balance_imports.period_end
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assert_mappings_complete_for_import(_import_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ref_date DATE;
    _company_id UUID;
    _user_id UUID;
    incomplete_accounts TEXT;
    incomplete_count INT;
BEGIN
    _user_id := public.get_user_id_from_auth();

    SELECT tbi.company_id, tbi.period_end
      INTO _company_id, ref_date
    FROM public.trial_balance_imports tbi
    WHERE tbi.id = _import_id;

    IF ref_date IS NULL OR _company_id IS NULL THEN
        RAISE EXCEPTION 'Import invalid sau lipsa period_end/company_id (import_id=%)', _import_id;
    END IF;

    IF NOT public.is_company_member(_user_id, _company_id)
       AND NOT public.has_role(_user_id, 'admin')
       AND NOT public.has_role(_user_id, 'super_admin') THEN
        RAISE EXCEPTION 'Acces interzis la import (import_id=%)', _import_id;
    END IF;

    WITH account_allocations AS (
        SELECT
            tba.id AS tb_account_id,
            tba.account_code,
            tba.account_name,
            COALESCE(SUM(am.allocation_pct), 0) AS total_allocation
        FROM public.trial_balance_accounts tba
        LEFT JOIN public.account_mappings am
          ON am.trial_balance_account_id = tba.id
         AND am.valid_from <= ref_date
         AND (am.valid_to IS NULL OR am.valid_to >= ref_date)
        WHERE tba.import_id = _import_id
          AND (
            COALESCE(tba.closing_debit, 0) <> 0
            OR COALESCE(tba.closing_credit, 0) <> 0
            OR COALESCE(tba.debit_turnover, 0) <> 0
            OR COALESCE(tba.credit_turnover, 0) <> 0
          )
        GROUP BY tba.id, tba.account_code, tba.account_name
    )
    SELECT
        COUNT(*),
        STRING_AGG(
            FORMAT('%s (%s): %.2f%%', account_code, account_name, total_allocation * 100),
            ', '
            ORDER BY account_code
        )
    INTO incomplete_count, incomplete_accounts
    FROM account_allocations
    WHERE total_allocation < 0.999999 OR total_allocation > 1.000001;

    IF incomplete_count > 0 THEN
        RAISE EXCEPTION
            'Mapare incompleta pentru % conturi relevante din importul % (ref_date: %). Conturi: %',
            incomplete_count, _import_id, ref_date, LEFT(incomplete_accounts, 500);
    END IF;

    RETURN TRUE;
END;
$$;

ALTER FUNCTION public.assert_mappings_complete_for_import(UUID) OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.assert_mappings_complete_for_import(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.assert_mappings_complete_for_import(UUID) TO authenticated;

-- ============================================================================
-- 5) FINANCIAL_STATEMENTS (complet)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.financial_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES public.companies(id) ON DELETE CASCADE,

    period_start DATE NOT NULL,
    period_end   DATE NOT NULL,

    source_import_id UUID NOT NULL
        REFERENCES public.trial_balance_imports(id) ON DELETE CASCADE,

    statement_type VARCHAR(50) NOT NULL
        CHECK (statement_type IN ('balance_sheet', 'income_statement', 'cash_flow')),

    version INT NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,

    currency_code CHAR(3) NOT NULL,

    sign_convention VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (sign_convention IN ('normal', 'inverted')),

    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by UUID REFERENCES public.users(id),

    CONSTRAINT valid_fs_period CHECK (period_start <= period_end)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_fs_period_type_version
ON public.financial_statements(company_id, period_start, period_end, statement_type, version);

CREATE UNIQUE INDEX IF NOT EXISTS ux_fs_one_current
ON public.financial_statements(company_id, period_start, period_end, statement_type)
WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_fs_company_period_type
ON public.financial_statements(company_id, period_start, period_end, statement_type);

CREATE INDEX IF NOT EXISTS idx_fs_source_import
ON public.financial_statements(source_import_id);

-- ============================================================================
-- 5a) Trigger: inchidere automata versiune "current" anterioara
-- ============================================================================
CREATE OR REPLACE FUNCTION public.close_previous_current_statement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.is_current = TRUE THEN
        UPDATE public.financial_statements
           SET is_current = FALSE
         WHERE company_id = NEW.company_id
           AND period_start = NEW.period_start
           AND period_end = NEW.period_end
           AND statement_type = NEW.statement_type
           AND is_current = TRUE
           AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_previous_current_statement ON public.financial_statements;

CREATE TRIGGER trg_close_previous_current_statement
BEFORE INSERT OR UPDATE ON public.financial_statements
FOR EACH ROW
WHEN (NEW.is_current = TRUE)
EXECUTE FUNCTION public.close_previous_current_statement();

-- ============================================================================
-- 5b) Trigger OBLIGATORIU: blocare generare fara mapare 100% (la ref_date)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.block_incomplete_mapping_generation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.assert_mappings_complete_for_import(NEW.source_import_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_incomplete_mapping_generation ON public.financial_statements;

CREATE TRIGGER trg_block_incomplete_mapping_generation
BEFORE INSERT ON public.financial_statements
FOR EACH ROW
EXECUTE FUNCTION public.block_incomplete_mapping_generation();

-- ============================================================================
-- 5c) Trigger UPDATE (FALLBACK) - activeaza doar daca permiti UPDATE pe campurile "imutabile"
--     Recomandare: NU permite UPDATE pe company_id/period_*/statement_type/source_import_id.
-- ============================================================================
/*
CREATE OR REPLACE FUNCTION public.block_incomplete_mapping_generation_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (NEW.source_import_id IS DISTINCT FROM OLD.source_import_id)
       OR (NEW.period_start IS DISTINCT FROM OLD.period_start)
       OR (NEW.period_end IS DISTINCT FROM OLD.period_end)
       OR (NEW.statement_type IS DISTINCT FROM OLD.statement_type)
       OR (NEW.company_id IS DISTINCT FROM OLD.company_id) THEN

        PERFORM public.assert_mappings_complete_for_import(NEW.source_import_id);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_incomplete_mapping_generation_on_update
ON public.financial_statements;

CREATE TRIGGER trg_block_incomplete_mapping_generation_on_update
BEFORE UPDATE ON public.financial_statements
FOR EACH ROW
EXECUTE FUNCTION public.block_incomplete_mapping_generation_on_update();
*/

-- ============================================================================
-- 6) HELPER: acces la financial_statement (pentru RLS lines)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_access_financial_statement(_user_id UUID, _statement_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.financial_statements fs
        WHERE fs.id = _statement_id
          AND public.is_company_member(_user_id, fs.company_id)
    )
$$;

ALTER FUNCTION public.can_access_financial_statement(UUID, UUID) OWNER TO postgres;

-- ============================================================================
-- 7) RLS: FINANCIAL_STATEMENTS
-- ============================================================================
ALTER TABLE public.financial_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fs_select ON public.financial_statements;
DROP POLICY IF EXISTS fs_insert ON public.financial_statements;
DROP POLICY IF EXISTS fs_update ON public.financial_statements;
DROP POLICY IF EXISTS fs_delete ON public.financial_statements;

CREATE POLICY fs_select
ON public.financial_statements
FOR SELECT
TO authenticated
USING (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

CREATE POLICY fs_insert
ON public.financial_statements
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
);

CREATE POLICY fs_update
ON public.financial_statements
FOR UPDATE
TO authenticated
USING (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
)
WITH CHECK (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
);

CREATE POLICY fs_delete
ON public.financial_statements
FOR DELETE
TO authenticated
USING (
    public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

-- ============================================================================
-- 8) LINES: BALANCE_SHEET_LINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.balance_sheet_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    statement_id UUID NOT NULL
        REFERENCES public.financial_statements(id) ON DELETE CASCADE,

    line_key VARCHAR(100) NOT NULL,

    category    VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),

    chart_account_id UUID
        REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,

    trial_balance_account_id UUID
        REFERENCES public.trial_balance_accounts(id) ON DELETE SET NULL,

    account_code VARCHAR(20),
    description  VARCHAR(255),

    amount NUMERIC(15,2) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (statement_id, line_key)
);

CREATE INDEX IF NOT EXISTS idx_bs_lines_statement_order
    ON public.balance_sheet_lines(statement_id, display_order);

CREATE INDEX IF NOT EXISTS idx_bs_lines_chart_account
    ON public.balance_sheet_lines(chart_account_id);

CREATE INDEX IF NOT EXISTS idx_bs_lines_tb_account
    ON public.balance_sheet_lines(trial_balance_account_id);

ALTER TABLE public.balance_sheet_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bs_lines_select ON public.balance_sheet_lines;
DROP POLICY IF EXISTS bs_lines_insert ON public.balance_sheet_lines;
DROP POLICY IF EXISTS bs_lines_update ON public.balance_sheet_lines;
DROP POLICY IF EXISTS bs_lines_delete ON public.balance_sheet_lines;

CREATE POLICY bs_lines_select
ON public.balance_sheet_lines
FOR SELECT
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY bs_lines_insert
ON public.balance_sheet_lines
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY bs_lines_update
ON public.balance_sheet_lines
FOR UPDATE
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
)
WITH CHECK (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY bs_lines_delete
ON public.balance_sheet_lines
FOR DELETE
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

-- ============================================================================
-- 9) LINES: INCOME_STATEMENT_LINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.income_statement_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    statement_id UUID NOT NULL
        REFERENCES public.financial_statements(id) ON DELETE CASCADE,

    line_key VARCHAR(100) NOT NULL,

    category VARCHAR(100) NOT NULL
        CHECK (category IN ('venituri', 'cheltuieli')),

    subcategory VARCHAR(100),

    chart_account_id UUID
        REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,

    trial_balance_account_id UUID
        REFERENCES public.trial_balance_accounts(id) ON DELETE SET NULL,

    account_code VARCHAR(20),
    description  VARCHAR(255),

    amount NUMERIC(15,2) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (statement_id, line_key)
);

CREATE INDEX IF NOT EXISTS idx_is_lines_statement_order
    ON public.income_statement_lines(statement_id, display_order);

CREATE INDEX IF NOT EXISTS idx_is_lines_chart_account
    ON public.income_statement_lines(chart_account_id);

CREATE INDEX IF NOT EXISTS idx_is_lines_tb_account
    ON public.income_statement_lines(trial_balance_account_id);

ALTER TABLE public.income_statement_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS is_lines_select ON public.income_statement_lines;
DROP POLICY IF EXISTS is_lines_insert ON public.income_statement_lines;
DROP POLICY IF EXISTS is_lines_update ON public.income_statement_lines;
DROP POLICY IF EXISTS is_lines_delete ON public.income_statement_lines;

CREATE POLICY is_lines_select
ON public.income_statement_lines
FOR SELECT
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY is_lines_insert
ON public.income_statement_lines
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY is_lines_update
ON public.income_statement_lines
FOR UPDATE
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
)
WITH CHECK (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY is_lines_delete
ON public.income_statement_lines
FOR DELETE
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

-- ============================================================================
-- 10) LINES: CASH_FLOW_LINES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cash_flow_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    statement_id UUID NOT NULL
        REFERENCES public.financial_statements(id) ON DELETE CASCADE,

    line_key VARCHAR(100) NOT NULL,

    section VARCHAR(50) NOT NULL
        CHECK (section IN ('operating', 'investing', 'financing')),

    description VARCHAR(255) NOT NULL,

    amount NUMERIC(15,2) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (statement_id, line_key)
);

CREATE INDEX IF NOT EXISTS idx_cf_lines_statement_order
    ON public.cash_flow_lines(statement_id, display_order);

CREATE INDEX IF NOT EXISTS idx_cf_lines_section
    ON public.cash_flow_lines(section);

ALTER TABLE public.cash_flow_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cf_lines_select ON public.cash_flow_lines;
DROP POLICY IF EXISTS cf_lines_insert ON public.cash_flow_lines;
DROP POLICY IF EXISTS cf_lines_update ON public.cash_flow_lines;
DROP POLICY IF EXISTS cf_lines_delete ON public.cash_flow_lines;

CREATE POLICY cf_lines_select
ON public.cash_flow_lines
FOR SELECT
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY cf_lines_insert
ON public.cash_flow_lines
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY cf_lines_update
ON public.cash_flow_lines
FOR UPDATE
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
)
WITH CHECK (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

CREATE POLICY cf_lines_delete
ON public.cash_flow_lines
FOR DELETE
TO authenticated
USING (
    public.can_access_financial_statement(public.get_user_id_from_auth(), statement_id)
);

-- ============================================================================
-- 11) KPI_DEFINITIONS (global + custom), indexuri partiale
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.kpi_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- NULL = KPI global
    company_id UUID
        REFERENCES public.companies(id) ON DELETE CASCADE,

    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,

    category VARCHAR(100)
        CHECK (category IN ('liquidity', 'profitability', 'leverage', 'efficiency', 'other')),

    formula JSONB NOT NULL,

    unit VARCHAR(50) NOT NULL DEFAULT 'ratio'
        CHECK (unit IN ('ratio', 'percentage', 'days', 'times', 'currency')),

    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_kpi_defs_global_code
ON public.kpi_definitions(code)
WHERE company_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_kpi_defs_company_code
ON public.kpi_definitions(company_id, code)
WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_defs_category
    ON public.kpi_definitions(category);

CREATE INDEX IF NOT EXISTS idx_kpi_defs_active
    ON public.kpi_definitions(is_active);

DROP TRIGGER IF EXISTS update_kpi_definitions_updated_at ON public.kpi_definitions;

CREATE TRIGGER update_kpi_definitions_updated_at
BEFORE UPDATE ON public.kpi_definitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kpi_defs_select ON public.kpi_definitions;
DROP POLICY IF EXISTS kpi_defs_insert ON public.kpi_definitions;
DROP POLICY IF EXISTS kpi_defs_update ON public.kpi_definitions;
DROP POLICY IF EXISTS kpi_defs_delete ON public.kpi_definitions;

CREATE POLICY kpi_defs_select
ON public.kpi_definitions
FOR SELECT
TO authenticated
USING (
    company_id IS NULL
    OR public.is_company_member(public.get_user_id_from_auth(), company_id)
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

CREATE POLICY kpi_defs_insert
ON public.kpi_definitions
FOR INSERT
TO authenticated
WITH CHECK (
    (company_id IS NULL AND public.has_role(public.get_user_id_from_auth(), 'admin'))
    OR (company_id IS NOT NULL AND public.is_company_member(public.get_user_id_from_auth(), company_id))
);

CREATE POLICY kpi_defs_update
ON public.kpi_definitions
FOR UPDATE
TO authenticated
USING (
    (company_id IS NULL AND public.has_role(public.get_user_id_from_auth(), 'admin'))
    OR (company_id IS NOT NULL AND public.is_company_member(public.get_user_id_from_auth(), company_id))
)
WITH CHECK (
    (company_id IS NULL AND public.has_role(public.get_user_id_from_auth(), 'admin'))
    OR (company_id IS NOT NULL AND public.is_company_member(public.get_user_id_from_auth(), company_id))
);

CREATE POLICY kpi_defs_delete
ON public.kpi_definitions
FOR DELETE
TO authenticated
USING (
    (company_id IS NULL AND public.has_role(public.get_user_id_from_auth(), 'super_admin'))
    OR (company_id IS NOT NULL AND public.is_company_member(public.get_user_id_from_auth(), company_id))
);

-- ============================================================================
-- 12) KPI_VALUES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.kpi_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    kpi_definition_id UUID NOT NULL
        REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,

    company_id UUID NOT NULL
        REFERENCES public.companies(id) ON DELETE CASCADE,

    period_start DATE NOT NULL,
    period_end   DATE NOT NULL,

    value NUMERIC(15,4),

    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    trial_balance_import_id UUID NOT NULL
        REFERENCES public.trial_balance_imports(id) ON DELETE CASCADE,

    metadata JSONB,

    CONSTRAINT valid_kpi_period CHECK (period_start <= period_end),

    UNIQUE (kpi_definition_id, company_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_kpi_values_company_period
    ON public.kpi_values(company_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_kpi_values_kpi
    ON public.kpi_values(kpi_definition_id);

CREATE INDEX IF NOT EXISTS idx_kpi_values_import
    ON public.kpi_values(trial_balance_import_id);

ALTER TABLE public.kpi_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kpi_values_select ON public.kpi_values;
DROP POLICY IF EXISTS kpi_values_insert ON public.kpi_values;
DROP POLICY IF EXISTS kpi_values_update ON public.kpi_values;
DROP POLICY IF EXISTS kpi_values_delete ON public.kpi_values;

CREATE POLICY kpi_values_select
ON public.kpi_values
FOR SELECT
TO authenticated
USING (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

CREATE POLICY kpi_values_insert
ON public.kpi_values
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
);

CREATE POLICY kpi_values_update
ON public.kpi_values
FOR UPDATE
TO authenticated
USING (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
)
WITH CHECK (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
);

CREATE POLICY kpi_values_delete
ON public.kpi_values
FOR DELETE
TO authenticated
USING (
    public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

-- ============================================================================
-- 13) REPORTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID NOT NULL
        REFERENCES public.companies(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,

    report_type VARCHAR(50)
        CHECK (report_type IN ('comprehensive', 'kpi_dashboard', 'comparative', 'custom')),

    period_start DATE NOT NULL,
    period_end   DATE NOT NULL,

    generated_by UUID NOT NULL
        REFERENCES public.users(id),

    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    file_url TEXT,

    file_format VARCHAR(10)
        CHECK (file_format IN ('pdf', 'excel', 'json')),

    status VARCHAR(50) NOT NULL DEFAULT 'generating'
        CHECK (status IN ('generating', 'completed', 'error')),

    metadata JSONB,

    CONSTRAINT valid_report_period CHECK (period_start <= period_end)
);

CREATE INDEX IF NOT EXISTS idx_reports_company_period
    ON public.reports(company_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_reports_type
    ON public.reports(report_type);

CREATE INDEX IF NOT EXISTS idx_reports_status
    ON public.reports(status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_select ON public.reports;
DROP POLICY IF EXISTS reports_insert ON public.reports;
DROP POLICY IF EXISTS reports_update ON public.reports;
DROP POLICY IF EXISTS reports_delete ON public.reports;

CREATE POLICY reports_select
ON public.reports
FOR SELECT
TO authenticated
USING (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

CREATE POLICY reports_insert
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_company_member(public.get_user_id_from_auth(), company_id)
    AND generated_by = public.get_user_id_from_auth()
);

CREATE POLICY reports_update
ON public.reports
FOR UPDATE
TO authenticated
USING (
    generated_by = public.get_user_id_from_auth()
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
)
WITH CHECK (
    generated_by = public.get_user_id_from_auth()
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

CREATE POLICY reports_delete
ON public.reports
FOR DELETE
TO authenticated
USING (
    public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

-- ============================================================================
-- 14) HELPER: acces la report (pentru RLS report_statements)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_access_report(_user_id UUID, _report_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.reports r
        WHERE r.id = _report_id
          AND public.is_company_member(_user_id, r.company_id)
    )
$$;

ALTER FUNCTION public.can_access_report(UUID, UUID) OWNER TO postgres;

-- ============================================================================
-- 15) REPORT_STATEMENTS (junction) + RLS + trigger cross-tenant
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.report_statements (
    report_id UUID NOT NULL
        REFERENCES public.reports(id) ON DELETE CASCADE,

    statement_id UUID NOT NULL
        REFERENCES public.financial_statements(id) ON DELETE CASCADE,

    PRIMARY KEY (report_id, statement_id)
);

CREATE INDEX IF NOT EXISTS idx_report_statements_statement
    ON public.report_statements(statement_id);

-- Trigger cross-tenant (recomandat)
CREATE OR REPLACE FUNCTION public.validate_report_statement_same_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    report_company_id UUID;
    statement_company_id UUID;
BEGIN
    SELECT company_id INTO report_company_id
    FROM public.reports
    WHERE id = NEW.report_id;

    SELECT company_id INTO statement_company_id
    FROM public.financial_statements
    WHERE id = NEW.statement_id;

    IF report_company_id IS NULL OR statement_company_id IS NULL OR report_company_id != statement_company_id THEN
        RAISE EXCEPTION 'Report si Statement trebuie sa apartina aceleiasi companii';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_report_statement_same_company ON public.report_statements;

CREATE TRIGGER trg_validate_report_statement_same_company
BEFORE INSERT ON public.report_statements
FOR EACH ROW
EXECUTE FUNCTION public.validate_report_statement_same_company();

ALTER TABLE public.report_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_statements_select ON public.report_statements;
DROP POLICY IF EXISTS report_statements_insert ON public.report_statements;
DROP POLICY IF EXISTS report_statements_delete ON public.report_statements;

CREATE POLICY report_statements_select
ON public.report_statements
FOR SELECT
TO authenticated
USING (
    public.can_access_report(public.get_user_id_from_auth(), report_id)
);

CREATE POLICY report_statements_insert
ON public.report_statements
FOR INSERT
TO authenticated
WITH CHECK (
    public.can_access_report(public.get_user_id_from_auth(), report_id)
);

CREATE POLICY report_statements_delete
ON public.report_statements
FOR DELETE
TO authenticated
USING (
    public.can_access_report(public.get_user_id_from_auth(), report_id)
);

-- ============================================================================
-- FIN MIGRARE v3.3
-- ============================================================================
