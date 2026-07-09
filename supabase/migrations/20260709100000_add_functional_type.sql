-- ============================================================================
-- MIGRARE (GENERATA): functional_type (functiunea contului) pe chart_of_accounts
-- Data: 2026-07-09
-- Sursa: scripts/coa/emit-functional-type-migration.mjs
--        (coloana account_balance_type din chart_of_accounts_cu_tip_cont.xlsx
--         + override-uri explicite din cerinta)
-- ============================================================================
-- Scop:
--   Separa clar FUNCTIUNEA contabila a contului (activ / pasiv / bifunctional)
--   de SOLDUL din balanta (closing_debit / closing_credit). Soldul ramane date
--   brute in trial_balance_accounts; functiunea este definita in planul de
--   conturi (chart_of_accounts / chart_of_accounts_template).
--
--   NU modifica date brute din trial_balance_accounts.
--   NU recalculeaza situatii financiare istorice.
--   Doar adauga si populeaza o coloana noua, aditiv si idempotent.
--
--   Mapare: debit -> activ, credit -> pasiv, mixed -> bifunctional.
-- ============================================================================

-- 1) Coloana noua (idempotent) -----------------------------------------------
ALTER TABLE public.chart_of_accounts
    ADD COLUMN IF NOT EXISTS functional_type TEXT
        CHECK (functional_type IN ('activ', 'pasiv', 'bifunctional'));

ALTER TABLE public.chart_of_accounts_template
    ADD COLUMN IF NOT EXISTS functional_type TEXT
        CHECK (functional_type IN ('activ', 'pasiv', 'bifunctional'));

COMMENT ON COLUMN public.chart_of_accounts.functional_type IS
    'Functiunea contabila a contului (activ/pasiv/bifunctional). NU este soldul din balanta.';
COMMENT ON COLUMN public.chart_of_accounts_template.functional_type IS
    'Functiunea contabila a contului (activ/pasiv/bifunctional). NU este soldul din balanta.';

