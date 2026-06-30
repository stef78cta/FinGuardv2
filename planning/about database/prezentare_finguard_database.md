# Prezentare FinGuard v2 - Bază de date și arhitectură

> **Sursă:** sinteză din `tabele.md`, `descriere_database.md`, `plan_dezvoltare_database.md`  
> **Versiune schemă documentată:** Plan Final v3.3 + Security Patches v1.8  
> **Data sintezei:** 24 iunie 2026

---

## 1. Introducere

**FinGuard v2** este o aplicație SaaS financiară multi-tenant, construită pe **Supabase** (PostgreSQL + Auth + Storage + Edge Functions). Baza de date este nucleul arhitecturii: stochează identitatea utilizatorilor, companiile, datele contabile importate și toate rezultatele derivate (situații financiare, KPI, rapoarte).

Documentația tehnică descrie o schemă destinată gestionării companiilor, importului balanțelor de verificare (`trial_balance_imports`), mapării conturilor (`account_mappings`), generării situațiilor financiare (`financial_statements`), calculului KPI-urilor (`kpi_values`) și rapoartelor (`reports`). Separarea datelor pe tenant (`company_id`), **Row Level Security (RLS)** și funcțiile **SECURITY DEFINER** formează stratul de securitate care protejează datele financiare sensibile.

---

## 2. Sumar executiv

- Aplicația folosește o **arhitectură multi-tenant** strictă: fiecare companie este un tenant izolat logic.
- **Toate datele operaționale** sunt legate de `company_id` și accesibile doar membrilor companiei.
- **Row Level Security** este activ pe tabelele importante (17 tabele + 2 auxiliare documentate).
- Există **mecanisme mature de securitate**: RBAC, RLS helper functions, rate limiting persistent, view-uri separate public/intern, storage policies, constraint triggers.
- Schema acoperă fluxul complet: **import balanță → plan de conturi → mapări → situații financiare → KPI → rapoarte**.
- **Security Patches v1.8** au remediat breșe critice (auto-join companii, CUI duplicate, import concurent, expunere erori interne).
- Documentația marchează status **production ready**, cu mențiunea că deploy-ul în producție necesită verificări Gate 0, migrări și aliniere frontend/types.

---

## 3. Arhitectura generală a bazei de date

Fluxul logic al datelor, de la autentificare la raportare:

```
Utilizator Supabase Auth (auth.users)
        ↓
public.users (+ user_roles pentru RBAC)
        ↓
company_users (membership many-to-many)
        ↓
companies (tenant root, status lifecycle, CUI unic)
        ↓
trial_balance_imports (import balanță, status pipeline)
        ↓
trial_balance_accounts (conturi din fișier)
        ↓
chart_of_accounts (plan de conturi per companie)
        ↓
account_mappings (TB → CoA, split + versionare)
        ↓
financial_statements (bilanț, P&L, cash flow — versionate)
        ↓
balance_sheet_lines / income_statement_lines / cash_flow_lines
        ↓
kpi_definitions → kpi_values
        ↓
reports (+ report_statements junction)
```

### Rolul fiecărui nivel

| Nivel | Rol |
|-------|-----|
| **auth.users → users** | Autentificare Supabase mapată la profil aplicație |
| **user_roles** | Roluri globale: `user`, `admin`, `super_admin` |
| **companies + company_users** | Multi-tenancy: utilizatorul vede doar companiile unde e membru |
| **trial_balance_imports** | Metadata import: perioadă, fișier, status procesare, erori |
| **trial_balance_accounts** | Date contabile brute din balanță (solduri, rulaje) |
| **chart_of_accounts** | Plan de conturi standardizat al companiei |
| **account_mappings** | Legătura cont TB → cont CoA, cu alocare procentuală |
| **financial_statements** | Situații financiare generate, versionate, imutabile |
| **statement lines** | Liniile concrete din fiecare situație |
| **kpi_*** | Definiții și valori calculate pe perioadă |
| **reports** | Rapoarte agregate, cu protecție cross-tenant |
| **rate_limits** | Limitare operațiuni sensibile (import, creare companie etc.) |

---

## 4. Module principale ale bazei de date

### 4.1 Users & Authentication

**Tabele:** `users`, `user_roles`

