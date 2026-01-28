# Security Patches Test Suite v1.8

> **Data**: 28 Ianuarie 2026  
> **Versiune**: 1.8  
> **Scope**: Teste pentru toate patch-urile de securitate

---

## 📋 Overview

Această suită conține teste pentru validarea completă a tuturor patch-urilor de securitate implementate în planul v1.8.

**Total teste**: 25+  
**Categorii**: 6 (RLS, Funcții, Rate Limiting, Storage, Edge Function, Integrare)

---

## 🧪 Test Suite 1: RLS Policies (PUNCT 1A)

### Test 1.1: Bootstrap Policy - Auto-join Rejection

**Scenariu**: User B încearcă să se adauge la compania lui User A

```sql
-- Setup: User A creează companie
SELECT public.create_company_with_member('Company A', 'RO11111111');
-- Returns: company_id_a

-- Test: User B încearcă auto-join (trebuie să eșueze)
-- Rulează ca User B (switch JWT token)
INSERT INTO public.company_users (company_id, user_id)
VALUES ('company_id_a', '<user_b_id>');
-- Așteptat: ERROR - policy violation
-- "new row violates row-level security policy"
```

**Rezultat așteptat**: ❌ ERROR (RLS policy refuză)  
**Status**: ✅ PASS / ❌ FAIL

### Test 1.2: Bootstrap Policy - First Member Allowed

**Scenariu**: User poate fi prim membru la companie nouă

```sql
-- Setup: Creare companie prin admin/script (fără membri)
INSERT INTO public.companies (name, cui) 
VALUES ('Orphan Company', 'RO22222222')
RETURNING id;
-- Returns: orphan_company_id

-- Test: User devine prim membru (bootstrap)
-- Rulează ca User authenticated
INSERT INTO public.company_users (company_id, user_id)
VALUES ('orphan_company_id', '<current_user_id>');
-- Așteptat: SUCCESS (policy permite bootstrap)
```

**Rezultat așteptat**: ✅ SUCCESS  
**Status**: ✅ PASS / ❌ FAIL

**⚠️ NOTĂ**: Acest test validează policy bootstrap, dar crearea orphan company  
e vulnerability (ar trebui blocată de constraint trigger în Test 1.4).

### Test 1.3: Member Can Add Members

**Scenariu**: Membru existent poate adăuga alți membri

```sql
-- Setup: User A are companie
SELECT public.create_company_with_member('Company A', 'RO33333333');

-- Test: User A (membru) adaugă User B
-- Rulează ca User A
INSERT INTO public.company_users (company_id, user_id)
VALUES ('<company_a_id>', '<user_b_id>');
-- Așteptat: SUCCESS (membru poate adăuga)
```

**Rezultat așteptat**: ✅ SUCCESS  
**Status**: ✅ PASS / ❌ FAIL

### Test 1.4: Constraint Trigger - INSERT Without Member

**Scenariu**: Previne creare companie fără membri

```sql
-- Test: Tentativă INSERT companie fără membru simultan
BEGIN;

INSERT INTO public.companies (name, cui) 
VALUES ('No Member Company', 'RO44444444')
RETURNING id;
-- Returns: company_id

-- NU inserăm membru

COMMIT;
-- Așteptat: ERROR - constraint trigger enforce_company_has_member
-- "Company must have at least one member"
```

**Rezultat așteptat**: ❌ ERROR (trigger blochează)  
**Status**: ✅ PASS / ❌ FAIL

### Test 1.5: Constraint Trigger - DELETE Last Member (Active)

**Scenariu**: Previne DELETE ultimul membru din companie activă

```sql
-- Setup: Companie cu 1 membru
SELECT public.create_company_with_member('Single Member Co', 'RO55555555');
-- Returns: company_id

-- Test: DELETE ultimul membru
DELETE FROM public.company_users WHERE company_id = '<company_id>';
-- Așteptat: ERROR - trigger prevent_last_member_removal
-- "Cannot remove last member from active company"
```

**Rezultat așteptat**: ❌ ERROR (trigger blochează)  
**Status**: ✅ PASS / ❌ FAIL

### Test 1.6: Constraint Trigger - DELETE Last Member (Archived)

**Scenariu**: Permite DELETE ultimul membru din companie archived

