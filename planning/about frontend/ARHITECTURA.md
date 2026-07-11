# Arhitectura Frontend — FinGuard v2

> **Ultima actualizare:** 11 Iulie 2026

---

## 1. Stack tehnologic

| Categorie | Tehnologie | Versiune | Fișier configurare |
|-----------|------------|----------|-------------------|
| Framework | React | 18.3.x | `package.json` |
| Build | Vite + `@vitejs/plugin-react-swc` | 5.4.x | `vite.config.ts` |
| Limbaj | TypeScript | 5.8.x | `tsconfig.json` |
| Routing | React Router DOM | 6.30.x | `src/App.tsx` |
| Styling | Tailwind CSS | 3.4.x | `tailwind.config.ts`, `src/index.css` |
| UI Components | shadcn/ui (Radix UI) | — | `components.json` |
| Grid | AG Grid Community | 36.x | `src/components/ag-grid/` |
| Charts | Recharts | 2.15.x | pagini analize/dashboard |
| Forms | react-hook-form + Zod | 7.x / 3.x | formulare upload, auth |
| Date | date-fns (locale `ro`) | 3.6.x | formatare perioade |
| Toast | sonner + shadcn toaster | — | `App.tsx` |
| Export | xlsx, jspdf, html2canvas | — | `RapoarteFinanciare.tsx` |
| Backend client | `@supabase/supabase-js` | 2.90.x | `src/integrations/supabase/` |
| State (configurat) | TanStack React Query | 5.83.x | `App.tsx` |
| Teste | Vitest | 3.2.x | `vite.config.ts` |
| Dev tooling | lovable-tagger | — | plugin Vite (doar development) |

**Port development:** `8080` (`vite.config.ts`)

**Alias import:** `@/` → `src/`

---

## 2. Structura proiectului `src/`

```
src/
├── main.tsx                    # Entry point + diagnostic tab-switch
├── App.tsx                     # Router, providers, rute
├── index.css                   # Tokeni NEWA + variabile CSS shadcn
│
├── pages/                      # 22 componente pagină
├── layouts/
│   ├── AppLayout.tsx           # Shell aplicație (sidebar, header, outlet)
│   └── AdminLayout.tsx         # Shell admin
│
├── components/
│   ├── ui/                     # ~50 componente shadcn
│   ├── auth/                   # AuthGuard, AdminGuard, CompanyGuard
│   ├── app/                    # PageHeader, KPICard, ChartCard, BalanceMonthPicker, CompanySwitcher
│   ├── ag-grid/                # BaseAgGridTreeTable, formatters, layout persistence
│   ├── financial/              # FinancialTreeReportTable, columns, mapper
│   ├── financial-reports/      # FinancialTreeTable, BalanceSheetDiagnosticDialog
│   ├── upload/                 # BalanceUploadPreview, ValidationResultsDialog
│   ├── marketing/              # PageShell
│   └── [secțiuni marketing]    # HeroSection, Footer, Navigation, etc.
│
├── contexts/
│   ├── AuthContext.tsx         # Sesiune Supabase Auth
│   └── CompanyContext.tsx      # Multi-tenant companii
│
├── hooks/                      # 17 fișiere (vezi PAGINI_SI_FEATURES.md)
├── lib/                        # Logică business (excel, import, balance period)
├── utils/                      # Arbore financiar, validare, reconciliere
├── types/                      # financialTree.ts
├── integrations/supabase/
│   ├── client.ts               # Client Supabase tipizat
│   └── types.ts                # Tipuri DB generate (~1700+ linii)
└── content/
    └── blogPosts.ts            # Conținut static blog
```

---

## 3. Routing

Configurație centrală în `src/App.tsx`.

### Rute publice

| Path | Componentă | Layout |
|------|------------|--------|
| `/` | `Index` | Marketing standalone |
| `/login` | `Login` | — |
| `/signup` | `Signup` | — |
| `/forgot-password` | `ForgotPassword` | — |
| `/style-guide`, `/style-guide-v2` | `newa_StyleGuide` | — |
| `/despre` | `About` | `PageShell` |
| `/cariere` | `Careers` | `PageShell` |
| `/termeni` | `Terms` | `PageShell` |
| `/confidentialitate` | `Privacy` | `PageShell` |
| `/blog` | `Blog` | `PageShell` |
| `/blog/:slug` | `BlogPost` | `PageShell` |
| `*` | `NotFound` | — |

### Rute protejate `/app/*`

**Guards (în ordine):** `AuthGuard` → `CompanyGuard` → `AppLayout`

