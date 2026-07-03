-- ============================================================================
-- MIGRARE: extindere cash_flow_lines
-- Data: 2026-07-03
-- ============================================================================
-- Problema (P2): CHECK (section IN ('operating','investing','financing'))
-- nu acopera structura din template: Sold numerar inceput/final, Incasari/Plati
-- totale, Viramente interne, Incasari/Plati neobisnuite.
--
-- Solutie:
--   - extindem section-ul cu: opening_cash, closing_cash, internal_transfers,
--     unusual, calculated
--   - adaugam cash_flow_area (grupare libera din template) si line_type
-- ============================================================================

-- 1) Relaxare constrangere section
ALTER TABLE public.cash_flow_lines
    DROP CONSTRAINT IF EXISTS cash_flow_lines_section_check;

ALTER TABLE public.cash_flow_lines
    ADD CONSTRAINT cash_flow_lines_section_check
    CHECK (section IN (
        'opening_cash',
        'operating',
        'investing',
        'financing',
        'internal_transfers',
        'unusual',
        'closing_cash',
        'calculated'
    ));

-- 2) Metadate suplimentare de raportare
ALTER TABLE public.cash_flow_lines
    ADD COLUMN IF NOT EXISTS cash_flow_area VARCHAR(100);

ALTER TABLE public.cash_flow_lines
    ADD COLUMN IF NOT EXISTS line_type VARCHAR(50);

ALTER TABLE public.cash_flow_lines
    DROP CONSTRAINT IF EXISTS cash_flow_lines_line_type_check;

ALTER TABLE public.cash_flow_lines
    ADD CONSTRAINT cash_flow_lines_line_type_check
    CHECK (line_type IS NULL OR line_type IN ('account', 'group', 'report', 'calculated'));

-- ============================================================================
-- FIN
-- ============================================================================
