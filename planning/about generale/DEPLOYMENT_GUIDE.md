# Ghid de Deployment - Security Patches v1.8

> **Data**: 28 Ianuarie 2026  
> **Versiune Plan**: 1.8  
> **Severitate**: Patch-uri CRITICE de securitate

---

## 📋 Sumar Executiv

Acest ghid descrie procesul complet de deployment pentru patch-urile de securitate FinGuard v2, incluzând:

- 9 migrări SQL (RLS, rate limiting, constraint triggers, storage)
- Edge Function updates (parse-balanta)
- Frontend updates (RPC calls, normalizare filename)
- Gate 0 verification (OBLIGATORIU înainte)

**Timp estimat**: 2-4 ore (incluzând testare)  
**Downtime**: Zero (cu excepția CUI UNIQUE în producție - <5 min lock)

---

## 🚦 Pre-Deployment Checklist

### Gate 0: Verificări Obligatorii

```bash
# 1. Rulează verificări SQL
cd c:\_Software\SAAS\finguardv2
supabase db exec < planning/gate0_verificari.sql > planning/gate0_db_state.txt

# 2. Rulează verificări cod
bash planning/gate0_code_checks.sh | tee planning/gate0_code_results.txt

# 3. Verifică rezultate
cat planning/gate0_db_state.txt
cat planning/gate0_code_results.txt

# 4. BLOCARE dacă probleme găsite
# - Expunere company_id necomitat → STOP
# - Coliziuni CUI (Query EXTRA) → REMEDIAZĂ
# - SERVICE_ROLE_KEY lipsă → FIX
```

### Backup & Rollback Prep

```bash
# 1. Notează hash curent pentru rollback
git rev-parse HEAD > planning/pre_deployment_commit.txt

# 2. Backup DB (recomandat pentru producție)
# Supabase Dashboard → Database → Backups → Create Backup
# SAU via CLI:
# supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Verifică branch
git branch  # Trebuie să fii pe branch de development/staging
```

---

## 📦 Migrări SQL - Ordinea de Aplicare

### Ordine CRITICĂ (v1.8)

```
Pas 0: Gate 0 (BLOCARE dacă eșuează)
↓
Pas 1: 20260128100000 - company_users RLS policy fix
↓
Pas 1a: 20260128100000a - companies.status (OPȚIONAL dar RECOMANDAT)
↓
Pas 1b: 20260128100000b - try_uuid helper (OBLIGATORIU pentru 100005)
↓
Pas 2: 20260128100001 - create_company_with_member hardening
↓
Pas 3: 20260128100002 - rate_limits table
↓
Pas 4: 20260128100002a - processing_started_at (OBLIGATORIU pentru 100003)
↓
Pas 5: 20260128100002b - internal_error view (OBLIGATORIU pentru 100003)
↓
Pas 6: 20260128100003 - process_import_accounts function
↓
Pas 7: 20260128100004 - company_member constraint triggers
↓
Pas 8: 20260128100005 - storage policy hardening
↓
Pas 9: 20260128100006 - CUI UNIQUE (MANUAL în producție!)
```

### Aplicare Staging/Development

```bash
# Automated (Supabase CLI aplică automat toate migrările)
cd c:\_Software\SAAS\finguardv2
supabase db push

# Verifică că toate migrările au trecut
supabase migration list

# Output așteptat:
#   ✅ 20260128100000_security_patch_company_users_rls.sql
#   ✅ 20260128100000a_add_companies_status.sql
#   ✅ 20260128100000b_try_uuid_helper.sql
#   ✅ 20260128100001_security_patch_create_company_function.sql
#   ... (toate cu ✅)
```

### Aplicare Producție (Pas cu Pas)

```bash
# 1. Conectare la producție
export SUPABASE_URL="https://<your-project>.supabase.co"
export DATABASE_URL="postgresql://postgres:[password]@db.<your-project>.supabase.co:5432/postgres"

# 2. Rulează Gate 0 pe producție (OBLIGATORIU)
psql $DATABASE_URL < planning/gate0_verificari.sql

# 3. Verifică rezultate și BLOCARE dacă probleme
# ...

# 4. Aplică migrări (Supabase Dashboard sau CLI)
# Dashboard: Database → Migrations → Upload All
# CLI: supabase db push (asigură că project link e corect)

# 5. ⚠️ PAS MANUAL: CUI UNIQUE CONCURRENTLY (dacă > 1000 companies)
# Vezi secțiunea "CUI UNIQUE Manual Step" mai jos
```

