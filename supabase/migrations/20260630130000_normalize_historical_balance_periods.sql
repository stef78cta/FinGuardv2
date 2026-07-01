-- =============================================================================
-- Normalizează period_start și period_end pentru importurile istorice, conform
-- noii reguli (aliniat cu src/lib/balancePeriod.ts):
--   period_start = prima zi a anului fiscal care conține balance_month
--   period_end   = ultima zi calendaristică a lunii balanței
--
-- balance_month rămâne sursa canonică (deja corectă în DB).
-- Importurile vechi aveau period_start shiftat de fus orar (ex. 2026-05-31) și
-- period_end = zi arbitrară. Verificat anterior: 0 coliziuni pe indexul parțial
-- unic (company_id, period_start, period_end) WHERE deleted_at IS NULL.
--
-- Afectează DOAR coloanele period_start/period_end/updated_at. Fără schimbări de
-- schemă. balance_month, conturile și status-urile rămân neatinse.
-- =============================================================================

UPDATE public.trial_balance_imports tbi
SET
    period_start = make_date(
        CASE
            WHEN EXTRACT(MONTH FROM tbi.balance_month) >= c.fiscal_year_start_month
                THEN EXTRACT(YEAR FROM tbi.balance_month)::int
            ELSE EXTRACT(YEAR FROM tbi.balance_month)::int - 1
        END,
        c.fiscal_year_start_month,
        1
    ),
    period_end = (date_trunc('month', tbi.balance_month) + interval '1 month' - interval '1 day')::date,
    updated_at = NOW()
FROM public.companies c
WHERE c.id = tbi.company_id
  AND (
        tbi.period_start <> make_date(
            CASE
                WHEN EXTRACT(MONTH FROM tbi.balance_month) >= c.fiscal_year_start_month
                    THEN EXTRACT(YEAR FROM tbi.balance_month)::int
                ELSE EXTRACT(YEAR FROM tbi.balance_month)::int - 1
            END,
            c.fiscal_year_start_month,
            1
        )
        OR tbi.period_end <> (date_trunc('month', tbi.balance_month) + interval '1 month' - interval '1 day')::date
      );