- `users` leagă `auth.users` (Supabase Auth) de profilul aplicației (`email`, `full_name`, `avatar_url`, timestamps).
- `user_roles` implementează **RBAC** cu enum `app_role`: `user`, `admin`, `super_admin`.
- La sign-up, profilul `users` se creează prin trigger Supabase Auth.
- RLS: utilizatorii văd/modifică propriul profil; rolurile sunt gestionate de `super_admin`.
- Funcția `has_role()` verifică privilegii administrative în policies și logică de business.

### 4.2 Companies & Multi-Tenancy

**Tabele:** `companies`, `company_users`

- `companies`: nume, **CUI**, țară, monedă, an fiscal, logo, adresă, telefon.
- **`status` lifecycle** (v1.7–v1.8): `active` (default), `archived`, `deleting` — suportă arhivare și cleanup GDPR.
- **`company_users`**: junction many-to-many user ↔ companie.
- **Separare date:** toate entitățile downstream au `company_id`; RLS verifică membership.
- **Protecție orphan companies:** constraint trigger `check_company_has_member` — o companie activă trebuie să aibă cel puțin un membru.
- **Protecție ultim membru:** trigger `prevent_last_member_removal` — nu se poate șterge ultimul membru (exceptând companii `archived`/`deleting`).
- **CUI normalizat:** `UPPER` + eliminare caractere non-alfanumerice; index **UNIQUE** pe CUI normalizat previne duplicate (`RO123` vs `ro 123`).
- **Creare companie:** INSERT direct pe `companies` este blocat; se folosește RPC `create_company_with_member()`.
- **RLS company_users (v1.8):** bootstrap limitat — auto-join permis doar ca prim membru al unei companii fără membri; altfel doar membri existenți sau `super_admin`.

### 4.3 Trial Balance Data

**Tabele:** `trial_balance_imports`, `trial_balance_accounts`

**Proces import:**
1. Utilizatorul selectează compania și perioada.
2. Se creează rând în `trial_balance_imports` (status inițial `draft`).
3. Fișierul este încărcat în Storage; Edge Function parsează XLSX.
4. RPC `process_import_accounts()` salvează conturile în `trial_balance_accounts`.
5. Statusul este actualizat la `completed` sau `error`.

**Statusuri import (`import_status`):**
- `draft` — creat, neprocesat
- `processing` — în curs de procesare
- `validated` — validat (dacă e folosit în pipeline)
- `completed` — procesat cu succes
- `error` — eșec procesare

**Câmpuri importante:**
- `processing_started_at` — timestamp start procesare; folosit pentru detectarea importurilor blocate (stale).
- `error_message` — mesaj user-friendly, expus în frontend.
- `internal_error_detail` / `internal_error_code` — detalii tehnice; **NU** expuse utilizatorilor autentificați.
- `accounts_count` — număr conturi procesate.
- `deleted_at` — soft delete.

**View-uri (strategie VIEW-ONLY v1.8):**
- `trial_balance_imports_public` — pentru frontend (`authenticated`); exclude coloane sensibile.
- `trial_balance_imports_internal` — pentru debugging (`service_role`); include `internal_error_detail`.

Accesul direct SELECT pe tabela `trial_balance_imports` este revocat pentru `authenticated`.

### 4.4 Chart of Accounts

**Tabel:** `chart_of_accounts`

- Plan de conturi **per companie** (`company_id`).
- Tipuri cont (`account_type`): `asset`, `liability`, `equity`, `revenue`, `expense`.
- **`parent_id`** — ierarhie conturi (cont părinte).
- **`is_postable`** — dacă contul acceptă postări directe.
- **`is_system`** — conturi sistem, protejate la ștergere.
- Constraint UNIQUE pe `(company_id, account_code)`.

### 4.5 Account Mappings

**Tabel:** `account_mappings`

- Mapare cont din balanță (`trial_balance_account_id`) → cont plan (`chart_account_id`).
- **Split allocation:** un cont TB poate fi repartizat pe mai multe conturi CoA via `allocation_pct` (0–1).
- **Versionare:** `valid_from`, `valid_to` (NULL = mapare curentă activă).
- **Non-overlap:** constraint EXCLUDE cu `btree_gist` pe intervale de date.
- **Regulă alocare:** suma alocărilor active pentru un cont TB **nu poate depăși 100%** (trigger `validate_mapping_allocation`).
- **Generare situații financiare:** trigger `block_incomplete_mapping_generation` + RPC `assert_mappings_complete_for_import()` — blochează generarea dacă maparea conturilor relevante (cu solduri/rulaje) nu este 100%.

