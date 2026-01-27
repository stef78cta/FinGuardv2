# FinGuard v2 - Schema Bază de Date

> **Ultima actualizare**: 27 Ianuarie 2026  
> **Versiune Schema**: Plan Final v3.3

---

## Sumar Tabele

| Tabel | Descriere | RLS |
|-------|-----------|-----|
| `users` | Utilizatori aplicație | ✅ |
| `user_roles` | Roluri RBAC | ✅ |
| `companies` | Companii multi-tenant | ✅ |
| `company_users` | Junction users-companies | ✅ |
| `trial_balance_imports` | Importuri balanțe | ✅ |
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
    cui VARCHAR(50) UNIQUE NOT NULL,
    country_code CHAR(2) DEFAULT 'RO',
    currency CHAR(3) DEFAULT 'RON',
    fiscal_year_start_month INT DEFAULT 1,
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);
```

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
    error_message TEXT,
    validation_errors JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ, -- Soft delete
    CONSTRAINT valid_period CHECK (period_start <= period_end)
);
```

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

## 9. Reports

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

## Funcții Helper RLS

| Funcție | Descriere |
|---------|-----------|
| `get_user_id_from_auth()` | Returnează users.id pentru auth.uid() curent |
| `is_company_member(user_id, company_id)` | Verifică membership în company_users |
| `has_role(user_id, role)` | Verifică rol în user_roles |
| `can_access_import(user_id, import_id)` | Verifică acces la import via company |
| `can_access_trial_balance_account(user_id, tb_account_id)` | Verifică acces la cont TB |
| `can_access_financial_statement(user_id, statement_id)` | Verifică acces la statement |
| `can_access_report(user_id, report_id)` | Verifică acces la report |
| `assert_mappings_complete_for_import(import_id)` | Validare 100% mapare la ref_date |

---

## Reguli de Validare (Plan v3.3)

| Regulă | Moment | Comportament |
|--------|--------|--------------|
| Suma alocări ≤ 100% | INSERT/UPDATE mapping curent | RAISE EXCEPTION dacă > 1.0 |
| Suma alocări = 100% (conturi relevante) | INSERT financial_statement | RAISE EXCEPTION dacă ≠ 1.0 |
| Non-overlap intervale | INSERT/UPDATE mapping | EXCLUDE constraint |
| Detectare gaps | UPDATE (închidere mapping) | WARNING, fără blocare |
| Verificare acces | Apel RPC assert_mappings | RAISE EXCEPTION dacă nu e membru |
| Cross-tenant report_statements | INSERT | RAISE EXCEPTION dacă company_id diferă |

---

## Migrări

| Fișier | Descriere |
|--------|-----------|
| `20260118224720_*.sql` | Structura inițială (users, companies, trial_balance_*) |
| `20260118224822_*.sql` | Fix search_path + RLS policy |
| `20260119094518_*.sql` | Fix companies SELECT policy |
| `20260119094906_*.sql` | create_company_with_member function |
| `20260119095336_*.sql` | Handle existing CUI în create_company |
| `20260120100000_performance_optimizations.sql` | Soft delete, batch queries, paginare |
| `20260127000000_plan_v3.3_*.sql` | **Plan v3.3**: CoA, mappings, FS, lines, KPIs, reports |
