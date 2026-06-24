# FinGuard - Technical Overview & Developer Documentation

## 📋 Cuprins

1. [Prezentare Generală](#prezentare-generală)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Arhitectura Sistemului](#arhitectura-sistemului)
5. [Fluxul de Date Principal](#fluxul-de-date-principal)
6. [Design System](#design-system)
7. [Structura Proiectului](#structura-proiectului)

---

## Prezentare Generală

**FinGuard** este o platformă SaaS pentru analiză financiară și raportare destinată antreprenorilor români, contabililor și analiștilor financiari. Aplicația oferă funcționalități de încărcare balanțe contabile, analize financiare, indicatori cheie și previziuni bugetare.

### Tech Stack Summary

| Layer | Tehnologie | Versiune |
|-------|------------|----------|
| **Framework** | React | 18.3.x |
| **Build Tool** | Vite | 5.4.x |
| **Language** | TypeScript | 5.8.x |
| **Styling** | Tailwind CSS | 3.4.x |
| **UI Components** | shadcn/ui | Latest |
| **Routing** | React Router DOM | 6.30.x |
| **State Management** | TanStack React Query | 5.83.x |
| **Charts** | Recharts | 2.15.x |
| **Forms** | React Hook Form + Zod | 7.x + 3.x |
| **Animations** | tailwindcss-animate | 1.x |
| **Backend** | Supabase | 2.90.x |
| **Auth** | Supabase Auth | Integrat |

<!-- UPDATED: Adăugat Supabase și Auth în tabelul principal - Ianuarie 2026 -->

---

## Frontend Architecture

### 🏗️ Core Technologies

#### React 18.3 + Vite
- **SWC Plugin**: Utilizăm `@vitejs/plugin-react-swc` pentru compilare rapidă
- **Hot Module Replacement**: Actualizări instant în development
- **Path Aliases**: `@/` mapează la `./src/` pentru importuri curate

```typescript
// vite.config.ts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}
```

#### TypeScript Strict Mode
- Type-safe development
- Props typing pentru componente
- Validare la compile-time

### 📦 State Management

#### TanStack React Query
Gestionare server state și caching:

```typescript
const queryClient = new QueryClient();

// Usage pattern
const { data, isLoading, error } = useQuery({
  queryKey: ['financial-data', period],
  queryFn: () => fetchFinancialData(period),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

#### Context API pentru Global State
<!-- UPDATED: Secțiune extinsă cu noile contexte - Ianuarie 2026 -->

Aplicația folosește Context API pentru state global partajat:

| Context | Scop | Hook |
|---------|------|------|
| `AuthContext` | Autentificare și sesiune utilizator | `useAuth()` |
| `CompanyContext` | Compania curentă selectată | `useCompany()` |

```typescript
// Exemplu folosire AuthContext
const { user, session, signIn, signOut, loading } = useAuth();

// Exemplu folosire CompanyContext
const { currentCompany, setCurrentCompany, companies } = useCompany();
```

#### Local State
- `useState` pentru UI state local
- `useReducer` pentru state complex
- ~~Context API pentru shared state (e.g., theme, user preferences)~~ <!-- DEPRECATED: Înlocuit cu contexte dedicate - vezi mai sus -->

### 🪝 Custom Hooks
<!-- NEW: Secțiune adăugată - Ianuarie 2026 -->

| Hook | Scop | Fișier |
|------|------|--------|
| `useAuth` | Autentificare Supabase | `contexts/AuthContext.tsx` |
| `useCompany` | Gestiune companie curentă | `hooks/useCompany.tsx` |
| `useBalante` | Operațiuni CRUD balanțe | `hooks/useBalante.tsx` |
| `useTrialBalances` | Încărcare și procesare balanțe | `hooks/useTrialBalances.tsx` |
| `useKPIs` | Calcul indicatori cheie | `hooks/useKPIs.tsx` |
| `useFinancialCalculations` | Calcule financiare complexe | `hooks/useFinancialCalculations.tsx` |
| `useUserRole` | Verificare roluri utilizator | `hooks/useUserRole.tsx` |
| `useMobile` | Detectare dispozitive mobile | `hooks/use-mobile.tsx` |
| `useToast` | Notificări toast | `hooks/use-toast.ts` |

### 🧭 Routing Architecture

#### React Router v6
Structură ierarhică cu nested routes și route guards:

<!-- UPDATED: Structură actualizată cu noile rute și guards - Ianuarie 2026 -->

```
/                           → Landing Page (Index)
/login                      → Pagina de autentificare
/signup                     → Pagina de înregistrare
/forgot-password            → Recuperare parolă
/app                        → Protected App Layout (AuthGuard + CompanyGuard)
  /app/dashboard            → Dashboard principal
  /app/incarcare-balanta    → Upload balanță contabilă
  /app/analize-financiare   → Analize financiare
  /app/indicatori-cheie     → KPI Dashboard
  /app/analize-comparative  → Comparații perioade
  /app/previziuni-bugetare  → Forecast & Planning
  /app/rapoarte-financiare  → Generare rapoarte
  /app/alte-analize         → Analize adiționale
  /app/settings             → Setări utilizator/companie
/admin                      → Admin Layout (AuthGuard + AdminGuard)
  /admin                    → Panou administrare
```

#### Route Guards Pattern
<!-- UPDATED: Pattern actualizat cu guards multiple - Ianuarie 2026 -->

```typescript
// Protecție cu multiple guards (Auth + Company)
<Route path="/app" element={
  <AuthGuard>
    <CompanyGuard>
      <AppLayout />
    </CompanyGuard>
  </AuthGuard>
}>
  <Route path="dashboard" element={<Dashboard />} />
  {/* ... alte rute protejate */}
</Route>

// Protecție admin (Auth + Admin Role)
<Route path="/admin" element={
  <AuthGuard>
    <AdminGuard>
      <AdminLayout />
    </AdminGuard>
  </AuthGuard>
}>
  <Route index element={<Admin />} />
</Route>
```

### 🎨 UI Component Library

#### shadcn/ui Components
Componente Radix UI pre-configurate cu Tailwind:

| Component | Package | Usage |
|-----------|---------|-------|
| Dialog | @radix-ui/react-dialog | Modals, confirmări |
| Dropdown | @radix-ui/react-dropdown-menu | Meniuri contextuale |
| Tabs | @radix-ui/react-tabs | Navigare tab-based |
| Toast | sonner | Notificări |
| Select | @radix-ui/react-select | Dropdowns |
| Accordion | @radix-ui/react-accordion | FAQ, colapsabile |

### 📊 Data Visualization

#### Recharts
- **AreaChart**: Evoluție în timp
- **BarChart**: Comparații categorii
- **PieChart**: Distribuții procentuale
- **LineChart**: Trenduri

#### Utilitare Export
- **jspdf**: Generare PDF rapoarte
- **html2canvas**: Screenshot pentru export
- **xlsx**: Import/Export Excel

---

## Backend Architecture

### 🔮 Current State
<!-- UPDATED: Actualizat de la "frontend-only" la "fully integrated" - Ianuarie 2026 -->

~~Aplicația este în prezent **frontend-only** cu date mock pentru demonstrație.~~

Aplicația are backend **complet funcțional** bazat pe **Supabase** cu:
- ✅ Autentificare (email/password, OAuth providers)
- ✅ Bază de date PostgreSQL cu RLS
- ✅ Storage pentru fișiere (balanțe Excel)
- ✅ Edge Functions pentru procesare
- ✅ Tipuri TypeScript generate automat

### 🚀 ~~Recommended~~ Implemented Backend (Supabase)
<!-- UPDATED: Secțiune actualizată - schema este implementată, nu recomandată - Ianuarie 2026 -->

#### Database Schema (PostgreSQL) - IMPLEMENTAT

<!-- DEPRECATED: Schema veche - înlocuită cu schema actuală -->
<details>
<summary>~~Schema recomandată (depreciat)~~</summary>

```sql
-- DEPRECATED: Aceasta era schema recomandată inițial
-- Înlocuită cu schema actuală de mai jos

-- ~~Users & Authentication~~
~~CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  company_name TEXT,
  cui TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);~~

-- ~~Balance Sheets~~
~~CREATE TABLE balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  period DATE NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  file_name TEXT,
  status TEXT DEFAULT 'processing'
);~~

-- ~~Account Lines~~
~~CREATE TABLE account_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_id UUID REFERENCES balances(id),
  account_code TEXT NOT NULL,
  account_name TEXT,
  debit_initial DECIMAL(15,2),
  credit_initial DECIMAL(15,2),
  debit_current DECIMAL(15,2),
  credit_current DECIMAL(15,2),
  debit_final DECIMAL(15,2),
  credit_final DECIMAL(15,2)
);~~

-- ~~Analysis Results~~
~~CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_id UUID REFERENCES balances(id),
  type TEXT NOT NULL, -- 'liquidity', 'profitability', 'solvency'
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);~~
```

</details>

#### Schema Actuală (Implementată)
<!-- NEW: Schema actuală din producție - Ianuarie 2026 -->

```sql
-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

