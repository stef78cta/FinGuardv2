# FinGuard v2 - Schema Bază de Date

> **Ultima actualizare**: 28 Ianuarie 2026  
> **Versiune Schema**: Plan Final v3.3 + Security Patches v1.8

---

## Sumar Tabele

| Tabel | Descriere | RLS |
|-------|-----------|-----|
| `users` | Utilizatori aplicație | ✅ |
| `user_roles` | Roluri RBAC | ✅ |
| `companies` | Companii multi-tenant (cu status lifecycle) | ✅ |
| `company_users` | Junction users-companies | ✅ |
| `trial_balance_imports` | Importuri balanțe (cu tracking procesare) | ✅ |
| `trial_balance_accounts` | Conturi din balanțe | ✅ |
| `chart_of_accounts` | Plan de conturi per companie | ✅ |
| `account_mappings` | Mapări conturi TB → CoA | ✅ |
| `financial_statements` | Situații financiare generate | ✅ |
| `balance_sheet_lines` | Linii bilanț | ✅ |
| `income_statement_lines` | Linii cont profit/pierdere | ✅ |
| `cash_flow_lines` | Linii cash flow | ✅ |
| `kpi_definitions` | Definiții KPI (global + custom) | ✅ |
| `kpi_values` | Valori KPI calculate | ✅ |
| `reports` | Rapoarte generate | ✅ |
| `report_statements` | Junction reports-statements | ✅ |
| `rate_limits` | Rate limiting persistent (DB-based) | ✅ |
| `rate_limits_meta` | Metadata cleanup rate limits | ✅ |

## Sumar View-uri

| View | Descriere | Acces |
|------|-----------|-------|
| `trial_balance_imports_public` | View public fără detalii erori interne | authenticated |
| `trial_balance_imports_internal` | View pentru debugging (include error details) | service_role |

---

## 1. Users & Authentication

### users
```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
```

### user_roles
```sql
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role app_role NOT NULL, -- 'user', 'admin', 'super_admin'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, role)
);
```

---

## 2. Companies & Multi-Tenancy

### companies
```sql
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cui VARCHAR(50) NOT NULL,  -- UNIQUE prin index normalizat (v1.8)
    country_code CHAR(2) DEFAULT 'RO',
    currency CHAR(3) DEFAULT 'RON',
    fiscal_year_start_month INT DEFAULT 1,
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active'  -- v1.7: lifecycle management
        CHECK (status IN ('active', 'archived', 'deleting')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- v1.8: UNIQUE constraint pe CUI normalizat (previne duplicate case/spații)
CREATE UNIQUE INDEX idx_companies_cui_normalized 
ON public.companies (UPPER(REGEXP_REPLACE(cui, '[^A-Z0-9]', '', 'gi')));

-- v1.7: Index pentru queries de companii active
CREATE INDEX idx_companies_status 
ON public.companies(status) WHERE status = 'active';
```

**Coloane noi (v1.7-v1.8):**
- `status`: Lifecycle status pentru operațiuni GDPR și cleanup
  - `'active'` (default): Companie activă, toate constraint triggers aplică
  - `'archived'`: Companie inactivă, poate fi ștearsă
  - `'deleting'`: În curs de ștergere, permite operațiuni destructive

**Constraint-uri speciale:**
- CUI UNIQUE prin index normalizat (previne "RO123" vs "ro 123")
- Constraint triggers (v1.8): Previne orphan companies (vezi secțiunea Funcții)

### company_users
```sql
CREATE TABLE public.company_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (company_id, user_id)
);
```

---

## 3. Trial Balance Data

### trial_balance_imports
```sql
CREATE TABLE public.trial_balance_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    source_file_name VARCHAR(255) NOT NULL,
    source_file_url TEXT,
    file_size_bytes BIGINT,
    uploaded_by UUID NOT NULL REFERENCES public.users(id),
    status import_status DEFAULT 'draft', -- draft/processing/validated/completed/error
    error_message TEXT,  -- User-friendly message (safe pentru authenticated)
    validation_errors JSONB,
    processing_started_at TIMESTAMPTZ,  -- v1.4: tracking pentru timeout detection
    internal_error_detail TEXT,  -- v1.7: detalii tehnice (DOAR service_role)
    internal_error_code VARCHAR(10),  -- v1.7: SQLSTATE pentru debugging
    accounts_count INT,  -- v1.5: număr conturi procesate
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,  -- Soft delete
    CONSTRAINT valid_period CHECK (period_start <= period_end)
);

-- v1.4: Index pentru detectare imports stale (processing > 10 min)
CREATE INDEX idx_trial_balance_imports_processing 
ON public.trial_balance_imports(status, processing_started_at) 
WHERE status = 'processing';
```

