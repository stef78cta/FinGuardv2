# Gate 0: Ghid Complet de Verificări Pre-Migrare

> **OBLIGATORIU**: Completează acest checklist ÎNAINTE de a aplica orice migrare de securitate.
>
> **Versiune**: 1.8  
> **Data**: 28 Ianuarie 2026  
> **Status**: Verificări preliminare obligatorii

---

## 📋 Prezentare Generală

Gate 0 este un set de verificări **obligatorii** care trebuie executate înainte de aplicarea patch-urilor de securitate. Aceste verificări previne probleme critice și asigură că sistemul este într-o stare validă pentru migrări.

### Componente Gate 0

| Component | Fișier | Scop |
|-----------|--------|------|
| SQL Queries | `gate0_verificari.sql` | Verifică starea bazei de date |
| Cod Sursă | `gate0_code_checks.sh` | Verifică cod sursă pentru breșe |
| Acest Ghid | `GATE0_README.md` | Instrucțiuni complete |

---

## 🚀 Cum să Rulezi Gate 0

### Pas 1: Verificări Bază de Date

```bash
# Navighează la directorul proiectului
cd c:\_Software\SAAS\finguardv2

# Rulează queries SQL prin Supabase CLI sau Dashboard
# Opțiunea A: Prin CLI (recomandat)
supabase db exec < planning/gate0_verificari.sql > planning/gate0_db_state.txt

# Opțiunea B: Prin Dashboard
# 1. Deschide https://supabase.com/dashboard/project/<your-project>/sql/new
# 2. Copiază conținutul din gate0_verificari.sql
# 3. Rulează și salvează rezultatele
```

### Pas 2: Verificări Cod Sursă

```bash
# Fă scriptul executabil (Linux/Mac/WSL)
chmod +x planning/gate0_code_checks.sh

# Rulează scriptul
./planning/gate0_code_checks.sh | tee planning/gate0_code_results.txt

# Windows (Git Bash sau WSL recomandat)
bash planning/gate0_code_checks.sh | tee planning/gate0_code_results.txt
```

### Pas 3: Analizează Rezultatele

```bash
# Verifică fișierele generate
cat planning/gate0_db_state.txt
cat planning/gate0_code_results.txt

# Caută probleme
grep "❌" planning/gate0_code_results.txt
grep "⚠️" planning/gate0_code_results.txt
```

---

## ✅ Checklist de Verificare

### A) Căutare INSERT în `public.companies`

**Scope**: Asigură că nu există căi neprotejate de creare companii

**Acțiuni**:
- [ ] Rulează secțiunea A din `gate0_code_checks.sh`
- [ ] Verifică că SINGURELE INSERT-uri sunt:
  - `create_company_with_member()` RPC → ✅ OK
  - Seed-uri cu membership simultan → ✅ OK
  - Alt cod → ❌ **TREBUIE ELIMINAT**

**Remediere dacă găsești probleme**:
```typescript
// ❌ NU FACE ASA
await supabase.from('companies').insert({ name, cui });

// ✅ FOLOSEȘTE RPC
await supabase.rpc('create_company_with_member', { 
  p_name: name, 
  p_cui: cui 
});
```

### B) Confirmare RLS pe `public.companies`

**Scope**: Verifică că RLS este activ și că nu există policy INSERT pentru authenticated

**Acțiuni**:
- [ ] Rulează Query D1 și D2 din `gate0_verificari.sql`
- [ ] Verifică:
  - [ ] `companies.rls_enabled = true`
  - [ ] NU există policy FOR INSERT TO authenticated
  - [ ] Policy bootstrap pe `company_users` este corectă

**Rezultat așteptat D2**:
```sql
-- NU trebuie să vezi așa ceva:
companies | INSERT | authenticated | ...

-- Trebuie să vezi doar:
companies | SELECT | authenticated | ...
company_users | INSERT | authenticated | ... (cu WITH CHECK pentru bootstrap)
```