### 4.6 Financial Statements

**Tabel:** `financial_statements`

**Tipuri (`statement_type`):**
- `balance_sheet` — bilanț
- `income_statement` — cont profit și pierdere
- `cash_flow` — flux de numerar

**Versionare:**
- `version` — număr versiune incremental.
- `is_current` — doar o versiune curentă per (companie, tip, perioadă).
- Trigger `close_previous_current_statement` — la versiune nouă `is_current=TRUE`, versiunile anterioare devin `is_current=FALSE`.

**Immutability:** câmpurile cheie (`company_id`, `source_import_id`, perioada, tipul) nu se modifică direct; se creează versiuni noi prin INSERT.

### 4.7 Statement Lines

**Tabele:** `balance_sheet_lines`, `income_statement_lines`, `cash_flow_lines`

- Stochează liniile concrete din fiecare situație financiară.
- Legături opționale la `chart_account_id` și `trial_balance_account_id`.
- `line_key` + `display_order` pentru structură și ordine afișare.
- `income_statement_lines`: categorii `venituri` / `cheltuieli`.
- `cash_flow_lines`: secțiuni `operating`, `investing`, `financing`.

### 4.8 KPIs

**Tabele:** `kpi_definitions`, `kpi_values`

- **`kpi_definitions`:** formule JSONB, categorii (`liquidity`, `profitability`, `leverage`, `efficiency`, `other`), unități (`ratio`, `percentage`, `days`, `times`, `currency`).
- KPI **globali** (`company_id = NULL`) și **personalizați** per companie.
- **`kpi_values`:** valori calculate pe `(kpi_definition_id, company_id, period_start, period_end)`, legate de `trial_balance_import_id`.

### 4.9 Reports

**Tabele:** `reports`, `report_statements`

- **`reports`:** titlu, tip (`comprehensive`, `kpi_dashboard`, `comparative`, `custom`), perioadă, format fișier (`pdf`, `excel`, `json`), status (`generating`, `completed`, `error`).
- **`report_statements`:** junction many-to-many raport ↔ situații financiare.
- **Protecție cross-tenant:** trigger `validate_report_statement_same_company` / `prevent_cross_tenant_report_statements` — blochează asocierea unui raport cu situații din altă companie.

### 4.10 Rate Limiting și operațiuni

**Tabele:** `rate_limits`, `rate_limits_meta`

- Rate limiting **persistent în PostgreSQL** (nu in-memory) — supraviețuiește redeploy-urilor Edge Functions.
- Fereastră fixă (ex. pe oră via `DATE_TRUNC`).
- **`check_rate_limit(user_id, resource_type, max_requests, window_seconds)`** — UPSERT atomic, strategie **fail-closed** (eroare DB → refuz cerere).
- **`cleanup_rate_limits()`** — șterge înregistrări vechi (> 24h), actualizează metadata.
- RLS pe `rate_limits`: acces direct blocat (`USING (FALSE)`); acces doar prin funcții SECURITY DEFINER.
- Tipuri resurse exemple: `trial_balance_import`, `company_create`, `report_gen`.

---

## 5. Securitate

### Principii

1. **RLS activ** pe toate tabelele documentate (default deny).
2. **Funcții helper SECURITY DEFINER** pentru verificări membership și acces indirect.
3. **Multi-tenancy strict** — fiecare policy verifică `company_id` sau `is_company_member()`.
4. **Defense in depth** — validări la DB, triggers, RPC și API (Edge Functions).
5. **Separare erori** — mesaje publice vs. detalii interne.

### Protecții implementate

| Amenințare | Mecanism |
|------------|----------|
| Auto-join neautorizat la companii | RLS bootstrap limitat pe `company_users` (v1.8) |
| Duplicate CUI | Normalizare + UNIQUE index pe CUI normalizat |
| Procesare simultană același import | Advisory lock (`pg_try_advisory_xact_lock`) în `process_import_accounts` |
| Importuri blocate în `processing` | `processing_started_at` + `detect_stale_imports()` |
| Acces cross-tenant rapoarte | Trigger pe `report_statements` |
| Path-uri Storage invalide | Policies cu `try_uuid()` + regex validare |
| Rate limit bypass | RLS deny direct + RPC fail-closed |
| Companii fără membri | Constraint trigger `check_company_has_member` |
| Ștergere ultim membru | Trigger `prevent_last_member_removal` |
| Expunere erori SQL | View public fără `internal_error_detail`; REVOKE SELECT direct |

