/**
 * Migrare: Rate Limits Table (DB-based)
 * 
 * PUNCTUL 2B: Înlocuiește rate limiting in-memory cu persistent DB
 * 
 * Versiune Plan: 1.8
 * Severitate: MEDIE
 * 
 * PROBLEMĂ:
 * Rate limiting curent e in-memory (Map în Edge Function) → resetează la redeploy
 * 
 * SOLUȚIE:
 * Tabel persistent cu cleanup automat (PostgreSQL native)
 * 
 * BENEFICII:
 * - Persistent între redeploy-uri
 * - Partajat între toate instanțele Edge Function
 * - Cleanup automat (pg_cron sau manual periodic)
 * - Observabilitate (SELECT din rate_limits)
 */

-- =============================================================================
-- 1. Creează tabelul rate_limits
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,  -- ex: 'import', 'company_create', 'report_gen'
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reset_in_seconds INT NOT NULL,  -- v1.4: clarificare unitați
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pentru performanță (queries frecvente: WHERE user_id + resource_type)
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_resource 
ON public.rate_limits(user_id, resource_type, window_start);

-- Index pentru cleanup (DELETE WHERE window_start < NOW() - interval)
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
ON public.rate_limits(window_start) 
WHERE window_start < NOW() - INTERVAL '1 hour';

COMMENT ON TABLE public.rate_limits IS 
'v1.4: Rate limiting persistent. Fixed window. Cleanup manual sau pg_cron. Units: reset_in_seconds.';

-- =============================================================================
-- 2. Tabel metadata pentru cleanup tracking (v1.2)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_cleanup_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cleanup_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial (sau DO NOTHING dacă există deja)
INSERT INTO public.rate_limits_meta (last_cleanup_at, cleanup_count)
VALUES (NOW(), 0)
ON CONFLICT DO NOTHING;  -- v1.3: Permite cleanup simultan

COMMENT ON TABLE public.rate_limits_meta IS 
'v1.3: Metadata pentru cleanup jobs. ON CONFLICT DO NOTHING pentru concurență.';

-- =============================================================================
-- 3. Funcție check_rate_limit (apelată din Edge Function)
-- =============================================================================

/**
 * check_rate_limit: Verifică și incrementează request count pentru user
 * 
 * @param p_user_id - ID utilizator (din get_user_id_from_auth() în Edge)
 * @param p_resource_type - Tip resursă (ex: 'import')
 * @param p_max_requests - Limită requests per fereastră
 * @param p_window_seconds - Durată fereastră (ex: 3600 pentru 1h)
 * @returns BOOLEAN - TRUE dacă permis, FALSE dacă limită depășită
 * 
 * SECURITY:
 * - SECURITY DEFINER pentru acces la rate_limits (service_role only table)
 * - Validare p_user_id obligatoriu (previne bypass)
 * - v1.4: Fail-closed strategy (eroare DB → returnează FALSE, nu TRUE)
 */
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_resource_type VARCHAR,
  p_max_requests INT DEFAULT 10,
  p_window_seconds INT DEFAULT 3600  -- v1.4: renamed din p_window_duration_seconds
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_window TIMESTAMPTZ;
  v_existing_count INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Validare parametri
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required for rate limiting';
  END IF;
  
  IF p_resource_type IS NULL OR TRIM(p_resource_type) = '' THEN
    RAISE EXCEPTION 'resource_type is required';
  END IF;
  
  -- Calculează start-ul ferestrei curente (fixed window)
  v_current_window := DATE_TRUNC('hour', NOW());  -- Simplu: fereastră pe oră
  -- Pentru granularitate mai fină: DATE_TRUNC('minute', NOW())
  
  -- Verifică dacă există entry pentru user + resource în fereastra curentă
  SELECT request_count, window_start
  INTO v_existing_count, v_window_start
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND resource_type = p_resource_type
    AND window_start >= v_current_window  -- Doar fereastra curentă
  LIMIT 1;
  
  IF v_existing_count IS NULL THEN
    -- Nu există entry → creează nou
    INSERT INTO public.rate_limits (
      user_id, 
      resource_type, 
      request_count, 
      window_start, 
      reset_in_seconds
    )
    VALUES (
      p_user_id, 
      p_resource_type, 
      1,  -- Primul request
      v_current_window,
      p_window_seconds
    );
    
    RETURN TRUE;  -- Primul request în fereastră → permis
  ELSIF v_existing_count < p_max_requests THEN
    -- Sub limită → incrementează
    UPDATE public.rate_limits
    SET request_count = request_count + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND resource_type = p_resource_type
      AND window_start >= v_current_window;
    
    RETURN TRUE;  -- Permis
  ELSE
    -- Limită depășită → refuză
    RETURN FALSE;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- v1.4: Fail-closed strategy (eroare DB → refuz, nu accept)
    -- Log intern pentru debugging
    RAISE NOTICE 'check_rate_limit ERROR: SQLSTATE=%, SQLERRM=%', SQLSTATE, SQLERRM;
    RETURN FALSE;  -- Fail-closed: dacă DB unavailable → refuz cerere