-- Utilizatori aplicație (sincronizat cu auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE, -- Referință la auth.users
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roluri utilizatori (RBAC)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  role app_role NOT NULL, -- ENUM: 'user', 'admin', 'super_admin'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENUM pentru roluri
CREATE TYPE app_role AS ENUM ('user', 'admin', 'super_admin');

-- =====================================================
-- COMPANIES & MULTI-TENANCY
-- =====================================================

-- Companii
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cui TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  country_code TEXT DEFAULT 'RO',
  currency TEXT DEFAULT 'RON',
  fiscal_year_start_month INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relație many-to-many: utilizatori <-> companii
CREATE TABLE company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- =====================================================
-- TRIAL BALANCE DATA
-- =====================================================

-- Status import
CREATE TYPE import_status AS ENUM (
  'draft', 'processing', 'validated', 'completed', 'error'
);

-- Importuri balanțe de verificare
CREATE TABLE trial_balance_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  uploaded_by UUID REFERENCES users(id),
  source_file_name TEXT NOT NULL,
  source_file_url TEXT,
  file_size_bytes INT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status import_status DEFAULT 'draft',
  error_message TEXT,
  validation_errors JSONB,
  processed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ, -- Soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conturi din balanță
CREATE TABLE trial_balance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID REFERENCES trial_balance_imports(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  opening_debit DECIMAL(15,2) DEFAULT 0,
  opening_credit DECIMAL(15,2) DEFAULT 0,
  debit_turnover DECIMAL(15,2) DEFAULT 0,
  credit_turnover DECIMAL(15,2) DEFAULT 0,
  closing_debit DECIMAL(15,2) DEFAULT 0,
  closing_credit DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View pentru importuri active (exclude soft-deleted)
CREATE VIEW active_trial_balance_imports AS
SELECT 
  tbi.*,
  COUNT(tba.id) as accounts_count
FROM trial_balance_imports tbi
LEFT JOIN trial_balance_accounts tba ON tba.import_id = tbi.id
WHERE tbi.deleted_at IS NULL
GROUP BY tbi.id;
```

#### Stored Functions (PostgreSQL)
<!-- NEW: Funcții implementate - Ianuarie 2026 -->

| Function | Scop | Returnează |
|----------|------|------------|
| `get_user_id_from_auth()` | Obține ID user din auth | UUID |
| `has_role(_role, _user_id)` | Verifică rol utilizator | boolean |
| `is_company_member(_company_id, _user_id)` | Verifică membru companie | boolean |
| `can_access_import(_import_id, _user_id)` | Verifică acces import | boolean |
| `create_company_with_member(...)` | Creează companie + membru | UUID |
| `soft_delete_import(_import_id)` | Soft delete import | boolean |
| `get_import_totals(_import_id)` | Totaluri import | JSON |
| `get_company_imports_with_totals(...)` | Lista importuri + totaluri | JSON |
| `get_accounts_paginated(...)` | Conturi paginat | JSON |
| `get_balances_with_accounts(...)` | Balanțe cu conturi | JSON |

#### Edge Functions

<!-- UPDATED: Status actualizat pentru fiecare funcție - Ianuarie 2026 -->

| Function | Purpose | Status |
|----------|---------|--------|
| `parse-balanta` | Procesare fișier Excel upload | ✅ Implementat |
| ~~`calculate-kpis`~~ | ~~Calcul indicatori financiari~~ | ❌ Planificat |
| ~~`generate-report`~~ | ~~Generare PDF raport~~ | ❌ Planificat |
| ~~`ai-analysis`~~ | ~~Analiză AI a datelor financiare~~ | ❌ Planificat |

#### Edge Function: parse-balanta (Implementat)
<!-- NEW: Detalii implementare - Ianuarie 2026 -->

```typescript
// supabase/functions/parse-balanta/index.ts
// Funcționalități:
// - Validare autentificare JWT
// - Rate limiting (10 req/min per user)
// - CORS cu whitelist origins
// - Parsare Excel cu XLSX
// - Sanitizare input (prevenire injection)
// - Validare cod cont (3-6 cifre)
// - Inserare batch în DB
// - Update status import (completed/error)
```

#### Row Level Security (RLS)

```sql
-- Fiecare user vede doar datele companiilor la care are acces
ALTER TABLE trial_balance_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_balance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

-- Exemplu policy pentru importuri
CREATE POLICY "Users can view imports from their companies" 
ON trial_balance_imports FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM company_users 
    WHERE user_id = get_user_id_from_auth()
  )
);