-- 2) Sursa de adevar: mapare cod -> functiune ---------------------------------
CREATE TEMP TABLE _ft_map (account_code VARCHAR(20) PRIMARY KEY, functional_type TEXT) ON COMMIT DROP;
INSERT INTO _ft_map (account_code, functional_type) VALUES
  ('101', 'pasiv'),
  ('105', 'pasiv'),
  ('106', 'pasiv'),
  ('117', 'bifunctional'),
  ('121', 'bifunctional'),
  ('151', 'pasiv'),
  ('162', 'pasiv'),
  ('167', 'pasiv'),
  ('208', 'activ'),
  ('211', 'activ'),
  ('212', 'activ'),
  ('213', 'activ'),
  ('214', 'activ'),
  ('231', 'activ'),
  ('265', 'activ'),
  ('267', 'activ'),
  ('280', 'pasiv'),
  ('281', 'pasiv'),
  ('301', 'activ'),
  ('302', 'activ'),
  ('303', 'activ'),
  ('322', 'activ'),
  ('331', 'activ'),
  ('332', 'activ'),
  ('341', 'activ'),
  ('345', 'activ'),
  ('346', 'activ'),
  ('348', 'activ'),
  ('351', 'activ'),
  ('371', 'activ'),
  ('378', 'bifunctional'),
  ('401', 'pasiv'),
  ('403', 'pasiv'),
  ('404', 'pasiv'),
  ('408', 'pasiv'),
  ('409', 'activ'),
  ('411', 'activ'),
  ('413', 'activ'),
  ('418', 'activ'),
  ('419', 'pasiv'),
  ('421', 'pasiv'),
  ('423', 'pasiv'),
  ('425', 'activ'),
  ('427', 'pasiv'),
  ('428', 'bifunctional'),
  ('431', 'pasiv'),
  ('436', 'pasiv'),
  ('437', 'pasiv'),
  ('438', 'bifunctional'),
  ('441', 'bifunctional'),
  ('442', 'bifunctional'),
  ('444', 'pasiv'),
  ('446', 'pasiv'),
  ('447', 'pasiv'),
  ('448', 'bifunctional'),
  ('461', 'activ'),
  ('462', 'pasiv'),
  ('471', 'activ'),
  ('473', 'bifunctional'),
  ('475', 'pasiv'),
  ('490', 'pasiv'),
  ('491', 'pasiv'),
  ('508', 'activ'),
  ('512', 'activ'),
  ('519', 'pasiv'),
  ('531', 'activ'),
  ('532', 'activ'),
  ('542', 'activ'),
  ('601', 'activ'),
  ('602', 'activ'),
  ('603', 'activ'),
  ('604', 'activ'),
  ('605', 'activ'),
  ('607', 'activ'),
  ('609', 'pasiv'),
  ('611', 'activ'),
  ('612', 'activ'),
  ('613', 'activ'),
  ('621', 'activ'),
  ('622', 'activ'),
  ('623', 'activ'),
  ('624', 'activ'),
  ('625', 'activ'),
  ('626', 'activ'),
  ('627', 'activ'),
  ('628', 'activ'),
  ('635', 'activ'),
  ('641', 'activ'),
  ('642', 'activ'),
  ('645', 'activ'),
  ('646', 'activ'),
  ('654', 'activ'),
  ('658', 'activ'),
  ('665', 'activ'),
  ('665.01', 'activ'),
  ('665.02', 'activ'),
  ('665.03', 'activ'),
  ('665.04', 'activ'),
  ('665.05', 'activ'),
  ('665movdebit', 'activ'),
  ('666', 'activ'),
  ('667', 'activ'),
  ('681', 'activ'),
  ('686', 'activ'),
  ('691', 'activ'),
  ('698', 'activ'),
  ('701', 'pasiv'),
  ('703', 'pasiv'),
  ('704', 'pasiv'),
  ('706', 'pasiv'),
  ('707', 'pasiv'),
  ('708', 'pasiv'),
  ('709', 'activ'),
  ('711', 'pasiv'),
  ('712', 'pasiv'),
  ('758', 'pasiv'),
  ('765', 'pasiv'),
  ('765.01', 'pasiv'),
  ('765.02', 'pasiv'),
  ('765.03', 'pasiv'),
  ('765.04', 'pasiv'),
  ('765movcredit', 'pasiv'),
  ('766', 'pasiv'),
  ('767', 'pasiv'),
  ('781', 'pasiv'),
  ('786', 'pasiv'),
  ('1012', 'pasiv'),
  ('1061', 'pasiv'),
  ('1065', 'pasiv'),
  ('1068', 'pasiv'),
  ('1171', 'bifunctional'),
  ('1174', 'bifunctional'),
  ('1175', 'bifunctional'),
  ('1511', 'pasiv'),
  ('1512', 'pasiv'),
  ('1518', 'pasiv'),
  ('1621', 'pasiv'),
  ('2111', 'activ'),
  ('2131', 'activ'),
  ('2132', 'activ'),
  ('2133', 'activ'),
  ('2678', 'activ'),
  ('2808', 'pasiv'),
  ('2812', 'pasiv'),
  ('2813', 'pasiv'),
  ('2814', 'pasiv'),
  ('3021', 'activ'),
  ('3022', 'activ'),
  ('3024', 'activ'),
  ('3028', 'activ'),
  ('4091', 'activ'),
  ('4092', 'activ'),
  ('4093', 'activ'),
  ('4111', 'activ'),
  ('4118', 'activ'),
  ('4281', 'pasiv'),
  ('4282', 'activ'),
  ('4311', 'pasiv'),
  ('4312', 'pasiv'),
  ('4313', 'pasiv'),
  ('4314', 'pasiv'),
  ('4315', 'pasiv'),
  ('4316', 'pasiv'),
  ('4371', 'pasiv'),
  ('4372', 'pasiv'),
  ('4373', 'pasiv'),
  ('4382', 'activ'),
  ('4411', 'bifunctional'),
  ('4423', 'pasiv'),
  ('4424', 'activ'),
  ('4426', 'activ'),
  ('4427', 'pasiv'),
  ('4428', 'bifunctional'),
  ('4452', 'activ'),
  ('4481', 'pasiv'),
  ('4482', 'activ'),
  ('4511', 'bifunctional'),
  ('4551', 'pasiv'),
  ('4751', 'pasiv'),
  ('4752', 'pasiv'),
  ('4901', 'pasiv'),
  ('4902', 'pasiv'),
  ('5081', 'activ'),
  ('5121', 'activ'),
  ('5124', 'activ'),
  ('5191', 'pasiv'),
  ('5198', 'pasiv'),
  ('5311', 'activ'),
  ('5314', 'activ'),
  ('5328', 'activ'),
  ('6021', 'activ'),
  ('6022', 'activ'),
  ('6024', 'activ'),
  ('6028', 'activ'),
  ('CF_TRANSFER_IN', 'activ'),
  ('CF_TRANSFER_OUT', 'pasiv');