**Coloane noi (v1.4-v1.7):**
- `processing_started_at`: Timestamp când a început procesarea (pentru timeout detection)
- `internal_error_detail`: Detalii tehnice eroare (DOAR accesibil prin view service_role)
- `internal_error_code`: SQLSTATE pentru debugging (DOAR service_role)
- `accounts_count`: Număr conturi procesate cu succes

**IMPORTANT (v1.7 - Securitate):**
- `internal_error_detail` și `internal_error_code` NU sunt accesibile pentru `authenticated`
- Frontend folosește view-ul `trial_balance_imports_public` (fără coloane sensibile)
- Debugging folosește `trial_balance_imports_internal` (service_role only)

### trial_balance_accounts
```sql
CREATE TABLE public.trial_balance_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES public.trial_balance_imports(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    opening_debit NUMERIC(15,2) DEFAULT 0,
    opening_credit NUMERIC(15,2) DEFAULT 0,
    debit_turnover NUMERIC(15,2) DEFAULT 0,
    credit_turnover NUMERIC(15,2) DEFAULT 0,
    closing_debit NUMERIC(15,2) DEFAULT 0,
    closing_credit NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (import_id, account_code)
);
```

---

## 4. Chart of Accounts (Plan Final v3.3)

### chart_of_accounts
```sql
CREATE TABLE public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL
        CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
    is_postable BOOLEAN NOT NULL DEFAULT TRUE,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, account_code)
);
```

---

## 5. Account Mappings (Plan Final v3.3)

### account_mappings
Mapări cu suport pentru:
- **Split allocation**: Un cont TB poate fi mapat la mai multe conturi CoA
- **History/Versionare**: Intervale de validitate (valid_from, valid_to)
- **Non-overlap**: EXCLUDE constraint cu btree_gist

```sql
CREATE TABLE public.account_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trial_balance_account_id UUID NOT NULL
        REFERENCES public.trial_balance_accounts(id) ON DELETE CASCADE,
    chart_account_id UUID NOT NULL
        REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE, -- NULL = mapare curentă (activă)
    allocation_pct NUMERIC(9,6) NOT NULL DEFAULT 1.0
        CHECK (allocation_pct > 0 AND allocation_pct <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CHECK (valid_to IS NULL OR valid_to >= valid_from),
    
    -- Non-overlap pe aceeași pereche (tb_account_id, chart_account_id)
    EXCLUDE USING gist (
        trial_balance_account_id WITH =,
        chart_account_id WITH =,
        daterange(valid_from, COALESCE(valid_to, 'infinity'::date), '[]') WITH &&
    )
);
```

**Triggere asociate:**
- `trg_validate_mapping_allocation`: Blochează dacă suma alocărilor curente > 100%
- `trg_validate_mapping_continuity`: WARNING (nu blochează) la închidere mapare dacă există gap

---

## 6. Financial Statements (Plan Final v3.3)

### financial_statements
Situații financiare cu versionare și immutability:

```sql
CREATE TABLE public.financial_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    source_import_id UUID NOT NULL
        REFERENCES public.trial_balance_imports(id) ON DELETE CASCADE,
    statement_type VARCHAR(50) NOT NULL
        CHECK (statement_type IN ('balance_sheet', 'income_statement', 'cash_flow')),
    version INT NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    currency_code CHAR(3) NOT NULL,
    sign_convention VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (sign_convention IN ('normal', 'inverted')),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by UUID REFERENCES public.users(id),
    CONSTRAINT valid_fs_period CHECK (period_start <= period_end)
);
```

**Triggere asociate:**
- `trg_close_previous_current_statement`: La INSERT/UPDATE cu is_current=TRUE, închide versiunea anterioară
- `trg_block_incomplete_mapping_generation`: BEFORE INSERT - blochează dacă maparea nu e 100%

**Policy Immutability:**
- Câmpurile `source_import_id`, `period_start`, `period_end`, `statement_type`, `company_id` sunt tratate ca **imutabile**
- Modificări = se creează versiune nouă (INSERT), nu UPDATE

---

## 7. Statement Lines

