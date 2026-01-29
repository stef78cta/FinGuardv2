/**
 * QUICK FIX: Creează Bucket 'trial-balances' și Policies
 * Rulează în Supabase SQL Editor
 */

-- Creează bucket (dacă nu există)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'trial-balances',
    'trial-balances',
    false,
    10485760, -- 10MB
    ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO NOTHING;

-- Șterge policies vechi
DROP POLICY IF EXISTS "Authenticated users can upload trial balances" ON storage.objects;
DROP POLICY IF EXISTS "Users can read trial balances from their companies" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete trial balances from their companies" ON storage.objects;

-- POLICY 1: Upload
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

-- POLICY 2: Read
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

-- POLICY 3: Delete
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

-- Verificare
SELECT 
    'Bucket created: ' || id AS status
FROM storage.buckets 
WHERE id = 'trial-balances';