```sql
-- Setup: Companie cu 1 membru
SELECT public.create_company_with_member('Archive Test', 'RO66666666');

-- Archive companie
SELECT public.archive_company('<company_id>');

-- Test: DELETE ultimul membru (trebuie să funcționeze)
DELETE FROM public.company_users WHERE company_id = '<company_id>';
-- Așteptat: SUCCESS (trigger permite pentru archived)
```

**Rezultat așteptat**: ✅ SUCCESS  
**Status**: ✅ PASS / ❌ FAIL

### Test 1.7: Constraint Trigger - CASCADE Delete

**Scenariu**: v1.8 - Permite DELETE membri când companie e ștearsă (CASCADE)

```sql
-- Setup: Companie cu 2 membri
SELECT public.create_company_with_member('Cascade Test', 'RO77777777');
INSERT INTO public.company_users (company_id, user_id) VALUES (...);

-- Test: DELETE companie (CASCADE va șterge și membrii)
DELETE FROM public.companies WHERE id = '<company_id>';
-- Așteptat: SUCCESS (CASCADE funcționează, trigger nu blochează)

-- Verificare: membri au fost șterși
SELECT COUNT(*) FROM public.company_users WHERE company_id = '<company_id>';
-- Așteptat: 0
```

**Rezultat așteptat**: ✅ SUCCESS (CASCADE funcționează)  
**Status**: ✅ PASS / ❌ FAIL

### Test 1.8: Seed Script Compatibility (v1.8)

**Scenariu**: INSERT+DELETE în aceeași tranzacție (seed-uri)

```sql
-- Test: Seed care crează și șterge în aceeași tranzacție
BEGIN;

INSERT INTO public.companies (name, cui) VALUES ('Temp Co', 'RO88888888') RETURNING id;
INSERT INTO public.company_users (company_id, user_id) VALUES (...);
-- Simulare: DELETE după setup
DELETE FROM public.companies WHERE cui = 'RO88888888';

COMMIT;
-- Așteptat: SUCCESS (trigger cu skip logic v1.8)
```

**Rezultat așteptat**: ✅ SUCCESS  
**Status**: ✅ PASS / ❌ FAIL

---

## 🧪 Test Suite 2: Funcții SECURITY DEFINER (PUNCT 1B)

### Test 2.1: create_company_with_member - Success

```sql
-- Test: Creare companie validă
SELECT public.create_company_with_member('Test Company', 'RO12345678');
-- Așteptat: Returnează UUID (company_id)

-- Verificare: companie + membru create atomic
SELECT c.id, c.name, c.cui, COUNT(cu.user_id) AS member_count
FROM public.companies c
LEFT JOIN public.company_users cu ON cu.company_id = c.id
WHERE c.cui = 'RO12345678'
GROUP BY c.id, c.name, c.cui;
-- Așteptat: 1 rând, member_count = 1
```

**Rezultat așteptat**: ✅ SUCCESS, member_count = 1  
**Status**: ✅ PASS / ❌ FAIL

### Test 2.2: create_company_with_member - Duplicate CUI

**Scenariu**: v1.8 - RAISE EXCEPTION pe duplicate (nu RETURN NULL)

```sql
-- Setup: Companie existentă
SELECT public.create_company_with_member('First Company', 'RO12345678');

-- Test: Duplicate CUI (normalizare: case + spații)
SELECT public.create_company_with_member('Second Company', 'ro 12345678');
-- Așteptat: EXCEPTION cu ERRCODE 23505
-- Mesaj: "Company with this CUI already exists..."
```

**Rezultat așteptat**: ❌ EXCEPTION (ERRCODE 23505)  
**Status**: ✅ PASS / ❌ FAIL

**Verificare suplimentară**:
```sql
-- v1.8: NU trebuie să returneze NULL (risc tratare ca success)
-- Verifică că EXCEPTION a fost aruncată (nu RETURN)
```

### Test 2.3: CUI Normalization

**Scenariu**: CUI-uri identice după normalizare sunt detectate