### balance_sheet_lines
```sql
CREATE TABLE public.balance_sheet_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL REFERENCES public.financial_statements(id) ON DELETE CASCADE,
    line_key VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    chart_account_id UUID REFERENCES public.chart_of_accounts(id),
    trial_balance_account_id UUID REFERENCES public.trial_balance_accounts(id),
    account_code VARCHAR(20),
    description VARCHAR(255),
    amount NUMERIC(15,2) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (statement_id, line_key)
);
```

### income_statement_lines
```sql
CREATE TABLE public.income_statement_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL REFERENCES public.financial_statements(id) ON DELETE CASCADE,
    line_key VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('venituri', 'cheltuieli')),
    subcategory VARCHAR(100),
    chart_account_id UUID REFERENCES public.chart_of_accounts(id),
    trial_balance_account_id UUID REFERENCES public.trial_balance_accounts(id),
    account_code VARCHAR(20),
    description VARCHAR(255),
    amount NUMERIC(15,2) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (statement_id, line_key)
);
```

### cash_flow_lines
```sql
CREATE TABLE public.cash_flow_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id UUID NOT NULL REFERENCES public.financial_statements(id) ON DELETE CASCADE,
    line_key VARCHAR(100) NOT NULL,
    section VARCHAR(50) NOT NULL CHECK (section IN ('operating', 'investing', 'financing')),
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (statement_id, line_key)
);
```

---

## 8. KPIs

### kpi_definitions
```sql
CREATE TABLE public.kpi_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id), -- NULL = KPI global
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) CHECK (category IN ('liquidity', 'profitability', 'leverage', 'efficiency', 'other')),
    formula JSONB NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'ratio'
        CHECK (unit IN ('ratio', 'percentage', 'days', 'times', 'currency')),
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### kpi_values
```sql
CREATE TABLE public.kpi_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_definition_id UUID NOT NULL REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    value NUMERIC(15,4),
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trial_balance_import_id UUID NOT NULL REFERENCES public.trial_balance_imports(id),
    metadata JSONB,
    CONSTRAINT valid_kpi_period CHECK (period_start <= period_end),
    UNIQUE (kpi_definition_id, company_id, period_start, period_end)
);
```

---

## 9. Rate Limiting (DB-based, v1.4-v1.8)

### rate_limits
Tabel persistent pentru rate limiting (înlocuiește Map in-memory):

```sql
CREATE TABLE public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL,  -- ex: 'import', 'company_create', 'report_gen'
    request_count INT NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reset_in_seconds INT NOT NULL,  -- Durată fereastră (ex: 3600 pentru 1h)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pentru verificări frecvente (user + resource + fereastră)
CREATE INDEX idx_rate_limits_user_resource 
ON public.rate_limits(user_id, resource_type, window_start);

-- Index pentru cleanup periodic (șterge entries expirate)
CREATE INDEX idx_rate_limits_window_start 
ON public.rate_limits(window_start) 
WHERE window_start < NOW() - INTERVAL '1 hour';
```

**Strategii:**
- **Fixed window**: Fereastră pe oră (DATE_TRUNC)
- **Persistent**: Supraviețuiește redeploy-urilor Edge Function
- **Cleanup**: Manual sau pg_cron (șterge entries > 2h vechi)

### rate_limits_meta
Metadata pentru tracking cleanup:

```sql
CREATE TABLE public.rate_limits_meta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    last_cleanup_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cleanup_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Funcții asociate:**
- `check_rate_limit(user_id, resource_type, max_requests, window_seconds)` → BOOLEAN
- `cleanup_rate_limits(retention_hours)` → INT (număr entries șterse)

---

## 10. Reports

### reports
```sql
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(50) CHECK (report_type IN ('comprehensive', 'kpi_dashboard', 'comparative', 'custom')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    generated_by UUID NOT NULL REFERENCES public.users(id),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    file_url TEXT,
    file_format VARCHAR(10) CHECK (file_format IN ('pdf', 'excel', 'json')),
    status VARCHAR(50) NOT NULL DEFAULT 'generating'
        CHECK (status IN ('generating', 'completed', 'error')),
    metadata JSONB,
    CONSTRAINT valid_report_period CHECK (period_start <= period_end)
);
```

### report_statements
Junction table cu trigger cross-tenant:

```sql
CREATE TABLE public.report_statements (
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    statement_id UUID NOT NULL REFERENCES public.financial_statements(id) ON DELETE CASCADE,
    PRIMARY KEY (report_id, statement_id)
);
```

---

## Funcții Helper RLS & Business Logic

### Funcții RLS (Row Level Security)

