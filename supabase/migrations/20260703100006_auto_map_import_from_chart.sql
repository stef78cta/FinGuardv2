-- ============================================================================
-- MIGRARE: auto_map_import_from_chart() (Faza 4 - building block)
-- Data: 2026-07-03
-- ============================================================================
-- Scop:
--   Dupa ce planul standard a fost instantiat pentru companie
--   (seed_standard_chart_of_accounts), maparea conturilor din balanta la
--   planul de conturi devine, in majoritatea cazurilor, deterministica:
--   contul din balanta se leaga de contul din CoA cu acelasi cod, iar pentru
--   conturi analitice (ex: 4111.01) de cel mai specific cont sintetic postabil
--   care este prefix al codului (ex: 4111 sau 411).
--
--   Aceasta functie creeaza automat maparile 1:1 (allocation_pct = 1.0) pentru
--   conturile inca nemapate ale unui import. Restul (split-uri, exceptii)
--   raman in sarcina utilizatorului.
--
-- PRESUPUNE: get_user_id_from_auth(), is_company_member(), has_role(),
--            trial_balance_imports, trial_balance_accounts, chart_of_accounts,
--            account_mappings
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_map_import_from_chart(_import_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
    _company_id UUID;
    _count INT := 0;
BEGIN
    _user_id := public.get_user_id_from_auth();

    SELECT company_id INTO _company_id
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

    -- Pentru fiecare cont din balanta nemapat, alege cel mai specific cont
    -- postabil din CoA (potrivire exacta sau prefix).
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
    INSERT INTO public.account_mappings (trial_balance_account_id, chart_account_id, allocation_pct)
    SELECT tb_id, coa_id, 1.0
    FROM candidates
    WHERE rn = 1
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS _count = ROW_COUNT;
    RETURN _count;
END;
$$;

ALTER FUNCTION public.auto_map_import_from_chart(UUID) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.auto_map_import_from_chart(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.auto_map_import_from_chart(UUID) TO authenticated;

-- ============================================================================
-- FIN
-- ============================================================================