```sql
-- Toate acestea trebuie considerate duplicate:
SELECT public.create_company_with_member('Test 1', 'RO12345678');   -- Original
SELECT public.create_company_with_member('Test 2', 'ro12345678');   -- Lowercase ❌
SELECT public.create_company_with_member('Test 3', 'RO 12345678');  -- Spațiu ❌
SELECT public.create_company_with_member('Test 4', 'ro 123 456 78'); -- Multiple spații ❌
SELECT public.create_company_with_member('Test 5', 'RO-12345678');  -- Dash ❌

-- Toate de la Test 2-5 trebuie să eșueze cu ERRCODE 23505
```

**Rezultat așteptat**: Doar primul SUCCESS, restul EXCEPTION 23505  
**Status**: ✅ PASS / ❌ FAIL

### Test 2.4: Empty/Invalid Parameters

```sql
-- Test 1: Name gol
SELECT public.create_company_with_member('', 'RO12345678');
-- Așteptat: EXCEPTION "Company name is required"

-- Test 2: CUI gol
SELECT public.create_company_with_member('Test', '');
-- Așteptat: EXCEPTION "Company CUI is required"

-- Test 3: CUI doar caractere speciale
SELECT public.create_company_with_member('Test', '---');
-- Așteptat: EXCEPTION "CUI is invalid"

-- Test 4: NULL parameters
SELECT public.create_company_with_member(NULL, 'RO123');
-- Așteptat: EXCEPTION
```

**Rezultat așteptat**: Toate aruncă EXCEPTION cu mesaje clare  
**Status**: ✅ PASS / ❌ FAIL

---

## 🧪 Test Suite 3: Rate Limiting (PUNCT 2B)

### Test 3.1: Rate Limit - Under Limit

```sql
-- Test: 5 requests (sub limită de 10)
SELECT public.check_rate_limit('<user_id>', 'import', 10, 3600);  -- 1
SELECT public.check_rate_limit('<user_id>', 'import', 10, 3600);  -- 2
SELECT public.check_rate_limit('<user_id>', 'import', 10, 3600);  -- 3
SELECT public.check_rate_limit('<user_id>', 'import', 10, 3600);  -- 4
SELECT public.check_rate_limit('<user_id>', 'import', 10, 3600);  -- 5

-- Toate trebuie să returneze: TRUE (permis)
```

**Rezultat așteptat**: Toate returnează TRUE  
**Status**: ✅ PASS / ❌ FAIL

### Test 3.2: Rate Limit - Over Limit

```sql
-- Test: 11 requests (peste limită de 10)
DO $$
DECLARE
  i INT;
  result BOOLEAN;
BEGIN
  FOR i IN 1..11 LOOP
    SELECT public.check_rate_limit('<user_id>', 'test_resource', 10, 3600) INTO result;
    RAISE NOTICE 'Request %: %', i, result;
  END LOOP;
END $$;

-- Așteptat:
-- Request 1-10: TRUE
-- Request 11: FALSE (peste limită)
```

**Rezultat așteptat**: Request 11 returnează FALSE  
**Status**: ✅ PASS / ❌ FAIL

### Test 3.3: Rate Limit - Window Reset

```sql
-- Test: Reset după expirare fereastră

-- Simulare: Setează window_start în trecut
UPDATE public.rate_limits
SET window_start = NOW() - INTERVAL '2 hours'
WHERE user_id = '<user_id>' AND resource_type = 'test_resource';

-- Acum request nou trebuie să funcționeze (fereastră nouă)
SELECT public.check_rate_limit('<user_id>', 'test_resource', 10, 3600);
-- Așteptat: TRUE (fereastră resetată)

-- Verificare: entry nou în DB
SELECT request_count, window_start FROM public.rate_limits
WHERE user_id = '<user_id>' AND resource_type = 'test_resource';
-- Așteptat: request_count = 1, window_start = recent
```

**Rezultat așteptat**: TRUE, request_count reset la 1  
**Status**: ✅ PASS / ❌ FAIL

### Test 3.4: Rate Limit Cleanup

