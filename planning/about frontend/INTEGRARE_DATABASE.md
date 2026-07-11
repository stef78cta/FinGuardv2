# Integrare Supabase — Perspectivă Frontend

> **Ultima actualizare:** 11 Iulie 2026  
> **Schema completă:** `planning/about database/tabele.md`

---

## 1. Client Supabase

**Fișier:** `src/integrations/supabase/client.ts`

| Aspect | Valoare actuală |
|--------|-----------------|
| URL | `https://gqxopxbzslwrjgukqbha.supabase.co` (hardcodat) |
| Anon key | hardcodat în fișier |
| Tipizare | `createClient<Database>(...)` |
| Auth storage | `localStorage` |
| Flow | PKCE (`flowType: 'pkce'`) |
| Auto-refresh | `autoRefreshToken: true` |

**Notă:** Credențialele sunt hardcodate conform comentariului „Lovable guidelines” — nu folosesc `import.meta.env.VITE_SUPABASE_*`.

---

## 2. Tipuri TypeScript generate

**Fișier:** `src/integrations/supabase/types.ts` (~1700+ linii)

Tipuri generate pentru:
- Toate tabelele `public.*`
- View-urile (`trial_balance_imports_public`, `active_trial_balance_imports`, etc.)
- ENUM-uri (`app_role`, `import_status`, etc.)
- Funcții RPC (signatures)

**Regenerare:** vezi `planning/about security patches, types, fix-uri tehnice/REGENERATE_TYPES.md`

---

## 3. Tabele accesate din frontend

### Autentificare și multi-tenant

| Tabel | Operații | Unde |
|-------|----------|------|
| `users` | SELECT, UPDATE | `AuthContext`, `Settings`, `Admin` |
| `user_roles` | SELECT, INSERT, UPDATE, DELETE | `useUserRole`, `Admin` |
| `companies` | SELECT, INSERT, UPDATE | `CompanyContext`, `Settings`, `Admin` |
| `company_users` | SELECT, INSERT | `CompanyContext`, `Admin` |

### Balanțe de verificare

| Tabel / View | Operații | Unde |
|--------------|----------|------|
| `trial_balance_imports` | SELECT, INSERT, UPDATE | `useTrialBalances`, `importPipeline` |
| `trial_balance_imports_public` (view) | SELECT | `importPipeline` (sursă preferată) |
| `active_trial_balance_imports` (view) | SELECT | hooks balanțe |
| `trial_balance_accounts` | SELECT, INSERT (batch) | `importPipeline`, Edge Function |

### Plan de conturi și mapări

| Tabel | Operații | Unde |
|-------|----------|------|
| `chart_of_accounts` | SELECT | pipeline raportare |
| `chart_of_accounts_template` | SELECT (via RPC seed) | `financialStatementsPipeline` |
| `account_mappings` | SELECT (via RPC auto_map) | `financialStatementsPipeline` |

### Situații financiare

| Tabel | Operații | Unde |
|-------|----------|------|
| `financial_statements` | SELECT | `useGeneratedFinancialStatements` |
| `balance_sheet_lines` | SELECT | idem |
| `income_statement_lines` | SELECT | idem |
| `cash_flow_lines` | SELECT | idem |
| `statement_line_definitions` | SELECT | `useStatementLineDefinitions` |
| `reports` | SELECT | `useGeneratedFinancialStatements` |
| `report_statements` | SELECT | idem |

### KPI (parțial)

| Tabel | Operații | Unde |
|-------|----------|------|
| `kpi_definitions` | SELECT | `useKPIs` (dacă definit în DB) |
| `kpi_values` | SELECT | `useKPIs` |

**Notă:** Majoritatea KPI-urilor sunt calculate client-side din conturi balanță, nu citite din `kpi_values`.

---

## 4. RPC-uri apelate din frontend

| RPC | Parametri principali | Fișier caller | Scop |
|-----|---------------------|---------------|------|
| `create_company_with_member` | name, cui | `CompanyContext.tsx`, `useCompany.tsx` | Creare companie + membru |
| `prepare_balance_month_upload` | company_id, balance_month, ... | `prepareBalanceMonthUpload.ts` | Pregătire upload (replace logic) |
| `get_company_imports_with_totals` | company_id | `useTrialBalances.tsx` | Listă importuri cu totaluri |
| `get_import_totals` | import_id | `useTrialBalances.tsx` | Totaluri per import |
| `soft_delete_import` | import_id | `useTrialBalances.tsx` | Soft delete import |
| `retry_failed_import` | import_id | `useTrialBalances.tsx` | Reprocesare import eșuat |
| `cleanup_stale_imports` | — | `useTrialBalances.tsx` | Curățare importuri blocate |
| `get_accounts_paginated` | import_id, page, page_size | `useBalante.tsx` | Conturi paginat (50/pagină) |
| `get_balances_with_accounts` | company_id, ... | `useBalante.tsx` | Balanțe cu conturi (batch) |
| `seed_standard_chart_of_accounts` | company_id | `financialStatementsPipeline.ts` | Instanțiere plan conturi standard |
| `auto_map_import_from_chart` | import_id | `financialStatementsPipeline.ts` | Mapare automată conturi |
| `generate_financial_statements_from_import` | import_id | `financialStatementsPipeline.ts` | Generare BS/P&L/CF |
| `validate_balance_sheet_coverage` | import_id | `financialStatementsPipeline.ts` | Validare acoperire bilanț |

---

## 5. Edge Functions

| Function | Invocare | Fișier | Scop |
|----------|----------|--------|------|
| `parse-balanta` | `supabase.functions.invoke('parse-balanta', { body })` | `lib/importPipeline.ts` | Parsare server-side Excel |