### C) Verificare SERVICE_ROLE_KEY în Edge Function

**Scope**: Asigură că Edge Function folosește SERVICE_ROLE pentru writes

**Acțiuni**:
- [ ] Rulează secțiunea C din `gate0_code_checks.sh`
- [ ] Verifică în `supabase/functions/parse-balanta/index.ts`:
  ```typescript
  // ✅ CORECT
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  // ❌ GREȘIT (pentru writes/RPC calls)
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  ```

**Remediere**:
```typescript
// Client pentru operațiuni privilegiate (RPC, writes)
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Client pentru verificare user (doar dacă e necesar separat)
const supabaseUser = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!,
  { global: { headers: { Authorization: authHeader } } }
);
```

### D) Verificare Constraints pe Tabele

**Scope**: Asigură integritate referențială și previne duplicate

**Acțiuni**:
- [ ] Rulează Query D3 și D4 din `gate0_verificari.sql`
- [ ] Verifică existența constraints:

**`company_users`**:
- [ ] `UNIQUE (company_id, user_id)` - previne duplicate membership
- [ ] `FOREIGN KEY (company_id) REFERENCES companies(id)`
- [ ] `FOREIGN KEY (user_id) REFERENCES auth.users(id)`

**`trial_balance_accounts`**:
- [ ] `UNIQUE (import_id, account_code)` - previne duplicate conturi
- [ ] `FOREIGN KEY (import_id) REFERENCES trial_balance_imports(id) ON DELETE CASCADE`

### E) Verificare Expunere company_id Necomitat (CRITIC!)

**Scope**: Previne fereastră de bootstrap prin expunere prematură a company_id

**Acțiuni**:
- [ ] Rulează secțiunea E din `gate0_code_checks.sh`
- [ ] Verifică MANUAL fiecare match găsit
- [ ] Asigură că `company_id` apare în:
  - Logs doar DUPĂ commit tranzacție ✅
  - Response doar DUPĂ verificare membership ✅
  - Debug NICIODATĂ înainte de commit ❌

**⚠️ BLOCARE CRITICĂ**: Dacă găsești expunere înainte de commit → **BLOCAT DEPLOY**

**Exemple problematice**:
```typescript
// ❌ BLOCAT - Log înainte de commit
export async function createCompany(name: string, cui: string) {
  const { data: company } = await supabase
    .from('companies')
    .insert({ name, cui })
    .select()
    .single();
  
  console.log('Created company:', company.id); // ❌ EXPUNERE ÎNAINTE!
  
  // ... adaugă membership ...
}

// ✅ CORECT - Log după commit atomic
export async function createCompany(name: string, cui: string) {
  const { data, error } = await supabase.rpc('create_company_with_member', {
    p_name: name,
    p_cui: cui
  });
  
  if (data) {
    console.log('Company created:', data.company_id); // ✅ DUPĂ RPC complet
  }
}
```

### F) Queries Diagnostic Stare DB (v1.8 - NOU)

**Scope**: Snapshot complet al stării curente DB pentru debugging și validare

**Acțiuni**:
- [ ] Rulează toate Query D1-D6 din `gate0_verificari.sql`
- [ ] Salvează output-ul în `planning/gate0_db_state.txt`
- [ ] Verifică:
  - [ ] D1: RLS activ pe toate tabelele
  - [ ] D2: Policies corecte pe toate tabelele
  - [ ] D3-D4: Constraints complete
  - [ ] D5: Privilegii funcții corecte (authenticated vs service_role)
  - [ ] D6: View-only strategy aplicată (v1.7+)

**Rezultat așteptat D5**:
```sql
function_name                | acl                              | security_check
-----------------------------|----------------------------------|---------------
create_company_with_member   | authenticated=X/postgres         | ✅
process_import_accounts      | service_role=X/postgres          | ✅
check_rate_limit             | service_role=X/postgres          | ✅
can_access_import            | authenticated=X/postgres         | ✅ (helper)
try_uuid                     | authenticated=X/postgres         | ✅ (helper)
```

