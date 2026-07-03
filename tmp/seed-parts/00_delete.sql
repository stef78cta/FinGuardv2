DELETE FROM public.statement_line_definitions WHERE company_id IS NULL;
DELETE FROM public.cash_flow_mapping_rules WHERE company_id IS NULL;
DELETE FROM public.chart_of_accounts_template;
DELETE FROM public.kpi_definitions WHERE company_id IS NULL AND code IN (E'gross_margin_pct', E'recurring_operating_margin_pct', E'ebitda_margin_pct', E'ebit_margin_pct', E'net_profit_margin_pct');