| Funcție | Descriere | Versiune |
|---------|-----------|----------|
| `get_user_id_from_auth()` | Returnează users.id pentru auth.uid() curent | v1.0 |
| `is_company_member(user_id, company_id)` | Verifică membership în company_users | v1.0 |
| `has_role(user_id, role)` | Verifică rol în user_roles | v1.0 |
| `can_access_import(user_id, import_id)` | Verifică acces la import via company | v1.0 |
| `can_access_trial_balance_account(user_id, tb_account_id)` | Verifică acces la cont TB | v3.3 |
| `can_access_financial_statement(user_id, statement_id)` | Verifică acces la statement | v3.3 |
| `can_access_report(user_id, report_id)` | Verifică acces la report | v3.3 |

### Funcții Business Logic

| Funcție | Descriere | Versiune | Securitate |
|---------|-----------|----------|------------|
| `assert_mappings_complete_for_import(import_id)` | Validare 100% mapare la ref_date (cu access hardening) | v3.3 (hardened v1.8) | SECURITY DEFINER |
| `create_company_with_member(name, cui)` | Creare atomică companie + prim membru (normalizare CUI) | v1.8 | SECURITY DEFINER |
| `archive_company(company_id)` | Marchează companie ca archived (permite DELETE membri) | v1.7 | SECURITY DEFINER |
| `process_import_accounts(import_id, accounts, user_id)` | Procesare import cu idempotență și advisory lock | v1.8 | SECURITY DEFINER |
| `check_rate_limit(user_id, resource, max, window)` | Rate limiting DB-based (fail-closed) | v1.8 | SECURITY DEFINER |
| `cleanup_rate_limits(retention_hours)` | Cleanup periodic rate_limits (manual sau pg_cron) | v1.4 | SECURITY DEFINER |
| `detect_stale_imports()` | Detectează imports blocate în processing > 10 min | v1.3 | STABLE |
| `try_uuid(text)` | Conversie safe TEXT → UUID (fără excepție) | v1.8 | IMMUTABLE |

### Trigger Functions

| Funcție | Trigger | Descriere | Versiune |
|---------|---------|-----------|----------|
| `update_updated_at_column()` | Various tables | Actualizare automată updated_at | v1.0 |
| `validate_mapping_allocation()` | account_mappings | Blochează dacă suma alocări > 100% (mapări curente) | v3.3 |
| `validate_mapping_continuity()` | account_mappings | WARNING la închidere mapare (detectare gaps) | v3.3 |
| `close_previous_current_statement()` | financial_statements | Închide automat versiunea anterioară is_current | v3.3 |
| `block_incomplete_mapping_generation()` | financial_statements | Blochează generare fără mapare 100% | v3.3 |
| `validate_report_statement_same_company()` | report_statements | Previne cross-tenant în reports | v3.3 |
| `check_company_has_member()` | companies (AFTER INSERT) | Previne orphan companies la creare | v1.8 |
| `prevent_last_member_removal()` | company_users (AFTER DELETE) | Previne DELETE ultimul membru (cu excepție archived) | v1.8 |

---

## Reguli de Validare (Plan v3.3 + Security Patches v1.8)

| Regulă | Moment | Comportament | Versiune |
|--------|--------|--------------|----------|
| Suma alocări ≤ 100% | INSERT/UPDATE mapping curent | RAISE EXCEPTION dacă > 1.0 | v3.3 |
| Suma alocări = 100% (conturi relevante) | INSERT financial_statement | RAISE EXCEPTION dacă ≠ 1.0 | v3.3 |
| Non-overlap intervale | INSERT/UPDATE mapping | EXCLUDE constraint | v3.3 |
| Detectare gaps | UPDATE (închidere mapping) | WARNING, fără blocare | v3.3 |
| Verificare acces | Apel RPC assert_mappings | RAISE EXCEPTION dacă nu e membru | v3.3 (hardened v1.8) |
| Cross-tenant report_statements | INSERT | RAISE EXCEPTION dacă company_id diferă | v3.3 |
| **Orphan company prevention** | **AFTER INSERT companies** | **RAISE EXCEPTION dacă fără membri** | **v1.8** |
| **Last member removal** | **AFTER DELETE company_users** | **RAISE EXCEPTION dacă ultimul membru (except archived)** | **v1.8** |
| **CUI duplicate** | **INSERT companies** | **UNIQUE constraint pe CUI normalizat** | **v1.8** |
| **Bootstrap auto-join** | **INSERT company_users** | **Permite DOAR dacă: (1) prim membru SAU (2) membru existent adaugă SAU (3) admin** | **v1.8** |
| **Rate limiting** | **RPC process_import_accounts** | **check_rate_limit() returnează FALSE → 429 Too Many Requests** | **v1.8** |
| **Processing concurrency** | **RPC process_import_accounts** | **Advisory lock → RAISE EXCEPTION dacă import în procesare** | **v1.8** |
| **Storage path validation** | **INSERT storage.objects** | **Regex validation + try_uuid safe cast** | **v1.8** |