| Path | Componentă |
|------|------------|
| `/app` | Redirect → `/app/dashboard` |
| `/app/dashboard` | `Dashboard` |
| `/app/incarcare-balanta` | `IncarcareBalanta` |
| `/app/rapoarte-financiare` | `RapoarteFinanciare` |
| `/app/analize-financiare` | `AnalizeFinanciare` |
| `/app/indicatori-cheie` | `IndicatoriCheie` |
| `/app/analize-comparative` | `AnalizeComparative` |
| `/app/alte-analize` | `AlteAnalize` |
| `/app/previziuni-bugetare` | `PreviziuniBugetare` |
| `/app/settings` | `Settings` |

**Notă:** `/app/settings` nu apare în sidebar — accesibil din `UserMenuPopover`.

### Rute admin `/admin/*`

**Guards:** `AuthGuard` → `AdminGuard` → `AdminLayout`

| Path | Componentă |
|------|------------|
| `/admin` | `Admin` |

---

## 4. Autentificare și autorizare

### Provider: Supabase Auth

| Aspect | Implementare |
|--------|--------------|
| Context | `src/contexts/AuthContext.tsx` |
| Flow | PKCE (`flowType: 'pkce'`) |
| Persistență sesiune | `localStorage` (managed de Supabase client) |
| Auto-refresh token | `autoRefreshToken: true` |
| Metode | `signUp`, `signIn` (email/parolă), `signInWithProvider` (Google OAuth), `signOut`, `resetPassword` |
| Redirect post-auth | `/app/dashboard` |

### Route Guards

| Guard | Fișier | Comportament |
|-------|--------|--------------|
| `AuthGuard` | `components/auth/AuthGuard.tsx` | Redirect `/login` dacă fără user; loading **doar** când `loading && !user` |
| `CompanyGuard` | `components/auth/CompanyGuard.tsx` | Onboarding companie; loading **doar** când `loading && companies.length === 0 && !activeCompany` |
| `AdminGuard` | `components/auth/AdminGuard.tsx` | Verifică rol `admin` sau `super_admin` |

**Fix tab-switch în guards:** Guards nu demontează arborele React la refresh token în background — afișează loading screen doar la prima încărcare, nu la revalidare.

### Roluri (RBAC)

| Rol | Sursă | Flag hook |
|-----|-------|-----------|
| `user` | `user_roles.role` (ENUM `app_role`) | `isUser` |
| `admin` | idem | `isAdmin` |
| `super_admin` | idem | `isSuperAdmin` |

**Hook:** `hooks/useUserRole.tsx`  
**Mapare:** `auth.users.id` → `users.auth_user_id` → `user_roles.user_id`

### Multi-tenant companii

| Aspect | Implementare |
|--------|--------------|
| Context | `contexts/CompanyContext.tsx` |
| Tabele | `users`, `companies`, `company_users` |
| Persistență companie activă | `localStorage` key `finguard_last_company_id` |
| Creare companie | RPC `create_company_with_member` |
| UI switcher | `components/app/CompanySwitcher.tsx` |

---

## 5. State management

### React Query

Configurat în `App.tsx`, dar **neutilizat activ** — zero apeluri `useQuery` sau `useMutation` în `src/`.

```typescript
// Configurație actuală (App.tsx)
refetchOnWindowFocus: false
refetchOnReconnect: false
staleTime: 2 * 60 * 1000    // 2 minute
gcTime: 5 * 60 * 1000       // 5 minute
retry: 1
placeholderData: (prev) => prev
```

Datele se încarcă prin hook-uri custom cu `useState`/`useEffect` + apeluri directe Supabase.

### Context providers (ordine în `App.tsx`)

1. `QueryClientProvider`
2. `AuthProvider`
3. `CompanyProvider`
4. `TooltipProvider`

### Persistență locală

| Mecanism | Cheie / Pattern | Fișier |
|----------|-----------------|--------|
| `sessionStorage` | `ui_state:<routeKey>:<companyId>:<userId>` | `hooks/usePageUiState.ts` |
| `sessionStorage` | `__debug_*` (diagnostic tab-switch) | `main.tsx` |
| `localStorage` | `finguard_last_company_id` | `CompanyContext.tsx` |
| `localStorage` | `cookieConsent` | marketing |
| `localStorage` | `finguard.financialTreeReport.<type>.layout.v1` | `ag-grid/gridLayoutStorage.ts` |
| `localStorage` | sesiune Supabase Auth | managed de client |

### Event bus local

`lib/balanceEvents.ts` — `emitBalancesChanged` / `subscribeBalancesChanged` pentru refresh cross-component (nu Supabase Realtime).

### Persistență UI per pagină