### G) Pre-Flight Coliziuni CUI (v1.7 - CRITIC pentru migrarea 100006)

**Scope**: Detectează coliziuni CUI înainte de aplicarea UNIQUE constraint

**Acțiuni**:
- [ ] Rulează Query EXTRA din `gate0_verificari.sql`
- [ ] **DACĂ rezultatul conține rânduri** → COLIZIUNI GĂSITE:
  1. Identifică compania legitimă (verifică CUI oficial ANAF)
  2. Șterge/arhivează companiile duplicate
  3. Rulează din nou query-ul
  4. **DOAR după 0 coliziuni**, aplică migrarea 100006

**Exemplu output problematic**:
```
normalized_cui | duplicate_count | companies
---------------|-----------------|------------------------------------------
RO12345678     | 2               | Acme SRL (ID: 1), Acme Duplicate (ID: 5)
```

**Plan remediere**:
```sql
-- 1. Verifică care e legitim
SELECT id, name, cui, created_at, updated_at 
FROM companies 
WHERE UPPER(REGEXP_REPLACE(cui, '[^A-Z0-9]', '', 'gi')) = 'RO12345678';

-- 2. Arhivează duplicatul (dacă ai coloana status)
UPDATE companies SET status = 'archived' WHERE id = 5;

-- SAU șterge (va folosi CASCADE pentru date aferente)
DELETE FROM companies WHERE id = 5;

-- 3. Verifică din nou
-- ... rulează query EXTRA din nou ...
```

---

## 🚨 Situații de Blocare

### BLOCARE CRITICĂ #1: Expunere company_id

**Condiție**: Gate 0(E) găsește `company_id` în logs/response înainte de commit

**Acțiune**: **BLOCAT DEPLOY** până la eliminare completă

**Verificare după remediere**:
```bash
# Rulează din nou
./planning/gate0_code_checks.sh | grep -A5 "E) EXPUNERE"

# Trebuie să vezi:
# ✅ Nu s-au găsit log-uri cu 'company'
# ✅ Nu s-au găsit return-uri cu company_id
```

### BLOCARE CRITICĂ #2: Coliziuni CUI

**Condiție**: Query EXTRA găsește CUI-uri duplicate

**Acțiune**: **BLOCAT migrarea 100006** până la remediere

**Verificare după remediere**:
```sql
-- Rulează din nou Query EXTRA
-- Rezultat așteptat: 0 rânduri
```

### BLOCARE MEDIE: SERVICE_ROLE_KEY lipsă

**Condiție**: Edge Function folosește ANON_KEY pentru writes

**Acțiune**: Actualizează codul, testează, apoi continuă

### AVERTIZARE: CORS wildcard

**Condiție**: `allowed_origins = ["*"]` în config.toml

**Acțiune**: Recomandată remediere pentru producție (v1.7), dar nu blochează

---

## 📊 Interpretarea Rezultatelor

### Simboluri Folosite

| Simbol | Semnificație | Acțiune |
|--------|--------------|---------|
| ✅ | OK, verificare trecută | Continuă |
| ⚠️ | Avertizare, verificare manuală necesară | Investighează |
| ❌ | Problemă critică identificată | **BLOCAT** până la remediere |
| ℹ️ | Informativ | Notează |

### Exit Codes

```bash
./planning/gate0_code_checks.sh
echo $?

# 0 = Toate verificările au trecut
# >0 = Numărul de probleme găsite (❌ sau ⚠️)
```

---

## 📝 Documentare Rezultate

După rularea completă a Gate 0:

1. **Salvează output-urile**:
   ```bash
   # Sunt deja salvate dacă ai folosit | tee
   ls -lh planning/gate0_db_state.txt
   ls -lh planning/gate0_code_results.txt
   ```