---

## 🔧 CUI UNIQUE - Manual Step (Producție)

**⚠️ OBLIGATORIU**: Dacă production DB are > 1000 companies, migrarea 100006 va fi SKIPPED.  
Trebuie să rulezi manual `CREATE INDEX CONCURRENTLY`.

### Pre-Flight: Verificare Coliziuni

```sql
-- Rulează ÎNAINTE de CREATE INDEX
WITH normalized AS (
  SELECT 
    id, name, cui,
    UPPER(REGEXP_REPLACE(cui, '[^A-Z0-9]', '', 'gi')) AS cui_normalized
  FROM public.companies
  WHERE cui IS NOT NULL
),
duplicates AS (
  SELECT 
    cui_normalized,
    COUNT(*) AS count,
    STRING_AGG(name || ' (ID: ' || id || ')', ', ' ORDER BY id) AS companies
  FROM normalized
  GROUP BY cui_normalized
  HAVING COUNT(*) > 1
)
SELECT * FROM duplicates;

-- DACĂ rezultat conține rânduri → REMEDIAZĂ (arhivează duplicate)
-- Exemplu remediere:
UPDATE public.companies 
SET status = 'archived', 
    name = name || ' (DUPLICATE)'
WHERE id IN (<ids-duplicate>);
```

### Manual Step: CREATE INDEX CONCURRENTLY

```bash
# ⚠️ Rulează în afara pipeline-ului de migrări (psql direct)
# Durata estimată: 1-5 min (depinde de număr companies)

psql $DATABASE_URL -c "
CREATE UNIQUE INDEX CONCURRENTLY idx_companies_cui_normalized 
ON public.companies (UPPER(REGEXP_REPLACE(cui, '[^A-Z0-9]', '', 'gi')));
"

# Verifică success
psql $DATABASE_URL -c "
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE indexname = 'idx_companies_cui_normalized';
"

# Output așteptat:
# schemaname | tablename  | indexname                     | indexdef
# -----------|------------|-------------------------------|----------
# public     | companies  | idx_companies_cui_normalized  | CREATE UNIQUE INDEX...
```

### Test: Duplicate CUI Refuzat

```sql
-- Testează că unique constraint funcționează
BEGIN;

-- Creare companie cu CUI valid
SELECT public.create_company_with_member('Test Company 1', 'RO12345678');

-- Tentativă duplicate (trebuie să eșueze)
SELECT public.create_company_with_member('Test Company 2', 'ro 12345678');
-- Așteptat: ERROR ERRCODE 23505 (unique_violation)

ROLLBACK;  -- Cleanup test
```

---

## 🌐 Edge Function Updates

### Pas 1: Actualizare config.toml

```toml
# supabase/config.toml

[functions.parse-balanta]
verify_jwt = true  # v1.8: OBLIGATORIU (era false)

# v1.7: CORS origins whitelist (nu wildcard)
[functions]
allowed_origins = [
  "https://your-app-domain.com",
  "https://staging.your-app-domain.com",
  "http://localhost:5173"  # Development doar
]
# NU folosiți: allowed_origins = ["*"]
```

### Pas 2: Rate Limiting DB (în index.ts)

```typescript
// supabase/functions/parse-balanta/index.ts

// ÎNAINTE (in-memory):
const rateLimits = new Map<string, number>();
if (rateLimits.get(userId) >= 10) {
  return new Response("Rate limited", { status: 429 });
}

// DUPĂ (DB-based):
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const { data: allowed } = await supabaseAdmin.rpc('check_rate_limit', {
  p_user_id: userId,
  p_resource_type: 'import',
  p_max_requests: 10,
  p_window_seconds: 3600
});

if (!allowed) {
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      retryAfter: 3600  // v1.3: Retry-After în seconds
    }),
    { 
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '3600'  // v1.3: Header standard
      }
    }
  );
}
```

### Pas 3: XLSX Resource Limits

