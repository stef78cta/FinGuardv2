-- ============================================================================
-- Sincronizare conturi operaționale + viramente interne + corecții functional_type
-- ============================================================================

-- 581 Viramente interne — leaf pentru completitudine șablon
INSERT INTO public.statement_line_definitions (
    company_id, statement_type, line_key, sort_order, display_order, display_name,
    report_area, section_l1, section_l2, section_l3, section_l4,
    account_code, row_type, line_type, normal_balance, report_sign,
    is_leaf_for_calculation, formula_or_rule, notes
)
SELECT v.*
FROM (VALUES
(NULL::uuid, 'balance_sheet'::varchar, 'bs_715'::varchar, 715, 715,
 'Viramente interne',
 'Active', 'Active curente / circulante', 'Sold numerar', NULL::text, NULL::text,
 '581', 'ACCOUNT_LEAF', 'account', 'Debit', '+', TRUE, NULL::text,
 'Transfer intern trezorerie; sold final ar trebui să fie zero')
) AS v(
    company_id, statement_type, line_key, sort_order, display_order, display_name,
    report_area, section_l1, section_l2, section_l3, section_l4,
    account_code, row_type, line_type, normal_balance, report_sign,
    is_leaf_for_calculation, formula_or_rule, notes
)
WHERE NOT EXISTS (
    SELECT 1 FROM public.statement_line_definitions s
    WHERE s.company_id IS NULL AND s.statement_type = v.statement_type AND s.line_key = v.line_key
);

-- 4551 — bifuncțional (creanță debitor / datorie creditor)
UPDATE public.chart_of_accounts_template
SET functional_type = 'bifunctional'
WHERE account_code = '4551';

UPDATE public.chart_of_accounts
SET functional_type = 'bifunctional'
WHERE account_code = '4551'
  AND functional_type IS DISTINCT FROM 'bifunctional';

-- Conturi operaționale — functional_type explicit pe amortizări necorporale
UPDATE public.chart_of_accounts_template
SET functional_type = 'pasiv'
WHERE account_code IN ('2805', '2807');

UPDATE public.chart_of_accounts
SET functional_type = 'pasiv'
WHERE account_code IN ('2805', '2807')
  AND functional_type IS DISTINCT FROM 'pasiv';