```sql
-- Test: Funcție cleanup șterge entries vechi

-- Setup: Crează entries vechi
INSERT INTO public.rate_limits (user_id, resource_type, window_start, reset_in_seconds)
VALUES 
  (gen_random_uuid(), 'old_1', NOW() - INTERVAL '3 hours', 3600),
  (gen_random_uuid(), 'old_2', NOW() - INTERVAL '5 hours', 3600),
  (gen_random_uuid(), 'recent', NOW() - INTERVAL '30 minutes', 3600);

-- Rulează cleanup (retention = 2 hours)
SELECT public.cleanup_rate_limits(2);
-- Așteptat: Returns 2 (șterge old_1 și old_2)

-- Verificare: doar 'recent' rămâne
SELECT COUNT(*) FROM public.rate_limits WHERE resource_type LIKE 'old_%';
-- Așteptat: 0

SELECT COUNT(*) FROM public.rate_limits WHERE resource_type = 'recent';
-- Așteptat: 1
```

**Rezultat așteptat**: Cleanup șterge 2 entries vechi, păstrează recent  
**Status**: ✅ PASS / ❌ FAIL

---

## 🧪 Test Suite 4: Storage Policies (PUNCT 4)

### Test 4.1: try_uuid Helper - Valid UUID

```sql
-- Test: UUID valid
SELECT public.try_uuid('550e8400-e29b-41d4-a716-446655440000');
-- Așteptat: '550e8400-e29b-41d4-a716-446655440000'::UUID
```

**Rezultat așteptat**: UUID valid  
**Status**: ✅ PASS / ❌ FAIL

### Test 4.2: try_uuid Helper - Invalid String (No Exception)

```sql
-- Test: String invalid (NU aruncă excepție)
SELECT public.try_uuid('not-a-uuid');
-- Așteptat: NULL (fără EXCEPTION)

SELECT public.try_uuid('');
-- Așteptat: NULL

SELECT public.try_uuid(NULL);
-- Așteptat: NULL
```

**Rezultat așteptat**: NULL (fără EXCEPTION thrown)  
**Status**: ✅ PASS / ❌ FAIL

### Test 4.3: Storage Policy - Valid Upload Path

**Scenariu**: Upload cu path valid (user_id/filename.xlsx)

```typescript
// Test în frontend sau curl
const userId = user.id;  // UUID valid
const filename = 'balanta.xlsx';  // ASCII, fără diacritice
const filePath = `${userId}/${filename}`;

const { error } = await supabase.storage
  .from('trial-balances')
  .upload(filePath, file);

// Așteptat: error = null (success)
```

**Rezultat așteptat**: ✅ SUCCESS  
**Status**: ✅ PASS / ❌ FAIL

### Test 4.4: Storage Policy - Invalid Path (Non-UUID)

```typescript
// Test: Upload cu user_id invalid (nu UUID)
const filePath = 'not-a-uuid/balanta.xlsx';

const { error } = await supabase.storage
  .from('trial-balances')
  .upload(filePath, file);

// Așteptat: error (policy violation - try_uuid returnează NULL)
```

**Rezultat așteptat**: ❌ ERROR (policy reject)  
**Status**: ✅ PASS / ❌ FAIL

### Test 4.5: Storage Policy - Filename Diacritice (v1.6)

```typescript
// Test: Upload cu filename românesc (diacritice)
const filePath = `${userId}/balanță.xlsx`;  // ă = diacritică

const { error } = await supabase.storage
  .from('trial-balances')
  .upload(filePath, file);

// v1.6: Policy regex ~* acceptă sau refuză?
// Depinde de normalizare frontend (trebuie normalizat ÎNAINTE)
```

**Rezultat așteptat**: ❌ ERROR (policy regex nu match diacritice)  
**Remediere**: Folosește `normalizeFilename()` în frontend  
**Status**: ✅ PASS / ❌ FAIL

### Test 4.6: Storage Policy - NULL Name Guard (v1.6)

```sql
-- Test: Simulare NULL name (nu ar trebui posibil, dar testing)
-- Nu poate fi testat direct (storage API nu permite NULL)
-- Verificare: policy conține "AND name IS NOT NULL"

SELECT with_check 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%upload to their folder%';
-- Așteptat: Conține "name IS NOT NULL"
```

**Rezultat așteptat**: Policy conține NULL guard  
**Status**: ✅ PASS / ❌ FAIL

---

## 🧪 Test Suite 5: Edge Function (PUNCT 2C, 2D)

### Test 5.1: verify_jwt Enabled (v1.8)

