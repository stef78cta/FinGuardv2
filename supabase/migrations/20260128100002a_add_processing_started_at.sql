/**
 * Migrare: Add processing_started_at Column
 * PUNCTUL 2E (v1.4): Previne race conditions în process_import_accounts
 * Versiune: 1.8 | Severitate: ÎNALTĂ (OBLIGATORIU înainte de 100003)
 */

-- Adaugă coloană pentru tracking când a început procesarea
ALTER TABLE public.trial_balance_imports 
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_trial_balance_imports_processing 
ON public.trial_balance_imports(status, processing_started_at) 
WHERE status = 'processing';

COMMENT ON COLUMN public.trial_balance_imports.processing_started_at IS 
'v1.4: Timestamp când a început procesarea. Folosit pentru timeout detection și concurență.';

-- Detectează imports "stale" (processing > 10 min)
CREATE OR REPLACE FUNCTION public.detect_stale_imports()
RETURNS TABLE(
  import_id UUID,
  file_name TEXT,
  started_at TIMESTAMPTZ,
  minutes_elapsed NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    id,
    file_name,
    processing_started_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - processing_started_at)) / 60, 2) AS minutes_elapsed
  FROM public.trial_balance_imports
  WHERE status = 'processing'
    AND processing_started_at < NOW() - INTERVAL '10 minutes';
$$;

COMMENT ON FUNCTION public.detect_stale_imports IS 
'v1.3: Detectează imports blocate în processing > 10 min.';

DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: processing_started_at column added';
  RAISE NOTICE '  - Column: trial_balance_imports.processing_started_at';
  RAISE NOTICE '  - Index: status + processing_started_at';
  RAISE NOTICE '  - Function: detect_stale_imports() pentru monitoring';
  RAISE NOTICE '  - OBLIGATORIU înainte de migrarea 100003';
END $$;
