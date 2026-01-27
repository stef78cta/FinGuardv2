

# Plan Final v3.3: Clarificări de Produs, Securitate și Politici

## Rezumat Modificări față de Plan v3.2

| # | Punct | Modificare |
|---|-------|------------|
| 1 | Immutabilitate Financial Statements | Decizie explicită: immutable ca default, trigger UPDATE ca fallback |
| 2 | Conturi relevante vs toate | Verificare 100% doar pentru conturi cu activitate (sold/rulaj nenul) |
| 3 | Hardening securitate | Verificare acces în `assert_mappings_complete_for_import` |

---

## Logica Principală Pragmatică (CONFIRMATĂ - NESCHIMBATĂ)

| Aspect | Comportament |
|--------|--------------|
| Editare mapări curente | Liberă, cu gard "≤ 100%" prin trigger |
| Completitudine "= 100%" | Doar la generare, la ref_date (period_end) |
| Non-overlap intervale | Prin EXCLUDE constraint + btree_gist |
| Gaps la închidere | WARNING opțional, fără blocare la scriere |

---

## (1) Policy: Financial Statements Immutability (DECIZIE)

### Decizie Explicită pentru Plan Final v3.3

**Default (RECOMANDAT)**: Tratează `financial_statements` ca **immutable** pentru câmpurile:
- `source_import_id`
- `period_start`
- `period_end`
- `statement_type`
- `company_id`

### Consecințe

| Acțiune | Cum se implementează |
|---------|---------------------|
| Modificare statement | Se creează o **versiune nouă** (INSERT) cu `is_current = true` |
| Versiune veche | Trigger existent setează automat `is_current = false` |
| UPDATE pe câmpuri imutabile | **Nu se expune** în UI/API |

### Fallback (Dacă proiectul insistă pe UPDATE)

Dacă se decide să se permită UPDATE pe aceste câmpuri, atunci se activează triggerul:

```sql
-- Triggerul există deja în v3.2, se activează doar dacă e necesar
CREATE TRIGGER trg_block_incomplete_mapping_generation_on_update
BEFORE UPDATE ON public.financial_statements
FOR EACH ROW
EXECUTE FUNCTION public.block_incomplete_mapping_generation_on_update();
```

### Tabel Actualizat: Reguli de Validare

| Regulă | Moment | Comportament | Status |
|--------|--------|--------------|--------|
| Suma alocări = 100% la INSERT | INSERT financial_statement | RAISE EXCEPTION | **Obligatoriu** |
| Suma alocări = 100% la UPDATE | UPDATE financial_statement | RAISE EXCEPTION | **Fallback** (doar dacă se permite UPDATE) |

---

## (2) Clarificare Produs: Mapare 100% - Conturi Relevante vs Toate

### Regula de Business (DECIZIE)

**Variantă B (RECOMANDATĂ în Plan Final v3.3)**:

> "Verificarea completitudinii 100% se aplică doar pentru **conturile relevante** - cele cu activitate (sold sau rulaj nenul)."

### Motivație

- Conturile cu sold zero și rulaj zero sunt tehnice sau inactive
- Blocarea generării din cauza conturilor zero creează fricțiune inutilă
- Maparea conturilor zero nu aduce valoare în situațiile financiare

### Definiție "Cont Relevant"

Un cont este relevant dacă **oricare** din următoarele este diferit de zero:

| Coloană | Descriere |
|---------|-----------|
| `closing_debit` | Sold final debitor |
| `closing_credit` | Sold final creditor |
| `debit_turnover` | Rulaj debitor |
| `credit_turnover` | Rulaj creditor |

### Patch SQL pentru `assert_mappings_complete_for_import`

```sql
-- Modificare în CTE account_allocations pentru a filtra doar conturile relevante
WITH account_allocations AS (
    SELECT 
        tba.id AS tb_account_id,
        tba.account_code,
        tba.account_name,
        COALESCE(SUM(am.allocation_pct), 0) AS total_allocation
    FROM public.trial_balance_accounts tba
    LEFT JOIN public.account_mappings am 
        ON am.trial_balance_account_id = tba.id
        AND am.valid_from <= ref_date
        AND (am.valid_to IS NULL OR am.valid_to >= ref_date)
    WHERE tba.import_id = _import_id
      -- FILTRU CONTURI RELEVANTE: cel puțin o valoare nenulă
      AND (
        COALESCE(tba.closing_debit, 0) <> 0
        OR COALESCE(tba.closing_credit, 0) <> 0
        OR COALESCE(tba.debit_turnover, 0) <> 0
        OR COALESCE(tba.credit_turnover, 0) <> 0
      )
    GROUP BY tba.id, tba.account_code, tba.account_name
)
```

