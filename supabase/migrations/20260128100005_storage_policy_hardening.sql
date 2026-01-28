/**
 * Migrare: Storage Policy Hardening
 * PUNCTUL 4 (v1.6 + v1.8): Validare file.name + try_uuid safe cast
 * Versiune: 1.8 | Severitate: MEDIE
 * DEPENDENCY: 100000b (try_uuid function)
 */

-- Drop policy-uri vechi (dacă există)
DROP POLICY IF EXISTS "Users can upload to their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read from their folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from their folder" ON storage.objects;

-- ============================================================
-- POLICY 1: INSERT (Upload) cu validări stricte
-- ============================================================

CREATE POLICY "Users can upload to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trial-balances'
  -- v1.8: Folosește try_uuid (nu ::uuid direct pentru safety)
  AND public.try_uuid(storage.foldername(name)) = auth.uid()
  -- v1.6: Validări suplimentare pentru name
  AND name IS NOT NULL
  AND LENGTH(name) < 500  -- Previne nesting excesiv
  AND name ~* '^[a-f0-9-]{36}/[a-zA-Z0-9._\- ]+\.(xlsx|xls)$'  -- v1.6: case-insensitive regex
);

COMMENT ON POLICY "Users can upload to their folder" ON storage.objects IS 
'v1.8: Upload cu try_uuid safe cast. v1.6: Validări name (length, regex, NULL guards).';

-- ============================================================
-- POLICY 2: SELECT (Download/Read) cu validări
-- ============================================================

CREATE POLICY "Users can read from their folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'trial-balances'
  AND public.try_uuid(storage.foldername(name)) = auth.uid()
  AND name IS NOT NULL
);

-- ============================================================
-- POLICY 3: DELETE cu validări
-- ============================================================

CREATE POLICY "Users can delete from their folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'trial-balances'
  AND public.try_uuid(storage.foldername(name)) = auth.uid()
  AND name IS NOT NULL
);

DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Storage policies hardened';
  RAISE NOTICE '  - v1.8: Folosește try_uuid() (safe cast, nu aruncă excepție)';
  RAISE NOTICE '  - v1.6: NULL guards (name IS NOT NULL)';
  RAISE NOTICE '  - v1.6: Length limit (< 500 chars)';
  RAISE NOTICE '  - v1.6: Regex case-insensitive (~*)';
  RAISE NOTICE '  - Format valid: <uuid>/<filename>.(xlsx|xls)';
  RAISE NOTICE '';
  RAISE NOTICE 'FRONTEND CHANGES (v1.7 - RECOMANDAT):';
  RAISE NOTICE '  - Normalizează ASCII: .normalize("NFD").replace(/[\u0300-\u036f]/g, "")';
  RAISE NOTICE '  - Validează regex: /^[a-zA-Z0-9._\- ]+$/';
  RAISE NOTICE '  - Exemplu: "balanță.xlsx" → "balanta.xlsx"';
END $$;
