-- ============================================================================
-- MIGRARE: corectie account_type pentru conturi de tip creanta clasificate gresit
-- Data: 2026-07-09
-- ============================================================================
-- Context:
--   Migrarea 20260703110000_extend_coa_template_operational_gaps a introdus
--   4452 si 4511 cu account_type='liability'. In realitate:
--     - 4452 „Imprumuturi nerambursabile cu caracter de subventii” este o
--       creanta (sold debitor) => account_type = 'asset', functional_type = 'activ'.
--     - 4511 „Decontari intre entitati afiliate” este bifunctional; pentru
--       raportare, soldul debitor se pozitioneaza pe active/creante
--       => account_type = 'asset', functional_type ramane 'bifunctional'.
--
--   account_type ramane conceptul de RAPORTARE; functional_type (activ/pasiv/
--   bifunctional) descrie functiunea contabila. Nu se recalculeaza situatii
--   financiare istorice; corectia afecteaza doar generarile viitoare.
-- ============================================================================

UPDATE public.chart_of_accounts_template
SET account_type = 'asset'
WHERE account_code IN ('4452', '4511')
  AND account_type <> 'asset';

UPDATE public.chart_of_accounts
SET account_type = 'asset'
WHERE account_code IN ('4452', '4511')
  AND account_type <> 'asset';

-- ============================================================================
-- FIN
-- ============================================================================