### View-uri și acces

- Frontend: **`trial_balance_imports_public`** (authenticated).
- Debugging/monitoring: **`trial_balance_imports_internal`** (service_role).
- Funcții critice (`process_import_accounts`, `check_rate_limit`): acces **service_role** din Edge Functions; `create_company_with_member`: **authenticated**.

---

## 6. Funcții importante

| Funcție | Scop | Unde e folosită | Problemă rezolvată |
|---------|------|-----------------|-------------------|
| `get_user_id_from_auth()` | Mapează `auth.uid()` → `users.id` | RLS policies, RPC-uri | ID consistent în tot stratul aplicație |
| `is_company_member(user_id, company_id)` | Verifică membership | RLS pe majoritatea tabelelor | Izolare multi-tenant |
| `has_role(user_id, role)` | Verifică rol RBAC | Policies admin, company_users INSERT | Control privilegii administrative |
| `can_access_import(user_id, import_id)` | Acces la import via companie | RLS `trial_balance_accounts` | Acces indirect securizat |
| `can_access_trial_balance_account(user_id, tb_account_id)` | Acces la cont TB | RLS conturi, mapări | Verificare lanț import → companie |
| `can_access_financial_statement(user_id, statement_id)` | Acces la situație financiară | RLS statements și lines | Protecție date financiare |
| `can_access_report(user_id, report_id)` | Acces la raport | RLS reports | Izolare rapoarte per tenant |
| `create_company_with_member(name, cui, ...)` | Creare atomică companie + prim membru | Frontend onboarding companie | Tranzacție atomică, CUI normalizat, fără orphan |
| `archive_company(company_id)` | Marchează companie `archived` | Flow arhivare/ștergere | Permite cleanup membri conform lifecycle |
| `process_import_accounts(import_id, accounts, requester_user_id)` | Procesare conturi import | Edge Function `parse-balanta` | Idempotență, lock concurent, error handling |
| `assert_mappings_complete_for_import(import_id, ref_date, requester_user_id)` | Validare mapare 100% | Pre-generare situații financiare | Blochează rapoarte incomplete |
| `check_rate_limit(user_id, resource, max, window)` | Verificare/incrementare limită | Edge Functions, RPC critice | Protecție abuz/DoS persistentă |
| `cleanup_rate_limits()` | Curățare înregistrări expirate | Cron/manual maintenance | Previne creștere necontrolată tabel |
| `detect_stale_imports(timeout_minutes)` | Găsește importuri blocate | Monitoring, cleanup jobs | Recuperare importuri stuck în `processing` |
| `try_uuid(text)` | Conversie safe TEXT → UUID | Storage policies, validări path | Evită excepții la cast invalid în policies |

---

## 7. Triggere și reguli de business

| Trigger / Regulă | Comportament |
|------------------|--------------|
| `update_updated_at_column()` | Actualizează automat `updated_at` la UPDATE pe tabele relevante |
| `validate_mapping_allocation` | Blochează INSERT/UPDATE dacă suma alocărilor > 100% |
| `validate_mapping_continuity` | WARNING (nu blochează) la gap în intervale de mapare |
| `close_previous_current_statement` | Marchează versiunea anterioară `is_current=FALSE` |
| `block_incomplete_mapping_generation` | BEFORE INSERT pe `financial_statements` — verifică mapare completă |
| `validate_report_statement_same_company` | Previne rapoarte cross-tenant |
| `check_company_has_member` | Previne companii active fără membri |
| `prevent_last_member_removal` | Previne ștergerea ultimului membru (cu excepții lifecycle) |

**Reguli suplimentare:**
- EXCLUDE constraint pe `account_mappings` — intervale non-suprapuse.
- UNIQUE CUI normalizat pe `companies`.
- Soft delete pe `trial_balance_imports` (`deleted_at IS NULL` în queries/view public).

---

## 8. Migrări SQL

### Migrări inițiale (18–20 ian. 2026)

| Migrare | Conținut |
|---------|----------|
| `20260118224720_*` | Structura inițială: users, companies, trial_balance, RLS |
| `20260118224822_*` | Fix search_path + RLS users |
| `20260119094518_*` | Fix companies SELECT policy |
| `20260119094906_*` | `create_company_with_member` v1.0 |
| `20260119095336_*` | Gestionare CUI existent |
| `20260120100000_performance_optimizations` | Soft delete, batch queries, paginare |

