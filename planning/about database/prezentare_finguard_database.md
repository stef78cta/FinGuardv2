# Prezentare FinGuard v2 - Bază de date și arhitectură

> **Sursă:** sinteză din `tabele.md`, `descriere_database.md`, `plan_dezvoltare_database.md` + migrări `supabase/migrations/` + cod `src/` + verificare live Supabase `finguard2`  
> **Versiune schemă:** Plan Final v3.3 + Security Patches v1.8 + Upload Pipeline v2.0 + Reporting Template v3.4 + Financial Statements Pipeline v3.5 + Reconciliation v3.6  
> **Ultima actualizare:** 11 iulie 2026  
> **Migrări în repo:** 48 fișiere SQL versionate (+ 1 script utilitar cleanup)  
> **Producție:** 19 tabele, 4 view-uri (Security v1.8 parțial neaplicat — vezi §2)

---

## 1. Introducere

**FinGuard v2** este o aplicație SaaS financiară multi-tenant, construită pe **Supabase** (PostgreSQL + Auth + Storage + Edge Functions). Baza de date este nucleul arhitecturii: stochează identitatea utilizatorilor, companiile, datele contabile importate și toate rezultatele derivate (situații financiare, KPI, rapoarte).

Schema acoperă: multi-tenancy (`companies`, `company_users`), import balanțe (`trial_balance_imports`), plan de conturi și mapări (`chart_of_accounts`, `account_mappings`), template de raportare (`statement_line_definitions`, `cash_flow_mapping_rules`), situații financiare generate (`financial_statements` + linii), KPI-uri și rapoarte. **Row Level Security (RLS)** și funcțiile **SECURITY DEFINER** formează stratul de securitate.

Extensii majore (2026):
- **Upload v2.0 (iun.):** `balance_month`, format dual 8/10 coloane, bucket `balante`
- **Reporting Template v3.4 (3 iul.):** schelet raportare BS/P&L/CF, seed CoA standard
- **Financial Statements Pipeline v3.5 (3–8 iul.):** generare automată situații din import
- **Reconciliation v3.6 (9 iul.):** `functional_type`, validare acoperire bilanț, status `unreconciled`

---

## 2. Sumar executiv

- **Multi-tenant strict:** date operaționale legate de `company_id`; acces doar pentru membri.
- **RLS activ** pe toate tabelele din producție (19 tabele; repo definește 21 cu `rate_limits*`).
- **48 migrări SQL** versionate în repo; **~61 migrări** aplicate pe `finguard2` (istoric squashed).
- **Flux complet live:** import balanță → seed CoA → auto-map → situații financiare → validare reconciliere → rapoarte.
- **Types TypeScript:** `src/integrations/supabase/types.ts` (19 tabele + 4 view-uri expuse PostgREST).
- **Status:** funcțional end-to-end; aliniere Security v1.8 (rate_limits, companies.status) încă parțială pe producție.

---

## 3. Arhitectura generală a bazei de date

```
Utilizator Supabase Auth (auth.users)
        ↓
public.users (+ user_roles — RBAC)
        ↓
company_users ↔ companies (status lifecycle, CUI unic)
        ↓
prepare_balance_month_upload()  ← verifică/replace lună
        ↓
trial_balance_imports (balance_month, balance_format, status pipeline)
        ↓  [Storage bucket: balante]
        ↓  [Edge Function: parse-balanta → process_import_accounts()]
trial_balance_accounts (8/10 coloane incl. total_sume_*)
        ↓
seed_standard_chart_of_accounts() → chart_of_accounts (functional_type)
        ↓
auto_map_import_from_chart() → account_mappings
        ↓
generate_financial_statements_from_import() → financial_statements + lines
        ↓
validate_balance_sheet_coverage() → reports.status (completed | unreconciled)
        ↓
kpi_definitions → kpi_values
        ↓
reports (+ report_statements)
```

### Rolul fiecărui nivel

| Nivel | Rol |
|-------|-----|
| **users / user_roles** | Profil aplicație + roluri `user`, `admin`, `super_admin` |
| **companies / company_users** | Tenant root; lifecycle `active` / `archived` / `deleting`; CUI unic normalizat |
| **trial_balance_imports** | Metadata import; **`balance_month`** = sursa canonică a lunii; **`balance_format`** = 8/10 coloane |
| **trial_balance_accounts** | Solduri, rulaje, total sume din Excel |
| **chart_of_accounts** | Plan conturi per companie + **`functional_type`** (activ/pasiv/bifuncțional) |
| **statement_line_definitions** | Schelet raportare BS/P&L/CF (global sau per companie) |
| **account_mappings** | Mapare TB → CoA (split + versionare) |
| **financial_statements + lines** | Situații generate, versionate, imutabile |
| **kpi_*** / **reports** | Analiză și raportare; `reports.status` include `unreconciled` |
| **rate_limits** | Limitare operațiuni sensibile (persistent DB, service_role) |

---

