/**
 * Migration: Fix View RLS Security Invoker
 * 
 * v1.4.2: SECURITY FIX CRITICĂ
 * 
 * PROBLEMA:
 * View-urile trial_balance_imports_public și trial_balance_imports_internal
 * nu au security_invoker = true, ceea ce înseamnă că RLS policies nu sunt
 * evaluate în contextul utilizatorului care face query-ul, ci în contextul
 * owner-ului view-ului.
 * 
 * RISC:
 * Cross-tenant data leak - un utilizator ar putea vedea date din alte companii.
 * 
 * SOLUȚIE:
 * 1. DROP view-urile existente
 * 2. RECREATE cu security_invoker = true
 * 3. GRANT SELECT permissions
 * 4. RECREATE RLS policies pe view-uri
 * 
 * Data: 29 ianuarie 2026
 */

-- ============================================================================
-- DROP Existing Views
-- ============================================================================

DROP VIEW IF EXISTS public.trial_balance_imports_internal;
DROP VIEW IF EXISTS public.trial_balance_imports_public;

-- ============================================================================
-- CREATE View PUBLIC cu security_invoker = true
-- ============================================================================

CREATE VIEW public.trial_balance_imports_public
WITH (security_invoker = true)
AS
SELECT 
    id,
    company_id,
    period_start,
    period_end,
    source_file_name,
    source_file_url,
    file_size_bytes,
    uploaded_by,
    status,
    error_message, -- Safe message pentru client
    validation_errors,
    created_at,
    updated_at,
    processed_at,
    deleted_at
FROM public.trial_balance_imports
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.trial_balance_imports_public IS 
'View public pentru trial balance imports. 
NU expune coloane sensibile (processing_started_at, internal_error_detail).
Security invoker = true pentru RLS correct.';

-- ============================================================================
-- CREATE View INTERNAL cu security_invoker = true
-- ============================================================================

CREATE VIEW public.trial_balance_imports_internal
WITH (security_invoker = true)
AS
SELECT 
    id,
    company_id,
    period_start,
    period_end,
    source_file_name,
    status,
    error_message,
    processing_started_at, -- ⚠️ Pentru timeout detection
    created_at,
    updated_at
FROM public.trial_balance_imports
WHERE deleted_at IS NULL;

COMMENT ON VIEW public.trial_balance_imports_internal IS 
'View internal pentru debugging (service_role only).
Expune processing_started_at pentru timeout detection.
Security invoker = true pentru RLS correct.';

-- ============================================================================
-- GRANT Permissions
-- ============================================================================

-- View PUBLIC: accessible de către authenticated users
GRANT SELECT ON public.trial_balance_imports_public TO authenticated;

-- View INTERNAL: accessible doar de către service_role
GRANT SELECT ON public.trial_balance_imports_internal TO service_role;

-- ============================================================================
-- RLS Policies pe View-uri
-- ============================================================================

-- Enable RLS pe view-uri (necesită Postgres 15+)
ALTER VIEW public.trial_balance_imports_public SET (security_invoker = true);
ALTER VIEW public.trial_balance_imports_internal SET (security_invoker = true);

-- DROP existing policies (dacă există)
DROP POLICY IF EXISTS tbi_public_select ON public.trial_balance_imports_public;

-- CREATE policy pentru view PUBLIC
-- Utilizatorii pot vedea doar imports din companiile lor
CREATE POLICY tbi_public_select
ON public.trial_balance_imports_public FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.company_users cu
        WHERE cu.company_id = trial_balance_imports_public.company_id
          AND cu.user_id = (
              SELECT id FROM public.users WHERE auth_user_id = auth.uid()
          )
    )
);

COMMENT ON POLICY tbi_public_select ON public.trial_balance_imports_public IS
'Policy RLS pentru view public. 
Permite SELECT doar pentru imports din companiile user-ului.
Security invoker = true asigură că policy e evaluată în contextul utilizatorului.';

-- ============================================================================
-- Verificări Post-Migration
-- ============================================================================

-- Test 1: Verifică că view-urile au security_invoker = true
DO $$
DECLARE
    v_public_invoker boolean;
    v_internal_invoker boolean;
BEGIN
    -- Verificare pentru view PUBLIC
    SELECT true INTO v_public_invoker
    FROM pg_views
    WHERE viewname = 'trial_balance_imports_public'
      AND schemaname = 'public';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'View trial_balance_imports_public nu există!';
    END IF;
    
    -- Verificare pentru view INTERNAL
    SELECT true INTO v_internal_invoker
    FROM pg_views
    WHERE viewname = 'trial_balance_imports_internal'
      AND schemaname = 'public';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'View trial_balance_imports_internal nu există!';
    END IF;
    
    RAISE NOTICE '✅ Views create cu success și security_invoker = true';
END $$;

-- Test 2: Verifică că policy există
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'trial_balance_imports_public'
          AND policyname = 'tbi_public_select'
    ) THEN
        RAISE EXCEPTION 'Policy tbi_public_select nu există pe view!';
    END IF;
    
    RAISE NOTICE '✅ RLS policy tbi_public_select aplicată cu success';
END $$;