2. **Creează issue/PR cu rezultate**:
   ```markdown
   ## Gate 0: Rezultate Verificări Pre-Migrare
   
   - **Data**: 2026-01-28
   - **Commit**: <hash>
   - **Status**: ✅ TOATE VERIFICĂRILE TRECUTE / ❌ PROBLEME GĂSITE
   
   ### Verificări Bază de Date
   [Attach gate0_db_state.txt]
   
   ### Verificări Cod Sursă
   [Attach gate0_code_results.txt]
   
   ### Probleme Identificate
   - [ ] Problemă 1: ...
   - [ ] Problemă 2: ...
   
   ### Plan Remediere
   1. ...
   ```

3. **Notează hash-ul pentru rollback**:
   ```bash
   git rev-parse HEAD > planning/gate0_commit_hash.txt
   ```

---

## 🎯 Criterii de Succes (Go/No-Go)

### ✅ GO - Poți aplica migrările

- [ ] Toate queries D1-D6 returnează rezultate așteptate
- [ ] Query EXTRA: 0 coliziuni CUI
- [ ] Zero probleme ❌ în gate0_code_results.txt
- [ ] Toate avertizările ⚠️ verificate manual și justificate
- [ ] verify_jwt = true în config.toml (sau va fi setat în migrare)
- [ ] SERVICE_ROLE_KEY folosit pentru writes în Edge Function
- [ ] Zero expuneri company_id necomitat

### ❌ NO-GO - BLOCAT până la remediere

- [ ] Orice problemă ❌ în verificări
- [ ] Coliziuni CUI detectate (Query EXTRA)
- [ ] Expunere company_id necomitat (Gate 0E)
- [ ] INSERT în companies fără membership atomic
- [ ] ANON_KEY folosit pentru writes în Edge Function

---

## 🔄 Re-rulare După Remedieri

După fiecare remediere:

```bash
# 1. Commit modificările
git add .
git commit -m "fix: remediere probleme Gate 0"

# 2. Re-rulează verificările
./planning/gate0_code_checks.sh | tee planning/gate0_code_results_v2.txt

# 3. Compară rezultatele
diff planning/gate0_code_results.txt planning/gate0_code_results_v2.txt

# 4. Verifică că problemele au fost rezolvate
grep "❌" planning/gate0_code_results_v2.txt
# Ar trebui să returneze nimic (empty)
```

---

## 📞 Suport și Debugging

### Întrebări Frecvente

**Q: Gate 0 a găsit INSERT în seed-uri, e OK?**  
A: DA, DACĂ seed-ul inserează și membership în aceeași tranzacție. Verifică manual.

**Q: Pot sări peste Gate 0 dacă sunt pe development?**  
A: **NU RECOMANDAT**. Gate 0 previne probleme greu de debugat mai târziu.

**Q: Cât durează Gate 0?**  
A: 2-5 minute pentru toate verificările.

**Q: Ce fac dacă Query D6 arată că authenticated are SELECT pe trial_balance_imports?**  
A: E OK pentru versiuni <1.7. Versiunea 1.7+ introduce view-only strategy.

### Debugging Common Issues

**Issue: `grep: Permission denied`**  
```bash
# Asigură că scriptul are permisiuni
chmod +x planning/gate0_code_checks.sh
```

**Issue: `supabase: command not found`**  
```bash
# Instalează Supabase CLI
npm install -g supabase

# SAU folosește Dashboard pentru queries SQL
```

**Issue: `Cannot find file gate0_verificari.sql`**  
```bash
# Asigură că ești în directorul corect
pwd
# Trebuie să fie: .../finguardv2

# Verifică că fișierul există
ls planning/gate0_verificari.sql
```

---

## 📚 Resurse Adiționale

- [Plan Dezvoltare Database](../about database/plan_dezvoltare_database.md)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Constraint Triggers](https://www.postgresql.org/docs/current/sql-createtrigger.html)

---

**Versiune Document**: 1.8  
**Ultima Actualizare**: 28 Ianuarie 2026  
**Autor**: FinGuard Security Team