### Migrare majoră Plan v3.3 (27 ian. 2026)

| Migrare | Conținut |
|---------|----------|
| `20260127000000_plan_v3.3_financial_statements_mappings` | CoA, account_mappings (split + history), financial_statements, lines, KPIs, reports |

### Security Patches v1.8 (28 ian. 2026)

| Migrare | Conținut | Severitate |
|---------|----------|------------|
| `20260128100000_security_patch_company_users_rls` | Fix breșă auto-join | CRITICĂ |
| `20260128100000a_add_companies_status` | Coloană `status` lifecycle | MEDIE |
| `20260128100000b_try_uuid_helper` | Funcție `try_uuid()` IMMUTABLE | ÎNALTĂ |
| `20260128100001_security_patch_create_company_function` | Hardening `create_company_with_member` | CRITICĂ |
| `20260128100002_rate_limits_table` | Tabele + funcții rate limiting | MEDIE |
| `20260128100002a_add_processing_started_at` | Tracking procesare | ÎNALTĂ |
| `20260128100002b_add_internal_error_tracking_view` | View-uri public/internal | MEDIE |
| `20260128100003_process_import_accounts_function` | Idempotență + advisory lock | ÎNALTĂ |
| `20260128100004_company_member_constraint` | Constraint triggers membri | CRITICĂ |
| `20260128100005_storage_policy_hardening` | Storage policies cu `try_uuid` | MEDIE |
| `20260128100006_cui_unique_constraint` | UNIQUE CUI normalizat | CRITICĂ |

### Migrări post-v1.8 (în repo, dincolo de documentația inițială)

Există migrări suplimentare în `supabase/migrations/` (ian.–iun. 2026): stabilizare upload pipeline, fix view RLS security invoker, stale imports cleanup, fix bucket storage, coloane total sume etc. Acestea extind documentația v1.8 și trebuie verificate la deploy.

### Dependențe critice

```
try_uuid (100000b) → storage policy (100005)
processing_started_at + views (100002a/b) → process_import_accounts (100003)
companies.status (100000a) → constraint triggers (100004)
create_company CUI normalizare (100001) → CUI UNIQUE (100006)
```

**Notă producție:** migrarea CUI UNIQUE poate necesita `CREATE INDEX CONCURRENTLY` manual, după verificarea coliziunilor CUI.

---

## 9. Fluxuri funcționale importante

### 9.1 Crearea unei companii

1. Utilizatorul este autentificat (Supabase Auth).
2. Frontend apelează RPC `create_company_with_member(name, cui, ...)`.
3. Se validează numele și CUI-ul (non-empty).
4. CUI-ul este normalizat (uppercase, fără caractere speciale).
5. Se inserează compania cu `status = 'active'`.
6. Utilizatorul curent devine primul membru în `company_users`.
7. Constraint trigger garantează că nu există companie fără membru.

### 9.2 Importul unei balanțe

1. Utilizatorul selectează compania și perioada contabilă.
2. Se creează rând în `trial_balance_imports` (status `draft`).
3. Fișierul XLSX este validat (frontend) și încărcat în Storage.
4. Edge Function `parse-balanta` parsează fișierul.
5. Se apelează `process_import_accounts()` — lock, status `processing`, INSERT conturi.
6. La succes: status `completed`, `processed_at` setat.
7. La eroare: status `error`, `error_message` (user-friendly), `internal_error_detail` (service_role).

### 9.3 Generarea situațiilor financiare

1. Se verifică existența importului completat.
2. `assert_mappings_complete_for_import()` verifică maparea 100% a conturilor relevante.
3. Se generează `financial_statements` (INSERT, nu UPDATE).
4. Versiunea anterioară `is_current` devine FALSE automat.
5. Liniile sunt salvate în `balance_sheet_lines`, `income_statement_lines`, `cash_flow_lines`.

### 9.4 Generarea KPI-urilor

1. Se citesc definițiile active din `kpi_definitions` (global + per companie).
2. Se calculează valorile pe baza situațiilor financiare / conturilor mapate.
3. Rezultatele sunt salvate în `kpi_values` (legat de import și perioadă).

### 9.5 Generarea rapoartelor