```bash
# Test: Request fără Authorization header
curl -X POST https://<project>.supabase.co/functions/v1/parse-balanta \
  -H "Content-Type: application/json" \
  -d '{"import_id": "test"}'

# Așteptat: 401 Unauthorized (verify_jwt = true blochează)
```

**Rezultat așteptat**: 401 Unauthorized  
**Status**: ✅ PASS / ❌ FAIL

### Test 5.2: CORS Preflight (OPTIONS)

```bash
# Test: OPTIONS request (preflight)
curl -X OPTIONS https://<project>.supabase.co/functions/v1/parse-balanta \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST"

# Așteptat: 204 No Content cu headers CORS
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Methods: POST, OPTIONS
```

**Rezultat așteptat**: 204 cu CORS headers  
**Status**: ✅ PASS / ❌ FAIL

### Test 5.3: Rate Limiting DB (v1.5)

```typescript
// Test: 11 requests rapide (peste limită)
const promises = Array.from({ length: 11 }, (_, i) => 
  fetch(`${supabaseUrl}/functions/v1/parse-balanta`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ import_id: `test-${i}` })
  })
);

const responses = await Promise.all(promises);

// Verifică că ultimele primesc 429
const statuses = responses.map(r => r.status);
console.log(statuses);
// Așteptat: [200, 200, ..., 429, 429] (ultimele sunt 429)

// Verifică Retry-After header (v1.3)
const last429 = responses.find(r => r.status === 429);
const retryAfter = last429?.headers.get('Retry-After');
console.log('Retry-After:', retryAfter);
// Așteptat: '3600' (seconds)
```

**Rezultat așteptat**: Request 11 → 429, Retry-After header prezent  
**Status**: ✅ PASS / ❌ FAIL

### Test 5.4: File Size Check Pre-Download (v1.7)

```typescript
// Test: Fișier > 10MB reject ÎNAINTE de download

// Setup: Creare import cu file_size_bytes mare
await supabase.from('trial_balance_imports_public').insert({
  company_id: companyId,
  file_name: 'fake-path.xlsx',
  file_size_bytes: 15 * 1024 * 1024,  // 15MB (peste limită)
  status: 'pending'
});

// Test: Apel Edge Function
const response = await fetch(`${supabaseUrl}/functions/v1/parse-balanta`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ import_id: importId })
});

// Așteptat: 413 Payload Too Large
// NU trebuie să facă download efectiv (verificat în logs)
```

**Rezultat așteptat**: 413 ÎNAINTE de download  
**Status**: ✅ PASS / ❌ FAIL

### Test 5.5: XLSX Resource Limits (v1.6)

**Test Cases**:

```typescript
// Test 5.5a: Prea multe foi (> 10)
// Creare fișier Excel cu 11 foi → Upload → Parse
// Așteptat: Error "Prea multe foi în fișier (max 10)"

// Test 5.5b: Prea multe rânduri (> 20,000)
// Creare fișier cu 25,000 rânduri → Upload → Parse
// Așteptat: Error "Prea multe rânduri în foi (max 20,000)"

// Test 5.5c: Prea multe coloane (> 30)
// Creare fișier cu 35 coloane → Upload → Parse
// Așteptat: Error "Prea multe coloane în foi (max 30)"

// Test 5.5d: Parse timeout (> 30s)
// Creare fișier enorm → Upload → Parse
// Așteptat: Warning log + truncare (incomplet, dar funcțional)
```

**Rezultat așteptat**: Toate limitele enforce  
**Status**: ✅ PASS / ❌ FAIL

### Test 5.6: parseNumber Format Detection (v1.1)

```typescript
// Test în Edge Function sau unit test

// Format RO (punct = mii, virgulă = zecimale)
parseNumber('1.234,56')  // Așteptat: 1234.56
parseNumber('1234,56')   // Așteptat: 1234.56

// Format US (virgulă = mii, punct = zecimale)
parseNumber('1,234.56')  // Așteptat: 1234.56
parseNumber('1234.56')   // Așteptat: 1234.56

// Ambigue (logging ar trebui să detecteze)
parseNumber('1,234')     // Ambigue: 1.234 (RO) sau 1234 (US)?
                         // v1.3: Log warning pentru detectare

// Edge cases
parseNumber('')          // Așteptat: 0
parseNumber(null)        // Așteptat: 0
parseNumber('invalid')   // Așteptat: 0
parseNumber(123.45)      // Așteptat: 123.45 (direct number)
```