### Alternativă Simplificată (dacă se preferă)

Dacă se dorește o regulă mai simplă (doar sold final):

```sql
AND (
    COALESCE(tba.closing_debit, 0) <> 0
    OR COALESCE(tba.closing_credit, 0) <> 0
)
```

---

## (3) Hardening Securitate: Verificare Acces în Funcție

### Problemă Identificată

În v3.2, funcția `assert_mappings_complete_for_import` nu verifică dacă utilizatorul curent are acces la importul specificat. Acest lucru permite:
- "Sondare" pentru a afla dacă un import există
- Potențiale scurgeri de informații prin mesaje de eroare

### Soluție pentru Plan Final v3.3

Funcția verifică membership pe compania importului înainte de a procesa validarea.

### SQL Complet: `assert_mappings_complete_for_import` (Versiune Finală)

```sql
CREATE OR REPLACE FUNCTION public.assert_mappings_complete_for_import(_import_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ref_date DATE;
    _company_id UUID;
    _user_id UUID;
    incomplete_accounts TEXT;
    incomplete_count INT;
BEGIN
    -- Obține user_id din context auth
    _user_id := public.get_user_id_from_auth();

    -- Obține company_id și period_end din import
    SELECT tbi.company_id, tbi.period_end
      INTO _company_id, ref_date
    FROM public.trial_balance_imports tbi
    WHERE tbi.id = _import_id;

    -- Validare existență import
    IF ref_date IS NULL OR _company_id IS NULL THEN
        RAISE EXCEPTION 'Import invalid sau lipsă period_end/company_id (import_id=%)', _import_id;
    END IF;

    -- HARDENING: Verifică accesul userului la compania importului
    IF NOT public.is_company_member(_user_id, _company_id)
       AND NOT public.has_role(_user_id, 'admin')
       AND NOT public.has_role(_user_id, 'super_admin') THEN
        RAISE EXCEPTION 'Acces interzis la import (import_id=%)', _import_id;
    END IF;

    -- Găsește conturile RELEVANTE cu mapare incompletă la ref_date
    WITH account_allocations AS (
        SELECT 
            tba.id AS tb_account_id,
            tba.account_code,
            tba.account_name,
            COALESCE(SUM(am.allocation_pct), 0) AS total_allocation
        FROM public.trial_balance_accounts tba
        LEFT JOIN public.account_mappings am 
            ON am.trial_balance_account_id = tba.id
            AND am.valid_from <= ref_date
            AND (am.valid_to IS NULL OR am.valid_to >= ref_date)
        WHERE tba.import_id = _import_id
          -- FILTRU: doar conturi relevante (cu activitate)
          AND (
            COALESCE(tba.closing_debit, 0) <> 0
            OR COALESCE(tba.closing_credit, 0) <> 0
            OR COALESCE(tba.debit_turnover, 0) <> 0
            OR COALESCE(tba.credit_turnover, 0) <> 0
          )
        GROUP BY tba.id, tba.account_code, tba.account_name
    )
    SELECT 
        COUNT(*),
        STRING_AGG(
            FORMAT('%s (%s): %.2f%%', account_code, account_name, total_allocation * 100),
            ', '
            ORDER BY account_code
        )
    INTO incomplete_count, incomplete_accounts
    FROM account_allocations
    WHERE total_allocation < 0.999999 OR total_allocation > 1.000001;
    
    IF incomplete_count > 0 THEN
        RAISE EXCEPTION 'Mapare incompletă pentru % conturi relevante din importul % (ref_date: %). Conturi: %',
            incomplete_count, _import_id, ref_date, LEFT(incomplete_accounts, 500);
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Restricții EXECUTE
REVOKE EXECUTE ON FUNCTION public.assert_mappings_complete_for_import(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_mappings_complete_for_import(UUID) TO authenticated;
```

### Notă Securitate

| Aspect | Implementare |
|--------|--------------|
| SECURITY DEFINER | Funcția rulează cu privilegiile owner-ului |
| SET search_path = public | Previne hijacking |
| Verificare membership | Înainte de orice procesare |
| Mesaj eroare generic | Nu expune detalii despre import la acces interzis |
| EXECUTE restricționat | Doar `authenticated`, nu `PUBLIC` sau `anon` |

---

## Secțiune Actualizată: Reguli de Validare