1. Se creează rând în `reports` (status `generating`).
2. Se asociază situațiile financiare în `report_statements`.
3. Triggerul verifică același `company_id` pentru raport și statement.
4. Raportul este generat (PDF/Excel/JSON) și marcat `completed` sau `error`.

---

## 10. Puncte forte ale arhitecturii

- **Multi-tenancy** robust, izolare pe `company_id` + RLS
- **Securitate solidă** — RLS, SECURITY DEFINER, constraint triggers, view-uri separate
- **Versionare situații financiare** — audit trail, immutability
- **Mapări contabile flexibile** — split allocation, istoric `valid_from`/`valid_to`
- **Audit trail** — timestamps (`created_at`, `updated_at`, `generated_at`, `calculated_at`)
- **Importuri idempotente** — advisory lock, guard status, rerun controlat
- **Rate limiting persistent** — supraviețuiește redeploy
- **Separare erori publice/interne** — UX sigur + debugging pentru ops
- **Normalizare CUI** — prevenire duplicate la nivel DB
- **Pregătire producție** — Gate 0, test suite documentată (29+ teste), monitoring queries

---

## 11. Riscuri sau zone care trebuie verificate

Înainte de producție, verificați în cod și în Supabase:

- [ ] **RLS activ** pe toate tabelele (query Gate 0 / `pg_class.relrowsecurity`)
- [ ] **Frontend folosește `trial_balance_imports_public`**, nu tabela directă
- [ ] **TypeScript types regenerate** după migrări (`src/integrations/supabase/types.ts`)
- [ ] **Edge Function `parse-balanta`** apelează corect `process_import_accounts` cu service_role
- [ ] **Teste import balanță** — există `useBalanceUploadForm.test.ts`; extindeți acoperirea E2E
- [ ] **Validări frontend XLSX** — format 10 coloane A–J, limite sheets/rows/size
- [ ] **Tratament importuri blocate** — `detect_stale_imports`, migrări cleanup, reset manual documentat
- [ ] **Index UNIQUE CUI** aplicat corect în producție (fără coliziuni pre-existente)
- [ ] **Storage policies** folosesc `try_uuid()` și bucket-ul corect (`trial-balances`)
- [ ] **Migrări post-v1.8** din repo sunt aplicate și documentate
- [ ] **Grants funcții** — `check_rate_limit` și `process_import_accounts` restricționate corect (service_role vs authenticated)

---

## 12. Concluzie

Baza de date **FinGuard v2** este proiectată solid pentru o aplicație financiară multi-tenant. Mecanismele de securitate (RLS, SECURITY DEFINER, constraint triggers, rate limiting, view-uri segregate) sunt mature și acoperă scenarii reale de abuz (auto-join, cross-tenant, import concurent, CUI duplicate).

Schema susține fluxuri contabile complexe: import balanță, mapare flexibilă cu split allocation, generare versionată de situații financiare, KPI și rapoarte. Documentația indică un status **production ready**, cu precizarea că înainte de deploy final trebuie verificate migrările (inclusiv cele post-v1.8), RLS, funcțiile RPC, tipurile TypeScript și integrarea frontend/Edge Functions.

---

## Observații / Posibile neconcordanțe

Documentația din cele 3 fișiere sursă conține mici diferențe care merită clarificate la implementare:

| Subiect | `tabele.md` | `descriere_database.md` | Recomandare |
|---------|-------------|-------------------------|-------------|
| FK `rate_limits.user_id` | `auth.users` | `public.users` | Verificați migrarea efectivă în `supabase/migrations/` |
| Return type `check_rate_limit` | BOOLEAN (sumar) | JSONB `{ allowed, remaining, ... }` | Tipul JSONB din implementare este sursa de adevăr |
| Grant `check_rate_limit` | service_role only (plan) | GRANT TO authenticated (descriere) | Verificați grants efective; planul recomandă service_role |
| Coloane view public | `file_name` | `source_file_name` | Aliniați frontend la schema reală din migrări |
| View internal filter | `status IN ('failed', 'error')` | fără filtru status strict | Verificați definiția din migrarea `100002b` |
| Default `detect_stale_imports` | 10 min (mențiune tabele) | 30 min (descriere) | Parametrul e configurabil; documentați timeout-ul ales în ops |
| Trigger orphan company | AFTER INSERT on `companies` (tabele) | AFTER INSERT on `company_users` (descriere) | Implementarea din `100004` folosește `company_users` |
| Număr migrări | 18 (documentație ian.) | 18 | Repo conține **27+** migrări — actualizați inventarul |
| Status import `failed` vs `error` | view internal menționează `failed` | enum are doar `error` | Verificați consistența statusurilor în cod |

