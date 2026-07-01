-- =============================================================================
-- RPC: prepare_balance_month_upload
--
-- Pregătește upload-ul unei balanțe pentru o lună dată:
-- - fără _replace_existing: eșuează dacă există deja o balanță activă;
-- - cu _replace_existing = TRUE: soft-delete pe importul activ existent, apoi
--   permite inserarea noii balanțe (o singură balanță activă per companie/lună).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prepare_balance_month_upload(
    _company_id UUID,
    _balance_month DATE,
    _replace_existing BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
    _existing_id UUID;
BEGIN
    _user_id := public.get_user_id_from_auth();

    IF NOT public.is_company_member(_user_id, _company_id) THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'FORBIDDEN'
        );
    END IF;

    IF _balance_month IS NULL
       OR _balance_month <> date_trunc('month', _balance_month)::date THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'INVALID_BALANCE_MONTH'
        );
    END IF;

    SELECT tbi.id
    INTO _existing_id
    FROM public.trial_balance_imports tbi
    WHERE tbi.company_id = _company_id
      AND tbi.balance_month = _balance_month
      AND tbi.deleted_at IS NULL
    LIMIT 1;

    IF _existing_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'replaced_import_id', NULL
        );
    END IF;

    IF NOT COALESCE(_replace_existing, FALSE) THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'ACTIVE_BALANCE_EXISTS',
            'existing_import_id', _existing_id
        );
    END IF;

    UPDATE public.trial_balance_imports
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = _existing_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'CONFLICT'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'replaced_import_id', _existing_id
    );
END;
$$;

ALTER FUNCTION public.prepare_balance_month_upload(UUID, DATE, BOOLEAN) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.prepare_balance_month_upload(UUID, DATE, BOOLEAN) TO authenticated;