---

## Migrări

### Migrări Inițiale (Ianuarie 18-20, 2026)

| Fișier | Descriere |
|--------|-----------|
| `20260118224720_*.sql` | Structura inițială (users, companies, trial_balance_*) |
| `20260118224822_*.sql` | Fix search_path + RLS policy |
| `20260119094518_*.sql` | Fix companies SELECT policy |
| `20260119094906_*.sql` | create_company_with_member function (v1.0) |
| `20260119095336_*.sql` | Handle existing CUI în create_company |
| `20260120100000_performance_optimizations.sql` | Soft delete, batch queries, paginare |

### Migrare Plan v3.3 (Ianuarie 27, 2026)

| Fișier | Descriere |
|--------|-----------|
| `20260127000000_plan_v3.3_*.sql` | **Plan v3.3**: CoA, mappings (split + history), FS (versionare), lines, KPIs, reports |

### Security Patches v1.8 (Ianuarie 28, 2026)

| Fișier | Descriere | Severitate |
|--------|-----------|------------|
| `20260128100000_security_patch_company_users_rls.sql` | Fix breșă critică auto-join la orice companie | CRITICĂ |
| `20260128100000a_add_companies_status.sql` | Adaugă coloană status pentru lifecycle management (GDPR/cleanup) | MEDIE |
| `20260128100000b_try_uuid_helper.sql` | Helper IMMUTABLE pentru conversie safe TEXT → UUID | ÎNALTĂ |
| `20260128100001_security_patch_create_company_function.sql` | Hardening create_company: normalizare CUI, elimină p_user_id | CRITICĂ |
| `20260128100002_rate_limits_table.sql` | Rate limiting DB-based (înlocuiește in-memory) | MEDIE |
| `20260128100002a_add_processing_started_at.sql` | Coloană pentru tracking procesare (timeout detection) | ÎNALTĂ |
| `20260128100002b_add_internal_error_tracking_view.sql` | View-uri pentru protecție internal_error_detail | MEDIE |
| `20260128100003_process_import_accounts_function.sql` | Hardening import: idempotență + advisory lock | ÎNALTĂ |
| `20260128100004_company_member_constraint.sql` | Constraint triggers (orphan companies + last member) | CRITICĂ |
| `20260128100005_storage_policy_hardening.sql` | Storage policies cu try_uuid și validări stricte | MEDIE |
| `20260128100006_cui_unique_constraint.sql` | UNIQUE constraint pe CUI normalizat | CRITICĂ |

---

## View-uri (v1.7)

### trial_balance_imports_public
View pentru frontend (authenticated users):

```sql
CREATE VIEW public.trial_balance_imports_public AS
SELECT 
  id,
  company_id,
  file_name,
  file_size_bytes,
  status,
  error_message,  -- Safe: mesaj user-friendly
  accounts_count,
  processing_started_at,
  created_at,
  updated_at
FROM public.trial_balance_imports;
```

**Acces:** `authenticated` (prin RLS policy)  
**Exclud:** `internal_error_detail`, `internal_error_code` (sensibile)

### trial_balance_imports_internal
View pentru debugging (service_role only):

```sql
CREATE VIEW public.trial_balance_imports_internal AS
SELECT 
  id,
  company_id,
  file_name,
  status,
  error_message,
  internal_error_detail,  -- Detalii tehnice complete
  internal_error_code,    -- SQLSTATE pentru debugging
  processing_started_at,
  created_at
FROM public.trial_balance_imports
WHERE status IN ('failed', 'error');
```

**Acces:** `service_role` only  
**Scop:** Monitoring, debugging, logging

---

## Security Patches v1.8 - Sumar

### Punctul 1A: Company Users RLS (CRITICĂ)
**Problemă:** Policy vechi permitea auto-join la orice companie prin simpla cunoaștere a company_id  
**Soluție:**
- Bootstrap limitat: DOAR pentru companii FĂRĂ membri
- Membri existenți pot adăuga alți membri
- Admin/super_admin pot adăuga la orice companie
- Constraint triggers: Previne orphan companies + DELETE ultimul membru

