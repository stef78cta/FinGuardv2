/**
 * Migrare: Elimină Constraints Restrictive pe trial_balance_accounts
 * 
 * PROBLEMA:
 * Constraints-urile check_opening_balance_xor și check_closing_balance_xor
 * interzic ca un cont să aibă valori pe ambele coloane (debit ȘI credit).
 * 
 * REALITATEA:
 * În balanțele contabile reale, există situații legitime unde un cont
 * poate avea valori pe ambele coloane (ex: conturi cu rulaje bifunctionale).
 * 
 * SOLUȚIE:
 * Eliminăm aceste constraints pentru a permite importul balanțelor reale.
 * 
 * ALTERNATIVĂ (implementată în cod):
 * Parser-ul normalizează valorile calculând NET-ul (diferența).
 * 
 * Versiune: 1.9.4 | Data: 29 ianuarie 2026
 */

-- OPȚIONAL: Elimină constraints dacă vrei să permiți valori pe ambele coloane
-- RECOMANDARE: Rulează doar dacă normalizarea din cod nu e suficientă

ALTER TABLE public.trial_balance_accounts
DROP CONSTRAINT IF EXISTS check_opening_balance_xor;

ALTER TABLE public.trial_balance_accounts
DROP CONSTRAINT IF EXISTS check_closing_balance_xor;

-- Verificare
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_opening_balance_xor'
          AND table_name = 'trial_balance_accounts'
    ) THEN
        RAISE NOTICE '✅ Constraint check_opening_balance_xor eliminat';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_closing_balance_xor'
          AND table_name = 'trial_balance_accounts'
    ) THEN
        RAISE NOTICE '✅ Constraint check_closing_balance_xor eliminat';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONSTRAINTS RESTRICTIVE ELIMINATE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Acum conturile pot avea valori pe ambele coloane.';
    RAISE NOTICE 'Normalizarea se face în cod (parser client-side).';
END $$;