-- Policy pentru conturi (accesibil dacă are acces la import)
CREATE POLICY "Users can view accounts from accessible imports"
ON trial_balance_accounts FOR SELECT
USING (
  can_access_import(import_id, get_user_id_from_auth())
);
```

---

## Arhitectura Sistemului

### 🏛️ High-Level Architecture

<!-- UPDATED: Diagramă actualizată cu structura reală - Ianuarie 2026 -->

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   React      │  │   Tailwind   │  │   React Query        │  │
│  │   Components │  │   CSS        │  │   (Cache & Sync)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     Contexts                             │   │
│  │    AuthContext  │  CompanyContext                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 React Router v6                          │   │
│  │  Landing │ Auth Pages │ App (Protected) │ Admin (RBAC)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Route Guards                           │   │
│  │    AuthGuard  │  CompanyGuard  │  AdminGuard             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼ HTTPS (Supabase JS Client)
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE (Backend)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Auth       │  │   Database   │  │   Storage            │  │
│  │  (Supabase   │  │  (PostgreSQL │  │   (S3-compatible)    │  │
│  │   Auth)      │  │   + RLS)     │  │   bucket: balante    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Edge Functions                        │   │
│  │   parse-balanta (✅)  │  calculate-kpis (planned)        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Database Functions (RPC)                   │   │
│  │   get_import_totals │ is_company_member │ has_role       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 📁 Component Architecture

<!-- UPDATED: Structură actualizată cu toate folderele - Ianuarie 2026 -->

```
src/
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── sidebar.tsx
│   │   └── ... (50+ componente)
│   │
│   ├── app/                   # Componente specifice aplicației (NEW)
│   │   ├── ChartCard.tsx      # Card pentru grafice
│   │   ├── CompanySwitcher.tsx # Selector companie
│   │   ├── KPICard.tsx        # Card indicatori
│   │   ├── PageHeader.tsx     # Header pagini
│   │   └── StatCard.tsx       # Card statistici
│   │
│   ├── auth/                  # Componente autentificare (NEW)
│   │   ├── AuthGuard.tsx      # Protecție rute autentificate
│   │   ├── AdminGuard.tsx     # Protecție rute admin
│   │   └── CompanyGuard.tsx   # Verificare companie selectată
│   │
│   ├── Navigation.tsx         # Header navigation
│   ├── AppSidebar.tsx         # Dashboard sidebar
│   ├── HeroSection.tsx        # Landing hero
│   ├── FeaturesSection.tsx    # Features grid
│   ├── PricingSection.tsx     # Pricing cards
│   ├── NotificationsPopover.tsx # Popover notificări (NEW)
│   ├── UserMenuPopover.tsx    # Meniu utilizator (NEW)
│   └── ...
│
├── contexts/                  # React Context providers (NEW)
│   ├── AuthContext.tsx        # Autentificare Supabase
│   └── CompanyContext.tsx     # Gestiune companie curentă
│
├── integrations/              # Integrări externe (NEW)
│   └── supabase/
│       ├── client.ts          # Supabase client config
│       └── types.ts           # TypeScript types generate
│
├── layouts/
│   ├── AppLayout.tsx          # Dashboard wrapper cu sidebar
│   └── AdminLayout.tsx        # Admin panel wrapper (NEW)
│
├── pages/
│   ├── Index.tsx              # Landing page
│   ├── Login.tsx              # Pagina login (NEW)
│   ├── Signup.tsx             # Pagina înregistrare (NEW)
│   ├── ForgotPassword.tsx     # Recuperare parolă (NEW)
│   ├── Dashboard.tsx          # Main dashboard
│   ├── IncarcareBalanta.tsx   # Upload functionality
│   ├── Settings.tsx           # Setări (NEW)
│   ├── Admin.tsx              # Panou admin (NEW)
│   └── ...
│
├── hooks/
│   ├── use-mobile.tsx         # Responsive detection
│   ├── use-toast.ts           # Toast notifications
│   ├── useBalante.tsx         # CRUD balanțe (NEW)
│   ├── useCompany.tsx         # Gestiune companii (NEW)
│   ├── useFinancialCalculations.tsx # Calcule financiare (NEW)
│   ├── useKPIs.tsx            # Indicatori cheie (NEW)
│   ├── useTrialBalances.tsx   # Procesare balanțe (NEW)
│   └── useUserRole.tsx        # Verificare roluri (NEW)
│
├── lib/
│   └── utils.ts               # Utility functions (cn, etc.)
│
└── assets/
    └── *.png, *.jpg           # Static images
