/**
 * Migrare: Add Status Column to Companies
 * 
 * PUNCTUL 1A (v1.7): Adaugă coloană status pentru management lifecycle companii
 * 
 * Versiune Plan: 1.8
 * Data: 28 Ianuarie 2026
 * Severitate: MEDIE (opțional dar RECOMANDAT)
 * 
 * SCOP:
 * Permite operațiuni legitime care necesită DELETE ultimul membru:
 * - GDPR / User delete
 * - Archive companie
 * - Cleanup administrativ
 * 
 * Fără această coloană, trigger-ul prevent_last_member_removal() din migrarea
 * 100004 va bloca TOATE DELETE-urile ultimului membru, inclusiv cele legitime.
 * 
 * STATUS VALUES:
 * - 'active' (default): Companie activă, constraint triggers aplică toate regulile
 * - 'archived': Companie inactivă, poate fi ștearsă complet (membri + date)
 * - 'deleting': În curs de ștergere (GDPR/cleanup), permite operațiuni destructive
 * 
 * BENEFICII:
 * - Permite flux explicit pentru închidere companie
 * - Rezolvă blocare GDPR (user delete când e ultimul membru)
 * - Permite cleanup administrativ fără dezactivare triggere
 * 
 * MIGRĂRI LEGATE:
 * - 100000: Policy bootstrap (va fi actualizat să excludă archived)
 * - 100004: Constraint triggers (va ignora verificări pentru status != 'active')
 * 
 * ROLLBACK:
 * - Dacă migrarea 100004 NU a fost aplicată: DROP COLUMN este safe
 * - Dacă migrarea 100004 A fost aplicată: NU DROP (triggers depind de status)
 */

-- =============================================================================
-- 1. Adaugă coloană status cu valori permise
-- =============================================================================

ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'archived', 'deleting'));

COMMENT ON COLUMN public.companies.status IS 
'v1.7: Lifecycle status pentru operațiuni GDPR și cleanup. active=normal, archived=inactiv dar păstrat, deleting=în curs de ștergere.';

-- =============================================================================
-- 2. Actualizează toate companiile existente la 'active'
-- =============================================================================

-- Asigură că toate companiile existente sunt marcate 'active'
UPDATE public.companies 
SET status = 'active' 
WHERE status IS NULL OR status NOT IN ('active', 'archived', 'deleting');

-- =============================================================================
-- 3. Creează index pentru performanță (queries cu WHERE status = 'active')
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_companies_status 
ON public.companies(status) 
WHERE status = 'active';

COMMENT ON INDEX idx_companies_status IS 
'v1.7: Optimizare pentru queries de companii active (cel mai comun filtru).';

-- =============================================================================
-- 4. Actualizează policy bootstrap să excludă companii archived (OPȚIONAL)
-- =============================================================================

/**
 * NOTĂ: Această actualizare este OPȚIONALĂ în v1.7.
 * 
 * Policy-ul de bootstrap din migrarea 100000 deja previne auto-join prin
 * verificarea "NOT EXISTS membri". Adăugarea exclude archived e defense in depth.
 * 
 * DECIZIE: Comentat pentru moment, poate fi activat în producție dacă necesar.
 */

-- UNCOMMENT DACĂ VREI DEFENSE IN DEPTH EXTRA:
-- DROP POLICY IF EXISTS "Company members can add members (bootstrap allowed)" 
--   ON public.company_users;
-- 
-- CREATE POLICY "Company members can add members (bootstrap allowed)"
-- ON public.company_users
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   (
--     user_id = public.get_user_id_from_auth()
--     AND NOT EXISTS (
--       SELECT 1 
--       FROM public.company_users cu2 
--       WHERE cu2.company_id = company_users.company_id
--     )
--     -- v1.7: Exclude bootstrap pentru companii archived/deleting
--     AND NOT EXISTS (
--       SELECT 1 
--       FROM public.companies c 
--       WHERE c.id = company_users.company_id 
--         AND c.status IN ('archived', 'deleting')
--     )
--   )
--   OR public.is_company_member(public.get_user_id_from_auth(), company_users.company_id)
--   OR public.has_role(public.get_user_id_from_auth(), 'admin'::public.app_role)
--   OR public.has_role(public.get_user_id_from_auth(), 'super_admin'::public.app_role)
-- );