**Fallback:** Dacă Edge Function eșuează, parsarea continuă client-side via `lib/excel-parser.ts`.

**Securitate Edge Function** (server-side, relevant pentru frontend):
- JWT validation
- Rate limiting (10 req/min)
- CORS whitelist origins
- Input sanitization Excel

---

## 6. Storage

| Bucket | Acces | Path pattern | Constantă |
|--------|-------|--------------|-----------|
| `balante` | Privat (RLS) | `{companyId}/{importId}/{filename}` | `lib/storage/constants.ts` |

**Operații frontend:**
- `supabase.storage.from('balante').upload(...)` — upload fișier
- `supabase.storage.from('balante').remove(...)` — ștergere la soft delete

**Constrângeri:** max 10MB, MIME Excel (`.xlsx`, `.xls`)

---

## 7. Pipeline date — flux complet

```
1. User selectează fișier Excel
       ↓
2. RPC prepare_balance_month_upload (verifică/replace lună existentă)
       ↓
3. INSERT trial_balance_imports (status: processing)
       ↓
4. Storage upload → bucket balante
       ↓
5. Edge Function parse-balanta (sau fallback client excel-parser.ts)
       ↓
6. INSERT trial_balance_accounts (batch)
       ↓
7. UPDATE trial_balance_imports (status: completed/error)
       ↓
8. RPC seed_standard_chart_of_accounts (dacă necesar)
       ↓
9. RPC auto_map_import_from_chart
       ↓
10. RPC generate_financial_statements_from_import
       ↓
11. INSERT financial_statements + balance_sheet_lines + income_statement_lines + cash_flow_lines
       ↓
12. emitBalancesChanged() → refresh UI cross-component
```

---

## 8. View-uri folosite

| View | De ce | Fallback |
|------|-------|----------|
| `trial_balance_imports_public` | Citire importuri fără erori interne | Tabelul `trial_balance_imports` |
| `active_trial_balance_imports` | Importuri non-soft-deleted | — |

Logica fallback în `importPipeline.ts`:
```typescript
// Dacă view-ul nu există, folosește tabelul direct
cachedImportsReadSource = TRIAL_BALANCE_IMPORTS_VIEW | TRIAL_BALANCE_IMPORTS_FALLBACK
```

---

## 9. RLS — impact frontend

Toate query-urile frontend respectă RLS automat (anon key + JWT user).

**Funcții helper server-side** (invocate indirect via policies):
- `get_user_id_from_auth()` — mapare auth → user intern
- `is_company_member(company_id)` — verificare apartenență
- `can_access_import(import_id)` — verificare acces import
- `has_role(role)` — verificare rol admin

**Implicație frontend:** Utilizatorul vede doar datele companiilor la care aparține. Admin-ul are acces extins via `AdminGuard` + query-uri directe.

---

## 10. ENUM-uri relevante pentru UI

| ENUM | Valori | Unde apare în UI |
|------|--------|------------------|
| `app_role` | `user`, `admin`, `super_admin` | Admin panel, guards |
| `import_status` | `draft`, `processing`, `validated`, `completed`, `error` | Listă importuri, badge-uri status |
| `balance_format` | `8_COLUMNS`, `10_COLUMNS` | Metadata import |
| Report status | `completed`, `unreconciled`, `generating`, `error` | Rapoarte financiare |

---

## 11. Event bus local (non-Supabase)

`lib/balanceEvents.ts` — mecanism pub/sub în memorie:

| Funcție | Scop |
|---------|------|
| `emitBalancesChanged()` | Notifică componentele că datele s-au schimbat |
| `subscribeBalancesChanged(callback)` | Abonare la schimbări |

**Utilizat în:** `useGeneratedFinancialStatements`, `useBalante`, `IncarcareBalanta`

**Nu înlocuiește** Supabase Realtime — este un pattern simplu client-side.

---

## 12. Mapare frontend ↔ schema DB (referință rapidă)

```
AuthContext          → auth.users (Supabase Auth API)
                   → users, user_roles

CompanyContext     → companies, company_users
                   → RPC create_company_with_member

useTrialBalances   → trial_balance_imports[_public]
                   → Storage balante
                   → Edge Function parse-balanta
                   → RPC prepare/soft_delete/retry/cleanup/totals

useBalante         → trial_balance_accounts
                   → RPC get_accounts_paginated, get_balances_with_accounts

useGeneratedFinancialStatements
                   → financial_statements, *_lines, reports
                   → RPC generate/seed/auto_map/validate

useKPIs            → calcul client din trial_balance_accounts
                   → (opțional) kpi_definitions, kpi_values
```

---

## 13. Fișiere cheie integrare

| Fișier | Rol |
|--------|-----|
| `integrations/supabase/client.ts` | Client singleton |
| `integrations/supabase/types.ts` | Tipuri DB |
| `lib/importPipeline.ts` | Orchestrare upload + parsare |
| `lib/excel-parser.ts` | Parsare client-side Excel |
| `lib/prepareBalanceMonthUpload.ts` | Wrapper RPC pregătire upload |
| `lib/financialStatementsPipeline.ts` | Pipeline generare situații |
| `lib/storage/constants.ts` | Constante bucket, helpers erori |
| `lib/balanceEvents.ts` | Event bus local |
| `hooks/useTrialBalances.tsx` | Hook principal upload |
| `hooks/useBalante.tsx` | Hook principal citire balanțe |
| `hooks/useGeneratedFinancialStatements.tsx` | Hook situații financiare |

---

*Pentru schema completă, migrări și funcții SQL server-side, consultați `planning/about database/`.*
