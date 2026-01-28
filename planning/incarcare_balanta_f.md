# Documentație: Încărcare Balanță de Verificare - Finguard v2

**Versiune:** 1.8  
**Data:** 28 ianuarie 2026  
**Scop:** Documentație completă a procedurii de încărcare, procesare și validare a balanței de verificare

---

## Cuprins

1. [Prezentare Generală](#1-prezentare-generală)
2. [Procedura de Încărcare](#2-procedura-de-încărcare)
3. [Formate Acceptate](#3-formate-acceptate)
4. [Validări și Verificări](#4-validări-și-verificări)
5. [Procesare Server-Side](#5-procesare-server-side)
6. [Chei de Control și Securitate](#6-chei-de-control-și-securitate)
7. [Limitări și Restricții](#7-limitări-și-restricții)
8. [Tratarea Erorilor](#8-tratarea-erorilor)
9. [Logging și Audit](#9-logging-și-audit)
10. [Performanță și Optimizări](#10-performanță-și-optimizări)
11. [Interfața Utilizator](#11-interfața-utilizator)
12. [Fluxul Complet de Procesare](#12-fluxul-complet-de-procesare)

---

## 1. Prezentare Generală

### 1.1. Descriere

Sistemul de încărcare a balanței de verificare permite utilizatorilor să încarce fișiere Excel (.xlsx, .xls) cu datele contabile, care sunt procesate automat pentru extragerea conturilor și calcularea totalurilor.

### 1.2. Componente Principale

| Componentă | Locație | Descriere |
|------------|---------|-----------|
| **UI Upload** | `src/pages/IncarcareBalanta.tsx` | Interfață utilizator pentru încărcare |
| **Hook Gestionare** | `src/hooks/useTrialBalances.tsx` | Logică React pentru CRUD balanțe |
| **Edge Function** | `supabase/functions/parse-balanta/index.ts` | Procesare server-side Excel |
| **Validare Fișiere** | `src/utils/fileHelpers.ts` | Validări și normalizare nume fișiere |
| **Funcție SQL** | `migrations/.../process_import_accounts_function.sql` | Inserare conturi în DB |
| **Error Boundary** | `src/components/ErrorBoundary.tsx` | Gestionare erori React |

### 1.3. Arhitectură

```
[Client Browser]
     ↓
[IncarcareBalanta.tsx] → [useTrialBalances Hook]
     ↓                           ↓
[Supabase Storage]    →    [Edge Function: parse-balanta]
     ↓                           ↓
[Database]             ←    [process_import_accounts RPC]
     ↓
[Rezultate vizualizare în UI]
```

---

## 2. Procedura de Încărcare

### 2.1. Pași de Încărcare (Perspectiva Utilizator)

#### Pas 1: Selectare Companie Activă
- Utilizatorul trebuie să aibă o companie activă selectată
- Afișare banner cu compania activă: **"Încărci balanță pentru: [Nume Companie]"**

#### Pas 2: Selectare Data de Referință
- **Obligatoriu:** Data până la care este validă balanța
- Selector calendar în format românesc (dd.MM.yyyy)
- Data de referință = ultima zi a perioadei
- Data de start = prima zi a lunii din data de referință

#### Pas 3: Încărcare Fișier
**Metode disponibile:**
- **Drag & Drop:** Tragere fișier în zona marcată
- **File Picker:** Click pe "Selectează fișier"

**Specificații tehnice afișate:**
- Secțiune colapsabilă "Specificații Tehnice și Format Acceptat"
- Structură Excel obligatorie (8 coloane: A-H)
- Exemplu tabel cu date demonstrative

#### Pas 4: Validare și Upload
- Validări client-side (tip, dimensiune)
- Progress bar (10% → 30% → 100%)
- Apel Edge Function pentru procesare

#### Pas 5: Vizualizare Rezultate
- Status badge: Draft/În procesare/Procesat/Validat/Eroare
- Afișare totaluri: Nr. Conturi, Total Debit, Total Credit
- Mesaje eroare (dacă există)

### 2.2. Implementare Tehnică Upload

**Fișier:** `src/hooks/useTrialBalances.tsx` (linii 165-231)

```typescript
const uploadBalance = async (
  file: File,
  periodStart: Date,
  periodEnd: Date,
  userId: string
): Promise<TrialBalanceImport>
```

**Proces:**
1. **Validare companie activă:** `if (!companyId) throw new Error('No company selected')`
2. **Generare path storage:** `${companyId}/${timestamp}_${file.name}`
3. **Upload în Supabase Storage:** Bucket `balante`
4. **Creare înregistrare import:** Status = `processing`
5. **Apel Edge Function:** POST la `/functions/v1/parse-balanta`
6. **Cleanup la eroare:** Ștergere fișier din storage dacă insert DB eșuează

---

## 3. Formate Acceptate

### 3.1. Extensii Fișiere

**Acceptate:**
- `.xlsx` (Excel 2007+, OpenXML)
- `.xls` (Excel 97-2003, Binary)

**Validare extensie:** `src/utils/fileHelpers.ts` (linii 72-74)
```typescript
/\.(xlsx|xls)$/i.test(filename)  // Case-insensitive
```

### 3.2. Tipuri MIME Acceptate

**Fișier:** `src/pages/IncarcareBalanta.tsx` (linii 129-132)

```javascript
const validTypes = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel'  // .xls
];
```

### 3.3. Structură Excel Obligatorie

**Configurare:** 8 coloane fixe (A-H), prima linie = header (ignorat)

| Coloană | Nume Câmp | Tip Date | Validare | Exemplu |
|---------|-----------|----------|----------|---------|
| **A** | Cont | Text | 3-6 cifre | `1012`, `4111` |
| **B** | Denumire | Text | Max 200 caractere | "Conturi la bănci" |
| **C** | Sold Inițial Debit | Număr | Format RO/US | `50000.00` |
| **D** | Sold Inițial Credit | Număr | Format RO/US | `0.00` |
| **E** | Rulaj Debit | Număr | Format RO/US | `25000.00` |
| **F** | Rulaj Credit | Număr | Format RO/US | `15000.00` |
| **G** | Sold Final Debit | Număr | Format RO/US | `60000.00` |
| **H** | Sold Final Credit | Număr | Format RO/US | `0.00` |

**Observații:**
- Prima linie (header) este ignorată automat la procesare
- Liniile goale sunt ignorate automat
- Conturi duplicate sunt permise (folosite pentru subcategorii)

### 3.4. Formate Numerice Suportate

**Fișier:** `supabase/functions/parse-balanta/index.ts` (linii 163-228)

**Format Românesc:**
- Separator mii: **punct** (.)
- Separator zecimale: **virgulă** (,)
- Exemplu: `1.234,56` → 1234.56

**Format Internațional (US):**
- Separator mii: **virgulă** (,)
- Separator zecimale: **punct** (.)
- Exemplu: `1,234.56` → 1234.56

**Detectare automată:**
- Dacă ambele prezente → ultimul caracter determină formatul
- Dacă doar virgulă → presupune RO (zecimale)
- Dacă doar punct → presupune US (zecimale)

**Exemplu ambiguu cu logging:**
```javascript
// Input: "1.234,56"
// Ultimul e virgulă → Format RO
// Output: 1234.56

// Input: "1,234.56"
// Ultimul e punct → Format US
// Output: 1234.56
```

---

## 4. Validări și Verificări

### 4.1. Validări Client-Side

**Fișier:** `src/pages/IncarcareBalanta.tsx` (linii 128-147)

#### Validare Tip Fișier
```typescript
if (!validTypes.includes(file.type)) {
  toast.error('Format fișier neacceptat. Vă rugăm să încărcați un fișier Excel (.xlsx, .xls)');
  return;
}
```

#### Validare Dimensiune
```typescript
if (file.size > 10 * 1024 * 1024) {  // 10MB
  toast.error('Fișierul depășește dimensiunea maximă de 10MB');
  return;
}
```

#### Validare Data Referință
```typescript
if (!referenceDate) {
  setDateError(true);
  toast.error('Data de referință este obligatorie');
  return;
}
```

### 4.2. Validări Server-Side (Edge Function)

**Fișier:** `supabase/functions/parse-balanta/index.ts`

#### 4.2.1. Validare Size ÎNAINTE de Download (v1.7)

**Linii 482-513:**
```typescript
if (importRecord.file_size_bytes > MAX_FILE_SIZE_BYTES) {
  await supabaseAdmin
    .from("trial_balance_imports")
    .update({ 
      status: "failed", 
      error_message: `Fișier prea mare (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB)`,
      internal_error_code: "FILE_TOO_LARGE"
    })
    .eq("id", import_id);

  return new Response(
    JSON.stringify({ error: "File too large" }),
    { status: 413 }
  );
}
```

#### 4.2.2. Sanitizare String (Formula Injection Prevention)

**Linii 119-140:**
```typescript
function sanitizeString(value: unknown): string {
  // Limitare lungime
  if (strValue.length > MAX_CELL_LENGTH) {
    strValue = strValue.substring(0, MAX_CELL_LENGTH);
  }
  
  // Eliminare formula injection (=, +, -, @, tab, CR)
  strValue = strValue.replace(/^[=+\-@\t\r]+/, "");
  
  // Eliminare caractere control (except whitespace)
  strValue = strValue.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  
  return strValue.trim();
}
```

#### 4.2.3. Validare Cod Cont

**Linii 327-328:**
```typescript
const accountCode = sanitizeString(row[0]);

// Validate account code (3-6 digits)
if (!/^\d{3,6}$/.test(accountCode)) continue;
```

#### 4.2.4. Validare Nume Cont

**Linii 330-332:**
```typescript
const accountName = sanitizeString(row[1]);

if (accountName.length > 200) continue;
```

#### 4.2.5. Validare Valori Numerice

**Linii 165-226:**
```typescript
// Verificare range
if (value > MAX_NUMERIC_VALUE || value < MIN_NUMERIC_VALUE) return 0;

// MAX_NUMERIC_VALUE = 999_999_999_999.99
// MIN_NUMERIC_VALUE = -999_999_999_999.99
```

### 4.3. Validări Nume Fișier (Storage Policy)

**Fișier:** `src/utils/fileHelpers.ts`

#### Normalizare Diacritice → ASCII
```typescript
function normalizeFilename(filename: string): string {
  return filename
    .normalize('NFD')  // Decompoziție: ă → a + ̆
    .replace(/[\u0300-\u036f]/g, '')  // Elimină diacritice
    .replace(/[^a-zA-Z0-9._\- ]/g, '_')  // Replace caractere invalide
    .trim();
}
```

**Exemple:**
- `balanță contabilă.xlsx` → `balanta contabila.xlsx`
- `situație financiară 2023.xls` → `situatie financiara 2023.xls`
- `file@#$%^&*.xlsx` → `file_______.xlsx`

#### Validare Pattern Storage
```typescript
function isValidFilename(filename: string): boolean {
  return /^[a-zA-Z0-9._\- ]+$/.test(filename);
}
```

### 4.4. Validări Database (RLS + Functions)

**Fișier:** `supabase/migrations/.../process_import_accounts_function.sql`

#### Verificare Ownership (Defense-in-Depth)

**Linii 28-39:**
```sql
SELECT company_id, status INTO v_company_id, v_current_status
FROM public.trial_balance_imports
WHERE id = p_import_id;

IF v_company_id IS NULL THEN
  RAISE EXCEPTION 'Import not found';
END IF;

IF NOT public.is_company_member(p_requester_user_id, v_company_id) THEN
  RAISE EXCEPTION 'Unauthorized: User does not belong to this company';
END IF;
```

#### Guard Status (Idempotență)

**Linii 48-53:**
```sql
IF v_current_status IN ('completed', 'failed') THEN
  -- Refuz rerun automat
  RAISE EXCEPTION 'Import already % (rerun not allowed)', v_current_status;
END IF;
```

---

## 5. Procesare Server-Side

### 5.1. Edge Function: parse-balanta

**Fișier:** `supabase/functions/parse-balanta/index.ts`

#### 5.1.1. Flux Procesare

```
[1. Verificare Auth JWT] → verify_jwt = true (config.toml)
         ↓
[2. Rate Limiting DB] → check_rate_limit RPC (10 req/oră)
         ↓
[3. Validare Size] → MAX_FILE_SIZE_BYTES (ÎNAINTE de download)
         ↓
[4. Download Fișier] → Supabase Storage (trial-balances bucket)
         ↓
[5. Validare Size Secundară] → Defense-in-depth
         ↓
[6. Parsare Excel] → parseExcelFile() cu resource limits
         ↓
[7. Procesare Conturi] → process_import_accounts RPC
         ↓
[8. Update Status] → completed/failed
```

#### 5.1.2. Parsare Excel cu Resource Limits (v1.6)

**Linii 244-395:**

**Limite configurate:**
```typescript
const MAX_SHEETS = 10;              // Maximum foi în workbook
const MAX_ROWS_PER_SHEET = 20_000;  // Maximum rânduri per foi
const MAX_COLUMNS = 30;             // Maximum coloane
const PARSE_TIMEOUT_MS = 30_000;    // Timeout parsare (30s)
const MAX_ACCOUNTS = 10_000;        // Maximum conturi în fișier
```

**Verificări:**
```typescript
// Verificare număr foi
if (workbook.SheetNames.length > MAX_SHEETS) {
  throw new Error(`Prea multe foi în fișier (max ${MAX_SHEETS})`);
}

// Verificare dimensiuni foi
const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

if (range.e.r > MAX_ROWS_PER_SHEET) {
  throw new Error(`Prea multe rânduri în foi (max ${MAX_ROWS_PER_SHEET})`);
}

if (range.e.c > MAX_COLUMNS) {
  throw new Error(`Prea multe coloane în foi (max ${MAX_COLUMNS})`);
}
```

**Timeout în buclă:**
```typescript
for (let i = 1; i < jsonData.length; i++) {
  // Verificare timeout la fiecare 1000 rânduri
  if (i % 1000 === 0 && Date.now() - startTime > PARSE_TIMEOUT_MS) {
    console.warn(`Parse timeout exceeded at row ${i}, truncating`);
    break;
  }
  // ... procesare rând
}
```

#### 5.1.3. Calcul Totaluri

**Linii 303-358:**
```typescript
const totals = {
  opening_debit: 0,
  opening_credit: 0,
  debit_turnover: 0,
  credit_turnover: 0,
  closing_debit: 0,
  closing_credit: 0,
};

// Acumulare în buclă
totals.opening_debit += account.opening_debit;
totals.opening_credit += account.opening_credit;
// ... etc

// Rotunjire finală (2 zecimale)
totals.opening_debit = Math.round(totals.opening_debit * 100) / 100;
```

### 5.2. Funcție SQL: process_import_accounts

**Fișier:** `supabase/migrations/.../process_import_accounts_function.sql`

#### 5.2.1. Prevenire Concurență (Advisory Lock)

**Linii 41-46:**
```sql
-- v1.7: Advisory lock pentru refuz instant (nu wait)
v_lock_acquired := pg_try_advisory_xact_lock(hashtext(p_import_id::TEXT));

IF NOT v_lock_acquired THEN
  RAISE EXCEPTION 'Import is already being processed by another request';
END IF;
```

**Comportament:**
- `pg_try_advisory_xact_lock`: Încearcă lock, returnează instant TRUE/FALSE
- Dacă FALSE → refuz imediat (nu așteaptă)
- Lock-ul este eliberat automat la COMMIT/ROLLBACK

#### 5.2.2. Bulk Insert Conturi

**Linii 68-77:**
```sql
INSERT INTO public.trial_balance_accounts (
  import_id, account_code, account_name, debit, credit
)
SELECT 
  p_import_id,
  (account->>'code')::VARCHAR,
  (account->>'name')::VARCHAR,
  COALESCE((account->>'debit')::NUMERIC, 0),
  COALESCE((account->>'credit')::NUMERIC, 0)
FROM jsonb_array_elements(p_accounts) AS account;
```

**Beneficii:**
- O singură query în loc de N queries
- Performanță optimă pentru 1000+ conturi
- Atomic (totul sau nimic)

#### 5.2.3. Update Status Final

**Linii 80-84:**
```sql
UPDATE public.trial_balance_imports
SET status = 'completed',
    accounts_count = jsonb_array_length(p_accounts),
    updated_at = NOW()
WHERE id = p_import_id;
```

---

## 6. Chei de Control și Securitate

### 6.1. Autentificare și Autorizare

#### 6.1.1. Verificare JWT (Edge Function)

**Fișier:** `supabase/functions/parse-balanta/index.ts` (linii 435-443)

```typescript
const authHeader = req.headers.get("Authorization");
if (!authHeader) {
  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { status: 401 }
  );
}

const token = authHeader.replace("Bearer ", "");
const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

if (authError || !user) {
  return new Response(
    JSON.stringify({ error: "Invalid token" }),
    { status: 401 }
  );
}
```

**Configurare:** `verify_jwt = true` în `supabase/config.toml`

#### 6.1.2. Verificare Ownership (SQL Function)

**Defense-in-depth:** Verificare dublă ownership

```sql
IF NOT public.is_company_member(p_requester_user_id, v_company_id) THEN
  RAISE EXCEPTION 'Unauthorized: User does not belong to this company';
END IF;
```

### 6.2. CORS Whitelist (v1.7)

**Fișier:** `supabase/functions/parse-balanta/index.ts` (linii 57-83)

```typescript
const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:3000",
  "http://localhost:5173",
  "https://finguard.ro",
  "https://www.finguard.ro",
];

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) 
    ? requestOrigin 
    : ALLOWED_ORIGINS[0];  // Fallback la localhost

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}
```

**NU se folosește wildcard** (`*`) → previne CSRF

### 6.3. Rate Limiting DB-Based (v1.5)

**Fișier:** `supabase/migrations/.../rate_limits_table.sql`

#### 6.3.1. Tabel Persistent

```sql
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,  -- 'import', 'company_create', etc
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reset_in_seconds INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 6.3.2. Funcție check_rate_limit

**Apelată din Edge Function (linii 446-470):**

```typescript
const { data: rateLimitAllowed, error: rateLimitError } = 
  await supabaseAdmin.rpc('check_rate_limit', {
    p_user_id: user.id,
    p_resource_type: 'import',
    p_max_requests: 10,
    p_window_seconds: 3600,  // 1 hour window
  });

// Fail-closed strategy: eroare DB → refuz
if (rateLimitError || !rateLimitAllowed) {
  return new Response(
    JSON.stringify({ 
      error: "Too many requests. Please try again later.",
      retryAfter: 3600
    }),
    { 
      status: 429,
      headers: { 
        "Retry-After": "3600"  // Seconds until reset
      }
    }
  );
}
```

**Algoritm:**
- **Fixed window:** Fereastră de 1 oră (DATE_TRUNC('hour', NOW()))
- **Limită:** 10 cereri per oră per user per tip resursă
- **Fail-closed:** Dacă DB eroare → refuz cerere (nu accept)

#### 6.3.3. Cleanup Periodic

```sql
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits(
  p_retention_hours INT DEFAULT 2
)
RETURNS INT
```

**Apelare:**
- Manual: `SELECT cleanup_rate_limits(2);`
- Sau pg_cron (opțional): `SELECT cron.schedule(...)`

### 6.4. Row Level Security (RLS)

**Tabelă:** `trial_balance_imports`

```sql
CREATE POLICY "Users can view their company imports"
ON public.trial_balance_imports
FOR SELECT
TO authenticated
USING (
  public.is_company_member(public.get_user_id_from_auth(), company_id)
  OR public.has_role(public.get_user_id_from_auth(), 'admin'::public.app_role)
);
```

**Protecție Internal Errors (v1.7):**
- REVOKE SELECT pe `trial_balance_imports` pentru `authenticated`
- CREATE VIEW `trial_balance_imports_public` (fără `internal_error_detail`)
- GRANT SELECT pe view către `authenticated`

### 6.5. Storage Policy

**Bucket:** `balante` (sau `trial-balances`)

**Policy:**
- Path format: `<user_id>/<filename>`
- Filename pattern: `^[a-zA-Z0-9._\- ]+$` (doar ASCII safe)
- Validare în `fileHelpers.ts`

---

## 7. Limitări și Restricții

### 7.1. Limite Fișiere

| Limită | Valoare | Locație Validare |
|--------|---------|------------------|
| **Dimensiune maximă** | 10 MB | Client + Server (pre-download) |
| **Extensii permise** | `.xlsx`, `.xls` | Client + Server |
| **Tipuri MIME** | `application/vnd.openxmlformats...`, `application/vnd.ms-excel` | Client |

### 7.2. Limite Excel (Resource Exhaustion Protection)

**Fișier:** `supabase/functions/parse-balanta/index.ts` (linii 26-51)

| Limită | Valoare | Cod Eroare |
|--------|---------|------------|
| **MAX_SHEETS** | 10 foi | `Prea multe foi în fișier` |
| **MAX_ROWS_PER_SHEET** | 20,000 rânduri | `Prea multe rânduri în foi` |
| **MAX_COLUMNS** | 30 coloane | `Prea multe coloane în foi` |
| **MAX_ACCOUNTS** | 10,000 conturi | Truncare cu warning |
| **PARSE_TIMEOUT_MS** | 30,000 ms (30s) | Truncare cu warning |

### 7.3. Limite String

| Limită | Valoare | Aplicare |
|--------|---------|----------|
| **MAX_CELL_LENGTH** | 500 caractere | Truncare automată |
| **Account Name** | 200 caractere | Skip row |
| **Account Code** | 3-6 cifre | Skip row dacă invalid |

### 7.4. Limite Numerice

| Limită | Valoare |
|--------|---------|
| **MAX_NUMERIC_VALUE** | 999,999,999,999.99 |
| **MIN_NUMERIC_VALUE** | -999,999,999,999.99 |

### 7.5. Limite Rate Limiting

| Resursă | Limită | Fereastră |
|---------|--------|-----------|
| **Import balanță** | 10 cereri | 1 oră (3600s) |

**Comportament depășire:**
- Status HTTP: `429 Too Many Requests`
- Header: `Retry-After: 3600` (seconds)
- Mesaj: "Too many requests. Please try again later."

### 7.6. Limite Concurență

**Advisory Lock:**
- Doar un request poate procesa un import în același timp
- Al doilea request primește: `Import is already being processed by another request`
- Lock eliberat automat la COMMIT/ROLLBACK

### 7.7. Limite Paginare UI

| Componentă | Limite |
|------------|--------|
| **Dialog Conturi** | 50 conturi/pagină |
| **Query Default** | 1000 conturi (fără paginare explicit) |

---

## 8. Tratarea Erorilor

### 8.1. Error Boundary React

**Fișier:** `src/components/ErrorBoundary.tsx`

#### 8.1.1. Capturare Erori

```typescript
static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
  return { hasError: true, error };
}

componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
  console.error('[ErrorBoundary] Caught error:', error);
  console.error('[ErrorBoundary] Error info:', errorInfo);
  
  // Callback pentru logging extern (ex: Sentry)
  this.props.onError?.(error, errorInfo);
}
```

#### 8.1.2. UI Eroare

**Elemente afișate:**
- Iconiță: `AlertTriangle` (destructive)
- Titlu: "Ceva nu a funcționat corect" (customizabil)
- Mesaj: "A apărut o eroare neașteptată..."
- Detalii tehnice: Doar în development (`import.meta.env.DEV`)
- Acțiuni:
  - **Reîncearcă:** Reset state ErrorBoundary
  - **Înapoi la Dashboard:** Redirect `/app/dashboard`
  - **Reîncarcă pagina:** `window.location.reload()`

#### 8.1.3. Folosire

```typescript
<ErrorBoundary 
  errorTitle="Eroare la încărcarea paginii"
  retryButtonText="Reîncearcă"
  onError={(error) => {
    console.error('[IncarcareBalanta] Caught error:', error);
  }}
>
  <IncarcareBalanta />
</ErrorBoundary>
```

### 8.2. Try-Catch în Upload Flow

**Fișier:** `src/pages/IncarcareBalanta.tsx`

#### handleUpload (linii 215-220)
```typescript
try {
  await uploadBalance(uploadedFile, periodStart, referenceDate, userData.id);
  // Success handling
} catch (error) {
  console.error('Upload error:', error);
  setUploadStatus('error');
  toast.error(error instanceof Error ? error.message : 'Eroare la încărcare');
}
```

#### confirmDelete (linii 232-238)
```typescript
try {
  await deleteImport(selectedImportId);
  toast.success('Balanța a fost ștearsă cu succes');
} catch (error) {
  toast.error('Eroare la ștergere');
}
```

#### handleViewAccounts (linii 262-268)
```typescript
try {
  const accounts = await getAccounts(importId, { limit: 50, offset: 0 });
  setViewingAccounts(accounts);
} catch (error) {
  toast.error('Eroare la încărcarea conturilor');
  console.error('[IncarcareBalanta] Error loading accounts:', error);
}
```

### 8.3. Error Handling în Edge Function

**Fișier:** `supabase/functions/parse-balanta/index.ts`

#### 8.3.1. Erori Parsare Excel (linii 385-394)

```typescript
try {
  // Parse workbook
  const workbook = XLSX.read(arrayBuffer, { ... });
  // ... procesare
} catch (error) {
  console.error("Error parsing Excel:", error);
  return {
    success: false,
    accounts: [],
    totals: { ... },
    accountsCount: 0,
    error: `Eroare la parsarea fișierului: ${error instanceof Error ? error.message : "Unknown error"}`,
  };
}
```

#### 8.3.2. Update Status "failed" în DB (linii 563-578)

```typescript
if (!parseResult.success) {
  await supabaseAdmin
    .from("trial_balance_imports")
    .update({ 
      status: "failed", 
      error_message: parseResult.error,           // User-facing
      internal_error_detail: parseResult.error,   // Internal debugging
      internal_error_code: "PARSE_FAILED"
    })
    .eq("id", import_id);

  return new Response(
    JSON.stringify({ error: parseResult.error }),
    { status: 400 }
  );
}
```

#### 8.3.3. Catch Global Handler (linii 613-619)

```typescript
} catch (error) {
  console.error("Handler error:", error);
  return new Response(
    JSON.stringify({ error: "Internal server error" }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### 8.4. Error Handling în SQL Function

**Fișier:** `supabase/migrations/.../process_import_accounts_function.sql` (linii 88-100)

```sql
EXCEPTION WHEN OTHERS THEN
  -- Marchează ca "failed" + salvează eroare
  UPDATE public.trial_balance_imports
  SET status = 'failed',
      error_message = 'Processing failed. Please try again.',
      internal_error_detail = SQLERRM,
      internal_error_code = SQLSTATE,
      updated_at = NOW()
  WHERE id = p_import_id;

  RAISE NOTICE 'process_import_accounts ERROR: %', SQLERRM;
  RETURN FALSE;
END;
```

### 8.5. Cleanup la Eroare

**Fișier:** `src/hooks/useTrialBalances.tsx` (linii 200-204)

```typescript
if (insertError) {
  // Clean up uploaded file
  await supabase.storage.from('balante').remove([filePath]);
  throw insertError;
}
```

**Previne:** Fișiere orfane în storage

### 8.6. Fallback Queries

#### Fallback la RPC Unavailable

```typescript
const { data: dataWithTotals, error: rpcError } = 
  await supabase.rpc('get_company_imports_with_totals', { ... });

if (!rpcError && dataArray) {
  // Folosește RPC optimizat
  setImportsWithTotals(mappedData);
} else {
  // Fallback: query simplu (fără totals)
  console.warn('[useTrialBalances] RPC not available, using fallback query');
  const { data, error: fetchError } = await supabase
    .from('trial_balance_imports')
    .select('*')
    .eq('company_id', companyId);
  // ...
}
```

---

## 9. Logging și Audit

### 9.1. Logging Client-Side

**Fișier:** `src/hooks/useTrialBalances.tsx`

```typescript
console.log('[useTrialBalances] Loaded', mappedData.length, 'imports with totals via RPC');
console.warn('[useTrialBalances] RPC not available, using fallback query');
console.error('[useTrialBalances] Error fetching imports:', err);
console.error('[useTrialBalances] Error deleting import:', err);
```

**Fișier:** `src/pages/IncarcareBalanta.tsx`

```typescript
console.error('Upload error:', error);
console.error('[IncarcareBalanta] Error loading accounts:', error);
```

**Fișier:** `src/components/ErrorBoundary.tsx`

```typescript
console.error('[ErrorBoundary] Caught error:', error);
console.error('[ErrorBoundary] Error info:', errorInfo);
```

### 9.2. Logging Server-Side (Edge Function)

**Fișier:** `supabase/functions/parse-balanta/index.ts`

#### Erori
```typescript
console.error("Download error:", downloadError);
console.error("Error parsing Excel:", error);
console.error("Process error:", processError);
console.error("Handler error:", error);
```

#### Warnings
```typescript
console.warn(`Parse timeout exceeded at row ${i}, truncating`);
console.warn(`File size mismatch: DB=${importRecord.file_size_bytes}, actual=${fileData.size}`);
console.warn(`Max accounts limit (${MAX_ACCOUNTS}) reached, truncating`);
```

#### Info/Debug
```typescript
console.warn(`[Row ${rowContext}] Possible US format treated as RO: "${strValue}" → ${normalized}`);
```

### 9.3. Audit Database

#### 9.3.1. View: internal_error_tracking

**Fișier:** `supabase/migrations/.../add_internal_error_tracking_view.sql`

```sql
CREATE OR REPLACE VIEW public.trial_balance_imports_internal AS
SELECT 
  id,
  company_id,
  file_name,
  status,
  error_message,
  internal_error_detail,  -- Detalii tehnice complete
  internal_error_code,    -- Cod eroare (ex: FILE_TOO_LARGE)
  processing_started_at,
  created_at
FROM public.trial_balance_imports
WHERE status IN ('failed', 'error');
```

**Acces:** Doar `service_role` (nu `authenticated`)

**Interogare:**
```sql
SELECT * FROM public.trial_balance_imports_internal
ORDER BY created_at DESC;
```

#### 9.3.2. Funcție: detect_stale_imports

**Fișier:** `supabase/migrations/.../add_processing_started_at.sql`

```sql
CREATE OR REPLACE FUNCTION public.detect_stale_imports()
RETURNS TABLE(
  import_id UUID,
  file_name TEXT,
  started_at TIMESTAMPTZ,
  minutes_elapsed NUMERIC
)
```

**Interogare:**
```sql
SELECT * FROM public.detect_stale_imports();
```

**Rezultat:** Imports blocate în `processing` > 10 minute

#### 9.3.3. Tabel: rate_limits

**Audit rate limiting:**
```sql
SELECT user_id, resource_type, request_count, window_start, updated_at
FROM public.rate_limits
WHERE window_start >= NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
```

**Cleanup metadata:**
```sql
SELECT last_cleanup_at, cleanup_count
FROM public.rate_limits_meta;
```

### 9.4. Logging SQL (RAISE NOTICE)

**Fișier:** `supabase/migrations/.../process_import_accounts_function.sql`

```sql
RAISE NOTICE 'process_import_accounts ERROR: %', SQLERRM;
```

**Vizualizare:** PostgreSQL logs (Supabase Dashboard → Database → Logs)

---

## 10. Performanță și Optimizări

### 10.1. Totaluri Calculate Server-Side

**Problem:** N+1 queries pentru calcularea totalurilor fiecărui import

**Soluție:** RPC `get_company_imports_with_totals`

**Fișier:** `src/hooks/useTrialBalances.tsx` (linii 101-127)

```typescript
const { data: dataWithTotals, error: rpcError } = 
  await supabase.rpc('get_company_imports_with_totals', {
    _company_id: companyId
  });

// Datele returnate conțin deja:
// - total_closing_debit
// - total_closing_credit
// - accounts_count
```

**Beneficii:**
- O singură query în loc de 1 + N queries
- Calcul pe server (PostgreSQL) în loc de client (JavaScript)
- Reducere trafic rețea

### 10.2. Paginare Server-Side pentru Conturi

**Fișier:** `src/hooks/useTrialBalances.tsx` (linii 298-315)

```typescript
const getAccounts = async (
  importId: string,
  options?: PaginationOptions
): Promise<TrialBalanceAccount[]> => {
  const limit = options?.limit ?? 1000;
  const offset = options?.offset ?? 0;

  const { data } = await supabase
    .from('trial_balance_accounts')
    .select('*')
    .eq('import_id', importId)
    .order('account_code')
    .range(offset, offset + limit - 1);  // PostgreSQL LIMIT/OFFSET

  return data;
};
```

**Fișier:** `src/pages/IncarcareBalanta.tsx` (linii 47-48, 253-256)

```typescript
const ACCOUNTS_PER_PAGE = 50;

const accounts = await getAccounts(importId, { 
  limit: ACCOUNTS_PER_PAGE, 
  offset: 0 
});
```

**Beneficii:**
- Nu încarcă toate conturile în memorie (poate fi 10,000+)
- Răspuns rapid indiferent de numărul total
- UX fluid cu navigare Previous/Next

### 10.3. Bulk Insert SQL

**Fișier:** `supabase/migrations/.../process_import_accounts_function.sql` (linii 68-77)

```sql
INSERT INTO public.trial_balance_accounts (...)
SELECT 
  p_import_id,
  (account->>'code')::VARCHAR,
  (account->>'name')::VARCHAR,
  COALESCE((account->>'debit')::NUMERIC, 0),
  COALESCE((account->>'credit')::NUMERIC, 0)
FROM jsonb_array_elements(p_accounts) AS account;
```

**Alternativa lentă (NU se folosește):**
```javascript
// ❌ BAD: Loop cu N queries separate
for (const account of accounts) {
  await supabase.from('trial_balance_accounts').insert({ ... });
}
```

**Beneficii:**
- O singură query pentru 1000+ conturi
- Atomic (totul sau nimic)
- Performanță 100x mai bună

### 10.4. Advisory Lock pentru Concurență

**Fișier:** `supabase/migrations/.../process_import_accounts_function.sql` (linii 41-46)

```sql
v_lock_acquired := pg_try_advisory_xact_lock(hashtext(p_import_id::TEXT));

IF NOT v_lock_acquired THEN
  RAISE EXCEPTION 'Import is already being processed';
END IF;
```

**Beneficii:**
- Refuz instant (nu wait) pentru request duplicat
- Previne race conditions și inserări duble
- Lock automat eliberat la COMMIT/ROLLBACK

### 10.5. Indexare Strategică

#### Index Compus (user_id + resource_type)

```sql
CREATE INDEX idx_rate_limits_user_resource 
ON public.rate_limits(user_id, resource_type, window_start);
```

**Query optimizat:**
```sql
WHERE user_id = ? AND resource_type = ? AND window_start >= ?
```

#### Index Parțial pentru Cleanup

```sql
CREATE INDEX idx_rate_limits_window_start 
ON public.rate_limits(window_start) 
WHERE window_start < NOW() - INTERVAL '1 hour';
```

**Beneficii:** Index mai mic, folosit doar pentru DELETE vechi

#### Index pentru Stale Imports

```sql
CREATE INDEX idx_trial_balance_imports_processing 
ON public.trial_balance_imports(status, processing_started_at) 
WHERE status = 'processing';
```

### 10.6. Soft Delete în Loc de Hard Delete

**Fișier:** `src/hooks/useTrialBalances.tsx` (linii 240-289)

```typescript
// Încercăm soft delete
const { data: softDeleteResult, error: rpcError } = 
  await supabase.rpc('soft_delete_import', {
    _import_id: importId
  });

if (!rpcError && softDeleteResult) {
  console.log('[useTrialBalances] Soft delete successful');
  return;
}

// Fallback: hard delete doar dacă RPC unavailable
```

**Beneficii:**
- Păstrează istoric pentru audit
- Permite restore ulterior
- Evită cascading deletes costisitoare

### 10.7. Optimizări XLSX Parsing

**Configurare securitate + performanță:**

```typescript
const workbook = XLSX.read(arrayBuffer, { 
  type: "array",
  cellDates: false,      // Nu parsează date (mai rapid)
  cellNF: false,         // Nu include number format
  cellFormula: false,    // SECURITY: Disable formula parsing
});
```

### 10.8. Usememo pentru Totaluri UI

**Fișier:** `src/pages/IncarcareBalanta.tsx` (linii 92-107)

```typescript
const importTotals = useMemo(() => {
  const totals: Record<string, { ... }> = {};
  
  if (importsWithTotals && importsWithTotals.length > 0) {
    importsWithTotals.forEach((imp) => {
      totals[imp.id] = {
        totalDebit: imp.total_closing_debit || 0,
        totalCredit: imp.total_closing_credit || 0,
        accountsCount: imp.accounts_count || 0,
      };
    });
  }
  
  return totals;
}, [importsWithTotals]);
```

**Beneficii:** Evită recalculare la fiecare render

---

## 11. Interfața Utilizator

### 11.1. Componente UI Principale

#### 11.1.1. Page Header

```typescript
<div className="page-header">
  <h1 className="page-title">Încărcare Balanță</h1>
  <p className="page-description">
    Încărcați și procesați balanțe contabile pentru 
    <span className="font-semibold text-primary">{activeCompany?.name}</span>
  </p>
</div>
```

#### 11.1.2. Active Company Banner

```typescript
<div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
  <div className="w-10 h-10 bg-primary/10 rounded-lg">
    {activeCompany?.name.substring(0, 2).toUpperCase()}
  </div>
  <div>
    <p className="text-sm text-muted-foreground">Încărci balanță pentru:</p>
    <p className="font-semibold text-foreground">{activeCompany?.name}</p>
  </div>
</div>
```

#### 11.1.3. Date Picker

**Componente folosite:**
- `Popover` + `PopoverTrigger` + `PopoverContent`
- `Calendar` cu `mode="single"`, `locale={ro}`
- Format afișare: `dd.MM.yyyy`

```typescript
<Button variant="outline">
  <CalendarIcon className="mr-2 h-4 w-4" />
  {referenceDate ? format(referenceDate, "dd.MM.yyyy", { locale: ro }) : "Selectează data"}
</Button>
```

#### 11.1.4. Upload Zone (Drag & Drop)

**State-uri vizuale:**
- **Idle:** Border dashed gri
- **Dragging:** Border solid albastru + background albastru transparent
- **File selected:** Border solid albastru

```typescript
<div
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  className={cn(
    "border-2 border-dashed rounded-xl p-8",
    isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
    uploadedFile && "border-primary"
  )}
>
```

#### 11.1.5. Progress Bar

**Afișat în timpul upload:**

```typescript
{uploadStatus === 'uploading' && (
  <div className="mb-4">
    <Progress value={uploadProgress} className="mb-2" />
    <p className="text-xs text-muted-foreground text-center">
      Se procesează... {uploadProgress}%
    </p>
  </div>
)}
```

**Progres:**
- 10% - Start
- 30% - După calcul periodStart
- 100% - Procesare completă

#### 11.1.6. Status Badges

```typescript
const getStatusBadge = (status: TrialBalanceImport['status']) => {
  switch (status) {
    case 'completed':
      return <Badge variant="default">Procesat</Badge>;
    case 'processing':
      return <Badge variant="secondary">În procesare</Badge>;
    case 'validated':
      return <Badge variant="outline">Validat</Badge>;
    case 'error':
      return <Badge variant="destructive">Eroare</Badge>;
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
};
```

#### 11.1.7. Tabel Balanțe Încărcate

**Coloane:**
1. Nume Fișier (cu iconiță `FileSpreadsheet`)
2. Perioadă (format: "ianuarie 2024")
3. Data Încărcare (format: "28.01.2026 14:30")
4. Nr. Conturi (din totaluri server-side)
5. Total Debit (format RON cu `Intl.NumberFormat`)
6. Total Credit (format RON)
7. Status (badge + mesaj eroare dacă există)
8. Acțiuni (Download, View, Delete)

**Loading state:**
```typescript
{importsLoading ? (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
) : ...}
```

**Empty state:**
```typescript
{imports.length === 0 ? (
  <div className="text-center py-12">
    <FileX className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
    <p className="text-sm text-muted-foreground">Nu există balanțe încărcate</p>
  </div>
) : ...}
```

#### 11.1.8. Dialog Vizualizare Conturi

**Dimensiuni:**
- Desktop: `max-w-6xl xl:max-w-7xl`
- Mobile: `max-w-[95vw]`
- Height: `max-h-[85vh]`

**Structură:**
```typescript
<Dialog>
  <DialogHeader>
    <DialogTitle>Conturi Balanță</DialogTitle>
    <DialogDescription>
      Afișez {start} - {end} din {total} conturi
    </DialogDescription>
  </DialogHeader>
  
  <div className="overflow-x-auto overflow-y-auto max-h-[calc(85vh-180px)]">
    <Table className="min-w-[900px]">
      <TableHeader className="sticky top-0 bg-background">
        {/* 8 coloane */}
      </TableHeader>
      <TableBody>
        {/* Conturi paginate */}
      </TableBody>
    </Table>
  </div>
  
  {/* Controale paginare */}
  <div className="flex items-center justify-between pt-4 border-t">
    <Button onClick={handlePrevAccountsPage}>Anterior</Button>
    <Button onClick={handleNextAccountsPage}>Următor</Button>
  </div>
</Dialog>
```

**Coloane tabel conturi:**
1. Cont (font-mono, 80px)
2. Denumire (min 180px, truncate cu title)
3. SI Debit (text-right, 120px)
4. SI Credit (text-right, 120px)
5. Rulaj D (text-right, 130px)
6. Rulaj C (text-right, 130px)
7. SF Debit (text-right, 120px)
8. SF Credit (text-right, 120px)

### 11.2. Tooltips

**Locații:**
- Info icon lângă titlu: "Încărcați fișierul Excel cu balanța contabilă..."
- Buton Download: "Descarcă"
- Buton View: "Vizualizează conturi"
- Buton Delete: "Șterge"

```typescript
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon">
        <Download className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Descarcă</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### 11.3. Toast Notifications

**Tipuri folosite:**
- `toast.success()` - Operații reușite
- `toast.error()` - Erori

**Exemple:**
```typescript
toast.success('Fișier selectat cu succes!');
toast.success('Balanța a fost încărcată și procesată cu succes!');
toast.success('Balanța a fost ștearsă cu succes');

toast.error('Format fișier neacceptat...');
toast.error('Fișierul depășește dimensiunea maximă de 10MB');
toast.error('Data de referință este obligatorie');
toast.error('Eroare la încărcare');
toast.error('Eroare la ștergere');
toast.error('Eroare la încărcarea conturilor');
```

### 11.4. Alert Dialogs

**Delete Confirmation:**

```typescript
<AlertDialog>
  <AlertDialogHeader>
    <AlertDialogTitle>Confirmare ștergere</AlertDialogTitle>
    <AlertDialogDescription>
      Sunteți sigur că doriți să ștergeți această balanță? 
      Această acțiune nu poate fi anulată.
    </AlertDialogDescription>
  </AlertDialogHeader>
  <AlertDialogFooter>
    <AlertDialogCancel>Anulează</AlertDialogCancel>
    <AlertDialogAction className="bg-destructive">
      Șterge
    </AlertDialogAction>
  </AlertDialogFooter>
</AlertDialog>
```

### 11.5. Collapsible Specifications

**Specificații Tehnice:**
```typescript
<Collapsible open={detailedSpecsOpen} onOpenChange={setDetailedSpecsOpen}>
  <CollapsibleTrigger>
    <h3>Specificații Tehnice și Format Acceptat</h3>
    <ChevronDown className={cn(
      "transition-transform",
      detailedSpecsOpen && "rotate-180"
    )} />
  </CollapsibleTrigger>
  
  <CollapsibleContent>
    {/* Structură Excel, cerințe format, exemplu tabel */}
  </CollapsibleContent>
</Collapsible>
```

### 11.6. Format Valori Monetare

**Funcție:**
```typescript
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2
  }).format(value);
};
```

**Output:** `60.000,00 RON`

---

## 12. Fluxul Complet de Procesare

### 12.1. Diagrama de Flux

```
┌─────────────────────────────────────────────────────────────┐
│ [1] USER: Selectează companie + data + fișier              │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [2] CLIENT VALIDATION                                        │
│  - Tip fișier (.xlsx/.xls)                                  │
│  - Dimensiune < 10MB                                        │
│  - Data referință obligatorie                               │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [3] FILENAME NORMALIZATION (fileHelpers.ts)                 │
│  - Diacritice → ASCII (ă → a)                               │
│  - Caractere invalide → underscore                          │
│  - Validare pattern: ^[a-zA-Z0-9._\- ]+$                    │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [4] SUPABASE STORAGE UPLOAD                                 │
│  - Bucket: balante                                          │
│  - Path: {companyId}/{timestamp}_{filename}                │
│  - Cleanup: Dacă eroare DB → remove file                   │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [5] DB INSERT: trial_balance_imports                        │
│  - company_id, file_name, file_size_bytes                  │
│  - period_start, period_end                                │
│  - status = 'processing'                                    │
│  - uploaded_by = user_id                                    │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [6] EDGE FUNCTION CALL: parse-balanta                       │
│  - POST /functions/v1/parse-balanta                         │
│  - Headers: Authorization: Bearer {session.access_token}   │
│  - Body: { import_id, file_path }                          │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [7] EDGE FUNCTION: Security Checks                          │
│  ✓ JWT Verification (verify_jwt = true)                    │
│  ✓ CORS Whitelist (nu wildcard)                            │
│  ✓ Rate Limiting (10 req/oră per user)                     │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [8] FILE SIZE VALIDATION (pre-download)                     │
│  - Query DB: file_size_bytes                                │
│  - Verificare: <= 10MB                                      │
│  - Dacă fail: Update status='failed', error_code            │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [9] DOWNLOAD FROM STORAGE                                   │
│  - supabase.storage.from('trial-balances').download()      │
│  - Validare secundară: fileData.size <= 10MB               │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [10] EXCEL PARSING (parseExcelFile)                         │
│  ✓ Resource Limits:                                         │
│    - MAX_SHEETS: 10                                         │
│    - MAX_ROWS: 20,000                                       │
│    - MAX_COLUMNS: 30                                        │
│    - TIMEOUT: 30 secunde                                    │
│  ✓ XLSX.read(arrayBuffer, { cellFormula: false })          │
│  ✓ Skip header row (index 0)                               │
│  ✓ Ignore empty rows                                        │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [11] ROW-BY-ROW VALIDATION                                  │
│  Pentru fiecare rând (1...N):                               │
│  ✓ Sanitize accountCode (remove =+-@, control chars)       │
│  ✓ Validate: /^\d{3,6}$/ (skip dacă invalid)               │
│  ✓ Sanitize accountName (max 200 chars)                    │
│  ✓ Parse numbers (RO/US format detection)                  │
│  ✓ Validate range: -999,999,999,999.99...+999,999,999,999.99│
│  ✓ Accumulate totals                                        │
│  ✓ Timeout check (la fiecare 1000 rânduri)                 │
│  ✓ Max accounts check (10,000 limit)                       │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [12] CALCULATE TOTALS (server-side)                         │
│  - opening_debit/credit                                     │
│  - debit_turnover/credit_turnover                           │
│  - closing_debit/credit                                     │
│  - Round to 2 decimals                                      │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [13] RPC CALL: process_import_accounts                      │
│  - p_import_id: UUID                                        │
│  - p_accounts: JSONB array                                  │
│  - p_requester_user_id: UUID (ownership check)             │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [14] SQL FUNCTION: process_import_accounts                  │
│  ✓ Validare ownership (is_company_member)                  │
│  ✓ Advisory lock (pg_try_advisory_xact_lock)               │
│  ✓ Guard status (refuz dacă completed/failed)              │
│  ✓ Update status = 'processing' + timestamp                │
│  ✓ DELETE old accounts (dacă rerun)                        │
│  ✓ INSERT accounts (bulk, jsonb_array_elements)            │
│  ✓ Update status = 'completed' + accounts_count            │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [15] RETURN SUCCESS                                         │
│  - Edge Function: 200 OK                                    │
│  - Body: { success: true, accountsCount, totals }          │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [16] CLIENT: Refresh Imports List                           │
│  - fetchImports() (cu totaluri server-side)                │
│  - Reset form                                               │
│  - Toast success: "Balanța a fost încărcată..."            │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ [17] UI UPDATE                                              │
│  - Tabel balanțe: row nou cu status "Procesat"            │
│  - Afișare totaluri: Nr. Conturi, Total Debit/Credit       │
│  - Acțiuni disponibile: Download, View, Delete             │
└─────────────────────────────────────────────────────────────┘
```

### 12.2. Fluxul de Eroare

```
┌─────────────────────────────────────────────────────────────┐
│ EROARE LA ORICE PUNCT                                        │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
                    ┌──────┴──────┐
                    │   Tip Eroare  │
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ↓               ↓               ↓
    [CLIENT-SIDE]    [EDGE FUNCTION]   [SQL FUNCTION]
           │               │               │
           ↓               ↓               ↓
   toast.error()    Update DB:        EXCEPTION WHEN OTHERS
   setUploadStatus  - status='failed'  - Update status='failed'
   ('error')        - error_message    - error_message
                    - internal_error_  - internal_error_detail
                      detail           - SQLERRM
                    - internal_error_  - SQLSTATE
                      code             - RETURN FALSE
                    Return 400/500
           │               │               │
           └───────────────┼───────────────┘
                           ↓
              ┌────────────────────────┐
              │ UI: Afișare mesaj eroare│
              │ - Badge "Eroare"        │
              │ - AlertCircle icon      │
              │ - error_message text    │
              └────────────────────────┘
```

### 12.3. Cazuri Speciale

#### 12.3.1. Rate Limit Exceeded

```
Edge Function → check_rate_limit RPC → FALSE
              ↓
Update DB: (nu e necesar, import nu e creat încă)
              ↓
Return 429 Too Many Requests
  Headers: Retry-After: 3600
  Body: { error: "Too many requests...", retryAfter: 3600 }
              ↓
Client: toast.error("Too many requests...")
```

#### 12.3.2. Concurrent Processing

```
Request 1 → process_import_accounts → pg_try_advisory_xact_lock → TRUE
                                                                    ↓
                                                              Process...
Request 2 (simultan) → process_import_accounts → pg_try_advisory_xact_lock → FALSE
                                                                              ↓
                                                  RAISE EXCEPTION: "Import is already being processed"
                                                                              ↓
                                                                        Return FALSE
                                                                              ↓
                                        Edge Function: 500 Internal Server Error
```

#### 12.3.3. File Too Large

```
Edge Function → Query DB: file_size_bytes (12MB)
              ↓
Verificare: 12MB > 10MB → TRUE
              ↓
Update DB:
  - status = 'failed'
  - error_message = "Fișier prea mare (max 10MB)"
  - internal_error_code = "FILE_TOO_LARGE"
              ↓
Return 413 Payload Too Large
              ↓
Client: toast.error("Eroare la încărcare")
```

#### 12.3.4. Stale Import (Processing > 10 min)

```
Monitoring Query:
  SELECT * FROM public.detect_stale_imports();
              ↓
Result: import_id, file_name, started_at, minutes_elapsed=15.2
              ↓
Manual Intervention:
  UPDATE trial_balance_imports
  SET status = 'failed',
      error_message = 'Processing timeout'
  WHERE id = import_id;
```

---

## 13. Rezumat Chei Importante

### ✅ Ce TREBUIE să Facă Utilizatorul

1. **Selectare companie activă**
2. **Selectare data de referință** (obligatoriu)
3. **Fișier Excel** cu structura exactă (8 coloane A-H)
4. **Format numere:** RO (1.234,56) SAU US (1,234.56)
5. **Cod cont:** 3-6 cifre (ex: 1012, 4111)

### ⚠️ Limite de Reținut

| Aspect | Limită |
|--------|--------|
| Dimensiune fișier | 10 MB |
| Foi Excel | 10 foi |
| Rânduri per foi | 20,000 |
| Coloane | 30 |
| Conturi totale | 10,000 |
| Timeout procesare | 30 secunde |
| Rate limiting | 10 cereri/oră |
| Lungime nume cont | 200 caractere |

### 🔒 Securitate

- ✅ JWT obligatoriu (verify_jwt = true)
- ✅ CORS whitelist (nu wildcard)
- ✅ Rate limiting DB-based
- ✅ Ownership verification (is_company_member)
- ✅ Advisory locks (concurență)
- ✅ Formula injection prevention
- ✅ Size validation ÎNAINTE de download
- ✅ RLS pe toate tabelele
- ✅ Internal errors ascunse de authenticated

### 🚀 Performanță

- ✅ Totaluri calculate server-side (RPC)
- ✅ Paginare server-side (50 conturi/pagină)
- ✅ Bulk insert SQL (toate conturile într-o query)
- ✅ Indexare strategică (compusă + parțială)
- ✅ Soft delete (păstrare istoric)
- ✅ Resource limits (previne DoS)

### 📊 Audit & Monitoring

- ✅ View: `internal_error_tracking` (debugging)
- ✅ Funcție: `detect_stale_imports()` (monitoring)
- ✅ Tabel: `rate_limits` (audit rate limiting)
- ✅ Logging client + server (console.error/warn/log)
- ✅ Error tracking: `internal_error_detail`, `internal_error_code`

---

**Documentație generată:** 28 ianuarie 2026  
**Versiune aplicație:** Finguard v2 (1.8)  
**Autor:** Documentație automată bazată pe analiză cod
