-- ============================================================================
-- MIGRARE: cash_flow_mapping_rules (reguli cash-flow metoda directa)
-- Data: 2026-07-03
-- ============================================================================
-- Scop:
--   Cash-flow-ul direct (Incasari din clienti, Plati catre furnizori, etc.) NU
--   se poate deduce doar din solduri. Fiecare linie de cash-flow are nevoie de:
--     - conturile de numerar (5121/5124/5311/5314)
--     - conturile de contrapartida (411, 401, 421, 442, ...)
--     - directia fluxului si sectiunea de raportare
--   Acest tabel stocheaza aceste reguli, separat de structura ierarhica
--   (care sta in statement_line_definitions).
--
-- company_id NULL = regula GLOBALA (template standard)
--
-- PRESUPUNE: update_updated_at_column(), get_user_id_from_auth(),
--            is_company_member(uuid,uuid), has_role(uuid,app_role)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cash_flow_mapping_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    company_id UUID
        REFERENCES public.companies(id) ON DELETE CASCADE,

    line_key    VARCHAR(150) NOT NULL,
    description VARCHAR(255) NOT NULL,

    cash_flow_direction VARCHAR(30) NOT NULL
        CHECK (cash_flow_direction IN (
            'opening', 'inflow', 'outflow', 'closing', 'internal_transfer'
        )),

    section VARCHAR(50) NOT NULL
        CHECK (section IN (
            'operating', 'investing', 'financing',
            'unusual', 'internal_transfers', 'cash_balance'
        )),

    -- conturile care reprezinta numerarul efectiv
    cash_account_prefixes TEXT[] NOT NULL DEFAULT ARRAY['5121','5124','5311','5314'],

    -- conturile de contrapartida care determina natura miscarii
    counterparty_account_prefixes TEXT[],

    report_sign VARCHAR(10) NOT NULL DEFAULT '+'
        CHECK (report_sign IN ('+', '-', 'calculated')),

    display_order INT NOT NULL DEFAULT 0,
    formula_or_rule TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unicitate line_key: separat pentru global vs per-companie
CREATE UNIQUE INDEX IF NOT EXISTS ux_cfmr_global_key
    ON public.cash_flow_mapping_rules(line_key)
    WHERE company_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_cfmr_company_key
    ON public.cash_flow_mapping_rules(company_id, line_key)
    WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cfmr_company_section
    ON public.cash_flow_mapping_rules(company_id, section, display_order);

CREATE INDEX IF NOT EXISTS idx_cfmr_direction
    ON public.cash_flow_mapping_rules(cash_flow_direction);

DROP TRIGGER IF EXISTS update_cash_flow_mapping_rules_updated_at
    ON public.cash_flow_mapping_rules;

CREATE TRIGGER update_cash_flow_mapping_rules_updated_at
BEFORE UPDATE ON public.cash_flow_mapping_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.cash_flow_mapping_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cfmr_select ON public.cash_flow_mapping_rules;
DROP POLICY IF EXISTS cfmr_insert ON public.cash_flow_mapping_rules;
DROP POLICY IF EXISTS cfmr_update ON public.cash_flow_mapping_rules;
DROP POLICY IF EXISTS cfmr_delete ON public.cash_flow_mapping_rules;

CREATE POLICY cfmr_select
ON public.cash_flow_mapping_rules
FOR SELECT
TO authenticated
USING (
    company_id IS NULL
    OR public.is_company_member(public.get_user_id_from_auth(), company_id)
    OR public.has_role(public.get_user_id_from_auth(), 'admin')
    OR public.has_role(public.get_user_id_from_auth(), 'super_admin')
);

CREATE POLICY cfmr_insert
ON public.cash_flow_mapping_rules
FOR INSERT
TO authenticated
WITH CHECK (
    (company_id IS NULL AND public.has_role(public.get_user_id_from_auth(), 'admin'))
    OR (company_id IS NOT NULL AND public.is_company_member(public.get_user_id_from_auth(), company_id))
);

CREATE POLICY cfmr_update
ON public.cash_flow_mapping_rules
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

CREATE POLICY cfmr_delete
ON public.cash_flow_mapping_rules
FOR DELETE
TO authenticated
USING (
    (company_id IS NULL AND public.has_role(public.get_user_id_from_auth(), 'super_admin'))
    OR (company_id IS NOT NULL AND public.is_company_member(public.get_user_id_from_auth(), company_id))
);

-- ============================================================================
-- FIN
-- ============================================================================
