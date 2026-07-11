# Pagini și Funcționalități — FinGuard v2

> **Ultima actualizare:** 11 Iulie 2026

---

## 1. Inventar pagini (22 total)

### Marketing și autentificare (11)

| Fișier | Rută | Status | Descriere |
|--------|------|--------|-----------|
| `Index.tsx` | `/` | ✅ Complet | Landing: hero, features, pricing, FAQ, newsletter |
| `Login.tsx` | `/login` | ✅ Complet | Email/parolă + Google OAuth |
| `Signup.tsx` | `/signup` | ✅ Complet | Înregistrare + Google OAuth |
| `ForgotPassword.tsx` | `/forgot-password` | ✅ Complet | Reset parolă via Supabase |
| `About.tsx` | `/despre` | ✅ Complet | Pagină despre (marketing) |
| `Careers.tsx` | `/cariere` | ✅ Complet | Pagină cariere (marketing) |
| `Terms.tsx` | `/termeni` | ✅ Complet | Termeni și condiții |
| `Privacy.tsx` | `/confidentialitate` | ✅ Complet | Politică confidențialitate |
| `Blog.tsx` | `/blog` | ✅ Complet | Listă articole din `content/blogPosts.ts` |
| `BlogPost.tsx` | `/blog/:slug` | ✅ Complet | Articol individual (conținut static) |
| `newa_StyleGuide.tsx` | `/style-guide`, `/style-guide-v2` | ✅ Complet | Ghid design NEWA |

### Aplicație protejată (10)

| Fișier | Rută | Status | Descriere |
|--------|------|--------|-----------|
| `Dashboard.tsx` | `/app/dashboard` | ✅ Complet | KPI-uri, grafice evoluție, top conturi, selector lună |
| `IncarcareBalanta.tsx` | `/app/incarcare-balanta` | ✅ Complet | Upload Excel, listă importuri, preview, ștergere, retry |
| `RapoarteFinanciare.tsx` | `/app/rapoarte-financiare` | ✅ Complet | Bilanț, P&L, cash flow; AG Grid; export Excel/PDF |
| `AnalizeFinanciare.tsx` | `/app/analize-financiare` | ✅ Complet | Grafice structură (pie, bar, area) din date balanță |
| `IndicatoriCheie.tsx` | `/app/indicatori-cheie` | ✅ Complet | KPI financiari cu benchmark-uri |
| `AnalizeComparative.tsx` | `/app/analize-comparative` | ✅ Complet | Comparație 2 perioade (bilanț, P&L, variații %) |
| `AlteAnalize.tsx` | `/app/alte-analize` | ✅ Complet | Analiză consolidată cheltuieli |
| `PreviziuniBugetare.tsx` | `/app/previziuni-bugetare` | ⚠️ Parțial | Scenarii calculate client-side din date reale |
| `Settings.tsx` | `/app/settings` | ⚠️ Parțial | Profil, parolă, companie; plan abonament doar UI |
| `Admin.tsx` | `/admin` | ✅ Complet | Panou admin: utilizatori, companii, roluri |

### Altele (1)

| Fișier | Rută | Status | Descriere |
|--------|------|--------|-----------|
| `NotFound.tsx` | `*` | ✅ Complet | Pagină 404 |

---

## 2. Funcționalități cheie — status detaliat

### Încărcare balanță (`IncarcareBalanta`)

| Capabilitate | Status | Detalii |
|--------------|--------|---------|
| Upload drag-and-drop Excel | ✅ | `.xlsx`, `.xls`, max 10MB |
| Formate 8/10 coloane | ✅ | `lib/excel-parser.ts` |
| Edge Function `parse-balanta` | ✅ | Cu fallback client-side (`lib/importPipeline.ts`) |
| Storage bucket `balante` | ✅ | Path: `{companyId}/{importId}/{filename}` |
| Validare controale D/C | ✅ | Erori blocking afișate în UI |
| Agregare conturi duplicate | ✅ | `utils/balanceValidation.ts` |
| Preview înainte de confirmare | ✅ | `BalanceUploadPreview` |
| Listă importuri cu totaluri | ✅ | RPC `get_company_imports_with_totals` |
| Soft delete import | ✅ | RPC `soft_delete_import` |
| Retry import eșuat | ✅ | RPC `retry_failed_import` |
| Cleanup importuri stale | ✅ | RPC `cleanup_stale_imports` |
| Paginare conturi (50/pagină) | ✅ | RPC `get_accounts_paginated` |
| Persistență UI tab-switch | ✅ | `usePageUiState('incarcare-balanta')` |
| Error Boundary | ✅ | Wrapper la export default |
| Generare situații financiare post-import | ✅ | `financialStatementsPipeline.ts` |

