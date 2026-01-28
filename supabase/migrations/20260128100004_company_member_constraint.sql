/**
 * Migrare: Company Member Constraint Triggers
 * PUNCTUL 1A (v1.5-v1.8): Previne orphan companies (INSERT fără membri + DELETE ultimul membru)
 * Versiune: 1.8 | Severitate: CRITICĂ
 */

-- =================================================================
-- TRIGGER 1: Previne INSERT companie fără membri (AFTER INSERT)
-- =================================================================

CREATE OR REPLACE FUNCTION public.check_company_has_member()
RETURNS TRIGGER AS $$
BEGIN
  -- v1.8: Skip dacă compania a fost ștearsă ulterior în tranzacție (seed/test)
  IF NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
  -- Verifică membership doar dacă compania există
  IF NOT EXISTS (
    SELECT 1 FROM public.company_users cu WHERE cu.company_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Company must have at least one member';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER enforce_company_has_member
AFTER INSERT ON public.companies
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_company_has_member();

COMMENT ON TRIGGER enforce_company_has_member ON public.companies IS 
'v1.8: Previne orphan companies la INSERT. Skip dacă companie ștearsă în aceeași tranzacție.';

-- =================================================================
-- TRIGGER 2: Previne DELETE ultimul membru (AFTER DELETE)
-- =================================================================

CREATE OR REPLACE FUNCTION public.prevent_last_member_removal()
RETURNS TRIGGER AS $$
DECLARE
  v_remaining_count INT;
  v_company_status VARCHAR;
BEGIN
  -- v1.8: Permite CASCADE delete de la companies
  IF NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = OLD.company_id) THEN
    RETURN OLD;
  END IF;
  
  -- v1.7: Obține status (dacă coloana există)
  BEGIN
    SELECT status INTO v_company_status
    FROM public.companies WHERE id = OLD.company_id;
  EXCEPTION WHEN undefined_column THEN
    v_company_status := 'active';  -- Default dacă coloana nu există
  END;
  
  -- v1.7: Ignoră verificare pentru companii archived/deleting
  IF v_company_status IN ('archived', 'deleting') THEN
    RETURN OLD;
  END IF;
  
  -- v1.7: COUNT simplu (trigger AFTER DELETE → OLD.user_id deja exclus)
  SELECT COUNT(*) INTO v_remaining_count
  FROM public.company_users WHERE company_id = OLD.company_id;
  
  IF v_remaining_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove last member from active company. Archive company first or transfer ownership.';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER enforce_company_has_member_on_delete
AFTER DELETE ON public.company_users
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_member_removal();

-- Similar pentru UPDATE (dacă company_id poate fi modificat)
CREATE CONSTRAINT TRIGGER enforce_company_has_member_on_update
AFTER UPDATE OF company_id ON public.company_users
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_member_removal();

COMMENT ON TRIGGER enforce_company_has_member_on_delete ON public.company_users IS 
'v1.7+v1.8: Previne DELETE ultimul membru. Permite CASCADE. Ignoră archived/deleting.';

DO $$
BEGIN
  RAISE NOTICE 'SUCCESS: Constraint triggers created';
  RAISE NOTICE '  - Trigger INSERT: enforce_company_has_member';
  RAISE NOTICE '  - Trigger DELETE: enforce_company_has_member_on_delete';
  RAISE NOTICE '  - Trigger UPDATE: enforce_company_has_member_on_update';
  RAISE NOTICE '  - v1.8: Skip logic pentru INSERT+DELETE seed-uri';
  RAISE NOTICE '  - v1.8: Permite CASCADE delete de la companies';
  RAISE NOTICE '  - v1.7: Excepție pentru status archived/deleting';
  RAISE NOTICE '';
  RAISE NOTICE 'FLUX ARCHIVE COMPANIE (pentru DELETE ultimul membru):';
  RAISE NOTICE '  1. UPDATE companies SET status = ''archived'' WHERE id = <company_id>';
  RAISE NOTICE '  2. DELETE FROM company_users WHERE company_id = <company_id>';
  RAISE NOTICE '  3. Opțional: DELETE FROM companies WHERE id = <company_id> (CASCADE)';
END $$;