```

---

## Fluxul de Date Principal

### 📊 User Journey Flow

<!-- UPDATED: Flow actualizat cu autentificare reală - Ianuarie 2026 -->

```
┌─────────────────┐
│   Landing Page  │
│   (Marketing)   │
└────────┬────────┘
         │
         ▼ Sign Up / Login
┌─────────────────┐
│   Auth Flow     │
│   (Supabase     │
│    Auth)        │
└────────┬────────┘
         │
         ▼ AuthGuard verifică sesiune
┌─────────────────┐
│  CompanyGuard   │
│  (Selectare sau │
│   creare        │
│   companie)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│   Dashboard     │────▶│  Upload Balance  │
│   (Overview)    │     │  (Excel/CSV)     │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         │              │  Storage Upload  │
         │              │  (bucket:balante)│
         │              └────────┬─────────┘
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         │              │  Edge Function   │
         │              │  parse-balanta   │
         │              └────────┬─────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│   View Reports  │◀────│  React Query     │
│   & Analyses    │     │  (invalidate &   │
└────────┬────────┘     │   refetch)       │
         │              └──────────────────┘
         ▼
┌─────────────────┐
│  Export Report  │
│  (PDF/Excel)    │
└─────────────────┘
```

### 🔄 Data Flow Patterns

#### 1. Balance Upload Flow (Implementat)
<!-- UPDATED: Flow real implementat - Ianuarie 2026 -->

```typescript
// hooks/useTrialBalances.tsx - Pattern real

