# Prezentare FinGuard v2 - Bază de date și arhitectură

> **Sursă:** sinteză din `tabele.md`, `descriere_database.md`, `plan_dezvoltare_database.md` + migrări `supabase/migrations/`  
> **Versiune schemă:** Plan Final v3.3 + Security Patches v1.8 + Upload Pipeline v2.0 (iun. 2026)  
> **Ultima actualizare:** 24 iunie 2026  
> **Migrări în repo:** 30 fișiere SQL (+ 1 script utilitar cleanup)

---

## 1. Introducere

**FinGuard v2** este o aplicație SaaS financiară multi-tenant, construită pe **Supabase** (PostgreSQL + Auth + Storage + Edge Functions). Baza de date este nucleul arhitecturii: stochează identitatea utilizatorilor, companiile, datele contabile importate și toate rezultatele derivate (situații financiare, KPI, rapoarte).

Documentația descrie o schemă pentru gestionarea companiilor, importului balanțelor de verificare (`trial_balance_imports`), mapării conturilor (`account_mappings`), generării situațiilor financiare (`financial_statements`), calculului KPI-urilor (`kpi_values`) și rapoartelor (`reports`). Separarea datelor pe tenant (`company_id`), **Row Level Security (RLS)** și funcțiile **SECURITY DEFINER** formează stratul de securitate.

Dincolo de schema inițială (ian. 2026), pipeline-ul de upload a fost extins (iun. 2026) cu **`balance_month`** (o balanță activă per companie/lună), coloane format Excel 10 coloane (`total_sume_debitoare` / `total_sume_creditoare`), bucket Storage **`balante`**, și RPC-uri noi pentru pregătire upload, soft delete și cleanup importuri blocate.

---

## 2. Sumar executiv

- **Multi-tenant strict:** toate datele operaționale sunt legate de `company_id`; acces doar pentru membri.
- **RLS activ** pe 17 tabele + 2 auxiliare (`rate_limits`, `rate_limits_meta`).
- **Securitate matură:** RBAC, helper functions, rate limiting DB, view-uri public/intern, storage policies cu `try_uuid`, constraint triggers.
- **Flux complet:** import balanță → plan conturi → mapări → situații financiare → KPI → rapoarte.
- **Security Patches v1.8** (ian.): auto-join, CUI duplicate, import concurent, expunere erori interne.
- **Upload Pipeline v2.0** (iun.): `balance_month`, format 10 coloane, `prepare_balance_month_upload`, `stale_imports_monitor`.
- **30 migrări SQL** în repo (față de 18 documentate inițial în ianuarie).
- **Status:** production ready, cu Gate 0 obligatoriu și aliniere frontend/types/Edge Functions.

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
trial_balance_imports (balance_month, status pipeline)
        ↓  [Storage bucket: balante]
        ↓  [Edge Function: parse-balanta → process_import_accounts()]
trial_balance_accounts (10 coloane incl. total_sume_*)
        ↓
chart_of_accounts → account_mappings (split + versionare)
        ↓
financial_statements → statement lines (bilanț / P&L / cash flow)
        ↓
kpi_definitions → kpi_values
        ↓
