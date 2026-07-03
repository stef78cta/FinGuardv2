-- ============================================================================
-- MIGRARE: statement_line_definitions (scheletul de raportare)
-- Data: 2026-07-03
-- ============================================================================
-- Scop:
--   Stocheaza structura completa de raportare importata din template-ul Excel
--   "Chart of Accounts Mapping" (Bilant, P&L, Cash Flow), inclusiv randurile
--   care NU sunt conturi contabile (REPORT_GROUP, CALCULATED) si care nu au ce
--   cauta in chart_of_accounts.
--
-- Corectii integrate fata de propunerea initiala:
--   E3: row_type include INTERNAL_GROUP (ex: 765movcredit, 665movdebit)
--   E4: report_sign include '+/-' (conturi mixt: 442, 4428, 121, 117)
--   E5: normal_balance VARCHAR(40) (ex: 'Credit/contra-cheltuiala')
--
-- company_id NULL = definitie GLOBALA (template standard Finguard)
-- company_id NOT NULL = definitie personalizata per companie
--
-- PRESUPUNE: update_updated_at_column(), get_user_id_from_auth(),
--            is_company_member(uuid,uuid), has_role(uuid,app_role),
--            chart_of_accounts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.statement_line_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- NULL = template global; altfel = definitie a companiei
    company_id UUID
        REFERENCES public.companies(id) ON DELETE CASCADE,

    statement_type VARCHAR(50) NOT NULL
        CHECK (statement_type IN ('balance_sheet', 'income_statement', 'cash_flow')),

    -- cheie stabila generata din sort_order (ex: bs_10, pl_1835, cf_3000)
    line_key        VARCHAR(150) NOT NULL,
    parent_line_key VARCHAR(150),

    sort_order   INT NOT NULL DEFAULT 0,
    display_order INT NOT NULL DEFAULT 0,

    display_name VARCHAR(255) NOT NULL,
    report_area  VARCHAR(100),

    section_l1 VARCHAR(255),
    section_l2 VARCHAR(255),
    section_l3 VARCHAR(255),
    section_l4 VARCHAR(255),

    account_code     VARCHAR(20),
    chart_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,

    -- E3: include INTERNAL_GROUP
    row_type VARCHAR(50) NOT NULL
        CHECK (row_type IN (
            'REPORT_GROUP', 'ACCOUNT_GROUP', 'ACCOUNT_LEAF',
            'CALCULATED', 'INTERNAL_ANALYTIC', 'INTERNAL_GROUP'
        )),

    -- categorie de nivel inalt pentru rendering
    line_type VARCHAR(50)
        CHECK (line_type IN ('account', 'group', 'report', 'calculated', 'kpi')),

    -- E5: valori extinse ('Credit/contra-cheltuiala', 'Debit/contra-venit', 'Mixt', ...)
    normal_balance VARCHAR(40),

    -- E4: include '+/-'
    report_sign VARCHAR(10)
        CHECK (report_sign IN ('+', '-', '+/-', 'calculated')),

    is_leaf_for_calculation BOOLEAN NOT NULL DEFAULT FALSE,

    formula_or_rule TEXT,
    notes           TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unicitate line_key: separat pentru global (company_id NULL) si per-companie,
-- deoarece UNIQUE nativ trateaza NULL ca distinct.
CREATE UNIQUE INDEX IF NOT EXISTS ux_sld_global_key
    ON public.statement_line_definitions(statement_type, line_key)
    WHERE company_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_sld_company_key
    ON public.statement_line_definitions(company_id, statement_type, line_key)
    WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sld_company_statement
    ON public.statement_line_definitions(company_id, statement_type, display_order);

CREATE INDEX IF NOT EXISTS idx_sld_account_code
    ON public.statement_line_definitions(account_code);

CREATE INDEX IF NOT EXISTS idx_sld_chart_account
    ON public.statement_line_definitions(chart_account_id);

CREATE INDEX IF NOT EXISTS idx_sld_parent
    ON public.statement_line_definitions(parent_line_key);

DROP TRIGGER IF EXISTS update_statement_line_definitions_updated_at
    ON public.statement_line_definitions;

CREATE TRIGGER update_statement_line_definitions_updated_at
BEFORE UPDATE ON public.statement_line_definitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.statement_line_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sld_select ON public.statement_line_definitions;
DROP POLICY IF EXISTS sld_insert ON public.statement_line_definitions;
DROP POLICY IF EXISTS sld_update ON public.statement_line_definitions;
DROP POLICY IF EXISTS sld_delete ON public.statement_line_definitions;

CREATE POLICY sld_select
ON public.statement_line_definitions
FOR SELECT
TO authenticated
USING (
    company_id IS NULL
    OR public.is_company_member(public.get_user_id_from_auth(), company_id)
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

CREATE POLICY sld_insert
ON public.statement_line_definitions
FOR INSERT
TO authenticated
WITH CHECK (
    (company_id IS NULL AND public.has_role(public.get_user_id_from_auth(), 'admin'))
    OR (company_id IS NOT NULL AND public.is_company_member(public.get_user_id_from_auth(), company_id))
);

CREATE POLICY sld_update
ON public.statement_line_definitions
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

CREATE POLICY sld_delete
ON public.statement_line_definitions
FOR DELETE
TO authenticated
USING (
    (company_id IS NULL AND public.has_role(public.get_user_id_from_auth(), 'super_admin'))
    OR (company_id IS NOT NULL AND public.is_company_member(public.get_user_id_from_auth(), company_id))
);

-- ============================================================================
-- FIN
-- ============================================================================
