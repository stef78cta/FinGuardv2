/**
 * Migrare: Fix Complet Bucket 'balante' + Storage Policies
 * SCOP: Creează bucket și policies pentru a rezolva "Eroare la încărcare"
 * Versiune: 1.9.1 | Severitate: CRITICĂ
 * Data: 29 ianuarie 2026
 */

-- ============================================================================
-- STEP 1: Creează bucket 'balante' (dacă nu există)
-- ============================================================================

DO $$
BEGIN
    -- Verifică dacă bucket există
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'balante') THEN
        -- Creează bucket
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'balante',
            'balante',
            false, -- NOT public (secured)
            10485760, -- 10MB limit
            ARRAY[
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'application/vnd.ms-excel.sheet.macroEnabled.12',
                'application/vnd.ms-excel.sheet.binary.macroEnabled.12'
            ]
        );
        
        RAISE NOTICE '✅ Bucket "balante" creat cu succes';
    ELSE
        RAISE NOTICE 'ℹ️  Bucket "balante" există deja';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Șterge policies vechi (cleanup)
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload trial balances" ON storage.objects;
DROP POLICY IF EXISTS "Users can read trial balances from their companies" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete trial balances from their companies" ON storage.objects;
DROP POLICY IF EXISTS "Upload balante by company members" ON storage.objects;
DROP POLICY IF EXISTS "Read balante by company members" ON storage.objects;
DROP POLICY IF EXISTS "Delete balante by company members" ON storage.objects;

RAISE NOTICE '✅ Policies vechi șterse';

-- ============================================================================
-- STEP 3: Creează Storage Policies NOI pentru 'balante'
-- ============================================================================

-- Helper function pentru ownership check (optimizat)
CREATE OR REPLACE FUNCTION storage.user_owns_company_folder(folder_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.companies c
        INNER JOIN public.company_users cu ON cu.company_id = c.id
        INNER JOIN public.users u ON u.id = cu.user_id
        WHERE u.auth_user_id = auth.uid()
          AND c.id::text = folder_name
    );
$$;

COMMENT ON FUNCTION storage.user_owns_company_folder IS 
'v1.9: Verifică dacă user-ul curent are acces la company folder';

-- POLICY 1: INSERT (Upload) - Simplu și explicit
CREATE POLICY "balante_upload_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'balante'
    AND storage.user_owns_company_folder((storage.foldername(name))[1])
);

-- POLICY 2: SELECT (Read) - Simplu și explicit
CREATE POLICY "balante_read_policy"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'balante'
    AND storage.user_owns_company_folder((storage.foldername(name))[1])
);

-- POLICY 3: DELETE - Simplu și explicit
CREATE POLICY "balante_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'balante'
    AND storage.user_owns_company_folder((storage.foldername(name))[1])
);

-- POLICY 4: UPDATE - Pentru metadate (opțional dar util)
CREATE POLICY "balante_update_policy"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'balante'
    AND storage.user_owns_company_folder((storage.foldername(name))[1])
);

RAISE NOTICE '✅ Storage policies create cu succes (4 total)';

-- ============================================================================
-- STEP 4: Enable RLS pe storage.objects (dacă nu e deja enabled)
-- ============================================================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

RAISE NOTICE '✅ RLS enabled pe storage.objects';

-- ============================================================================
-- STEP 5: Grant permissions pentru helper function
-- ============================================================================

GRANT EXECUTE ON FUNCTION storage.user_owns_company_folder(text) TO authenticated;
GRANT EXECUTE ON FUNCTION storage.user_owns_company_folder(text) TO service_role;

-- ============================================================================
-- STEP 6: Verificări finale
-- ============================================================================

DO $$
DECLARE
    v_bucket_exists boolean;
    v_policies_count int;
    v_helper_exists boolean;
BEGIN
    -- Verifică bucket
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'balante'
    ) INTO v_bucket_exists;
    
    -- Verifică policies
    SELECT COUNT(*) INTO v_policies_count
    FROM pg_policies
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND policyname LIKE 'balante_%';
    
    -- Verifică helper function
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'user_owns_company_folder'
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage')
    ) INTO v_helper_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICARE FINALĂ:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Bucket "balante" exists: %', v_bucket_exists;
    RAISE NOTICE 'Storage policies count: %', v_policies_count;
    RAISE NOTICE 'Helper function exists: %', v_helper_exists;
    RAISE NOTICE '';
    
    IF NOT v_bucket_exists THEN
        RAISE EXCEPTION '❌ Bucket "balante" nu a fost creat!';
    END IF;
    
    IF v_policies_count < 3 THEN
        RAISE EXCEPTION '❌ Policies incomplete (găsite: %, minim: 3)', v_policies_count;
    END IF;
    
    IF NOT v_helper_exists THEN
        RAISE EXCEPTION '❌ Helper function nu a fost creată!';
    END IF;
    
    RAISE NOTICE '✅✅✅ TOATE VERIFICĂRILE TRECUTE! ✅✅✅';
    RAISE NOTICE '';
    RAISE NOTICE 'Upload ar trebui să funcționeze acum!';
    RAISE NOTICE 'Test: Încearcă să încarci o balanță din UI.';
END $$;

-- ============================================================================
-- Bonus: View pentru debugging rapid
-- ============================================================================

CREATE OR REPLACE VIEW storage.balante_debug AS
SELECT 
    o.name AS file_path,
    (storage.foldername(o.name))[1] AS company_folder,
    o.owner,
    o.created_at,
    o.metadata->>'size' AS file_size,
    c.name AS company_name
FROM storage.objects o
LEFT JOIN public.companies c ON c.id::text = (storage.foldername(o.name))[1]
WHERE o.bucket_id = 'balante'
ORDER BY o.created_at DESC;

COMMENT ON VIEW storage.balante_debug IS 
'v1.9: Debug view pentru fișiere în bucket balante';

GRANT SELECT ON storage.balante_debug TO authenticated;

RAISE NOTICE '✅ Debug view "storage.balante_debug" creată';
RAISE NOTICE '';
RAISE NOTICE '========================================';
RAISE NOTICE '🎉 MIGRARE COMPLETĂ CU SUCCES! 🎉';
RAISE NOTICE '========================================';