| Regulă | Moment | Comportament | Autoritate |
|--------|--------|--------------|------------|
| Suma alocări ≤ 100% | INSERT/UPDATE mapping curent | RAISE EXCEPTION dacă > 1.0 | Trigger `validate_mapping_allocation` |
| Suma alocări = 100% (conturi relevante) | INSERT financial_statement | RAISE EXCEPTION dacă ≠ 1.0 la ref_date | Funcție `assert_mappings_complete_for_import` |
| Suma alocări = 100% la UPDATE | UPDATE financial_statement | RAISE EXCEPTION (FALLBACK) | Trigger opțional (doar dacă immutability nu e respectată) |
| Non-overlap intervale | INSERT/UPDATE mapping | EXCLUDE constraint | Constraint GIST |
| Detectare gaps | UPDATE (închidere mapping) | WARNING, fără blocare | Trigger `validate_mapping_continuity` |
| Verificare acces | Apel RPC assert_mappings | RAISE EXCEPTION dacă nu e membru | În funcție |

---

## Flux de Lucru (Actualizat pentru v3.3)

```text
1. Upload balanță → trial_balance_imports + trial_balance_accounts

2. Creare/Editare mapări curente (valid_to IS NULL)
   └─→ Trigger verifică: suma ≤ 1.0 pe contul curent
   └─→ NU verifică completitudine (poate fi < 1.0)
   └─→ Permite creare treptată a mapărilor

3. Închidere mapare veche (setare valid_to)
   └─→ Trigger emite WARNING dacă nu există acoperire pentru ziua următoare
   └─→ NU blochează - doar semnal pentru operatori

4. [OPȚIONAL] Verificare mapare completă
   └─→ UI: Buton "Verifică maparea pentru import"
   └─→ Apelează assert_mappings_complete_for_import(import_id)
   └─→ Verifică acces + conturi RELEVANTE (nu toate)
   └─→ Afișează succes sau listă conturi incomplete

5. Generare situații financiare (INSERT)
   └─→ Trigger BEFORE INSERT apelează assert_mappings_complete_for_import
   └─→ Verifică acces utilizator
   └─→ Verifică doar conturi RELEVANTE (sold/rulaj nenul)
   └─→ RAISE EXCEPTION dacă mapare incompletă sau gaps la ref_date
   └─→ Succes doar dacă toate conturile relevante au mapare 100%

6. [IMMUTABILITY] Modificare statement existent
   └─→ DEFAULT: Nu se permite UPDATE pe câmpuri imutabile
   └─→ Se creează versiune nouă (INSERT) și se marchează curentă
   └─→ FALLBACK: Dacă UPDATE e permis, trigger validează maparea
```

---

## Note Importante (Actualizat pentru v3.3)

1. **Financial statements sunt IMUTABILE** pentru câmpurile: `source_import_id`, `period_*`, `statement_type`, `company_id`. Modificări = versiune nouă.

2. **Verificarea 100% se aplică doar pe CONTURI RELEVANTE** - cele cu sold sau rulaj nenul. Conturile zero/inactive sunt ignorate.

3. **Funcția de validare verifică accesul** - utilizatorul trebuie să fie membru al companiei sau admin pentru a apela funcția.

4. **Triggerul de alocare funcționează corect la UPDATE** - exclude rândul curent din sumă și adaugă noua valoare.

5. **WARNING la închidere verifică ziua următoare** (`valid_to + 1`) - nu blochează, doar semnalează.

6. **SECURITY DEFINER + verificare membership** - funcțiile au owner controlat și verifică accesul intern.

7. **Triggerul UPDATE pe financial_statements este FALLBACK** - se activează doar dacă se decide să se permită UPDATE pe câmpuri imutabile.

---

## Sumar Plan Final v3.3

| # | Aspect | Decizie |
|---|--------|---------|
| 1 | Immutabilitate FS | **Default**: imutabil; **Fallback**: trigger UPDATE |
| 2 | Conturi pentru verificare | Doar **relevante** (sold/rulaj ≠ 0) |
| 3 | Securitate funcție | Verificare **membership** + restricții **EXECUTE** |
| 4 | Logica pragmatică | **CONFIRMATĂ** - neschimbată |

---

## SQL Complet pentru Actualizări v3.3