### Rapoarte financiare (`RapoarteFinanciare`)

| Capabilitate | Status | Detalii |
|--------------|--------|---------|
| Bilanț din DB | ✅ | `useGeneratedFinancialStatements` |
| Cont profit/pierdere | ✅ | idem |
| Flux de trezorerie | ✅ | idem |
| AG Grid tree table | ✅ | `FinancialTreeTable` (lazy-loaded) |
| Export Excel (.xlsx) | ✅ | Biblioteca `xlsx`, 3 sheet-uri |
| Export PDF | ✅ | `html2canvas` + `jspdf` |
| Print | ✅ | `window.print()` |
| Regenerare situații | ✅ | RPC `generate_financial_statements_from_import` |
| Diagnostic acoperire bilanț | ✅ | `BalanceSheetDiagnosticDialog` + RPC `validate_balance_sheet_coverage` |
| Layout AG Grid persistent | ✅ | `localStorage` via `gridLayoutStorage.ts` |
| Status reconciliere | ✅ | `reportStatus: 'completed' | 'unreconciled' | ...` |

### Analize și KPI

| Capabilitate | Status | Detalii |
|--------------|--------|---------|
| 9+ indicatori financiari | ✅ | `useKPIs`, `useOfficialFinancialCalculations` |
| Benchmark-uri referință | ✅ | `IndicatoriCheie.tsx` |
| Trend față de perioada anterioară | ✅ | calculat în hooks |
| Grafice Recharts | ✅ | Dashboard, Analize, Previziuni |
| Selector lună balanță | ✅ | `BalanceMonthPicker`, `useBalanceMonthSelection` |
| Comparație 2 perioade | ✅ | `AnalizeComparative` cu date reale din DB |
| Analiză cheltuieli consolidate | ✅ | `AlteAnalize` |

### Admin (`Admin`)

| Capabilitate | Status | Detalii |
|--------------|--------|---------|
| Listă utilizatori | ✅ | query direct `users` + `user_roles` |
| Listă companii | ✅ | query `companies` |
| Schimbare roluri | ✅ | update `user_roles` |
| Statistici platformă | ✅ | agregări client-side |
| Acces restricționat | ✅ | `AdminGuard` (admin/super_admin) |

---

## 3. Funcționalități incomplete sau mock

| Funcționalitate | Status | Detalii |
|-----------------|--------|---------|
| Notificări reale | ❌ Mock | `NotificationsPopover` folosește `mockNotifications` hardcodate |
| Search global header | ❌ Neimplementat | Bara de căutare nu are logică |
| Onboarding tutorial | ❌ Neimplementat | — |
| AI Analysis | ❌ Neimplementat | Menționat în sidebar tagline, fără cod |
| Plan abonament (Settings) | ⚠️ UI only | Fără integrare billing |
| Previziuni bugetare | ⚠️ Parțial | Date istorice reale, proiecții calculate client-side (nu persistate) |
| Supabase Realtime | ❌ Neutilizat | Refresh via event bus local (`balanceEvents`) |
| React Query hooks | ❌ Neutilizat | Configurat dar fără `useQuery`/`useMutation` |

---

## 4. Hook-uri custom (17 fișiere)

| Hook | Fișier | Scop |
|------|--------|------|
| `useAuth` | `contexts/AuthContext.tsx` | Sesiune și metode auth |
| `useCompanyContext` | `contexts/CompanyContext.tsx` | Companie activă, CRUD companii |
| `useCompany` | `hooks/useCompany.tsx` | Variantă alternativă (legacy) |
| `useBalante` | `hooks/useBalante.tsx` | CRUD balanțe, RPC paginare |
| `useTrialBalances` | `hooks/useTrialBalances.tsx` | Upload, listă importuri, retry, delete |
| `useBalanceUploadForm` | `hooks/useBalanceUploadForm.ts` | Logică formular upload |
| `useBalanceMonthSelection` | `hooks/useBalanceMonthSelection.ts` | Selector lună partajat |
| `useGeneratedFinancialStatements` | `hooks/useGeneratedFinancialStatements.tsx` | Citire/generare situații financiare |
| `useFinancialCalculations` | `hooks/useFinancialCalculations.tsx` | Calcule financiare din balanțe |
| `useOfficialFinancialCalculations` | `hooks/useOfficialFinancialCalculations.ts` | Calcule din situații oficiale DB |
| `useKPIs` | `hooks/useKPIs.tsx` | Indicatori cheie |
| `useBalanceSheetDiagnostic` | `hooks/useBalanceSheetDiagnostic.ts` | Diagnostic acoperire bilanț |
| `useStatementLineDefinitions` | `hooks/useStatementLineDefinitions.ts` | Definiții linii raportare |
| `useUserRole` | `hooks/useUserRole.tsx` | Roluri RBAC |
| `usePageUiState` | `hooks/usePageUiState.ts` | Persistență UI sessionStorage |
| `useMobile` | `hooks/use-mobile.tsx` | Detectare dispozitive mobile |
| `useToast` | `hooks/use-toast.ts` | Notificări shadcn |

