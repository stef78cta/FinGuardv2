/**
 * Migrare: Câmpuri profil companie pentru Setări → Companie
 *
 * Adaugă coloane opționale pentru date complete ale companiei.
 * Păstrează compatibilitatea cu înregistrările existente (toate NULL by default).
 */

ALTER TABLE public.companies
  ALTER COLUMN country_code TYPE VARCHAR(100) USING country_code::VARCHAR(100);

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS trade_register_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS legal_form VARCHAR(100),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS county VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS website VARCHAR(255);

COMMENT ON COLUMN public.companies.trade_register_number IS 'Nr. Registrul Comerțului (opțional)';
COMMENT ON COLUMN public.companies.legal_form IS 'Formă juridică / tip companie (opțional)';
COMMENT ON COLUMN public.companies.city IS 'Localitate sediu';
COMMENT ON COLUMN public.companies.county IS 'Județ / sector';
COMMENT ON COLUMN public.companies.postal_code IS 'Cod poștal (opțional)';
COMMENT ON COLUMN public.companies.email IS 'E-mail companie (opțional)';
COMMENT ON COLUMN public.companies.website IS 'Website companie (opțional)';