**Rezultat așteptat**: Toate formatele procesate corect  
**Status**: ✅ PASS / ❌ FAIL

---

## 🧪 Test Suite 6: Integrare End-to-End

### Test 6.1: Full Import Flow

**Scenariu**: Flow complet de la upload până la procesare

```typescript
// 1. User creează companie
const { data: companyId } = await supabase.rpc('create_company_with_member', {
  p_name: 'Test E2E Company',
  p_cui: 'RO99999999'
});

// 2. User upload fișier (normalizat)
const file = new File([...], 'balanta.xlsx');
const safeName = normalizeFilename(file.name);
const filePath = buildStoragePath(user.id, safeName);

await supabase.storage.from('trial-balances').upload(filePath, file);

// 3. Creare import în DB
const { data: importData } = await supabase
  .from('trial_balance_imports_public')
  .insert({
    company_id: companyId,
    file_name: filePath,
    file_size_bytes: file.size,
    status: 'pending'
  })
  .select()
  .single();

// 4. Apel Edge Function pentru procesare
const response = await fetch(`${supabaseUrl}/functions/v1/parse-balanta`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ import_id: importData.id })
});

// 5. Verificare success
const result = await response.json();
console.log('Accounts:', result.accountsCount);

// 6. Verificare DB (status = completed)
const { data: finalImport } = await supabase
  .from('trial_balance_imports_public')
  .select('*')
  .eq('id', importData.id)
  .single();

console.log('Final status:', finalImport.status);
// Așteptat: 'completed'

// 7. Verificare accounts inserate
const { data: accounts } = await supabase
  .from('trial_balance_accounts')
  .select('*')
  .eq('import_id', importData.id);

console.log('Accounts in DB:', accounts.length);
// Așteptat: Egal cu result.accountsCount
```

**Rezultat așteptat**: Flow complet SUCCESS, status = completed  
**Status**: ✅ PASS / ❌ FAIL

### Test 6.2: Concurență Process Import (v1.7)

**Scenariu**: Două requests simultane pentru același import

```typescript
// Setup: Import în status 'pending'
const importId = '...';

// Test: 2 requests simultane
const [response1, response2] = await Promise.all([
  fetch(`${supabaseUrl}/functions/v1/parse-balanta`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ import_id: importId })
  }),
  fetch(`${supabaseUrl}/functions/v1/parse-balanta`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ import_id: importId })
  })
]);

// Așteptat: 
// - Un request SUCCESS (200)
// - Alt request FAIL cu "already being processed" (500 sau similar)
// - v1.7: pg_try_advisory_xact_lock refuză instant (nu wait)
```

**Rezultat așteptat**: Un SUCCESS, un FAIL (refuz instant)  
**Status**: ✅ PASS / ❌ FAIL

### Test 6.3: Defense-in-Depth Ownership (v1.5)

**Scenariu**: User B nu poate procesa import-ul lui User A

```typescript
// Setup: User A creează companie și import
const companyA = await createCompany('Company A', 'RO111');
const importA = await createImport(companyA);

// Test: User B (altă companie) încearcă să proceseze import-ul lui A
// Call Edge Function ca User B
const response = await fetch(`${supabaseUrl}/functions/v1/parse-balanta`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${tokenUserB}` },
  body: JSON.stringify({ import_id: importA.id })
});

// Așteptat: Error "Unauthorized: User does not belong to this company"
```

**Rezultat așteptat**: ❌ ERROR (unauthorized)  
**Status**: ✅ PASS / ❌ FAIL

---

## 📊 Test Results Template

```markdown
## Test Results - Security Patches v1.8

**Data**: YYYY-MM-DD  
**Environment**: Staging / Production  
**Tester**: [Nume]

