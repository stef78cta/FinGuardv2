/**
 * DEBUG: Verificare Storage Policies pentru Bucket 'balante'
 * Rulează în Supabase SQL Editor pentru diagnostic
 */

-- ============================================================================
-- STEP 1: Verifică că bucket-ul există
-- ============================================================================

SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
WHERE id IN ('balante', 'trial-balances');

-- Rezultat așteptat: Ar trebui să vezi bucket-ul 'balante'
-- Dacă nu există, trebuie creat!

-- ============================================================================
-- STEP 2: Verifică Storage Policies
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- Rezultat așteptat: Ar trebui să vezi policies pentru INSERT, SELECT, DELETE
-- Verifică că 'bucket_id' în policies se referă la 'balante'

-- ============================================================================
-- STEP 3: Verifică structura folder și fișiere existente
-- ============================================================================

SELECT 
    name,
    bucket_id,
    owner,
    created_at,
    metadata->>'size' AS file_size
FROM storage.objects
WHERE bucket_id = 'balante'
ORDER BY created_at DESC
LIMIT 10;

-- Rezultat: Lista fișierelor din bucket (dacă există)

-- ============================================================================
-- STEP 4: Test Manual Upload Policy (simulare)
-- ============================================================================

-- Verifică dacă user-ul curent poate vedea companiile
SELECT 
    c.id AS company_id,
    c.name AS company_name,
    cu.user_id,
    u.email
FROM public.companies c
JOIN public.company_users cu ON cu.company_id = c.id
JOIN public.users u ON u.id = cu.user_id
WHERE u.auth_user_id = auth.uid();

-- Rezultat: Lista companiilor la care user-ul are acces
-- Trebuie să existe măcar o companie!

-- ============================================================================
-- STEP 5: Verifică că user-ul curent este autentificat
-- ============================================================================

SELECT 
    auth.uid() AS auth_user_id,
    (SELECT id FROM public.users WHERE auth_user_id = auth.uid()) AS internal_user_id,
    (SELECT email FROM public.users WHERE auth_user_id = auth.uid()) AS email;

-- Rezultat: Ar trebui să vezi user_id-ul tău
-- Dacă NULL, înseamnă că nu ești autentificat!

-- ============================================================================
-- QUICK FIX: Recreează Storage Policies pentru 'balante'
-- ============================================================================

-- Doar dacă policies nu există sau sunt greșite, rulează:

-- Șterge policies vechi
DROP POLICY IF EXISTS "Authenticated users can upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload trial balances" ON storage.objects;
DROP POLICY IF EXISTS "Users can read trial balances from their companies" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete trial balances from their companies" ON storage.objects;

-- Creează policies NOI pentru 'balante'
CREATE POLICY "Upload balante by company members"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'balante'
    AND (storage.foldername(name))[1]::uuid IN (
        SELECT c.id
        FROM public.companies c
        JOIN public.company_users cu ON cu.company_id = c.id
        WHERE cu.user_id = (
            SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
    )
);

CREATE POLICY "Read balante by company members"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'balante'
    AND (storage.foldername(name))[1]::uuid IN (
        SELECT c.id
        FROM public.companies c
        JOIN public.company_users cu ON cu.company_id = c.id
        WHERE cu.user_id = (
            SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
    )
);

CREATE POLICY "Delete balante by company members"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'balante'
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
-- VERIFICARE FINALĂ
-- ============================================================================

-- Număr total policies pentru bucket 'balante'
SELECT COUNT(*) AS total_policies
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (qual::text LIKE '%balante%' OR with_check::text LIKE '%balante%');

-- Rezultat așteptat: 3 (INSERT, SELECT, DELETE)

-- ============================================================================
-- SUMAR REZULTATE
-- ============================================================================

DO $$
DECLARE
    v_bucket_exists boolean;
    v_policies_count int;
    v_user_has_companies boolean;
BEGIN
    -- Verifică bucket
    SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'balante') INTO v_bucket_exists;
    
    -- Verifică policies
    SELECT COUNT(*) INTO v_policies_count
    FROM pg_policies
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND (qual::text LIKE '%balante%' OR with_check::text LIKE '%balante%');
    
    -- Verifică companii user
    SELECT EXISTS (
        SELECT 1 
        FROM public.companies c
        JOIN public.company_users cu ON cu.company_id = c.id
        JOIN public.users u ON u.id = cu.user_id
        WHERE u.auth_user_id = auth.uid()
    ) INTO v_user_has_companies;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNOSTIC RESULTS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Bucket "balante" exists: %', v_bucket_exists;
    RAISE NOTICE 'Storage policies count: %', v_policies_count;
    RAISE NOTICE 'User has companies: %', v_user_has_companies;
    RAISE NOTICE '';
    
    IF NOT v_bucket_exists THEN
        RAISE WARNING '❌ PROBLEMA: Bucket "balante" nu există!';
        RAISE NOTICE '   SOLUȚIE: Creează bucket manual în Storage sau rulează:';
        RAISE NOTICE '   INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES (''balante'', ''balante'', false, 10485760);';
    END IF;
    
    IF v_policies_count < 3 THEN
        RAISE WARNING '❌ PROBLEMA: Policies incomplete (găsite: %, așteptate: 3)', v_policies_count;
        RAISE NOTICE '   SOLUȚIE: Rulează secțiunea "QUICK FIX" din acest script';
    END IF;
    
    IF NOT v_user_has_companies THEN
        RAISE WARNING '❌ PROBLEMA: User-ul nu are nicio companie asociată!';
        RAISE NOTICE '   SOLUȚIE: Creează o companie sau asociază user-ul la o companie existentă';
    END IF;
    
    IF v_bucket_exists AND v_policies_count >= 3 AND v_user_has_companies THEN
        RAISE NOTICE '✅ TOATE VERIFICĂRILE TRECUTE! Upload ar trebui să funcționeze.';
    END IF;
END $$;