---

## 13. Format final obligatoriu

### Rezumat executiv (max. 15 rânduri)

FinGuard v2 este o aplicație financiară SaaS multi-tenant pe Supabase/PostgreSQL.  
Datele sunt izolate strict pe `company_id`, protejate prin RLS pe 17+ tabele.  
Fluxul principal: utilizator → companie → import balanță → mapare conturi → situații financiare → KPI → rapoarte.  
Security Patches v1.8 au remediat breșe critice: auto-join companii, CUI duplicate, import concurent.  
Funcții SECURITY DEFINER (`create_company_with_member`, `process_import_accounts`) gestionează operațiuni atomice.  
Erorile tehnice sunt segregate: frontend vede `trial_balance_imports_public`, ops vede view internal.  
Rate limiting persistent în DB înlocuiește soluțiile in-memory.  
Situațiile financiare sunt versionate și imutabile; mapările suportă split allocation.  
Documentația marchează status production ready, cu Gate 0 obligatoriu pre-deploy.  
Verificați migrările post-v1.8, regenerarea types TypeScript și integrarea Edge Functions.  
Repo-ul conține migrări suplimentare (upload pipeline, storage, stale cleanup) față de doc. inițială.  
Test suite documentată: 29+ scenarii securitate și funcționale.  
Constraint triggers previn companii fără membri și ștergerea ultimului membru.  
Index UNIQUE pe CUI normalizat necesită verificare coliziuni în producție.  
Această prezentare servește ca document de onboarding pentru echipa FinGuard v2.

### Acțiuni recomandate pentru dezvoltator

1. Rulați **Gate 0** (`planning/gate0_verificari.sql`, `gate0_code_checks.sh`) pe environment-ul țintă.
2. Aplicați toate migrările: `supabase db push` + pași manuali pentru CUI UNIQUE CONCURRENTLY.
3. Regenerați **`src/integrations/supabase/types.ts`** după migrări.
4. Verificați că frontend interoghează **`trial_balance_imports_public`**, nu tabela directă.
5. Confirmați că **`parse-balanta`** folosește service_role și apelează `process_import_accounts` corect.
6. Testați fluxul complet upload balanță (validări XLSX → Storage → Edge Function → DB).
7. Implementați/monitorizați job pentru **`detect_stale_imports`** și `cleanup_rate_limits`.
8. Rulați test suite Security Patches v1.8 documentată.
9. Verificați **storage policies** și bucket `trial-balances` cu `try_uuid`.
10. Actualizați documentația internă cu migrările post-v1.8 din repo.

### Module din aplicație de verificat în Cursor IDE

| Modul | Cale |
|-------|------|
| Migrări Supabase | `supabase/migrations/*.sql` |
| TypeScript types | `src/integrations/supabase/types.ts` |
| Edge Function import balanță | `supabase/functions/parse-balanta/index.ts` |
| Hook upload balanță | `src/hooks/useBalanceUploadForm.ts` |
| Componente upload | `src/components/upload/BalanceUploadPreview.tsx`, `ValidationResultsDialog.tsx` |
| Storage constants | `src/lib/storage/constants.ts` |
| Selectare companie | `src/contexts/CompanyContext.tsx`, `src/hooks/useCompany.tsx`, `src/components/app/CompanySwitcher.tsx` |
| Guard companie | `src/components/auth/CompanyGuard.tsx` |
| KPI | `src/hooks/useKPIs.tsx`, `src/pages/IndicatoriCheie.tsx`, `src/components/app/KPICard.tsx` |
| Rapoarte | `src/pages/RapoarteFinanciare.tsx` |
| Calcule financiare | `src/hooks/useFinancialCalculations.tsx` |
| Script verificare pipeline | `scripts/verify-upload-pipeline.mjs` |
| Gate 0 verificări | `planning/gate0_verificari.sql`, `planning/gate0_code_checks.sh` |
| Documentație deploy | `planning/about security patches, types, fix-uri tehnice/START_HERE.md` |

---

*Document generat pentru onboarding echipă FinGuard v2. Pentru detalii SQL complete, consultați `descriere_database.md` (~2.300 linii) și `plan_dezvoltare_database.md` (~3.600 linii).*
