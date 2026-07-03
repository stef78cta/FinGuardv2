-- ============================================================================
-- MIGRARE: chart_of_accounts_template + seed_standard_chart_of_accounts()
-- Data: 2026-07-03
-- ============================================================================
-- Scop:
--   chart_of_accounts.company_id este NOT NULL, deci nu putem tine un plan
--   "global". Pastram planul standard (deduplicat din template Excel) intr-un
--   tabel de referinta si il instantiem per companie printr-o functie idempotenta.
--
-- PRESUPUNE: get_user_id_from_auth(), is_company_member(uuid,uuid),
--            has_role(uuid,app_role), chart_of_accounts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chart_of_accounts_template (
    account_code VARCHAR(20) PRIMARY KEY,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL
        CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    parent_code  VARCHAR(20),
    is_postable  BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order   INT NOT NULL DEFAULT 0
);

ALTER TABLE public.chart_of_accounts_template ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coa_template_select ON public.chart_of_accounts_template;
DROP POLICY IF EXISTS coa_template_write  ON public.chart_of_accounts_template;

-- Date de referinta: orice utilizator autentificat le poate citi.
CREATE POLICY coa_template_select
ON public.chart_of_accounts_template
FOR SELECT
TO authenticated
USING (TRUE);

-- Scrierea (mentenanta template) e rezervata administratorilor.
CREATE POLICY coa_template_write
ON public.chart_of_accounts_template
FOR ALL
TO authenticated
USING (public.has_role(public.get_user_id_from_auth(), 'super_admin'))
WITH CHECK (public.has_role(public.get_user_id_from_auth(), 'super_admin'));

-- ============================================================================
-- Functie: instantiaza planul standard pentru o companie (idempotent)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.seed_standard_chart_of_accounts(_company_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
    _inserted INT;
BEGIN
    _user_id := public.get_user_id_from_auth();

    IF NOT public.is_company_member(_user_id, _company_id)
       AND NOT public.has_role(_user_id, 'admin')
       AND NOT public.has_role(_user_id, 'super_admin') THEN
        RAISE EXCEPTION 'Acces interzis la compania % ', _company_id;
    END IF;

    -- 1) Insereaza conturile (fara parent_id inca)
    INSERT INTO public.chart_of_accounts
        (company_id, account_code, account_name, account_type, is_postable, is_system)
    SELECT _company_id, t.account_code, t.account_name, t.account_type, t.is_postable, TRUE
    FROM public.chart_of_accounts_template t
    ON CONFLICT (company_id, account_code) DO NOTHING;

    GET DIAGNOSTICS _inserted = ROW_COUNT;

    -- 2) Leaga parent_id pe baza parent_code din template
    UPDATE public.chart_of_accounts c
    SET parent_id = p.id
    FROM public.chart_of_accounts_template t
    JOIN public.chart_of_accounts p
      ON p.company_id = _company_id
     AND p.account_code = t.parent_code
    WHERE c.company_id = _company_id
      AND c.account_code = t.account_code
      AND t.parent_code IS NOT NULL
      AND c.parent_id IS DISTINCT FROM p.id;

    -- 3) Leaga definitiile de raportare ale companiei (daca exista) la conturi
    UPDATE public.statement_line_definitions sld
    SET chart_account_id = c.id
    FROM public.chart_of_accounts c
    WHERE sld.company_id = _company_id
      AND c.company_id = _company_id
      AND sld.account_code = c.account_code
      AND sld.chart_account_id IS NULL;

    RETURN _inserted;
END;
$$;

ALTER FUNCTION public.seed_standard_chart_of_accounts(UUID) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.seed_standard_chart_of_accounts(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.seed_standard_chart_of_accounts(UUID) TO authenticated;

-- ============================================================================
-- FIN
-- ============================================================================
