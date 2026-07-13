/**
 * Migrare: Normalizare canonică CUI + index UNIQUE global
 *
 * Faza 1.5-1.6 (remediere CUI multi-tenant):
 * Garantează unicitatea GLOBALĂ a unei companii pentru un CUI canonic.
 *
 * Regula canonică (aceeași companie pentru toate variantele):
 *   1. elimină toate caracterele non-alfanumerice (spații, liniuțe, puncte);
 *   2. UPPER;
 *   3. elimină prefixul fiscal `RO`.
 *
 * Exemple → canonic:
 *   "RO12345678"  → "12345678"
 *   "12345678"    → "12345678"
 *   "ro12345678"  → "12345678"
 *   "RO 12345678" → "12345678"
 *   "RO-12345678" → "12345678"
 *
 * Preflight (13 iul. 2026, proiect finguard2): 0 coliziuni canonice, sigur pentru UNIQUE.
 */

-- =============================================================================
-- 1. Funcție IMMUTABLE de normalizare (folosită de index + RPC)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.normalize_cui(p_cui TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT REGEXP_REPLACE(
           UPPER(REGEXP_REPLACE(COALESCE(p_cui, ''), '[^A-Za-z0-9]', '', 'g')),
           '^RO', ''
         );
$$;

COMMENT ON FUNCTION public.normalize_cui(TEXT) IS
'Valoare canonică a unui CUI: fără separatoare, UPPER, fără prefix RO. Baza unicității globale.';

-- =============================================================================
-- 2. Index UNIQUE pe valoarea canonică (unicitate globală)
-- =============================================================================
-- Notă: tabelul are 7 rânduri (dev/staging) → CREATE INDEX normal e sigur.
-- Pentru un tabel mare în producție reală, se rulează manual CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_cui_canonical
  ON public.companies (public.normalize_cui(cui));

COMMENT ON INDEX public.idx_companies_cui_canonical IS
'Unicitate globală CUI canonic: previne duplicate RO/spații/case pentru aceeași firmă.';
