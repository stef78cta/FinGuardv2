/**
 * Migration: Fix Storage Bucket Consistency
 * 
 * v1.4.1: FIX CRITIC - Bucket Name Inconsistent
 * 
 * PROBLEMA:
 * Cod folosește 'balante' în unele locuri și 'trial-balances' în altele.
 * Storage policies pot fi pe bucket diferit → upload eșuează.
 * 
 * DECIZIE:
 * Standardizăm la 'trial-balances' (naming convention internațional).
 * 
 * ACȚIUNI:
 * 1. CREATE bucket 'trial-balances' (dacă nu există)
 * 2. MIGRATE date din 'balante' la 'trial-balances' (dacă 'balante' există)
 * 3. UPDATE storage policies pentru 'trial-balances'
 * 4. UPDATE referințe în trial_balance_imports.source_file_url
 * 
 * ⚠️ IMPORTANT: Această migrare necesită service_role permissions.
 * Rulează manual în Supabase Dashboard SQL Editor sau cu supabase db push.
 * 
 * Data: 29 ianuarie 2026
 */

-- ============================================================================
-- STEP 1: Verifică și creează bucket 'trial-balances'
-- ============================================================================

DO $$
DECLARE
    v_bucket_exists boolean;
BEGIN
    -- Verifică dacă bucket există
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'trial-balances'
    ) INTO v_bucket_exists;
    
    IF NOT v_bucket_exists THEN
        -- Creează bucket
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'trial-balances',
            'trial-balances',
            false, -- NOT public (secured)
            10485760, -- 10MB limit
            ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
        );
        
        RAISE NOTICE '✅ Bucket trial-balances creat cu succes';
    ELSE
        RAISE NOTICE 'ℹ️  Bucket trial-balances există deja';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Migrare date din 'balante' la 'trial-balances' (dacă există)
-- ============================================================================

-- ⚠️ NOTĂ: Această secțiune trebuie rulată manual sau prin script Node.js
-- deoarece necesită copiere fișiere în storage, care nu se poate face direct în SQL.
-- 
-- Alternativă:
-- 1. Export fișiere din 'balante' bucket
-- 2. Upload în 'trial-balances' bucket
-- 3. Update trial_balance_imports.source_file_url
-- 
-- Dacă 'balante' bucket nu există sau e gol, se poate sări această secțiune.

-- UPDATE paths în database (înlocuiește prefix 'balante/' cu 'trial-balances/')
-- Doar dacă există date care să necesite migrare

DO $$
DECLARE
    v_updated_count int;
BEGIN
    -- Update source_file_url pentru înregistrări vechi (dacă au prefix 'balante/')
    -- ⚠️ Această operație presupune că fișierele au fost deja copiate în storage
    
    UPDATE public.trial_balance_imports
    SET source_file_url = REPLACE(source_file_url, 'balante/', 'trial-balances/')
    WHERE source_file_url LIKE 'balante/%';
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count > 0 THEN
        RAISE NOTICE '✅ Actualizate % înregistrări cu path-uri noi', v_updated_count;
    ELSE
        RAISE NOTICE 'ℹ️  Nicio înregistrare cu path vechi găsită';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Storage Policies pentru 'trial-balances'
-- ============================================================================

-- DROP existing policies (dacă există)
DROP POLICY IF EXISTS "Authenticated users can upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- POLICY 1: Upload - Users pot upload în propriul folder (company_id/filename)
CREATE POLICY "Authenticated users can upload trial balances"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'trial-balances'
    AND (storage.foldername(name))[1]::uuid IN (
        SELECT c.id
        FROM public.companies c
        JOIN public.company_users cu ON cu.company_id = c.id
        WHERE cu.user_id = (
            SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
    )
);

-- POLICY 2: Read - Users pot citi fișiere din companiile lor
CREATE POLICY "Users can read trial balances from their companies"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'trial-balances'
    AND (storage.foldername(name))[1]::uuid IN (
        SELECT c.id
        FROM public.companies c
        JOIN public.company_users cu ON cu.company_id = c.id
        WHERE cu.user_id = (
            SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
    )
);

-- POLICY 3: Delete - Users pot șterge fișiere din companiile lor
CREATE POLICY "Users can delete trial balances from their companies"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'trial-balances'
    AND (storage.foldername(name))[1]::uuid IN (
        SELECT c.id
        FROM public.companies c
        JOIN public.company_users cu ON cu.company_id = c.id
        WHERE cu.user_id = (
            SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
    )
);

-- ============================================================================
-- STEP 4: Verificări Post-Migration
-- ============================================================================

-- Test 1: Verifică că bucket există
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'trial-balances') THEN
        RAISE EXCEPTION 'Bucket trial-balances nu există!';
    END IF;
    
    RAISE NOTICE '✅ Bucket trial-balances verificat';
END $$;

-- Test 2: Verifică că policies există
DO $$
DECLARE
    v_policy_count int;
BEGIN
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname LIKE '%trial balance%';
    
    IF v_policy_count < 3 THEN
        RAISE WARNING 'Doar % din 3 policies găsite pentru trial-balances', v_policy_count;
    ELSE
        RAISE NOTICE '✅ Toate cele 3 storage policies aplicate cu succes';
    END IF;
END $$;

-- Test 3: Verifică că nu mai există referințe la 'balante/' în database
DO $$
DECLARE
    v_old_refs_count int;
BEGIN
    SELECT COUNT(*) INTO v_old_refs_count
    FROM public.trial_balance_imports
    WHERE source_file_url LIKE 'balante/%';
    
    IF v_old_refs_count > 0 THEN
        RAISE WARNING '⚠️  Există încă % referințe la bucket vechi "balante/"', v_old_refs_count;
    ELSE
        RAISE NOTICE '✅ Nicio referință la bucket vechi găsită';
    END IF;
END $$;

-- ============================================================================
-- Manual Steps (dacă e necesar)
-- ============================================================================

-- Dacă există fișiere în 'balante' bucket care trebuie migrate:
-- 
-- 1. Export fișiere din Supabase Dashboard:
--    Storage → balante → Download all files
-- 
-- 2. Upload în trial-balances bucket:
--    Storage → trial-balances → Upload files
--    (păstrează structura company_id/filename)
-- 
-- 3. Verifică că path-urile din database sunt actualizate:
--    SELECT source_file_url FROM trial_balance_imports WHERE source_file_url LIKE 'balante/%';
-- 
-- 4. Șterge bucket vechi (opțional, după verificare):
--    DELETE FROM storage.buckets WHERE id = 'balante';
