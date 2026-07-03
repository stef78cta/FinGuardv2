-- ============================================================================
-- Fix: calcule BS/P&L — rulaj brut TB, sold equity/mixt, totaluri CALCULATED
-- ============================================================================

CREATE OR REPLACE FUNCTION public._tb_period_activity(
    _debit NUMERIC,
    _credit NUMERIC,
    _account_type VARCHAR,
    _normal_balance VARCHAR
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN _debit = _credit AND _debit <> 0 THEN
            CASE
                WHEN _account_type = 'revenue' THEN _credit
                WHEN _account_type IN ('expense', 'cost') THEN _debit
                WHEN _normal_balance ILIKE 'credit%' THEN _credit
                ELSE _debit
            END
        WHEN _account_type = 'revenue' THEN (_credit - _debit)
        WHEN _account_type IN ('expense', 'cost') THEN (_debit - _credit)
        WHEN _normal_balance ILIKE 'credit%' THEN (_credit - _debit)
        ELSE (_debit - _credit)
    END;
$$;

CREATE OR REPLACE FUNCTION public._tb_closing_balance(
    _debit NUMERIC,
    _credit NUMERIC,
    _account_type VARCHAR,
    _normal_balance VARCHAR
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN _account_type IN ('liability', 'equity') THEN (_credit - _debit)
        WHEN _normal_balance ILIKE 'credit%' OR _normal_balance ILIKE 'mixt%' THEN (_credit - _debit)
        WHEN _normal_balance ILIKE 'debit%' THEN (_debit - _credit)
        ELSE (_debit - _credit)
    END;
$$;

CREATE OR REPLACE FUNCTION public._map_cf_section(_section TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN _section = 'cash_balance' AND _section ILIKE '%final%' THEN 'closing_cash'
        WHEN _section = 'cash_balance' THEN 'opening_cash'
        ELSE _section
    END;
$$;

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

    -- Înlocuiește output anterior pentru același import (regenerare idempotentă)
    DELETE FROM public.reports
    WHERE (metadata->>'source_import_id')::uuid = _import_id;

    DELETE FROM public.financial_statements
    WHERE source_import_id = _import_id;

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
        formula_or_rule TEXT,
        leaf_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        amount NUMERIC(15,2) NOT NULL DEFAULT 0
    ) ON COMMIT DROP;

    INSERT INTO _amounts (
        line_key, statement_type, sort_order, display_order, display_name,
        report_area, section_l1, section_l2, section_l3, section_l4,
        account_code, row_type, line_type, report_sign, is_leaf_for_calculation,
        formula_or_rule
    )
    SELECT
        line_key, statement_type, sort_order, display_order, display_name,
        report_area, section_l1, section_l2, section_l3, section_l4,
        account_code, row_type, line_type, report_sign, is_leaf_for_calculation,
        formula_or_rule
    FROM _sld;

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
                    public._tb_closing_balance(
                        m.closing_debit, m.closing_credit,
                        m.account_type, l.normal_balance
                    ),
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
                    public._tb_period_activity(
                        m.debit_turnover, m.credit_turnover,
                        m.account_type, l.normal_balance
                    ),
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
                            public._tb_closing_balance(
                                m.opening_debit, m.opening_credit,
                                m.account_type, cr.sld_normal_balance
                            )
                        WHEN 'closing' THEN
                            public._tb_closing_balance(
                                m.closing_debit, m.closing_credit,
                                m.account_type, cr.sld_normal_balance
                            )
                        WHEN 'inflow' THEN
                            public._tb_period_activity(
                                m.debit_turnover, m.credit_turnover,
                                'revenue', cr.sld_normal_balance
                            )
                        WHEN 'outflow' THEN
                            public._tb_period_activity(
                                m.debit_turnover, m.credit_turnover,
                                'expense', cr.sld_normal_balance
                            )
                        WHEN 'internal_transfer' THEN
                            public._tb_period_activity(
                                m.debit_turnover, m.credit_turnover,
                                m.account_type, cr.sld_normal_balance
                            )
                        ELSE
                            public._tb_period_activity(
                                m.debit_turnover, m.credit_turnover,
                                m.account_type, cr.sld_normal_balance
                            )
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

    -- Agregare grupuri: sumă frunze pe secțiune
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

    -- Totaluri CALCULATED din formule cu secțiuni (ex: Active imobilizate + Active circulante)
    UPDATE _amounts parent
    SET amount = COALESCE((
        SELECT SUM(grp.amount)
        FROM _amounts grp
        WHERE grp.statement_type = parent.statement_type
          AND grp.row_type = 'REPORT_GROUP'
          AND grp.section_l2 IS NULL
          AND grp.section_l3 IS NULL
          AND parent.formula_or_rule IS NOT NULL
          AND grp.section_l1 IN (
              SELECT trim(part)
              FROM regexp_split_to_table(
                  replace(replace(parent.formula_or_rule, ' + ', '|'), '+', '|'),
                  '\|'
              ) part
              WHERE trim(part) <> ''
          )
    ), parent.amount)
    WHERE parent.row_type = 'CALCULATED'
      AND parent.formula_or_rule IS NOT NULL
      AND parent.formula_or_rule LIKE '%+%';

    -- P&L CALCULATED simple: „A - B” sau „A + B” după display_name
    UPDATE _amounts parent
    SET amount = COALESCE((
        SELECT
            CASE
                WHEN position(' - ' IN parent.formula_or_rule) > 0
                     AND position('+' IN parent.formula_or_rule) = 0 THEN
                    COALESCE((
                        SELECT a.amount FROM _amounts a
                        WHERE a.display_name = trim(split_part(parent.formula_or_rule, '-', 1))
                        LIMIT 1
                    ), 0)
                    - COALESCE((
                        SELECT a.amount FROM _amounts a
                        WHERE a.display_name = trim(split_part(parent.formula_or_rule, '-', 2))
                        LIMIT 1
                    ), 0)
                WHEN position('+' IN parent.formula_or_rule) > 0
                     AND position(' - ' IN parent.formula_or_rule) = 0 THEN
                    COALESCE((
                        SELECT a.amount FROM _amounts a
                        WHERE a.display_name = trim(split_part(parent.formula_or_rule, '+', 1))
                        LIMIT 1
                    ), 0)
                    + COALESCE((
                        SELECT a.amount FROM _amounts a
                        WHERE a.display_name = trim(split_part(parent.formula_or_rule, '+', 2))
                        LIMIT 1
                    ), 0)
                ELSE parent.amount
            END
    ), parent.amount)
    WHERE parent.statement_type = 'income_statement'
      AND parent.row_type = 'CALCULATED'
      AND parent.formula_or_rule IS NOT NULL;

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
        CASE
            WHEN a.line_type = 'kpi' THEN 'kpi'
            WHEN a.row_type = 'CALCULATED' OR a.line_type = 'calculated' THEN 'calculated'
            WHEN a.row_type IN ('REPORT_GROUP', 'ACCOUNT_GROUP') THEN 'group'
            ELSE COALESCE(a.line_type, 'account')
        END
    FROM _amounts a
    WHERE a.statement_type = 'income_statement'
    ORDER BY a.display_order;

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
        public._map_cf_section(COALESCE(
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
        )),
        a.display_name,
        ROUND(a.amount, 2),
        a.display_order,
        a.report_area,
        COALESCE(a.line_type, 'account')
    FROM _amounts a
    WHERE a.statement_type = 'cash_flow'
    ORDER BY a.display_order;

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