**Migrări:**
- `20260128100000`: Fix RLS policy cu bootstrap limitat
- `20260128100000a`: Adaugă `companies.status` (lifecycle management)
- `20260128100004`: Constraint triggers (INSERT companies + DELETE company_users)

### Punctul 1B: CUI Duplicate Prevention (CRITICĂ)
**Problemă:** CUI-uri identice cu diferențe case/spații ("RO123" vs "ro 123") create duplicate  
**Soluție:**
- Normalizare CUI în `create_company_with_member`: UPPER + TRIM + REGEXP
- UNIQUE constraint pe expresie normalizată
- RAISE EXCEPTION pe duplicate (nu RETURN NULL)
- Elimină parametrul `p_user_id` (folosește `get_user_id_from_auth()`)

**Migrări:**
- `20260128100001`: Hardening `create_company_with_member` (v1.8)
- `20260128100006`: UNIQUE constraint pe CUI normalizat

### Punctul 2B: Rate Limiting DB-based (MEDIE)
**Problemă:** Rate limiting in-memory (Map) → resetează la redeploy  
**Soluție:**
- Tabele persistent: `rate_limits`, `rate_limits_meta`
- Funcție `check_rate_limit()` (SECURITY DEFINER, service_role only)
- Fail-closed strategy: eroare DB → refuz cerere
- Cleanup periodic: manual sau pg_cron

**Migrări:**
- `20260128100002`: Tabele + funcții rate limiting

### Punctul 2E: Import Processing Idempotency (ÎNALTĂ)
**Problemă:** Race conditions la procesare simultană + expunere `internal_error_detail`  
**Soluție:**
- Advisory lock (`pg_try_advisory_xact_lock`) → refuz instant
- Idempotență: previne rerun automat pentru status completed/failed
- View-uri: `trial_balance_imports_public` (frontend) vs `_internal` (debugging)
- Coloană `processing_started_at` pentru timeout detection

**Migrări:**
- `20260128100002a`: Adaugă `processing_started_at`
- `20260128100002b`: View-uri + REVOKE SELECT direct
- `20260128100003`: Hardening `process_import_accounts`

### Punctul 4: Storage Policy Hardening (MEDIE)
**Problemă:** Cast direct `::uuid` poate arunca excepție neprevăzută (query planner reordonare)  
**Soluție:**
- Funcție `try_uuid()` (IMMUTABLE, safe cast fără excepție)
- Validări stricte: NULL guards, length limit, regex case-insensitive
- Path normalizare în frontend (recomandat)

**Migrări:**
- `20260128100000b`: Helper `try_uuid(text)` → UUID sau NULL
- `20260128100005`: Storage policies cu `try_uuid()` + validări

---

## Diagrame Relații (actualizat v1.8)

```
┌─────────────┐         ┌──────────────┐
│   users     │────1:N──│ user_roles   │
└─────────────┘         └──────────────┘
       │
       │ 1:N (company_users)
       ↓
┌─────────────────┐
│   companies     │────── status: active/archived/deleting (v1.7)
│                 │────── cui: UNIQUE normalizat (v1.8)
└─────────────────┘
       │
       │ 1:N
       ↓
┌──────────────────────────┐
│ trial_balance_imports    │────── processing_started_at (v1.4)
│                          │────── internal_error_detail (v1.7, service_role)
└──────────────────────────┘
       │
       │ 1:N
       ↓
┌──────────────────────────┐
│ trial_balance_accounts   │
└──────────────────────────┘
       │
       │ 1:N (account_mappings)
       ↓
┌──────────────────────────┐         ┌───────────────────┐
│  chart_of_accounts       │────1:N──│ account_mappings  │
│                          │         │ (split + history) │
└──────────────────────────┘         └───────────────────┘
       │
       │ 1:N (lines)
       ↓
┌──────────────────────────┐
│  financial_statements    │────── versionare + is_current (v3.3)
│                          │────── assert_mappings_complete (v3.3)
└──────────────────────────┘
       │
       ├──1:N─→ balance_sheet_lines
       ├──1:N─→ income_statement_lines
       └──1:N─→ cash_flow_lines

┌──────────────────────────┐
│    rate_limits           │────── DB-based (v1.4)
│                          │────── check_rate_limit() (v1.8)
└──────────────────────────┘
```