---

## 5. Componente specializate

### AG Grid (`components/ag-grid/`)

| Componentă | Rol |
|------------|-----|
| `BaseAgGridTreeTable.tsx` | Tabel arbore generic |
| `GridColumnChooser.tsx` | Selector coloane |
| `gridLayoutStorage.ts` | Persistență layout în localStorage |
| `agGridFormatters.ts` | Formatare valori financiare |

Theme: `ag-theme-quartz`

### Upload (`components/upload/`)

| Componentă | Rol |
|------------|-----|
| `BalanceUploadPreview.tsx` | Preview date parsate |
| `ValidationResultsDialog.tsx` | Dialog erori validare |
| `ImportProgressIndicator.tsx` | Progres procesare |

### Financial (`components/financial/`, `components/financial-reports/`)

| Componentă | Rol |
|------------|-----|
| `FinancialTreeReportTable.tsx` | Tabel arbore raport |
| `FinancialTreeTable.tsx` | Wrapper lazy-loaded pentru AG Grid |
| `BalanceSheetDiagnosticDialog.tsx` | Diagnostic mapping bilanț |
| `financialTreeColumns.ts` | Definiții coloane |

---

## 6. Sidebar — meniu principal

Definit în `src/components/AppSidebar.tsx`:

| Titlu | URL | Icon | Badge |
|-------|-----|------|-------|
| Dashboard | `/app/dashboard` | LayoutDashboard | — |
| Încărcare balanță | `/app/incarcare-balanta` | Upload | Număr balanțe |
| Rapoarte financiare | `/app/rapoarte-financiare` | FileText | — |
| Analize financiare | `/app/analize-financiare` | TrendingUp | — |
| Indicatori cheie | `/app/indicatori-cheie` | Target | — |
| Analize comparative | `/app/analize-comparative` | GitCompare | — |
| Analiza consolidată | `/app/alte-analize` | BarChart3 | — |
| Previziuni bugetare | `/app/previziuni-bugetare` | Calendar | — |

**Footer sidebar:** `NotificationsPopover` (mock), `UserMenuPopover` (Settings, Logout, Admin link dacă `isAdmin`).

---

## 7. Flux utilizator principal

```
Landing (/) → Signup/Login → AuthGuard → CompanyGuard (creare/selectare companie)
    → Dashboard → Upload balanță → Parsare (Edge Function + fallback client)
    → Generare situații financiare (RPC pipeline)
    → Rapoarte / Analize / KPI / Comparații
```

---

## 8. Dependențe între pagini și date

| Pagină | Depinde de | Sursă date |
|--------|------------|------------|
| Dashboard | Import completat | `useBalante`, `useKPIs` |
| Încărcare balanță | Companie activă | `useTrialBalances`, Storage, Edge Function |
| Rapoarte financiare | Situații generate | `useGeneratedFinancialStatements` |
| Analize financiare | Conturi balanță | `useBalante`, `useFinancialCalculations` |
| Indicatori cheie | Conturi balanță | `useKPIs`, `useOfficialFinancialCalculations` |
| Analize comparative | ≥2 balanțe | `useBalante`, `useFinancialCalculations` |
| Alte analize | Conturi balanță | `useBalante` |
| Previziuni bugetare | ≥1 balanță | `useBalante` (proiecții locale) |
| Settings | User + companie | `AuthContext`, `CompanyContext` |
| Admin | Rol admin | query direct Supabase |

---

*Sincronizat cu `src/pages/` și `src/hooks/` la 11 Iulie 2026.*