```typescript
// v1.5 + v1.6 + v1.7: Limite resource exhaustion

// v1.7: Verifică file_size_bytes ÎNAINTE de download
const { data: importRecord } = await supabase
  .from('trial_balance_imports')
  .select('file_size_bytes, file_name')
  .eq('id', importId)
  .single();

if (importRecord.file_size_bytes > 10 * 1024 * 1024) {  // 10MB
  throw new Error('File too large (max 10MB)');
}

// Acum e safe să download
const { data: fileData } = await supabase.storage
  .from('trial-balances')
  .download(importRecord.file_name);

// v1.6: Verificare post-download (secundară, defense-in-depth)
if (fileData.size > 10 * 1024 * 1024) {
  throw new Error('File too large after download');
}

// Parse cu limite
const workbook = XLSX.read(await fileData.arrayBuffer());

// Post-parse guards
const MAX_SHEETS = 10;
const MAX_ROWS = 20000;
const MAX_COLUMNS = 30;

if (workbook.SheetNames.length > MAX_SHEETS) {
  throw new Error(`Too many sheets (max ${MAX_SHEETS})`);
}

const sheet = workbook.Sheets[workbook.SheetNames[0]];
const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

if (range.e.r > MAX_ROWS) {
  throw new Error(`Too many rows (max ${MAX_ROWS})`);
}

if (range.e.c > MAX_COLUMNS) {
  throw new Error(`Too many columns (max ${MAX_COLUMNS})`);
}
```

---

## 💻 Frontend Updates

### Pas 1: RPC Calls (elimină p_user_id)

```typescript
// src/hooks/useCompany.tsx

// ÎNAINTE:
const { data, error } = await supabase.rpc('create_company_with_member', {
  p_name: name,
  p_cui: cui,
  p_user_id: userData.id  // ❌ ELIMINĂ
});

// DUPĂ:
const { data, error } = await supabase.rpc('create_company_with_member', {
  p_name: name,
  p_cui: cui
});

// Handle error 23505 (duplicate CUI)
if (error?.code === '23505') {
  toast.error('O companie cu acest CUI există deja. Solicită invitație de la owner.');
  return;
}
```

### Pas 2: trial_balance_imports_public View

```typescript
// src/hooks/useTrialBalances.tsx

// ÎNAINTE:
const { data } = await supabase
  .from('trial_balance_imports')  // ❌ TABEL direct
  .select('*')
  .eq('company_id', companyId);

// DUPĂ:
const { data } = await supabase
  .from('trial_balance_imports_public')  // ✅ VIEW (fără internal_error_detail)
  .select('*')
  .eq('company_id', companyId);
```

### Pas 3: Filename Normalizare (v1.7)

```typescript
// src/utils/fileHelpers.ts

/**
 * Normalizează filename pentru storage policy
 * Elimină diacritice și caractere speciale
 */
export function normalizeFilename(filename: string): string {
  return filename
    .normalize('NFD')  // Decompose diacritice
    .replace(/[\u0300-\u036f]/g, '')  // Elimină diacritice
    .replace(/[^a-zA-Z0-9._\- ]/g, '_')  // Replace caractere invalide
    .trim();
}

// Folosire în upload:
const originalName = file.name;  // "balanță contabilă.xlsx"
const safeName = normalizeFilename(originalName);  // "balanta contabila.xlsx"

const filePath = `${userId}/${safeName}`;
const { error } = await supabase.storage
  .from('trial-balances')
  .upload(filePath, file);
```

---

## ✅ Post-Deployment Testing

### Test Suite Obligatoriu

```bash
# 1. Test RLS Policy Bootstrap
# - User A: crează companie → success
# - User B: încearcă auto-join la compania lui A → FAIL (rejected)

# 2. Test CUI UNIQUE
# - Creare companie cu CUI "RO12345678" → success
# - Creare companie cu CUI "ro 12345678" (spații + lowercase) → FAIL (23505)

# 3. Test Constraint Triggers
# - Creare companie + membru → success
# - DELETE ultimul membru fără archive → FAIL (exception)
# - Archive companie apoi DELETE ultimul membru → success

# 4. Test Rate Limiting
# - 10 requests rapide import → ultimele FAIL (429)
# - Wait 1h → requests din nou permise

# 5. Test Storage Policy
# - Upload "balanță.xlsx" → success (normalizat)
# - Upload cu path invalid → FAIL (rejected)

# 6. Test Edge Function
# - Import valid → success (procesare completă)
# - Import > 10MB → FAIL (pre-download reject)
# - Import cu > 10 foi → FAIL (post-parse guard)
```

