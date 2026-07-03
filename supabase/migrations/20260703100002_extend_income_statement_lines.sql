-- ============================================================================
-- MIGRARE: extindere income_statement_lines
-- Data: 2026-07-03
-- ============================================================================
-- Problema (P1): constrangerea CHECK (category IN ('venituri','cheltuieli'))
-- blocheaza salvarea randurilor calculate din P&L: Rezultat operational brut,
-- EBITDA, EBIT, Profit brut, Profit net, % Marje, Rezultat financiar.
--
-- Solutie:
--   - relaxam CHECK-ul pe category (adaugam 'rezultat','marja','calculated')
--   - adaugam line_type pentru clasificare precisa (account/group/calculated/kpi)
-- ============================================================================

-- 1) Relaxare constrangere category (numele implicit generat de Postgres)
ALTER TABLE public.income_statement_lines
    DROP CONSTRAINT IF EXISTS income_statement_lines_category_check;

ALTER TABLE public.income_statement_lines
    ADD CONSTRAINT income_statement_lines_category_check
    CHECK (category IN ('venituri', 'cheltuieli', 'rezultat', 'marja', 'calculated'));

-- 2) line_type: distinge conturi de indicatori calculati
ALTER TABLE public.income_statement_lines
    ADD COLUMN IF NOT EXISTS line_type VARCHAR(50);

ALTER TABLE public.income_statement_lines
    DROP CONSTRAINT IF EXISTS income_statement_lines_line_type_check;

ALTER TABLE public.income_statement_lines
    ADD CONSTRAINT income_statement_lines_line_type_check
    CHECK (line_type IS NULL OR line_type IN ('account', 'group', 'calculated', 'kpi'));

-- ============================================================================
-- FIN
-- ============================================================================
