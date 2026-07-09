-- ============================================================================
-- Reconciliere obligatorie bilanț + rute SLD duale pentru conturi bifuncționale
-- ============================================================================

-- 1) Status raport: adaugă 'unreconciled' pentru rapoarte generate dar nereconciliate
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports
    ADD CONSTRAINT reports_status_check
    CHECK (status IN ('generating', 'completed', 'error', 'unreconciled'));

-- 2) Rute SLD duale lipsă (debit → Active, credit → Pasive)
INSERT INTO public.statement_line_definitions (
    company_id, statement_type, line_key, sort_order, display_order, display_name,
    report_area, section_l1, section_l2, section_l3, section_l4,
    account_code, row_type, line_type, normal_balance, report_sign,
    is_leaf_for_calculation, formula_or_rule, notes
)
SELECT v.*
FROM (VALUES
(NULL::uuid, 'balance_sheet'::varchar, 'bs_484'::varchar, 484, 484,
 'Diferențe de preț la mărfuri (sold creditor)',
 'Pasive', 'Datorii pe termen scurt', 'Datorii comerciale curente către furnizori / clienți', NULL::text, NULL::text,
 '378', 'ACCOUNT_LEAF', 'account', 'Credit', '+', TRUE, NULL::text,
 'Bifuncțional; sold creditor'),

(NULL::uuid, 'balance_sheet'::varchar, 'bs_605'::varchar, 605, 605,
 'Acționari/Asociați - creanțe (sold debitor)',
 'Active', 'Active curente / circulante', 'Creanțe nete', 'Creanțe brute', NULL::text,
 '4551', 'ACCOUNT_LEAF', 'account', 'Debit', '+', TRUE, NULL::text,
 'Bifuncțional; sold debitor = creanță'),

(NULL::uuid, 'balance_sheet'::varchar, 'bs_615'::varchar, 615, 615,
 'Decontări în curs de clarificare (creanță)',
 'Active', 'Active curente / circulante', 'Creanțe nete', 'Creanțe brute', NULL::text,
 '473', 'ACCOUNT_LEAF', 'account', 'Debit', '+', TRUE, NULL::text,
 'Bifuncțional; sold debitor'),

(NULL::uuid, 'balance_sheet'::varchar, 'bs_1445'::varchar, 1445, 1445,
 'Pierdere reportată (121 sold debitor)',
 'Active', 'Active imobilizate', NULL::text, NULL::text, NULL::text,
 '121', 'ACCOUNT_LEAF', 'account', 'Debit', '+', TRUE, NULL::text,
 'Bifuncțional; pierdere = sold debitor pe 121'),

(NULL::uuid, 'balance_sheet'::varchar, 'bs_1075'::varchar, 1075, 1075,
 'Alte datorii/creanțe sociale (sold debitor)',
 'Active', 'Active curente / circulante', 'Creanțe nete', 'Creanțe brute', NULL::text,
 '438', 'ACCOUNT_LEAF', 'account', 'Debit', '+', TRUE, NULL::text,
 'Bifuncțional; sold debitor'),

(NULL::uuid, 'balance_sheet'::varchar, 'bs_1076'::varchar, 1076, 1076,
 'Alte datorii/creanțe sociale (sold creditor)',
 'Pasive', 'Datorii pe termen scurt', 'Sume datorate către / pentru salariați', NULL::text, '438',
 '438', 'ACCOUNT_LEAF', 'account', 'Credit', '+', TRUE, NULL::text,
 'Bifuncțional; sold creditor'),

(NULL::uuid, 'balance_sheet'::varchar, 'bs_865'::varchar, 865, 865,
 'Alte datorii/creanțe personal (sold debitor)',
 'Active', 'Active curente / circulante', 'Creanțe nete', 'Creanțe brute', NULL::text,
 '428', 'ACCOUNT_LEAF', 'account', 'Debit', '+', TRUE, NULL::text,
 'Bifuncțional; sold debitor'),

(NULL::uuid, 'balance_sheet'::varchar, 'bs_866'::varchar, 866, 866,
 'Alte datorii/creanțe personal (sold creditor)',
 'Pasive', 'Datorii pe termen scurt', 'Sume datorate către / pentru salariați', NULL::text, NULL::text,
 '428', 'ACCOUNT_LEAF', 'account', 'Credit', '+', TRUE, NULL::text,
 'Bifuncțional; sold creditor'),

(NULL::uuid, 'balance_sheet'::varchar, 'bs_1145'::varchar, 1145, 1145,
 'TVA neexigibilă (sold debitor / creanță)',
 'Active', 'Active curente / circulante', 'Creanțe nete', 'Creanțe brute', '442',
 '4428', 'ACCOUNT_LEAF', 'account', 'Debit', '+', TRUE, NULL::text,
 'Bifuncțional; sold debitor'),

(NULL::uuid, 'balance_sheet'::varchar, 'bs_1146'::varchar, 1146, 1146,
 'TVA neexigibilă (sold creditor / datorie)',
 'Pasive', 'Datorii pe termen scurt', 'Datorii către bugetele de stat', NULL::text, '442',
 '4428', 'ACCOUNT_LEAF', 'account', 'Credit', '+', TRUE, NULL::text,
 'Bifuncțional; sold creditor'),

(NULL::uuid, 'balance_sheet'::varchar, 'bs_1225'::varchar, 1225, 1225,
 'Alte datorii/creanțe buget stat (sold debitor)',
 'Active', 'Active curente / circulante', 'Creanțe nete', 'Creanțe brute', '448',
 '448', 'ACCOUNT_LEAF', 'account', 'Debit', '+', TRUE, NULL::text,
 'Bifuncțional; sold debitor'),

(NULL::uuid, 'balance_sheet'::varchar, 'bs_1226'::varchar, 1226, 1226,
 'Alte datorii/creanțe buget stat (sold creditor)',
 'Pasive', 'Datorii pe termen scurt', 'Datorii către bugetele de stat', NULL::text, NULL::text,
 '448', 'ACCOUNT_LEAF', 'account', 'Credit', '+', TRUE, NULL::text,
 'Bifuncțional; sold creditor')
) AS v(
    company_id, statement_type, line_key, sort_order, display_order, display_name,
    report_area, section_l1, section_l2, section_l3, section_l4,
    account_code, row_type, line_type, normal_balance, report_sign,
    is_leaf_for_calculation, formula_or_rule, notes
)
WHERE NOT EXISTS (
    SELECT 1 FROM public.statement_line_definitions s
    WHERE s.company_id IS NULL
      AND s.statement_type = v.statement_type
      AND s.line_key = v.line_key
);

