/**
 * Migrare: Internal Error Tracking View (v1.7 VIEW-ONLY strategy)
 * PUNCTUL 2E: Protejează internal_error_detail de expunere către authenticated
 * Versiune: 1.8 | Severitate: MEDIE
 */

-- 1. REVOKE SELECT pe trial_balance_imports pentru authenticated
-- Previne SELECT direct care ar expune internal_error_detail
REVOKE SELECT ON public.trial_balance_imports FROM authenticated;

-- 2. Creează VIEW public fără coloane sensibile
CREATE OR REPLACE VIEW public.trial_balance_imports_public AS
SELECT 
  id,
  company_id,
  file_name,
  file_size_bytes,
  status,
  error_message,  -- Safe: mesaj user-friendly
  -- NU INCLUDE: internal_error_detail, internal_error_code
  accounts_count,
  processing_started_at,
  created_at,
  updated_at
FROM public.trial_balance_imports;

COMMENT ON VIEW public.trial_balance_imports_public IS 
'v1.7: View public pentru trial_balance_imports fără internal_error_detail. Folosit de frontend.';

-- 3. Grant SELECT pe view către authenticated
GRANT SELECT ON public.trial_balance_imports_public TO authenticated;

-- 4. RLS pe view (moștenește din tabel)
ALTER VIEW public.trial_balance_imports_public SET (security_barrier = true);

-- Creează policy SELECT pe view (verifică company membership)
DROP POLICY IF EXISTS "Users can view their company imports" 
  ON public.trial_balance_imports;

CREATE POLICY "Users can view their company imports"
ON public.trial_balance_imports
FOR SELECT
TO authenticated
USING (
  public.is_company_member(public.get_user_id_from_auth(), company_id)
  OR public.has_role(public.get_user_id_from_auth(), 'admin'::public.app_role)
);

-- 5. Internal error tracking (DOAR pentru service_role/debugging)
CREATE OR REPLACE VIEW public.trial_balance_imports_internal AS
SELECT 
  id,
  company_id,
  file_name,
  status,
  error_message,
  internal_error_detail,  -- Coloane sensibile
  internal_error_code,
  processing_started_at,
  created_at
FROM public.trial_balance_imports
WHERE status IN ('failed', 'error');

COMMENT ON VIEW public.trial_balance_imports_internal IS 
'v1.7: View pentru debugging (service_role only). Include internal_error_detail.';

-- Grant DOAR service_role
GRANT SELECT ON public.trial_balance_imports_internal TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: VIEW-ONLY strategy applied';
  RAISE NOTICE '  - REVOKE SELECT pe trial_balance_imports din authenticated';
  RAISE NOTICE '  - CREATE VIEW trial_balance_imports_public (fără internal_error_detail)';
  RAISE NOTICE '  - GRANT SELECT pe view către authenticated';
  RAISE NOTICE '  - CREATE VIEW trial_balance_imports_internal (debugging, service_role)';
  RAISE NOTICE '';
  RAISE NOTICE 'FRONTEND CHANGES REQUIRED:';
  RAISE NOTICE '  - Înlocuiește .from("trial_balance_imports")';
  RAISE NOTICE '  - Cu .from("trial_balance_imports_public")';
END $$;