## 4. Module principale ale bazei de date

### 4.1 Users & Authentication

**Tabele:** `users`, `user_roles` — profil aplicație legat de `auth.users`, RBAC via `has_role()`.

### 4.2 Companies & Multi-Tenancy

**Tabele:** `companies`, `company_users`

- **`status`:** `active`, `archived`, `deleting` (lifecycle GDPR/cleanup).
- **CUI normalizat** + index UNIQUE pe expresie normalizată.
- Creare doar via `create_company_with_member(name, cui)` — fără parametru `p_user_id` extern.
- Triggers: orphan prevention, last member protection.

### 4.3 Trial Balance Data

**Tabele:** `trial_balance_imports`, `trial_balance_accounts`

- **`balance_month`** — prima zi a lunii; UNIQUE parțial `(company_id, balance_month) WHERE deleted_at IS NULL`.
- **`balance_format`** — `'8_COLUMNS'` | `'10_COLUMNS'` | NULL (importuri vechi).
- **`total_sume_debitoare/creditoare`** — coloane G/H format 10 coloane.
- **Statusuri:** `draft`, `processing`, `validated`, `completed`, `error`.
- **View-uri:** `trial_balance_imports_public`, `trial_balance_imports_internal`, `active_trial_balance_imports`, `stale_imports_monitor`.
- **Storage:** bucket **`balante`** (10 MB, MIME Excel).

### 4.4 Chart of Accounts & Template

- **`chart_of_accounts`** — plan per companie; coloană **`functional_type`** (`activ`/`pasiv`/`bifunctional`).
- **`chart_of_accounts_template`** — referință globală deduplicată; seed via `seed_standard_chart_of_accounts()`.

### 4.5 Reporting Template (v3.4)

- **`statement_line_definitions`** — schelet BS/P&L/CF: `REPORT_GROUP`, `ACCOUNT_LEAF`, `CALCULATED`, `INTERNAL_GROUP`.
- **`cash_flow_mapping_rules`** — reguli cash-flow metoda directă (numerar ↔ contrapartidă).
- Seed global în `20260703100005_seed_standard_report_template.sql` (+ extinderi iul. 2026).

### 4.6 Account Mappings

Split allocation, versionare (`valid_from`/`valid_to`), EXCLUDE non-overlap. `auto_map_import_from_chart()` creează mapări automat la import.

### 4.7 Financial Statements (v3.5)

- **`generate_financial_statements_from_import(_import_id)`** — generează BS, P&L, CF + raport `comprehensive`.
- Versionare (`version`, `is_current`); trigger închide versiunea anterioară.
- Linii extinse: `income_statement_lines.category` include `rezultat`, `marja`, `calculated`; `cash_flow_lines.section` include `opening_cash`, `closing_cash`, `internal_transfers`, etc.

### 4.8 Reconciliation (v3.6)

- **`validate_balance_sheet_coverage(_import_id)`** — verifică mapări, `functional_type`, rute bifuncționale în SLD.
- **`reports.status = 'unreconciled'`** când reconcilierea eșuează (setat din `src/lib/financialStatementsPipeline.ts`).
- Conturi bifuncționale pot avea rute duale Active/Pasive în `statement_line_definitions`.

### 4.9 KPIs & Reports

`kpi_definitions`, `kpi_values`, `reports`, `report_statements` — cu protecție cross-tenant.

### 4.10 Rate Limiting

> **Repo:** `rate_limits` (FK → `auth.users`), `rate_limits_meta`, `check_rate_limit()` → BOOLEAN.  
> **Producție (`finguard2`):** tabelele și RPC-ul **lipsesc** — migrarea `20260128100002` neaplicată; `parse-balanta` încă apelează `check_rate_limit`.

---

## 5. Securitate

| Amenințare | Mecanism |
|------------|----------|
| Auto-join companii | RLS bootstrap limitat (v1.8) |
| CUI duplicate | Normalizare + UNIQUE index |
| Import concurent | Advisory lock în `process_import_accounts` |
| Importuri blocate | `cleanup_stale_imports()` (10 min) |
| Cross-tenant rapoarte | Trigger `report_statements` |
| Storage path invalid | `try_uuid()` + regex |
| Expunere erori SQL | View public + GRANT SELECT parțial |
| View RLS bypass | `security_invoker = true` |

**Grants RPC (confirmate în migrări):**
- **authenticated:** `create_company_with_member`, `prepare_balance_month_upload`, `soft_delete_import`, `retry_failed_import`, `seed_standard_chart_of_accounts`, `auto_map_import_from_chart`, `generate_financial_statements_from_import`, `validate_balance_sheet_coverage`
- **service_role:** `process_import_accounts`, `check_rate_limit`, `cleanup_stale_imports`

---

## 6. Funcții importante