`usePageUiState` — salvare automată în `sessionStorage` cu debounce 300ms, restaurare la mount, salvare la `visibilitychange:hidden`.

**Pagini care folosesc hook-ul:** doar `IncarcareBalanta` (routeKey `'incarcare-balanta'`).

---

## 6. Design system

### shadcn/ui

- Config: `components.json` (style `default`, baseColor `slate`, CSS variables)
- ~50 componente în `src/components/ui/`
- Utility `cn()` în `src/lib/utils.ts` (clsx + tailwind-merge)

### NEWA Design System

| Element | Locație |
|---------|---------|
| Tokeni CSS | `src/index.css` |
| Integrare Tailwind | `tailwind.config.ts` (culori `newa.*`, `surface.*`) |
| Fonturi | Inter, Playfair Display, JetBrains Mono |
| Chart colors | `src/lib/newa-chart-colors.ts` |
| Style guide live | `pages/newa_StyleGuide.tsx` (~2300 linii) |

### Theming

- CSS variables shadcn (`--primary`, `--background`, etc.) mapate pe tokeni NEWA
- `darkMode: ["class"]` în Tailwind — configurat, fără toggle global în `App`
- `next-themes` folosit doar în `components/ui/sonner.tsx`

### Componente app reutilizabile

`PageHeader`, `StatCard`, `KPICard`, `ChartCard`, `BalanceMonthPicker`, `CompanySwitcher`

---

## 7. Pattern-uri UI

| Pattern | Implementare | Unde |
|---------|--------------|------|
| Error Boundary | `ErrorBoundary` + HOC `withErrorBoundary` | `IncarcareBalanta` (wrapper export default) |
| Loading states | `Loader2`, `Skeleton` | guards, pagini |
| Stale-while-revalidate | Guards + CompanyContext | tab-switch fix |
| Toast | `sonner` + shadcn `useToast` | acțiuni utilizator |
| Lazy loading | `React.lazy` + `Suspense` | `FinancialTreeTable` în `RapoarteFinanciare` |
| Empty states | CTA către `/app/incarcare-balanta` | pagini fără date |
| Locale RO | `date-fns/locale/ro`, `Intl.NumberFormat('ro-RO')` | global |
| Print/Export | `window.print()`, xlsx, jspdf | `RapoarteFinanciare` |

---

## 8. Teste

**11 fișiere test** Vitest (environment `node`, fără teste componente React sau E2E):

| Fișier | Domeniu |
|--------|---------|
| `lib/excel-parser.test.ts` | Parsare Excel balanță |
| `lib/balanceMonthSelection.test.ts` | Selecție lună |
| `lib/balancePeriod.test.ts` | Perioadă fiscală |
| `lib/prepareBalanceMonthUpload.test.ts` | Pregătire upload |
| `lib/balanceUploadErrors.test.ts` | Erori upload |
| `lib/balanceReplaceUploadFlow.test.ts` | Flow înlocuire balanță |
| `hooks/useBalanceUploadForm.test.ts` | Form upload |
| `utils/buildFinancialTree.test.ts` | Arbore financiar |
| `utils/resolveCalculatedTotal.test.ts` | Totaluri calculate |
| `utils/financialReportReconciliation.test.ts` | Reconciliere rapoarte |
| `utils/balanceSheetDiagnostic.test.ts` | Diagnostic bilanț |

---

## 9. Diagnostic activ (tab-switch)

Cod de diagnostic **încă activ** în producție/dev:

| Fișier | Flag / cod | Efect |
|--------|------------|-------|
| `main.tsx` | `DEBUG_TAB_SWITCH = true` | Logging colorat consolă, event listeners |
| `App.tsx` | `appMountCounter` | Log `[APP] App MOUNTED/UNMOUNTED` |

Vezi [DEBUG_TAB_SWITCH.md](./DEBUG_TAB_SWITCH.md) pentru interpretare și mitigări.

---

## 10. Fișiere cheie

| Scop | Path |
|------|------|
| Dependencies | `package.json` |
| Entry + debug | `src/main.tsx` |
| Router + providers | `src/App.tsx` |
| Supabase client | `src/integrations/supabase/client.ts` |
| DB types | `src/integrations/supabase/types.ts` |
| Auth | `src/contexts/AuthContext.tsx` |
| Companii | `src/contexts/CompanyContext.tsx` |
| App shell | `src/layouts/AppLayout.tsx` |
| Sidebar nav | `src/components/AppSidebar.tsx` |
| Import pipeline | `src/lib/importPipeline.ts` |
| Financial statements | `src/lib/financialStatementsPipeline.ts` |
| Design tokens | `src/index.css` |