```sql
-- ============================================================================
-- PLAN FINAL v3.3: PATCH-URI
-- ============================================================================

-- (3) Funcție actualizată cu hardening securitate + (2) filtru conturi relevante
CREATE OR REPLACE FUNCTION public.assert_mappings_complete_for_import(_import_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ref_date DATE;
    _company_id UUID;
    _user_id UUID;
    incomplete_accounts TEXT;
    incomplete_count INT;
BEGIN
    -- Obține user_id din context auth
    _user_id := public.get_user_id_from_auth();

    -- Obține company_id și period_end din import
    SELECT tbi.company_id, tbi.period_end
      INTO _company_id, ref_date
    FROM public.trial_balance_imports tbi
    WHERE tbi.id = _import_id;

    -- Validare existență import
    IF ref_date IS NULL OR _company_id IS NULL THEN
        RAISE EXCEPTION 'Import invalid sau lipsă period_end/company_id (import_id=%)', _import_id;
    END IF;

    -- HARDENING: Verifică accesul userului la compania importului
    IF NOT public.is_company_member(_user_id, _company_id)
       AND NOT public.has_role(_user_id, 'admin')
       AND NOT public.has_role(_user_id, 'super_admin') THEN
        RAISE EXCEPTION 'Acces interzis la import (import_id=%)', _import_id;
    END IF;

    -- Găsește conturile RELEVANTE cu mapare incompletă la ref_date
    WITH account_allocations AS (
        SELECT 
            tba.id AS tb_account_id,
            tba.account_code,
            tba.account_name,
            COALESCE(SUM(am.allocation_pct), 0) AS total_allocation
        FROM public.trial_balance_accounts tba
        LEFT JOIN public.account_mappings am 
            ON am.trial_balance_account_id = tba.id
            AND am.valid_from <= ref_date
            AND (am.valid_to IS NULL OR am.valid_to >= ref_date)
        WHERE tba.import_id = _import_id
          -- FILTRU: doar conturi relevante (cu activitate)
          AND (
            COALESCE(tba.closing_debit, 0) <> 0
            OR COALESCE(tba.closing_credit, 0) <> 0
            OR COALESCE(tba.debit_turnover, 0) <> 0
            OR COALESCE(tba.credit_turnover, 0) <> 0
          )
        GROUP BY tba.id, tba.account_code, tba.account_name
    )
    SELECT 
        COUNT(*),
        STRING_AGG(
            FORMAT('%s (%s): %.2f%%', account_code, account_name, total_allocation * 100),
            ', '
            ORDER BY account_code
        )
    INTO incomplete_count, incomplete_accounts
    FROM account_allocations
    WHERE total_allocation < 0.999999 OR total_allocation > 1.000001;
    
    IF incomplete_count > 0 THEN
        RAISE EXCEPTION 'Mapare incompletă pentru % conturi relevante din importul % (ref_date: %). Conturi: %',
            incomplete_count, _import_id, ref_date, LEFT(incomplete_accounts, 500);
    END IF;
    
    RETURN TRUE;
END;
$$;

-- Restricții EXECUTE pentru securitate
REVOKE EXECUTE ON FUNCTION public.assert_mappings_complete_for_import(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_mappings_complete_for_import(UUID) TO authenticated;

-- ============================================================================
-- (1) TRIGGER UPDATE pe financial_statements (FALLBACK - activează doar dacă 
--     se decide să se permită UPDATE pe câmpuri imutabile)
-- ============================================================================

-- NOTĂ: Acest trigger este OPȚIONAL și se activează doar dacă proiectul 
-- decide să permită UPDATE pe câmpurile imutabile în loc de versionare.
-- DEFAULT recomandat: NU activa acest trigger, tratează statements ca imutabile.

/*
CREATE OR REPLACE FUNCTION public.block_incomplete_mapping_generation_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Rulează doar dacă se schimbă câmpuri care afectează selecția mapărilor
    IF (NEW.source_import_id IS DISTINCT FROM OLD.source_import_id)
       OR (NEW.period_start IS DISTINCT FROM OLD.period_start)
       OR (NEW.period_end IS DISTINCT FROM OLD.period_end)
       OR (NEW.statement_type IS DISTINCT FROM OLD.statement_type)
       OR (NEW.company_id IS DISTINCT FROM OLD.company_id) THEN

        PERFORM public.assert_mappings_complete_for_import(NEW.source_import_id);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_incomplete_mapping_generation_on_update
ON public.financial_statements;

CREATE TRIGGER trg_block_incomplete_mapping_generation_on_update
BEFORE UPDATE ON public.financial_statements
FOR EACH ROW
EXECUTE FUNCTION public.block_incomplete_mapping_generation_on_update();
*/
```