| Funcție | Scop |
|---------|------|
| `prepare_balance_month_upload()` | Pregătește upload; verifică conflict lună |
| `process_import_accounts()` | Procesare conturi JSONB; param opțional `p_balance_format` |
| `seed_standard_chart_of_accounts()` | Instanțiază plan standard per companie |
| `auto_map_import_from_chart()` | Mapare automată TB → CoA |
| `generate_financial_statements_from_import()` | Generează situații + raport comprehensive |
| `validate_balance_sheet_coverage()` | Validare reconciliere bilanț (JSONB) |
| `assert_mappings_complete_for_import()` | Mapare 100% înainte de FS manual |
| `cleanup_stale_imports()` / `retry_failed_import()` | Recuperare importuri blocate/eșuate |
| `get_company_imports_with_totals()` / `get_balances_with_accounts()` | Queries performante dashboard |

---

## 7. Migrări SQL — cronologie

| Fază | Perioadă | Migrări | Conținut |
|------|----------|---------|----------|
| Inițial | 18–20 ian. | 6 | users, companies, trial_balance, RLS, performance |
| Plan v3.3 | 27 ian. | 1 | CoA, mappings, FS, KPI, reports |
| Security v1.8 | 28 ian. | 11 | RLS, rate_limits, import hardening, CUI UNIQUE |
| Stabilizare upload | 29 ian. – 1 iul. | 12 | view security, stale cleanup, balance_month, prepare RPC |
| Reporting v3.4 | 3 iul. | 7 | statement_line_definitions, cash_flow rules, CoA template, seed |
| FS Pipeline v3.5 | 3–8 iul. | 5 | auto_map, generate FS, calcule, balance_format, reimport version |
| Reconciliation v3.6 | 9 iul. | 6 | functional_type, reconciliere, rute bifuncționale, corecții template |

**Total: 48 migrări versionate.**

---

## 8. Fluxuri funcționale

### 8.1 Import balanță

1. Selectare `balance_month` → `prepare_balance_month_upload()`.
2. INSERT import (status `draft`/`processing`).
3. Upload XLSX în bucket **`balante`**.
4. Edge Function `parse-balanta` → `process_import_accounts()` cu `p_balance_format`.
5. Status `completed` sau `error`; stale cleanup la 10 min.

### 8.2 Generare situații financiare (post-import)

Implementat în `src/lib/financialStatementsPipeline.ts`:

1. `seed_standard_chart_of_accounts(companyId)` — best-effort.
2. `auto_map_import_from_chart(importId)` — obligatoriu.
3. `generate_financial_statements_from_import(importId)`.
4. `validate_balance_sheet_coverage(importId)` → `reports.status`: `completed` | `unreconciled`.

### 8.3 KPI & Rapoarte

Calcul KPI per perioadă/import; rapoarte agregate cu protecție cross-tenant.

---

## 9. Verificări pre-producție

- [ ] **Migrări repo** (48 fișiere) vs **producție** (`supabase migration list` pe proiectul conectat)
- [ ] **Security v1.8** aplicat complet (`rate_limits`, `companies.status`, CUI normalizat)
- [ ] **`src/integrations/supabase/types.ts`** aliniat (conține `balance_format`, `functional_type`, RPC-uri v3.5/v3.6)
- [ ] Frontend folosește **`trial_balance_imports_public`**
- [ ] Upload: **`prepare_balance_month_upload`** + bucket **`balante`**
- [ ] Post-import: **`financialStatementsPipeline.ts`** apelat după `process_import_accounts`
- [ ] Monitoring **`cleanup_stale_imports`**
- [ ] CUI UNIQUE fără coliziuni

---

## 10. Module de verificat în cod

| Modul | Cale |
|-------|------|
| Migrări | `supabase/migrations/*.sql` |
| Types | `src/integrations/supabase/types.ts` |
| Edge Function | `supabase/functions/parse-balanta/index.ts` |
| Upload | `src/hooks/useBalanceUploadForm.ts`, `src/lib/importPipeline.ts` |
| FS Pipeline | `src/lib/financialStatementsPipeline.ts` |
| Reconciliere UI | `src/utils/balanceSheetDiagnostic.ts`, `src/utils/financialReportReconciliation.ts` |
| Perioadă balanță | `src/lib/balancePeriod.ts` |
| Storage | `src/lib/storage/constants.ts` |
| CoA tooling | `scripts/coa/parse-mapping-xlsx.mjs`, `scripts/coa/emit-functional-type-migration.mjs` |
| Verificare pipeline | `scripts/verify-upload-pipeline.mjs` |

---

## 11. Concluzie

Schema FinGuard v2 este production-ready, cu un flux complet de la import balanță la situații financiare generate și validate. Documentația din ianuarie 2026 (v3.3/v1.8) rămâne validă pentru nucleu; extensiile iulie 2026 (template raportare, generare automată FS, reconciliere bifuncțională) sunt reflectate în migrări 31–48 și în codul frontend/Edge Functions.

---

*Document de onboarding FinGuard v2. Detalii SQL: `descriere_database.md`, `tabele.md`, `plan_dezvoltare_database.md`.*