### Monitoring Post-Deployment

```sql
-- Verifică că nu există orphan companies
SELECT c.id, c.name, COUNT(cu.user_id) AS member_count
FROM public.companies c
LEFT JOIN public.company_users cu ON cu.company_id = c.id
GROUP BY c.id, c.name
HAVING COUNT(cu.user_id) = 0;
-- Output așteptat: 0 rânduri

-- Verifică rate limiting activ
SELECT COUNT(*) FROM public.rate_limits;
-- Ar trebui să crească în timp (requests active)

-- Verifică imports stale (processing > 10 min)
SELECT * FROM public.detect_stale_imports();
-- Output așteptat: 0 rânduri (toate procesate sau failed)

-- Verifică că try_uuid funcționează
SELECT public.try_uuid('550e8400-e29b-41d4-a716-446655440000');  -- UUID valid
SELECT public.try_uuid('not-a-uuid');  -- NULL (nu aruncă)
```

---

## 🔄 Rollback Procedure

### Rollback SQL Migrations

```bash
# ⚠️ Forward-Only Rollback (RECOMANDAT pentru securitate)
# NU revert-uim migrările de securitate (mai riscant decât să le păstrăm)

# DACĂ rollback absolut necesar (ex: bug critic):
# 1. Identifică ultima migrare bună
supabase migration list

# 2. Revert manual (psql)
# Exemplu: revert CUI UNIQUE
psql $DATABASE_URL -c "DROP INDEX IF EXISTS public.idx_companies_cui_normalized;"

# Exemplu: revert constraint triggers
psql $DATABASE_URL -c "
DROP TRIGGER IF EXISTS enforce_company_has_member ON public.companies;
DROP TRIGGER IF EXISTS enforce_company_has_member_on_delete ON public.company_users;
DROP FUNCTION IF EXISTS public.check_company_has_member();
DROP FUNCTION IF EXISTS public.prevent_last_member_removal();
"
```

### Rollback Code

```bash
# Revert la commit pre-deployment
git reset --hard $(cat planning/pre_deployment_commit.txt)

# Deploy code vechi (Edge Function + Frontend)
# ... deployment process ...
```

---

## 📞 Support & Troubleshooting

### Probleme Comune

**1. Migrare 100006 eșuează cu "cannot run inside transaction"**  
→ Rulează manual CREATE INDEX CONCURRENTLY (vezi secțiunea CUI UNIQUE Manual Step)

**2. Frontend primește "function not found" pentru create_company_with_member**  
→ Verifică că migrarea 100001 a fost aplicată: `SELECT * FROM pg_proc WHERE proname = 'create_company_with_member'`

**3. Upload files eșuează cu "policy violation"**  
→ Verifică că try_uuid există și e IMMUTABLE: `SELECT * FROM pg_proc WHERE proname = 'try_uuid'`

**4. Rate limiting nu funcționează**  
→ Verifică că Edge Function folosește SERVICE_ROLE_KEY (nu ANON_KEY)

**5. Internal errors expuse în UI**  
→ Verifică că frontend folosește `trial_balance_imports_public` VIEW (nu tabel direct)

---

## 📋 Checklist Final Deployment

- [ ] Gate 0 rulat și validat (0 probleme)
- [ ] Backup DB creat
- [ ] Commit hash salvat pentru rollback
- [ ] Toate 9 migrări aplicate (✅ în supabase migration list)
- [ ] CUI UNIQUE manual step completat (producție)
- [ ] config.toml actualizat (verify_jwt = true, CORS whitelist)
- [ ] Edge Function deployed cu rate limiting DB
- [ ] Frontend deployed cu p_user_id eliminat
- [ ] Frontend deployed cu view trial_balance_imports_public
- [ ] Frontend deployed cu filename normalizare
- [ ] Toate testele post-deployment trecute
- [ ] Monitoring activ (orphan companies, stale imports)
- [ ] Documentation actualizată în PR

---

**Versiune Document**: 1.8  
**Ultima Actualizare**: 28 Ianuarie 2026  
**Contact**: FinGuard Security Team
