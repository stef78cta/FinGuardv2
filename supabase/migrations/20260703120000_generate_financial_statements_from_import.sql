-- ============================================================================
-- MIGRARE: generate_financial_statements_from_import + fix valid_from mapări
-- Data: 2026-07-03
-- ============================================================================
-- Generează BS / P&L / CF + raport comprehensive din:
--   trial_balance_imports + account_mappings + chart_of_accounts
--   + statement_line_definitions (+ cash_flow_mapping_rules pentru CF)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Fix: auto_map setează valid_from la period_start al importului
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_map_import_from_chart(_import_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
    _company_id UUID;
    _valid_from DATE;
    _count INT := 0;
BEGIN
    _user_id := public.get_user_id_from_auth();

    SELECT company_id, period_start
      INTO _company_id, _valid_from
    FROM public.trial_balance_imports
    WHERE id = _import_id;

    IF _company_id IS NULL THEN
        RAISE EXCEPTION 'Import inexistent: %', _import_id;
    END IF;

    IF NOT public.is_company_member(_user_id, _company_id)
       AND NOT public.has_role(_user_id, 'admin')
       AND NOT public.has_role(_user_id, 'super_admin') THEN
        RAISE EXCEPTION 'Acces interzis la importul %', _import_id;
    END IF;

    WITH candidates AS (
        SELECT
            tba.id AS tb_id,
            coa.id AS coa_id,
            ROW_NUMBER() OVER (
                PARTITION BY tba.id
                ORDER BY length(coa.account_code) DESC
            ) AS rn
        FROM public.trial_balance_accounts tba
        JOIN public.chart_of_accounts coa
          ON coa.company_id = _company_id
         AND coa.is_postable = TRUE
         AND (
              tba.account_code = coa.account_code
              OR tba.account_code LIKE coa.account_code || '%'
         )
        WHERE tba.import_id = _import_id
          AND NOT EXISTS (
              SELECT 1 FROM public.account_mappings m
              WHERE m.trial_balance_account_id = tba.id
                AND m.valid_to IS NULL
          )
    )
    INSERT INTO public.account_mappings (trial_balance_account_id, chart_account_id, allocation_pct, valid_from)
    SELECT tb_id, coa_id, 1.0, _valid_from
    FROM candidates
    WHERE rn = 1
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS _count = ROW_COUNT;
    RETURN _count;
END;
$$;

-- Backfill mapări existente: valid_from = period_start al importului
UPDATE public.account_mappings am
SET valid_from = tbi.period_start
FROM public.trial_balance_accounts tba
JOIN public.trial_balance_imports tbi ON tbi.id = tba.import_id
WHERE am.trial_balance_account_id = tba.id
  AND am.valid_from > tbi.period_end;

-- ---------------------------------------------------------------------------
-- Helper: aplică semnul de raportare
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._apply_report_sign(_amount NUMERIC, _sign VARCHAR)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN _sign = '-' THEN -_amount
        WHEN _sign = '+/-' THEN _amount
        WHEN _sign = '+' THEN _amount
        ELSE _amount
    END;
$$;

-- ---------------------------------------------------------------------------
-- Helper: copil al unui nod de secțiune (prefix pe section_l1..l4)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._sld_is_section_child(
    _child_l1 TEXT, _child_l2 TEXT, _child_l3 TEXT, _child_l4 TEXT,
    _parent_l1 TEXT, _parent_l2 TEXT, _parent_l3 TEXT, _parent_l4 TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT
        (_parent_l1 IS NULL OR _child_l1 IS NOT DISTINCT FROM _parent_l1)
    AND (_parent_l2 IS NULL OR _child_l2 IS NOT DISTINCT FROM _parent_l2)
    AND (_parent_l3 IS NULL OR _child_l3 IS NOT DISTINCT FROM _parent_l3)
    AND (_parent_l4 IS NULL OR _child_l4 IS NOT DISTINCT FROM _parent_l4);
$$;

-- ---------------------------------------------------------------------------
-- RPC principal
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_financial_statements_from_import(_import_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
    _company_id UUID;
    _period_start DATE;
    _period_end DATE;
    _currency CHAR(3);
    _bs_id UUID;
    _pl_id UUID;
    _cf_id UUID;
    _report_id UUID;
BEGIN
    _user_id := public.get_user_id_from_auth();

    SELECT tbi.company_id, tbi.period_start, tbi.period_end, COALESCE(c.currency, 'RON')
      INTO _company_id, _period_start, _period_end, _currency
    FROM public.trial_balance_imports tbi
    JOIN public.companies c ON c.id = tbi.company_id
    WHERE tbi.id = _import_id;

    IF _company_id IS NULL THEN
        RAISE EXCEPTION 'Import inexistent: %', _import_id;
    END IF;

    IF NOT public.is_company_member(_user_id, _company_id)
       AND NOT public.has_role(_user_id, 'admin')
       AND NOT public.has_role(_user_id, 'super_admin') THEN
        RAISE EXCEPTION 'Acces interzis la importul %', _import_id;
    END IF;

    PERFORM public.assert_mappings_complete_for_import(_import_id);

    -- Definiții de raportare (companie > global)
    CREATE TEMP TABLE _sld ON COMMIT DROP AS
    SELECT DISTINCT ON (d.line_key)
        d.*
    FROM public.statement_line_definitions d
    WHERE d.is_active = TRUE
      AND (d.company_id IS NULL OR d.company_id = _company_id)
    ORDER BY d.line_key, (d.company_id IS NULL) ASC;

    CREATE TEMP TABLE _amounts (
        line_key VARCHAR(150) PRIMARY KEY,
        statement_type VARCHAR(50) NOT NULL,
        sort_order INT NOT NULL,
        display_order INT NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        report_area VARCHAR(100),
        section_l1 TEXT, section_l2 TEXT, section_l3 TEXT, section_l4 TEXT,
        account_code VARCHAR(20),
        row_type VARCHAR(50),
        line_type VARCHAR(50),
        report_sign VARCHAR(10),
        is_leaf_for_calculation BOOLEAN NOT NULL,
        leaf_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        amount NUMERIC(15,2) NOT NULL DEFAULT 0
    ) ON COMMIT DROP;

    INSERT INTO _amounts (
        line_key, statement_type, sort_order, display_order, display_name,
        report_area, section_l1, section_l2, section_l3, section_l4,
        account_code, row_type, line_type, report_sign, is_leaf_for_calculation
    )
    SELECT
        line_key, statement_type, sort_order, display_order, display_name,
        report_area, section_l1, section_l2, section_l3, section_l4,
        account_code, row_type, line_type, report_sign, is_leaf_for_calculation
    FROM _sld;

    -- Mapări active la data balanței
    CREATE TEMP TABLE _mapped ON COMMIT DROP AS
    SELECT
        tba.id AS tb_id,
        coa.id AS coa_id,
        coa.account_code AS coa_code,
        coa.account_type,
        am.allocation_pct,
        tba.opening_debit,
        tba.opening_credit,
        tba.debit_turnover,
        tba.credit_turnover,
        tba.closing_debit,
        tba.closing_credit
    FROM public.trial_balance_accounts tba
    JOIN public.account_mappings am
      ON am.trial_balance_account_id = tba.id
     AND am.valid_from <= _period_end
     AND (am.valid_to IS NULL OR am.valid_to >= _period_end)
    JOIN public.chart_of_accounts coa ON coa.id = am.chart_account_id
    WHERE tba.import_id = _import_id;

    -- Frunze BS / P&L: atribuire longest-prefix per tip de raport
    WITH leaves AS (
        SELECT line_key, account_code, statement_type, normal_balance, report_sign
        FROM _sld
        WHERE is_leaf_for_calculation = TRUE
          AND account_code IS NOT NULL
          AND account_code !~ '^CF_'
    ),
    bs_leaf AS (
        SELECT
            l.line_key,
            SUM(
                m.allocation_pct * public._apply_report_sign(
                    CASE
                        WHEN l.normal_balance ILIKE 'credit%' THEN (m.closing_credit - m.closing_debit)
                        ELSE (m.closing_debit - m.closing_credit)
                    END,
                    l.report_sign
                )
            ) AS amt
        FROM _mapped m
        JOIN LATERAL (
            SELECT l2.line_key, l2.normal_balance, l2.report_sign
            FROM leaves l2
            WHERE l2.statement_type = 'balance_sheet'
              AND (m.coa_code = l2.account_code OR m.coa_code LIKE l2.account_code || '%')
            ORDER BY length(l2.account_code) DESC
            LIMIT 1
        ) l ON TRUE
        GROUP BY l.line_key
    ),
    pl_leaf AS (
        SELECT
            l.line_key,
            SUM(
                m.allocation_pct * public._apply_report_sign(
                    CASE
                        WHEN m.account_type = 'revenue' THEN (m.credit_turnover - m.debit_turnover)
                        WHEN m.account_type = 'expense' THEN (m.debit_turnover - m.credit_turnover)
                        WHEN l.normal_balance ILIKE 'credit%' THEN (m.credit_turnover - m.debit_turnover)
                        ELSE (m.debit_turnover - m.credit_turnover)
                    END,
                    l.report_sign
                )
            ) AS amt
        FROM _mapped m
        JOIN LATERAL (
            SELECT l2.line_key, l2.normal_balance, l2.report_sign
            FROM leaves l2
            WHERE l2.statement_type = 'income_statement'
              AND (m.coa_code = l2.account_code OR m.coa_code LIKE l2.account_code || '%')
            ORDER BY length(l2.account_code) DESC
            LIMIT 1
        ) l ON TRUE
        GROUP BY l.line_key
    )
    UPDATE _amounts t
    SET leaf_amount = v.amt,
        amount = v.amt
    FROM (
        SELECT line_key, amt FROM bs_leaf
        UNION ALL
        SELECT line_key, amt FROM pl_leaf
    ) v
    WHERE t.line_key = v.line_key;

    -- Cash flow: reguli pe line_key
    WITH cf_rules AS (
        SELECT r.*, s.normal_balance AS sld_normal_balance, s.report_sign AS sld_report_sign
        FROM public.cash_flow_mapping_rules r
        JOIN _sld s ON s.line_key = r.line_key AND s.statement_type = 'cash_flow'
        WHERE r.company_id IS NULL OR r.company_id = _company_id
    ),
    cf_calc AS (
        SELECT
            cr.line_key,
            SUM(
                m.allocation_pct * public._apply_report_sign(
                    CASE cr.cash_flow_direction
                        WHEN 'opening' THEN
                            CASE WHEN cr.sld_normal_balance ILIKE 'credit%'
                                THEN (m.opening_credit - m.opening_debit)
                                ELSE (m.opening_debit - m.opening_credit)
                            END
                        WHEN 'closing' THEN
                            CASE WHEN cr.sld_normal_balance ILIKE 'credit%'
                                THEN (m.closing_credit - m.closing_debit)
                                ELSE (m.closing_debit - m.closing_credit)
                            END
                        WHEN 'inflow' THEN (m.credit_turnover - m.debit_turnover)
                        WHEN 'outflow' THEN (m.debit_turnover - m.credit_turnover)
                        WHEN 'internal_transfer' THEN (m.debit_turnover - m.credit_turnover)
                        ELSE (m.debit_turnover - m.credit_turnover)
                    END,
                    cr.report_sign
                )
            ) AS amt
        FROM cf_rules cr
        JOIN _sld s ON s.line_key = cr.line_key
        JOIN _mapped m ON (
            (
                cr.counterparty_account_prefixes IS NOT NULL
                AND EXISTS (
                    SELECT 1 FROM unnest(cr.counterparty_account_prefixes) pfx
                    WHERE m.coa_code = pfx OR m.coa_code LIKE pfx || '%'
                )
            )
            OR (
                cr.counterparty_account_prefixes IS NULL
                AND s.account_code IS NOT NULL
                AND (m.coa_code = s.account_code OR m.coa_code LIKE s.account_code || '%')
            )
        )
        GROUP BY cr.line_key
    )
    UPDATE _amounts t
    SET leaf_amount = c.amt,
        amount = c.amt
    FROM cf_calc c
    WHERE t.line_key = c.line_key;

    -- Agregare grupuri / calculate: sumă frunze descendent pe secțiune
    UPDATE _amounts parent
    SET amount = COALESCE((
        SELECT SUM(child.leaf_amount)
        FROM _amounts child
        WHERE child.statement_type = parent.statement_type
          AND child.is_leaf_for_calculation = TRUE
          AND public._sld_is_section_child(
              child.section_l1, child.section_l2, child.section_l3, child.section_l4,
              parent.section_l1, parent.section_l2, parent.section_l3, parent.section_l4
          )
    ), 0)
    WHERE parent.is_leaf_for_calculation = FALSE
       OR parent.account_code IS NULL;

    -- -----------------------------------------------------------------------
    -- BALANCE SHEET
    -- -----------------------------------------------------------------------
    INSERT INTO public.financial_statements (
        company_id, period_start, period_end, source_import_id,
        statement_type, currency_code, generated_by
    ) VALUES (
        _company_id, _period_start, _period_end, _import_id,
        'balance_sheet', _currency, _user_id
    ) RETURNING id INTO _bs_id;

    INSERT INTO public.balance_sheet_lines (
        statement_id, line_key, category, subcategory,
        account_code, description, amount, display_order
    )
    SELECT
        _bs_id,
        a.line_key,
        COALESCE(a.report_area, a.section_l1, 'Altele'),
        a.section_l2,
        a.account_code,
        a.display_name,
        ROUND(a.amount, 2),
        a.display_order
    FROM _amounts a
    WHERE a.statement_type = 'balance_sheet'
    ORDER BY a.display_order;

    -- -----------------------------------------------------------------------
    -- INCOME STATEMENT
    -- -----------------------------------------------------------------------
    INSERT INTO public.financial_statements (
        company_id, period_start, period_end, source_import_id,
        statement_type, currency_code, generated_by
    ) VALUES (
        _company_id, _period_start, _period_end, _import_id,
        'income_statement', _currency, _user_id
    ) RETURNING id INTO _pl_id;

    INSERT INTO public.income_statement_lines (
        statement_id, line_key, category, subcategory,
        account_code, description, amount, display_order, line_type
    )
    SELECT
        _pl_id,
        a.line_key,
        CASE
            WHEN a.line_type = 'kpi' THEN 'marja'
            WHEN a.row_type = 'CALCULATED' OR a.line_type = 'calculated' THEN 'rezultat'
            WHEN a.report_area ILIKE '%chelt%' OR a.section_l1 ILIKE '%chelt%' THEN 'cheltuieli'
            WHEN a.report_area ILIKE '%venit%' OR a.section_l1 ILIKE '%venit%' THEN 'venituri'
            WHEN a.report_sign = '-' THEN 'cheltuieli'
            ELSE 'venituri'
        END,
        a.section_l2,
        a.account_code,
        a.display_name,
        ROUND(a.amount, 2),
        a.display_order,
        COALESCE(a.line_type, 'account')
    FROM _amounts a
    WHERE a.statement_type = 'income_statement'
    ORDER BY a.display_order;

    -- -----------------------------------------------------------------------
    -- CASH FLOW
    -- -----------------------------------------------------------------------
    INSERT INTO public.financial_statements (
        company_id, period_start, period_end, source_import_id,
        statement_type, currency_code, generated_by
    ) VALUES (
        _company_id, _period_start, _period_end, _import_id,
        'cash_flow', _currency, _user_id
    ) RETURNING id INTO _cf_id;

    INSERT INTO public.cash_flow_lines (
        statement_id, line_key, section, description, amount, display_order,
        cash_flow_area, line_type
    )
    SELECT
        _cf_id,
        a.line_key,
        COALESCE(
            (SELECT r.section FROM public.cash_flow_mapping_rules r
             WHERE r.line_key = a.line_key AND (r.company_id IS NULL OR r.company_id = _company_id)
             LIMIT 1),
            CASE
                WHEN a.report_area ILIKE '%sold%' AND a.section_l1 ILIKE '%final%' THEN 'closing_cash'
                WHEN a.report_area ILIKE '%sold%' THEN 'opening_cash'
                WHEN a.report_area ILIKE '%încas%' OR a.report_area ILIKE '%incas%' THEN 'operating'
                WHEN a.report_area ILIKE '%plă%' OR a.report_area ILIKE '%pla%' THEN 'operating'
                WHEN a.section_l2 ILIKE '%financ%' THEN 'financing'
                WHEN a.section_l2 ILIKE '%invest%' THEN 'investing'
                ELSE 'operating'
            END
        ),
        a.display_name,
        ROUND(a.amount, 2),
        a.display_order,
        a.report_area,
        COALESCE(a.line_type, 'account')
    FROM _amounts a
    WHERE a.statement_type = 'cash_flow'
    ORDER BY a.display_order;

    -- -----------------------------------------------------------------------
    -- REPORT comprehensive
    -- -----------------------------------------------------------------------
    INSERT INTO public.reports (
        company_id, title, report_type, period_start, period_end, generated_by, status, metadata
    ) VALUES (
        _company_id,
        'Raport financiar ' || to_char(_period_end, 'MM.YYYY'),
        'comprehensive',
        _period_start,
        _period_end,
        _user_id,
        'completed',
        jsonb_build_object('source_import_id', _import_id)
    ) RETURNING id INTO _report_id;

    INSERT INTO public.report_statements (report_id, statement_id)
    VALUES
        (_report_id, _bs_id),
        (_report_id, _pl_id),
        (_report_id, _cf_id);

    RETURN jsonb_build_object(
        'report_id', _report_id,
        'balance_sheet_id', _bs_id,
        'income_statement_id', _pl_id,
        'cash_flow_id', _cf_id,
        'company_id', _company_id,
        'period_start', _period_start,
        'period_end', _period_end
    );
END;
$$;

ALTER FUNCTION public.generate_financial_statements_from_import(UUID) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.generate_financial_statements_from_import(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.generate_financial_statements_from_import(UUID) TO authenticated;

-- ============================================================================
-- FIN
-- ============================================================================
