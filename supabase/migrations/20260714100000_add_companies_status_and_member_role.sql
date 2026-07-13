/**
 * Migrare: companies.status + company_users.role
 *
 * Faza 1 (remediere CUI multi-tenant):
 * - companies.status: lifecycle (active/archived/deleting) necesar triggerelor de orphan-prevention
 *   și fluxurilor GDPR/archive.
 * - company_users.role: distincție owner/admin/member, necesară pentru aprobarea cererilor de acces
 *   (doar owner/admin pot aproba) și pentru claritatea proprietății companiei.
 *
 * Idempotent: ADD COLUMN IF NOT EXISTS. Backfill owner = primul membru per companie.
 */

-- =============================================================================
-- 1. companies.status
-- =============================================================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.companies'::regclass
      AND conname = 'companies_status_check'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_status_check
      CHECK (status IN ('active', 'archived', 'deleting'));
  END IF;
END $$;

COMMENT ON COLUMN public.companies.status IS
'Lifecycle: active=normal, archived=inactiv dar păstrat, deleting=în curs de ștergere (GDPR/cleanup).';

CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);

-- =============================================================================
-- 2. company_users.role
-- =============================================================================
ALTER TABLE public.company_users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'member';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.company_users'::regclass
      AND conname = 'company_users_role_check'
  ) THEN
    ALTER TABLE public.company_users
      ADD CONSTRAINT company_users_role_check
      CHECK (role IN ('owner', 'admin', 'member'));
  END IF;
END $$;

COMMENT ON COLUMN public.company_users.role IS
'Rol în companie: owner (creator), admin (gestionează membri), member (acces standard).';

-- Backfill: primul membru (după created_at) al fiecărei companii devine owner
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY company_id ORDER BY created_at ASC, id ASC
  ) AS rn
  FROM public.company_users
)
UPDATE public.company_users cu
SET role = 'owner'
FROM ranked r
WHERE cu.id = r.id AND r.rn = 1 AND cu.role <> 'owner';