END;
$$;

COMMENT ON FUNCTION public.check_rate_limit IS 
'v1.4: Rate limiting DB. Fixed window. Fail-closed (eroare → FALSE). Service role only.';

-- Permisiuni: DOAR service_role (Edge Function cu SERVICE_ROLE_KEY)
REVOKE ALL ON FUNCTION public.check_rate_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;

-- =============================================================================
-- 4. Funcție cleanup (apelată periodic: cron sau manual)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_rate_limits(
  p_retention_hours INT DEFAULT 2  -- Șterge entries > 2h vechi
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  -- Șterge entries expirate
  DELETE FROM public.rate_limits
  WHERE window_start < NOW() - (p_retention_hours || ' hours')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Actualizează metadata
  UPDATE public.rate_limits_meta
  SET last_cleanup_at = NOW(),
      cleanup_count = cleanup_count + v_deleted_count;
  
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_rate_limits IS 
'Cleanup periodic pentru rate_limits. Apelează manual sau via pg_cron.';

-- Permisiuni: service_role sau postgres
REVOKE ALL ON FUNCTION public.cleanup_rate_limits FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits TO service_role;

-- =============================================================================
-- 5. RLS Policies (tabele accesibile doar prin funcții SECURITY DEFINER)
-- =============================================================================

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits_meta ENABLE ROW LEVEL SECURITY;

-- NU creem policies pentru authenticated (acces doar prin funcții SECURITY DEFINER)
-- Service role bypass RLS oricum

-- =============================================================================
-- 6. Verificare post-migrare
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Rate limiting DB tables created';
  RAISE NOTICE '  - Table: rate_limits (user_id, resource_type, request_count)';
  RAISE NOTICE '  - Table: rate_limits_meta (cleanup tracking)';
  RAISE NOTICE '  - Function: check_rate_limit() (SECURITY DEFINER, service_role only)';
  RAISE NOTICE '  - Function: cleanup_rate_limits() (manual sau cron)';
  RAISE NOTICE '  - Indexes: user_resource, window_start';
  RAISE NOTICE '';
  RAISE NOTICE 'EDGE FUNCTION CHANGES REQUIRED:';
  RAISE NOTICE '  - Replace in-memory Map with RPC call to check_rate_limit()';
  RAISE NOTICE '  - Use SERVICE_ROLE client (not ANON)';
  RAISE NOTICE '  - Handle FALSE return → 429 Too Many Requests';
  RAISE NOTICE '  - v1.3: Add Retry-After header (seconds until reset)';
  RAISE NOTICE '';
  RAISE NOTICE 'CLEANUP:';
  RAISE NOTICE '  - Manual: SELECT cleanup_rate_limits(2);';
  RAISE NOTICE '  - Cron (optional): pg_cron every 1 hour';
END $$;