-- =============================================================================
-- 5. Funcții helper pentru management status (BONUS)
-- =============================================================================

/**
 * Helper function: archive_company
 * 
 * Marchează o companie ca archived, permițând DELETE ulterior al membrilor.
 * Doar owner sau admin pot arhiva.
 */
CREATE OR REPLACE FUNCTION public.archive_company(
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_status VARCHAR(20);
BEGIN
  v_user_id := public.get_user_id_from_auth();
  
  -- Verifică permisiuni (owner/admin sau member cu role admin în companie)
  IF NOT (
    public.is_company_member(v_user_id, p_company_id)
    OR public.has_role(v_user_id, 'admin'::public.app_role)
    OR public.has_role(v_user_id, 'super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You must be a company member or admin to archive this company';
  END IF;
  
  -- Obține status curent
  SELECT status INTO v_current_status
  FROM public.companies
  WHERE id = p_company_id;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Company not found';
  END IF;
  
  IF v_current_status = 'deleting' THEN
    RAISE EXCEPTION 'Cannot archive company that is already being deleted';
  END IF;
  
  -- Marchează ca archived
  UPDATE public.companies
  SET status = 'archived', updated_at = NOW()
  WHERE id = p_company_id;
  
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.archive_company IS 
'v1.7: Marchează companie ca archived, permițând DELETE membri. Doar member/admin pot apela.';

-- Grant execute pentru authenticated (verificare permisiuni e în funcție)
GRANT EXECUTE ON FUNCTION public.archive_company TO authenticated;

-- =============================================================================
-- 6. Verificare post-migrare
-- =============================================================================

DO $$
DECLARE
  v_has_column BOOLEAN;
  v_active_count INT;
  v_total_count INT;
BEGIN
  -- Verifică că coloana a fost adăugată
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'companies' 
      AND column_name = 'status'
  ) INTO v_has_column;

  IF NOT v_has_column THEN
    RAISE EXCEPTION 'MIGRATION FAILED: Column status was not added to companies table';
  END IF;

  -- Verifică că toate companiile au status valid
  SELECT COUNT(*) INTO v_active_count
  FROM public.companies
  WHERE status = 'active';
  
  SELECT COUNT(*) INTO v_total_count
  FROM public.companies;

  RAISE NOTICE 'SUCCESS: Status column added to companies table';
  RAISE NOTICE '  - Column created with CHECK constraint';
  RAISE NOTICE '  - Index idx_companies_status created';
  RAISE NOTICE '  - All % existing companies marked as active', v_total_count;
  RAISE NOTICE '  - Helper function archive_company() created';
  RAISE NOTICE '';
  RAISE NOTICE 'STATUS DISTRIBUTION:';
  RAISE NOTICE '  - active: % companies', v_active_count;
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Aplică migrarea 100000b (try_uuid helper) - OBLIGATORIU';
  RAISE NOTICE '  2. Aplică migrarea 100004 (constraint triggers) - OBLIGATORIU';
  RAISE NOTICE '  3. Testează flux archive: archive_company() apoi DELETE membri';
  RAISE NOTICE '';
  RAISE NOTICE 'FLUX ARCHIVE COMPANIE:';
  RAISE NOTICE '  1. Admin/Owner: SELECT archive_company(''<company_id>'')';
  RAISE NOTICE '  2. Trigger în 100004 va permite DELETE ultimul membru';
  RAISE NOTICE '  3. Opțional: DELETE companie (CASCADE va șterge toate datele)';
END $$;

-- =============================================================================
-- 7. Queries de diagnostic
-- =============================================================================

-- Afișează distribuția status-urilor
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC: Companies Status Distribution';
  RAISE NOTICE '========================================';
  
  FOR r IN 
    SELECT 
      status,
      COUNT(*) AS count,
      ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
    FROM public.companies
    GROUP BY status
    ORDER BY count DESC
  LOOP
    RAISE NOTICE 'Status: % | Count: % | Percentage: %', 
      r.status, r.count, r.percentage || '%';
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