reports (+ report_statements)
```

### Rolul fiecărui nivel

| Nivel | Rol |
|-------|-----|
| **users / user_roles** | Profil aplicație + roluri `user`, `admin`, `super_admin` |
| **companies / company_users** | Tenant root; membership; lifecycle `active` / `archived` / `deleting` |
| **trial_balance_imports** | Metadata import; **`balance_month`** = sursa canonică a lunii |
| **trial_balance_accounts** | Solduri, rulaje, total sume (col. G/H) din Excel |
| **chart_of_accounts / account_mappings** | Plan conturi + mapare TB → CoA |
| **financial_statements + lines** | Situații generate, versionate, imutabile |
| **kpi_*** / **reports** | Analiză și raportare agregată |
| **rate_limits** | Limitare operațiuni sensibile (persistent DB) |

---

## 4. Module principale ale bazei de date

### 4.1 Users & Authentication

**Tabele:** `users`, `user_roles`

- `users` leagă `auth.users` de profil (`email`, `full_name`, `avatar_url`).
- `user_roles`: enum `app_role` = `user`, `admin`, `super_admin`.
- Trigger `handle_new_user()` la sign-up Supabase Auth.
- `has_role()` pentru verificări RBAC în policies.

### 4.2 Companies & Multi-Tenancy

**Tabele:** `companies`, `company_users`

- **`status`:** `active`, `archived`, `deleting`.
- **CUI normalizat** + index UNIQUE pe expresie normalizată.
- Creare doar via `create_company_with_member()` (INSERT direct blocat).
- RLS v1.8: bootstrap limitat la primul membru; altfel doar membri existenți sau `super_admin`.
- Triggers: `check_company_has_member`, `prevent_last_member_removal`.
- `archive_company()` pentru lifecycle.

### 4.3 Trial Balance Data

**Tabele:** `trial_balance_imports`, `trial_balance_accounts`

**Coloane noi (iun. 2026):**
- **`balance_month`** (DATE, NOT NULL) — prima zi a lunii balanței; sursa canonică.
- Constraint: `balance_month = date_trunc('month', balance_month)`.
- **UNIQUE parțial:** `(company_id, balance_month) WHERE deleted_at IS NULL` — o singură balanță activă per lună.

**Coloane cont (format 10 coloane A–J):**
- `opening_debit/credit`, `debit_turnover/credit_turnover`
- **`total_sume_debitoare`**, **`total_sume_creditoare`** (col. G/H)
- `closing_debit/credit`

**Statusuri (`import_status`):** `draft`, `processing`, `validated`, `completed`, `error`

**Câmpuri tracking:** `processing_started_at`, `accounts_count`, `error_message`, `internal_error_detail`, `internal_error_code`, `deleted_at` (soft delete).

**View-uri (`security_invoker = true`):**
- `trial_balance_imports_public` — frontend; include `balance_month`; fără erori interne.
- `trial_balance_imports_internal` — service_role; include erori interne.
- `stale_imports_monitor` — importuri în `processing` > 5 min (warning).

**Acces tabel:** REVOKE SELECT complet; GRANT SELECT parțial pe coloane safe pentru `INSERT ... RETURNING`.

**Storage:** bucket canonical **`balante`** (10 MB, MIME Excel).

### 4.4 Chart of Accounts

Plan conturi per companie: `account_type` (`asset`, `liability`, `equity`, `revenue`, `expense`), `parent_id`, `is_postable`, `is_system`. UNIQUE `(company_id, account_code)`.

### 4.5 Account Mappings

Split allocation (`allocation_pct`), versionare (`valid_from`, `valid_to`), EXCLUDE non-overlap. Trigger: alocare ≤ 100%. Generare FS blocată dacă maparea incompletă (`assert_mappings_complete_for_import`).

### 4.6 Financial Statements

Tipuri: `balance_sheet`, `income_statement`, `cash_flow`. Versionare (`version`, `is_current`), immutability — versiuni noi prin INSERT.

### 4.7 Statement Lines

`balance_sheet_lines`, `income_statement_lines`, `cash_flow_lines` — linii concrete per situație.

### 4.8 KPIs

`kpi_definitions` (global + per companie), `kpi_values` (per perioadă, legat de import).

### 4.9 Reports

`reports` + `report_statements`; protecție cross-tenant via trigger.

### 4.10 Rate Limiting

`rate_limits` (FK → `auth.users`), `rate_limits_meta`. `check_rate_limit()` returnează **BOOLEAN**, fail-closed. Acces direct blocat prin RLS; apel din Edge Functions (service_role).

---

## 5. Securitate

| Amenințare | Mecanism |
|------------|----------|
| Auto-join companii | RLS bootstrap limitat (v1.8) |
| CUI duplicate | Normalizare + UNIQUE index |
| Import concurent | Advisory lock în `process_import_accounts` |
| Importuri blocate | `cleanup_stale_imports()` (10 min), `stale_imports_monitor` (5 min) |
| Cross-tenant rapoarte | Trigger `report_statements` |
| Storage path invalid | `try_uuid()` + regex |
| Rate limit bypass | RLS deny + RPC fail-closed |
| Expunere erori SQL | View public + GRANT SELECT parțial |
| View RLS bypass | `security_invoker = true` pe view-uri (ian. 2026) |

**Grants confirmate în migrări:**
- `create_company_with_member`, `prepare_balance_month_upload`, `soft_delete_import`, `retry_failed_import` → **authenticated**
- `process_import_accounts`, `check_rate_limit`, `cleanup_stale_imports` → **service_role** (Edge Functions)

---

## 6. Funcții importante

| Funcție | Scop | Problemă rezolvată |
|---------|------|-------------------|
| `get_user_id_from_auth()` | auth.uid() → users.id | ID consistent în RLS/RPC |
| `is_company_member()` | Verifică membership | Multi-tenancy |
| `has_role()` | RBAC | Privilegii admin |
| `can_access_import()` / `can_access_trial_balance_account()` / `can_access_financial_statement()` / `can_access_report()` | Acces indirect | Lanț FK securizat |
| `create_company_with_member()` | Companie + prim membru atomic | Fără orphan, CUI normalizat |
| `archive_company()` | Lifecycle archived | GDPR/cleanup |
| `prepare_balance_month_upload()` | Pregătește upload lună; replace opțional | O balanță/lună/companie |
| `process_import_accounts()` | Procesare conturi JSONB | Idempotență, lock, 10 coloane |
| `soft_delete_import()` | Soft delete orice membru companie | Ștergere colaborativă |
| `assert_mappings_complete_for_import()` | Mapare 100% | FS incomplete blocate |
| `check_rate_limit()` | Rate limit DB | Abuz persistent |
| `cleanup_rate_limits()` | Curățare entries vechi | Maintenance |
| `detect_stale_imports()` | Detectare processing timeout | Monitoring |
| `cleanup_stale_imports()` | Marchează stale ca `error` | Recuperare automată |
| `retry_failed_import()` | Reset import `error` → reprocess | Retry din UI |
| `get_company_imports_with_totals()` | Listă importuri + totaluri | Dashboard performant |
| `get_balances_with_accounts()` | Balanțe + conturi JSONB paginat | UI balanțe |
| `get_accounts_paginated()` | Conturi paginate per import | Liste mari |
| `get_import_totals()` | Totaluri per import | Validări rapide |
| `try_uuid()` | Cast safe TEXT → UUID | Storage policies |

---

## 7. Triggere și reguli de business

- `update_updated_at_column()` — timestamps automate
- `validate_mapping_allocation` — alocare ≤ 100%
- `close_previous_current_statement` — versionare FS
- `block_incomplete_mapping_generation` — mapare obligatorie
- `validate_report_statement_same_company` — anti cross-tenant
- `check_company_has_member` / `prevent_last_member_removal` — integritate companie
- **UNIQUE** `(company_id, balance_month) WHERE deleted_at IS NULL`
- **Soft delete** pe imports; constraints XOR sold deschis/închis **eliminate** (v1.9.4) pentru balanțe reale

---

## 8. Migrări SQL

### Faza 1 — Inițial (18–20 ian. 2026): 6 migrări

Structură de bază: users, companies, trial_balance, RLS, performance, `create_company_with_member`.

### Faza 2 — Plan v3.3 (27 ian. 2026): 1 migrare

CoA, mappings, financial_statements, lines, KPIs, reports.

### Faza 3 — Security Patches v1.8 (28 ian. 2026): 11 migrări

RLS company_users, status, try_uuid, create_company hardened, rate_limits, processing_started_at, views, process_import_accounts, constraint triggers, storage, CUI UNIQUE.

### Faza 4 — Stabilizare upload (29 ian. – iul. 2026): 12 migrări

| Migrare | Conținut |
|---------|----------|
| `20260129000001_fix_view_rls_security_invoker` | View-uri cu `security_invoker = true` |
| `20260129000002_fix_storage_bucket_consistency` | Aliniere bucket storage |
| `20260129100000_fix_process_import_accepts_both_statuses` | Status draft/processing acceptate |
| `20260129100001_stale_imports_cleanup_mechanism` | `cleanup_stale_imports`, `retry_failed_import`, `stale_imports_monitor` |
| `20260129100002_fix_bucket_balante_complete` | Bucket `balante` complet |
| `20260129100003_remove_restrictive_balance_constraints` | Elimină XOR constraints conturi |
| `20260621000000_stabilize_upload_pipeline` | Pipeline v2.0, view aliniat, GRANT parțial |
| `20260621100000_add_total_sume_columns` | Coloane G/H + RPC actualizate |
| `20260630100000_add_balance_month_to_trial_balance_imports` | `balance_month`, UNIQUE/lună, view-uri |
| `20260630120000_allow_company_member_soft_delete_import` | Soft delete orice membru |
| `20260630130000_normalize_historical_balance_periods` | Normalizare period_start/end istoric |
| `20260701120000_prepare_balance_month_upload` | RPC pregătire upload lună |

---

## 9. Fluxuri funcționale

### 9.1 Creare companie

Autentificare → `create_company_with_member(name, cui)` → validare + normalizare CUI → INSERT companie + membru → trigger verifică membru.

### 9.2 Import balanță (actualizat iun. 2026)

1. User selectează compania și **`balance_month`**.
2. `prepare_balance_month_upload(company_id, balance_month, replace?)` — verifică conflict lună.
3. INSERT în `trial_balance_imports` (status `draft`/`processing`).
4. Upload XLSX în bucket **`balante`**.
5. Edge Function `parse-balanta` → `process_import_accounts()` (service_role).
6. Conturi salvate cu 10 coloane; status `completed` sau `error`.
7. La stale > 10 min: `cleanup_stale_imports()`; retry via `retry_failed_import()`.

### 9.3 Situații financiare

Verificare import → `assert_mappings_complete_for_import()` → INSERT FS versionat → linii în tabele specifice.

### 9.4 KPI

Definiții → calcul → `kpi_values` per perioadă/import.

### 9.5 Rapoarte

Creare raport → asociere statements → trigger anti cross-tenant → export PDF/Excel/JSON.

---

## 10. Puncte forte

Multi-tenancy, RLS, versionare FS, mapări flexibile, audit trail, import idempotent, rate limiting persistent, segregare erori, **`balance_month`** canonic, format Excel 10 coloane, monitoring stale imports, soft delete colaborativ.

---

## 11. Verificări pre-producție

- [ ] Toate **30 migrări** aplicate (`supabase migration list`)
- [ ] **Gate 0** trecut
- [ ] **`src/integrations/supabase/types.ts`** regenerat (conține `balance_month`, `total_sume_*`, RPC-uri noi)
- [ ] Frontend folosește **`trial_balance_imports_public`**
- [ ] Upload folosește **`prepare_balance_month_upload`** + bucket **`balante`**
- [ ] Edge Function apelează **`process_import_accounts`** cu service_role
- [ ] CUI UNIQUE fără coliziuni în producție
- [ ] Job/monitoring pentru **`cleanup_stale_imports`**

---

## 12. Concluzie

Schema FinGuard v2 este solidă și extinsă pentru producție. Documentația din ianuarie 2026 rămâne validă pentru nucleul v3.3/v1.8; extensiile din iunie 2026 (balance_month, pipeline upload, format 10 coloane) sunt reflectate în migrări și types. Înainte de deploy final: migrări, RLS, RPC, types și fluxuri frontend/Edge Functions trebuie aliniate.

---

## 13. Rezumat executiv (15 rânduri)

FinGuard v2 = SaaS financiar multi-tenant pe Supabase/PostgreSQL.  
17 tabele + 2 auxiliare, RLS pe toate, izolare strictă pe `company_id`.  
Flux: user → companie → balanță lunară → mapări → situații financiare → KPI → rapoarte.  
v1.8 (ian.): securitate critică — auto-join, CUI, import concurent, erori interne.  
v2.0 upload (iun.): `balance_month`, o balanță activă/companie/lună, bucket `balante`.  
Format Excel 10 coloane: `total_sume_debitoare/creditoare` în `trial_balance_accounts`.  
View-uri: public/internal + `stale_imports_monitor`; `security_invoker = true`.  
RPC noi: `prepare_balance_month_upload`, `cleanup_stale_imports`, `retry_failed_import`.  
`process_import_accounts` + `check_rate_limit` = service_role din Edge Functions.  
30 migrări SQL în repo; types TypeScript trebuie regenerate după fiecare schimbare.  
Stale imports: cleanup la 10 min, warning monitor la 5 min.  
Soft delete: orice membru companie poate șterge balanțele companiei.  
Gate 0 obligatoriu pre-deploy; test suite v1.8 documentată (29+ scenarii).  
Status: production ready cu verificări finale listate în secțiunea 11.

### Acțiuni recomandate

1. Gate 0 + `supabase db push`
2. Regenerare types
3. Test flux upload complet (prepare → storage → parse → process)
4. Monitoring stale imports
5. Verificare bucket `balante` și storage policies

### Module de verificat în Cursor IDE

| Modul | Cale |
|-------|------|
| Migrări | `supabase/migrations/*.sql` |
| Types | `src/integrations/supabase/types.ts` |
| Edge Function | `supabase/functions/parse-balanta/index.ts` |
| Upload hook | `src/hooks/useBalanceUploadForm.ts` |
| Perioadă balanță | `src/lib/balancePeriod.ts` |
| Storage | `src/lib/storage/constants.ts` |
| Companie | `src/contexts/CompanyContext.tsx`, `src/hooks/useCompany.tsx` |
| KPI / Rapoarte | `src/hooks/useKPIs.tsx`, `src/pages/RapoarteFinanciare.tsx` |
| Verificare pipeline | `scripts/verify-upload-pipeline.mjs` |

---

*Document de onboarding FinGuard v2. Detalii SQL: `descriere_database.md`, `tabele.md`, `plan_dezvoltare_database.md`.*