const handleUpload = async (file: File, periodStart: Date, periodEnd: Date) => {
  // 1. Verifică autentificare și companie
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  
  // 2. Creează înregistrare import în DB
  const { data: importRecord } = await supabase
    .from('trial_balance_imports')
    .insert({
      company_id: currentCompany.id,
      uploaded_by: user.id,
      source_file_name: file.name,
      period_start: periodStart,
      period_end: periodEnd,
      status: 'processing'
    })
    .select()
    .single();
  
  // 3. Upload fișier în Storage
  const filePath = `${currentCompany.id}/${importRecord.id}/${file.name}`;
  await supabase.storage
    .from('balante')
    .upload(filePath, file);
  
  // 4. Actualizează URL în import
  await supabase
    .from('trial_balance_imports')
    .update({ source_file_url: filePath })
    .eq('id', importRecord.id);
  
  // 5. Apelează Edge Function pentru parsare
  const { data: parseResult } = await supabase.functions
    .invoke('parse-balanta', {
      body: { 
        import_id: importRecord.id, 
        file_path: filePath 
      }
    });
  
  // 6. Edge function actualizează status și inserează conturi
  // 7. Invalidate cache pentru refresh UI
  queryClient.invalidateQueries(['trial-balances', currentCompany.id]);
};
```

#### 2. Dashboard Data Flow

```typescript
// React Query hook pattern
const useDashboardData = (period: string) => {
  return useQuery({
    queryKey: ['dashboard', period],
    queryFn: async () => {
      // Parallel fetches for performance
      const [kpis, trends, alerts] = await Promise.all([
        fetchKPIs(period),
        fetchTrends(period),
        fetchAlerts(period)
      ]);
      
      return { kpis, trends, alerts };
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true
  });
};
```

#### 3. Report Generation Flow

```typescript
// Client-side PDF generation
const generateReport = async (analysisData: AnalysisData) => {
  // 1. Render report component to canvas
  const canvas = await html2canvas(reportRef.current);
  
  // 2. Create PDF document
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // 3. Add pages with charts and tables
  pdf.addImage(canvas.toDataURL(), 'PNG', 10, 10, 190, 0);
  
  // 4. Download
  pdf.save(`raport-financiar-${period}.pdf`);
};
```

---

## Design System

### 🎨 Color Palette

| Token | HSL Value | Usage |
|-------|-----------|-------|
| `--primary` | 244 58% 64% | Primary actions, links |
| `--primary-navy` | 222 47% 11% | Dark backgrounds |
| `--accent-emerald` | 158 64% 52% | Success states |
| `--warning-amber` | 38 92% 50% | Warnings |
| `--destructive` | 0 84% 60% | Errors, delete |

### 📝 Typography Scale

```css
.headline     → 3.5rem/4rem/4.5rem @ font-weight: 800
.subheadline  → 1.5rem @ font-weight: 600
.body-large   → 1.125rem @ font-weight: 400
.body         → 1rem @ font-weight: 400
.text-small   → 0.875rem @ font-weight: 500
```

### 🎭 Animation Tokens

| Animation | Duration | Usage |
|-----------|----------|-------|
| `fade-in-up` | 0.6s | Page elements appear |
| `slide-in-right` | 0.8s | Sidebars, panels |
| `scale-in` | 0.4s | Modals, cards |
| `float` | 3s infinite | Hero decorations |

---

## Structura Proiectului

<!-- UPDATED: Structură completă actualizată - Ianuarie 2026 -->

```
FinGuard/
├── public/
│   ├── robots.txt
│   ├── sitemap.xml
│   └── favicon.ico
│
├── planning/
│   ├── about generale/
│   │   ├── analiza_app.md          # Analiză cerințe
│   │   ├── KNOWLEDGE.md            # Documentație cunoștințe
│   │   └── tech_stack.md           # This document
│   ├── design-guidelines.json      # Design system spec (legacy path)
│
├── src/
│   ├── assets/                  # Images, icons
│   ├── components/              # Reusable components
│   │   ├── ui/                  # shadcn primitives
│   │   ├── app/                 # App-specific components (NEW)
│   │   └── auth/                # Auth guards (NEW)
│   ├── contexts/                # React contexts (NEW)
│   ├── hooks/                   # Custom React hooks
│   ├── integrations/            # External integrations (NEW)
│   │   └── supabase/            # Supabase client & types
│   ├── layouts/                 # Page layouts
│   ├── lib/                     # Utilities
│   ├── pages/                   # Route components
│   ├── App.tsx                  # Root component
│   ├── App.css                  # Global styles (unused)
│   ├── index.css                # Tailwind + Design tokens
│   └── main.tsx                 # Entry point
│
├── supabase/                    # Supabase local config (NEW)
│   ├── config.toml              # Project configuration
│   ├── functions/               # Edge Functions
│   │   └── parse-balanta/       # Balance parsing function
│   └── migrations/              # Database migrations
│
├── .cursor/                     # Cursor IDE rules
│   └── rules/
│       ├── commenting-guidelines.mdc
│       └── master_debugge.mdc
│
├── tailwind.config.ts           # Tailwind configuration
├── vite.config.ts               # Vite build config
├── tsconfig.json                # TypeScript config
├── eslint.config.js             # ESLint configuration
└── package.json                 # Dependencies
```

---

## 🚀 Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Build for development (with sourcemaps)
npm run build:dev

# Preview production build
npm run preview

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

### Supabase Commands (NEW)
<!-- NEW: Comenzi Supabase - Ianuarie 2026 -->

```bash
# Start local Supabase
npx supabase start

# Generate TypeScript types
npx supabase gen types typescript --local > src/integrations/supabase/types.ts

# Deploy Edge Functions
npx supabase functions deploy parse-balanta

# Apply migrations
npx supabase db push

# View database changes
npx supabase db diff
```

---

## 📚 Resurse Adiționale

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query)
- [React Router](https://reactrouter.com)
- [Supabase Documentation](https://supabase.com/docs)
- ~~[Lovable Cloud Docs](https://docs.lovable.dev/features/cloud)~~ <!-- DEPRECATED: Înlocuit cu Supabase direct -->

---

## 📝 Changelog

<!-- NEW: Secțiune changelog pentru tracking modificări - Ianuarie 2026 -->

| Data | Modificare |
|------|------------|
| Ianuarie 2026 | Actualizare majoră: documentare integrare Supabase completă |
| Ianuarie 2026 | Adăugare schema DB actuală, Edge Functions, Route Guards |
| Ianuarie 2026 | Marcare schema veche ca depreciate (strikethrough) |
| Ianuarie 2026 | Adăugare secțiuni noi: Contexts, Custom Hooks, Supabase Commands |

---

*Ultima actualizare: 20 Ianuarie 2026*