-- 3) Populeaza template-ul standard -------------------------------------------
UPDATE public.chart_of_accounts_template t
SET functional_type = m.functional_type
FROM _ft_map m
WHERE t.account_code = m.account_code;

-- 3b) Fallback minim pentru conturi de template inca fara functiune, derivat
--     din account_type deja existent (NU din prima cifra a codului):
--       asset -> activ, liability -> pasiv, equity -> pasiv.
--     Conturile de rezultat (revenue/expense) raman NULL: functiunea
--     activ/pasiv/bifunctional se aplica bilantului, nu contului de profit.
UPDATE public.chart_of_accounts_template t
SET functional_type = CASE t.account_type
    WHEN 'asset' THEN 'activ'
    WHEN 'liability' THEN 'pasiv'
    WHEN 'equity' THEN 'pasiv'
    ELSE NULL
END
WHERE t.functional_type IS NULL
  AND t.account_type IN ('asset', 'liability', 'equity');

-- 4) Backfill conturile companiilor existente ---------------------------------
--    a) din maparea autoritativa (cod exact)
UPDATE public.chart_of_accounts c
SET functional_type = m.functional_type
FROM _ft_map m
WHERE c.account_code = m.account_code
  AND c.functional_type IS DISTINCT FROM m.functional_type;

--    b) din template pentru orice cod ramas
UPDATE public.chart_of_accounts c
SET functional_type = t.functional_type
FROM public.chart_of_accounts_template t
WHERE c.account_code = t.account_code
  AND c.functional_type IS NULL
  AND t.functional_type IS NOT NULL;

--    c) fallback din account_type propriu, pentru conturi care nu exista in template
UPDATE public.chart_of_accounts c
SET functional_type = CASE c.account_type
    WHEN 'asset' THEN 'activ'
    WHEN 'liability' THEN 'pasiv'
    WHEN 'equity' THEN 'pasiv'
    ELSE NULL
END
WHERE c.functional_type IS NULL
  AND c.account_type IN ('asset', 'liability', 'equity');

-- 5) seed_standard_chart_of_accounts: copiaza si functional_type ---------------
CREATE OR REPLACE FUNCTION public.seed_standard_chart_of_accounts(_company_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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

    INSERT INTO public.chart_of_accounts
        (company_id, account_code, account_name, account_type, functional_type, is_postable, is_system)
    SELECT _company_id, t.account_code, t.account_name, t.account_type, t.functional_type, t.is_postable, TRUE
    FROM public.chart_of_accounts_template t
    ON CONFLICT (company_id, account_code) DO NOTHING;

    GET DIAGNOSTICS _inserted = ROW_COUNT;

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

    -- Completeaza functiunea pentru conturile deja existente ale companiei
    UPDATE public.chart_of_accounts c
    SET functional_type = t.functional_type
    FROM public.chart_of_accounts_template t
    WHERE c.company_id = _company_id
      AND c.account_code = t.account_code
      AND t.functional_type IS NOT NULL
      AND c.functional_type IS DISTINCT FROM t.functional_type;

    UPDATE public.statement_line_definitions sld
    SET chart_account_id = c.id
    FROM public.chart_of_accounts c
    WHERE sld.company_id = _company_id
      AND c.company_id = _company_id
      AND sld.account_code = c.account_code
      AND sld.chart_account_id IS NULL;

    RETURN _inserted;
END;
$fn$;

ALTER FUNCTION public.seed_standard_chart_of_accounts(UUID) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.seed_standard_chart_of_accounts(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.seed_standard_chart_of_accounts(UUID) TO authenticated;

-- ============================================================================
-- FIN
-- ============================================================================
