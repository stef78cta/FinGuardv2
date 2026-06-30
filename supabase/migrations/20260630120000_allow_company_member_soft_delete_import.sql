-- =============================================================================
-- Permite oricărui membru al companiei să șteargă (soft delete) un import
-- de balanță al companiei sale, nu doar uploader-ul sau un admin.
--
-- Motiv: balanțele încărcate de un coleg nu puteau fi șterse (RPC returna FALSE),
-- iar fallback-ul de hard delete era oricum blocat de RLS (lipsă politică DELETE).
-- Schimbarea afectează DOAR logica RPC. Fără modificări de schemă sau date.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.soft_delete_import(_import_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
    _can_delete BOOLEAN;
BEGIN
    _user_id := public.get_user_id_from_auth();

    -- Orice membru al companiei poate șterge balanțele companiei sale.
    SELECT EXISTS (
        SELECT 1
        FROM public.trial_balance_imports tbi
        WHERE tbi.id = _import_id
          AND public.is_company_member(_user_id, tbi.company_id)
          AND tbi.deleted_at IS NULL
    ) INTO _can_delete;

    IF NOT _can_delete THEN
        RETURN FALSE;
    END IF;

    UPDATE public.trial_balance_imports
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = _import_id
      AND deleted_at IS NULL;

    RETURN FOUND;
END;
$$;

ALTER FUNCTION public.soft_delete_import(UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.soft_delete_import(UUID) TO authenticated;