-- 3) Validare acoperire bilanț la generare (mirror logică client)
CREATE OR REPLACE FUNCTION public.validate_balance_sheet_coverage(_import_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _issues JSONB := '[]'::jsonb;
    _unmapped INT := 0;
    _not_in_report INT := 0;
    _bifunctional INT := 0;
    _missing_fn INT := 0;
    rec RECORD;
    _leaves_active BOOLEAN;
    _leaves_passive BOOLEAN;
BEGIN
    FOR rec IN
        SELECT
            tba.account_code,
            tba.closing_debit,
            tba.closing_credit,
            coa.account_code AS coa_code,
            coa.functional_type,
            CASE
                WHEN COALESCE(tba.closing_debit, 0) > 0.01 AND COALESCE(tba.closing_credit, 0) > 0.01 THEN 'both'
                WHEN COALESCE(tba.closing_debit, 0) > 0.01 THEN 'debit'
                WHEN COALESCE(tba.closing_credit, 0) > 0.01 THEN 'credit'
                ELSE 'zero'
            END AS balance_side
        FROM public.trial_balance_accounts tba
        LEFT JOIN public.account_mappings am
          ON am.trial_balance_account_id = tba.id AND am.valid_to IS NULL
        LEFT JOIN public.chart_of_accounts coa ON coa.id = am.chart_account_id
        WHERE tba.import_id = _import_id
          AND (
              ABS(COALESCE(tba.closing_debit, 0)) > 0.01
              OR ABS(COALESCE(tba.closing_credit, 0)) > 0.01
          )
    LOOP
        IF rec.coa_code IS NULL THEN
            _unmapped := _unmapped + 1;
            _issues := _issues || jsonb_build_object(
                'type', 'unmapped',
                'account_code', rec.account_code
            );
            CONTINUE;
        END IF;

        IF rec.functional_type IS NULL THEN
            _missing_fn := _missing_fn + 1;
            _issues := _issues || jsonb_build_object(
                'type', 'missing_functional_type',
                'account_code', rec.account_code
            );
            CONTINUE;
        END IF;

        IF rec.functional_type = 'bifunctional' THEN
            SELECT
                EXISTS (
                    SELECT 1 FROM public.statement_line_definitions s
                    WHERE s.statement_type = 'balance_sheet'
                      AND s.is_leaf_for_calculation = TRUE
                      AND s.is_active = TRUE
                      AND s.account_code IS NOT NULL
                      AND s.report_area = 'Active'
                      AND (rec.coa_code = s.account_code OR rec.coa_code LIKE s.account_code || '%')
                ),
                EXISTS (
                    SELECT 1 FROM public.statement_line_definitions s
                    WHERE s.statement_type = 'balance_sheet'
                      AND s.is_leaf_for_calculation = TRUE
                      AND s.is_active = TRUE
                      AND s.account_code IS NOT NULL
                      AND s.report_area = 'Pasive'
                      AND (rec.coa_code = s.account_code OR rec.coa_code LIKE s.account_code || '%')
                )
            INTO _leaves_active, _leaves_passive;

            IF NOT _leaves_active OR NOT _leaves_passive THEN
                _bifunctional := _bifunctional + 1;
                _issues := _issues || jsonb_build_object(
                    'type', 'bifunctional_incomplete_routes',
                    'account_code', rec.account_code
                );
            END IF;
        ELSE
            IF NOT EXISTS (
                SELECT 1 FROM public.statement_line_definitions s
                WHERE s.statement_type = 'balance_sheet'
                  AND s.is_leaf_for_calculation = TRUE
                  AND s.is_active = TRUE
                  AND s.account_code IS NOT NULL
                  AND (rec.coa_code = s.account_code OR rec.coa_code LIKE s.account_code || '%')
            ) THEN
                _not_in_report := _not_in_report + 1;
                _issues := _issues || jsonb_build_object(
                    'type', 'not_in_report',
                    'account_code', rec.account_code
                );
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'is_valid', (_unmapped + _not_in_report + _bifunctional + _missing_fn) = 0,
        'unmapped_count', _unmapped,
        'not_in_report_count', _not_in_report,
        'bifunctional_route_issue_count', _bifunctional,
        'missing_functional_count', _missing_fn,
        'issues', _issues
    );
END;
$$;

ALTER FUNCTION public.validate_balance_sheet_coverage(UUID) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.validate_balance_sheet_coverage(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_balance_sheet_coverage(UUID) TO authenticated;