| Test ID | Descriere | Status | Note |
|---------|-----------|--------|------|
| 1.1 | Bootstrap auto-join reject | ✅ PASS | |
| 1.2 | Bootstrap first member | ✅ PASS | |
| 1.3 | Member add members | ✅ PASS | |
| 1.4 | Trigger INSERT orphan | ✅ PASS | |
| 1.5 | Trigger DELETE last (active) | ✅ PASS | |
| 1.6 | Trigger DELETE last (archived) | ✅ PASS | |
| 1.7 | Trigger CASCADE delete | ✅ PASS | |
| 1.8 | Seed INSERT+DELETE | ✅ PASS | |
| 2.1 | create_company success | ✅ PASS | |
| 2.2 | Duplicate CUI exception | ✅ PASS | |
| 2.3 | CUI normalization | ✅ PASS | |
| 2.4 | Empty params validation | ✅ PASS | |
| 3.1 | Rate limit under | ✅ PASS | |
| 3.2 | Rate limit over | ✅ PASS | |
| 3.3 | Rate limit window reset | ✅ PASS | |
| 3.4 | Rate limit cleanup | ✅ PASS | |
| 4.1 | try_uuid valid | ✅ PASS | |
| 4.2 | try_uuid invalid no exception | ✅ PASS | |
| 4.3 | Storage valid path | ✅ PASS | |
| 4.4 | Storage invalid path | ✅ PASS | |
| 4.5 | Storage diacritice | ✅ PASS | |
| 4.6 | Storage NULL guard | ✅ PASS | |
| 5.1 | verify_jwt enabled | ✅ PASS | |
| 5.2 | CORS preflight | ✅ PASS | |
| 5.3 | Rate limiting DB | ✅ PASS | |
| 5.4 | File size pre-download | ✅ PASS | |
| 5.5 | XLSX resource limits | ✅ PASS | |
| 5.6 | parseNumber format | ✅ PASS | |
| 6.1 | Full import E2E | ✅ PASS | |
| 6.2 | Concurrency process import | ✅ PASS | |
| 6.3 | Defense-in-depth ownership | ✅ PASS | |

**TOTAL**: 29/29 PASS (100%)

**BLOCKERS**: None  
**WARNINGS**: None  
**READY FOR PRODUCTION**: ✅ YES / ❌ NO
```

---

## 🔍 Automated Testing (Optional)

### Playwright E2E Tests

```typescript
// tests/e2e/security-patches.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Security Patches v1.8', () => {
  test('should reject auto-join to other company', async ({ page, context }) => {
    // User A: creates company
    const pageA = await context.newPage();
    await pageA.goto('/companies/create');
    await pageA.fill('[name="name"]', 'Company A');
    await pageA.fill('[name="cui"]', 'RO11111111');
    await pageA.click('button[type="submit"]');
    
    // Wait for success
    await expect(pageA.locator('.toast-success')).toBeVisible();
    
    // User B: tries to access Company A
    const pageB = await context.newPage();
    await pageB.goto('/companies');  // Should not see Company A
    
    const companyA = pageB.locator('text=Company A');
    await expect(companyA).not.toBeVisible();
  });
  
  test('should reject duplicate CUI with friendly message', async ({ page }) => {
    // Create first company
    await page.goto('/companies/create');
    await page.fill('[name="name"]', 'First Company');
    await page.fill('[name="cui"]', 'RO12345678');
    await page.click('button[type="submit"]');
    await expect(page.locator('.toast-success')).toBeVisible();
    
    // Try duplicate
    await page.goto('/companies/create');
    await page.fill('[name="name"]', 'Duplicate Company');
    await page.fill('[name="cui"]', 'RO 12345678');  // Spațiu diferit
    await page.click('button[type="submit"]');
    
    // Verifică mesaj error friendly (nu technical)
    await expect(page.locator('.toast-error')).toContainText('CUI există deja');
    await expect(page.locator('.toast-error')).toContainText('invitație');
  });
  
  test('should normalize filename with diacritics', async ({ page }) => {
    await page.goto('/imports/upload');
    
    // Upload fișier cu diacritice
    const file = new File(['content'], 'balanță.xlsx');
    await page.setInputFiles('input[type="file"]', file);
    
    // Verifică toast notification pentru filename schimbat
    await expect(page.locator('.toast-info')).toContainText('balanta.xlsx');
  });
});
```

---

**Versiune Document**: 1.0  
**Data**: 28 Ianuarie 2026  
**Total Teste**: 29+  
**Coverage**: RLS, Funcții, Rate Limiting, Storage, Edge Function, Integrare
