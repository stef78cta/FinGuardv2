# FinGuard v2 - Custom Knowledge File

> **Ultima actualizare**: 26 Ianuarie 2026  
> **Status proiect**: ✅ Production-ready (7/11 probleme critice rezolvate)  
> **Versiune**: 2.0

---

## 1. Project Overview
- **Name**: FinGuard v2 - Financial Analysis Dashboard
- **Language**: Romanian (RO)
- **Purpose**: Platformă SaaS pentru analiză financiară automată și raportare
- **Target Users**: Antreprenori români, cabinete contabilitate, analiști financiari, IFN-uri

### Propunere de Valoare
- **Analiză financiară automată**: Procesare balanțe lunare → rapoarte comprehensive în secunde
- **Confidențialitate**: Nu necesită identificare firmă prin CUI
- **Multi-company support**: Gestiune multiplă companii per utilizator
- **Securitate garantată**: Date criptate în cloud (Supabase + RLS)

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18.3.x + Vite 5.4.x
- **Language**: TypeScript 5.8.x (Strict Mode)
- **Build Tool**: Vite cu SWC Plugin pentru compilare rapidă
- **Styling**: Tailwind CSS 3.4.x + tailwindcss-animate
- **UI Components**: Radix UI primitives + shadcn/ui (50+ componente)
- **Charts**: Recharts 2.15.x cu ChartContainer wrapper
- **Routing**: React Router DOM v6.30.x
- **State Management**: 
  - TanStack React Query 5.83.x (server state & caching)
  - Context API (AuthContext, CompanyContext)
  - useState/useReducer pentru local UI state
- **Forms**: React Hook Form 7.x + Zod 3.x validation
- **Animations**: tailwindcss-animate + custom CSS animations
- **Export**: jsPDF + html2canvas pentru PDF, xlsx pentru Excel

### Backend (Supabase - ✅ Implementat complet)
- **Database**: PostgreSQL cu Row Level Security (RLS)
- **Auth**: Supabase Auth (Email/Password + OAuth Google)
- **Storage**: S3-compatible storage (bucket: `balante`)
- **Edge Functions**: Deno-based serverless functions
- **Real-time**: Supabase Realtime (opțional)
- **Types**: TypeScript types auto-generate din schema DB

---

## 3. Backend Architecture (Supabase)

### Database Schema (PostgreSQL)

#### Users & Authentication
```sql
-- Utilizatori aplicație (sincronizat cu auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roluri utilizatori (RBAC)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  role app_role NOT NULL -- 'user', 'admin', 'super_admin'
);
```

#### Companies & Multi-Tenancy
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  cui TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  currency TEXT DEFAULT 'RON',
  is_active BOOLEAN DEFAULT true
);

-- Relație many-to-many: utilizatori <-> companii
CREATE TABLE company_users (
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  UNIQUE(company_id, user_id)
);
```

#### Trial Balance Data
```sql
-- Importuri balanțe de verificare
CREATE TABLE trial_balance_imports (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  uploaded_by UUID REFERENCES users(id),
  source_file_name TEXT NOT NULL,
  source_file_url TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status import_status DEFAULT 'draft', -- draft/processing/validated/completed/error
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- Conturi din balanță
CREATE TABLE trial_balance_accounts (
  id UUID PRIMARY KEY,
  import_id UUID REFERENCES trial_balance_imports(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  opening_debit DECIMAL(15,2) DEFAULT 0,
  opening_credit DECIMAL(15,2) DEFAULT 0,
  debit_turnover DECIMAL(15,2) DEFAULT 0,
  credit_turnover DECIMAL(15,2) DEFAULT 0,
  closing_debit DECIMAL(15,2) DEFAULT 0,
  closing_credit DECIMAL(15,2) DEFAULT 0
);
```

### Row Level Security (RLS)
Toate tabelele au politici RLS active:
- `is_company_member(_company_id, _user_id)` - Verifică apartenență la companie
- `can_access_import(_import_id, _user_id)` - Verifică acces la import specific
- `has_role(_role, _user_id)` - Verifică roluri admin/super_admin

### Edge Functions
| Function | Status | Scop |
|----------|--------|------|
| `parse-balanta` | ✅ Implementat | Procesare Excel upload + validare + inserare DB |
| `calculate-kpis` | ⏳ Planificat | Calcul indicatori financiari server-side |
| `generate-report` | ⏳ Planificat | Generare PDF raport comprehensive |

#### parse-balanta (Implementat)
- ✅ Rate limiting: 10 req/min per user
- ✅ CORS restrictiv cu whitelist origins
- ✅ Input validation & sanitization (prevenire injection)
- ✅ Validare cod cont (3-6 cifre)
- ✅ Parsare Excel cu XLSX library
- ✅ Inserare batch în DB

### Stored Functions (PostgreSQL RPC)
| Function | Scop |
|----------|------|
| `get_import_totals(_import_id)` | Totaluri import calculate server-side |
| `get_company_imports_with_totals(...)` | Lista importuri + totaluri (evită N+1) |
| `get_accounts_paginated(...)` | Conturi paginat pentru performance |
| `get_balances_with_accounts(...)` | Balanțe cu conturi (batch query) |
| `soft_delete_import(_import_id)` | Soft delete pentru istoricul datelor |

---

## 4. React Architecture

### Contexts (Global State)
| Context | Scop | Hook | Fișier |
|---------|------|------|--------|
| `AuthContext` | Autentificare Supabase, sesiune, sign in/out | `useAuth()` | `contexts/AuthContext.tsx` |
| `CompanyContext` | Companie curentă selectată, multi-company switch | `useCompany()` | `contexts/CompanyContext.tsx` |

### Custom Hooks (Business Logic)
| Hook | Scop | Operații |
|------|------|----------|
| `useBalante` | CRUD operations pentru balanțe | create, read, update, soft delete |
| `useTrialBalances` | Încărcare și procesare balanțe | upload, parse, validate |
| `useKPIs` | Calcul indicatori cheie | 9 indicatori (lichiditate, profitabilitate, îndatorare, eficiență) |
| `useFinancialCalculations` | Calcule financiare complexe | totaluri, marje, raportări |
| `useUserRole` | Verificare roluri utilizator | isAdmin, isSuperAdmin, hasRole |
| `useCompany` | Gestiune companii | create, switch, list companies |
| `useMobile` | Detectare dispozitive mobile | responsive breakpoints |
| `useToast` | Notificări toast (Sonner) | success, error, info |

### Route Guards & Protected Routes
```typescript
// Auth Guard - verifică sesiune utilizator
<AuthGuard>
  <AppLayout />
</AuthGuard>

// Company Guard - forțează selectare companie
<CompanyGuard>
  <Dashboard />
</CompanyGuard>

// Admin Guard - verifică rol admin/super_admin
<AdminGuard>
  <AdminLayout />
</AdminGuard>
```

### Routing Structure
```
/                           → Landing Page (marketing)
/login                      → Autentificare
/signup                     → Înregistrare
/forgot-password            → Recuperare parolă
/app                        → Protected Layout (AuthGuard + CompanyGuard)
  /app/dashboard            → Dashboard principal cu KPIs
  /app/incarcare-balanta    → Upload balanță Excel
  /app/analize-financiare   → Analize financiare (tabs)
  /app/indicatori-cheie     → KPI Dashboard (9 indicatori)
  /app/analize-comparative  → Comparații perioade
  /app/previziuni-bugetare  → Forecast & Planning
  /app/rapoarte-financiare  → Generare rapoarte PDF/Excel
  /app/alte-analize         → Analize adiționale
  /app/settings             → Setări utilizator/companie
/admin                      → Admin Layout (AdminGuard)
  /admin                    → Panou administrare
```

---

## 5. Design System

### Color Tokens (HSL-based in index.css)
```css
--background: 210 40% 98%;
--foreground: 222.2 84% 4.9%;
--primary: 238 84% 67%;          /* Indigo - main brand */
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96.1%;
--accent: 160 84% 39%;           /* Emerald - success/positive */
--accent-foreground: 210 40% 98%;
--muted: 210 40% 96.1%;
--muted-foreground: 215.4 16.3% 46.9%;
--destructive: 0 84.2% 60.2%;    /* Red - errors/negative */
--warning: 38 92% 50%;           /* Orange - caution */
--card: 0 0% 100%;
--border: 214.3 31.8% 91.4%;
```

### Typography Classes
```css
.headline-hero      /* text-5xl md:text-6xl lg:text-7xl font-black */
.section-title      /* text-3xl md:text-4xl font-bold */
.page-title         /* text-2xl md:text-3xl font-bold */
.page-description   /* text-muted-foreground text-base */
.body-text          /* text-base leading-relaxed */
```

### Button Hierarchy
```css
.btn-hero           /* Dominant - Hero CTA only */
.btn-primary        /* Prominent - Main actions */
.btn-secondary      /* Subtle - Secondary actions */
.btn-ghost          /* Minimal - Tertiary actions */
.btn-action         /* App action buttons with icon */
```

### Card Styles
```css
.card-app           /* Standard app card with shadow */
.card-feature       /* Landing feature cards */
.card-feature-highlight /* Highlighted feature cards */
.kpi-card           /* KPI display cards */
```

### Spacing Convention
- Container: `container mx-auto px-4 py-8`
- Section padding: `py-16 md:py-20` (`.section-padding`)
- Card padding: `p-6`
- Section gaps: `gap-4`, `gap-6`, `gap-8`

## 6. Component Patterns

### Page Structure (App Pages)
```tsx
const PageName = () => {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Page Title"
        description="Page description"
        actions={<Button>Action</Button>}
      />
      
      <div className="grid gap-6">
        {/* Main content */}
      </div>
    </div>
  );
};
```

### Reusable App Components
Located in `src/components/app/`:
- **PageHeader**: Consistent page headers with title, description, actions
- **KPICard**: KPI display cu value, label, trend indicator, optional sparkline
- **ChartCard**: Chart wrapper cu title, description, și content area
- **StatCard**: Simple stat display cu icon și value
- **CompanySwitcher**: Selector companie curentă (multi-company)

### Card Pattern
```tsx
<Card className="card-app">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Tab Navigation Pattern
```tsx
<Tabs defaultValue="tab1" className="w-full">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    {/* Content */}
  </TabsContent>
</Tabs>
```

## 5. Data Visualization Standards

### Chart Colors (Consistent Palette)
```tsx
const CHART_COLORS = {
  primary: "hsl(var(--primary))",      // #6366F1 indigo
  accent: "hsl(var(--accent))",        // #10B981 emerald
  warning: "hsl(var(--warning))",      // #F59E0B orange
  destructive: "hsl(var(--destructive))", // #EF4444 red
  muted: "hsl(var(--muted-foreground))", // gray
};
```

### Chart Configuration Pattern
```tsx
const chartConfig = {
  venituri: { label: "Venituri", color: "hsl(var(--accent))" },
  cheltuieli: { label: "Cheltuieli", color: "hsl(var(--destructive))" },
  profit: { label: "Profit", color: "hsl(var(--primary))" },
} satisfies ChartConfig;
```

### Chart Container Usage
```tsx
<ChartContainer config={chartConfig} className="h-[300px] w-full">
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data}>
      {/* Chart elements */}
    </LineChart>
  </ResponsiveContainer>
</ChartContainer>
```

## 6. Table Patterns

### Financial Table Styling
```css
.table-financial     /* Base table styling */
.table-row-total     /* Total row - bold, highlighted bg */
.table-row-subtotal  /* Subtotal row - semi-bold */
```

### Value Formatting
- Negative values: `text-destructive`
- Positive values: `text-accent` or default
- Neutral: `text-foreground`

### Number Formatting
```tsx
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number): string => {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
};
```

## 7. File Organization

### Project Structure Complete
```
src/
├── assets/                # Images, icons
│   ├── dashboard-mockup.png
│   ├── testimonial-*.jpg
│   └── ...
│
├── components/
│   ├── ui/                # shadcn/ui primitives (50+ componente)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── sidebar.tsx
│   │   ├── table.tsx
│   │   └── ...
│   │
│   ├── app/               # App-specific components
│   │   ├── ChartCard.tsx
│   │   ├── CompanySwitcher.tsx
│   │   ├── KPICard.tsx
│   │   ├── PageHeader.tsx
│   │   └── StatCard.tsx
│   │
│   ├── auth/              # Authentication guards
│   │   ├── AuthGuard.tsx
│   │   ├── AdminGuard.tsx
│   │   └── CompanyGuard.tsx
│   │
│   ├── AppSidebar.tsx
│   ├── Navigation.tsx
│   ├── HeroSection.tsx
│   ├── FeaturesSection.tsx
│   ├── PricingSection.tsx
│   ├── NotificationsPopover.tsx
│   ├── UserMenuPopover.tsx
│   ├── ErrorBoundary.tsx
│   └── ...
│
├── contexts/              # React Context providers
│   ├── AuthContext.tsx
│   └── CompanyContext.tsx
│
├── hooks/                 # Custom React hooks
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   ├── useBalante.tsx
│   ├── useCompany.tsx
│   ├── useFinancialCalculations.tsx
│   ├── useKPIs.tsx
│   ├── useTrialBalances.tsx
│   └── useUserRole.tsx
│
├── integrations/          # External integrations
│   └── supabase/
│       ├── client.ts      # Supabase client config
│       └── types.ts       # TypeScript types auto-generate
│
├── layouts/
│   ├── AppLayout.tsx      # Dashboard wrapper cu sidebar
│   └── AdminLayout.tsx    # Admin panel wrapper
│
├── lib/
│   └── utils.ts           # Utility functions (cn, formatters)
│
├── pages/
│   ├── Index.tsx          # Landing page
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── ForgotPassword.tsx
│   ├── Dashboard.tsx
│   ├── IncarcareBalanta.tsx
│   ├── AnalizeFinanciare.tsx
│   ├── IndicatoriCheie.tsx
│   ├── AnalizeComparative.tsx
│   ├── AlteAnalize.tsx
│   ├── PreviziuniBugetare.tsx
│   ├── RapoarteFinanciare.tsx
│   ├── Settings.tsx
│   ├── Admin.tsx
│   ├── NotFound.tsx
│   └── StyleGuide.tsx
│
├── App.tsx
├── App.css
├── index.css              # Tailwind + Design tokens
└── main.tsx               # Entry point

supabase/                  # Supabase local config
├── config.toml
├── functions/
│   └── parse-balanta/     # Edge function pentru parsare Excel
│       └── index.ts
└── migrations/
    ├── 20260118224720_*.sql
    ├── 20260119094518_*.sql
    └── 20260120100000_performance_optimizations.sql
```

## 8. Romanian Language Conventions

### Common Financial Terms
| Romanian | English |
|----------|---------|
| Venituri | Revenues |
| Cheltuieli | Expenses |
| Profit Net | Net Profit |
| Cifra de afaceri | Turnover |
| Active | Assets |
| Pasive | Liabilities |
| Balanță | Balance |
| Analiză | Analysis |
| Raport | Report |
| Indicatori | Indicators |
| Lichiditate | Liquidity |
| Profitabilitate | Profitability |
| Îndatorare | Indebtedness |
| Eficiență | Efficiency |

### UI Text Patterns
- Section titles: Title Case ("Indicatori Cheie")
- Button text: Title Case ("Începe Analiza")
- Descriptions: Sentence case
- Tab labels: Title Case
- Months: Romanian format ("Ian", "Feb", "Mar", etc.)

## 9. Animation Patterns

### Scroll Animations
```css
.animate-fade-in        /* Fade in on scroll */
.animate-slide-up       /* Slide up on scroll */
```

### Hover Effects
```css
.hover-lift             /* translateY(-4px) on hover */
.hover-scale            /* scale(1.02) on hover */
```

### Transitions
- Default: `transition-all duration-300`
- Fast: `transition-all duration-200`
- Smooth: `transition-all duration-500 ease-out`

## 10. Responsive Design

### Breakpoints
- Mobile: < 768px (default)
- Tablet: md (768px+)
- Desktop: lg (1024px+)
- Large: xl (1280px+)

### Responsive Patterns
- Charts: `h-[250px] md:h-[300px] lg:h-[400px]`
- Grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Text: `text-2xl md:text-3xl lg:text-4xl`
- Spacing: `p-4 md:p-6`

## 11. Implementation Status & Progress

### ✅ Funcționalități Implementate Complete

#### 1. Upload și Procesare Balanțe
- ✅ Upload drag-and-drop pentru Excel (.xlsx, .xls)
- ✅ Validare format și dimensiune (max 10MB)
- ✅ Edge Function `parse-balanta` pentru procesare server-side
- ✅ Stocare în Supabase Storage bucket `balante`
- ✅ Specificații tehnice clare pentru format Excel acceptat

#### 2. Calculul KPI-urilor (9 indicatori)
- ✅ **Lichiditate**: Rata Curentă, Rata Rapidă, Cash Ratio
- ✅ **Profitabilitate**: Marja Profitului, ROA, ROE
- ✅ **Îndatorare**: Debt-to-Equity, Grad Îndatorare
- ✅ **Eficiență**: Rotația Activelor
- ✅ Benchmark-uri de referință pentru fiecare indicator
- ✅ Trend-uri calculate față de perioada anterioară

#### 3. Vizualizare Date
- ✅ Grafice interactive cu Recharts (AreaChart, LineChart, BarChart)
- ✅ Tabel Top 5 Conturi cu variații
- ✅ Dashboard cu KPI cards responsive
- ✅ ChartContainer wrapper pentru consistență

#### 4. Multi-Company Support
- ✅ Suport pentru multiple companii per utilizator
- ✅ CompanySwitcher în header
- ✅ Persistență companie activă în localStorage
- ✅ RLS pentru izolare date per companie

#### 5. Securitate & Performance (✅ Rezolvate Ianuarie 2026)
- ✅ Mutare credențiale în variabile de mediu (.env)
- ✅ Rate limiting: 10 req/min per user (Edge Function)
- ✅ CORS restrictiv cu whitelist domenii
- ✅ Input validation & sanitization pentru Excel
- ✅ Batch queries pentru rezolvare N+1 problem
- ✅ Paginare server-side pentru liste mari
- ✅ Soft delete pentru istoricul datelor
- ✅ Error Boundary pentru gestionare erori UX

### ⏳ Funcționalități În Lucru / Planificate

| Funcționalitate | Status | Prioritate |
|-----------------|--------|------------|
| Rapoarte PDF complete | Parțial | 🟡 Medie |
| Export Excel | Neimplementat | 🟡 Medie |
| Analize Comparative complete | Parțial | 🟡 Medie |
| Previziuni Bugetare | Placeholder | 🟢 Scăzută |
| AI Analysis | Neimplementat | 🟢 Scăzută |
| Search funcțional | Neimplementat | 🟢 Scăzută |
| Onboarding tutorial | Neimplementat | 🟢 Scăzută |

### Progres Rezolvare Probleme (din Analiza Aplicației)

```
Probleme Critice (Securitate):    2/2 rezolvate (100%) ████████████ 
Probleme Înalte (Performance):    2/2 rezolvate (100%) ████████████
Probleme Medii (UX/Features):     3/4 rezolvate (75%)  █████████░░░
Probleme Scăzute (Nice-to-have):  0/3 rezolvate (0%)   ░░░░░░░░░░░░
─────────────────────────────────────────────────────────────────
TOTAL:                            7/11 rezolvate (64%)
```

### Changelog Securitate & Performanță (Ianuarie 2026)

| Data | Modificare | Impact |
|------|------------|--------|
| Ian 2026 | Mutare credențiale în variabile de mediu | 🔴 **CRITIC** - Securitate |
| Ian 2026 | Implementare CORS restrictiv | 🔴 **CRITIC** - Securitate |
| Ian 2026 | Implementare rate limiting (10 req/min) | 🔴 **CRITIC** - Securitate |
| Ian 2026 | Input validation & sanitization Excel | 🟠 **ÎNALTĂ** - Securitate |
| Ian 2026 | Batch queries pentru fix N+1 problem | 🟠 **ÎNALTĂ** - Performance |
| Ian 2026 | Paginare server-side | 🟡 **MEDIE** - Scalabilitate |
| Ian 2026 | Soft delete pentru imports | 🟡 **MEDIE** - UX |
| Ian 2026 | Error Boundary component | 🟡 **MEDIE** - UX |
| Ian 2026 | Totals server-side (avoid N+1) | 🟡 **MEDIE** - Performance |

### Verdict Actual (Ianuarie 2026)
✅ **Aplicația este pregătită pentru producție** și scale mediu-mare.  
✅ Toate problemele critice de securitate și performanță au fost rezolvate.  
⏳ Pentru scale enterprise cu fișiere foarte mari (>50MB), se recomandă implementarea procesării asincrone cu queue.

---

## 12. Best Practices

### DO (Architecture & Code Quality):
1. ✅ Use semantic design tokens from `index.css`
2. ✅ Use HSL colors with CSS variables (`hsl(var(--primary))`)
3. ✅ Create focused, reusable components în `components/app/`
4. ✅ Use TypeScript interfaces pentru toate data structures
5. ✅ Follow Romanian language conventions pentru UI text
6. ✅ Maintain consistent spacing scale (4, 6, 8, 12, 16)
7. ✅ Use `ChartContainer` pentru toate Recharts components
8. ✅ Wrap toate API calls în custom hooks (useBalante, useKPIs)
9. ✅ Use React Query pentru server state management
10. ✅ Implement proper error boundaries pentru UX

### DO (Security & Performance):
1. ✅ **CRITICAL**: Store toate credentials în `.env` (NEVER hardcode)
2. ✅ Use RLS policies pentru toate database tables
3. ✅ Validate și sanitize toate inputs (prevenire injection)
4. ✅ Implement rate limiting pentru toate Edge Functions
5. ✅ Use batch queries (avoid N+1 problems)
6. ✅ Implement paginare pentru liste mari
7. ✅ Use soft delete (`deleted_at`) pentru istoricul datelor
8. ✅ Calculate totaluri server-side (avoid loading all data)

### DON'T (Anti-patterns):
1. ❌ Hardcode colors sau magic numbers
2. ❌ Use inline styles pentru theming
3. ❌ Create monolithic components (>500 lines)
4. ❌ Mix Romanian/English în UI text
5. ❌ Skip responsive considerations (mobile-first)
6. ❌ Forget accessibility (labels, ARIA, contrast)
7. ❌ Hardcode Supabase keys (use env vars)
8. ❌ Use sequential queries (prefer batch/parallel)
9. ❌ Skip input validation (security risk)
10. ❌ Use `SELECT *` în production (specify columns)

## 13. Key Dependencies

### Frontend Dependencies
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.30.0",
  "@tanstack/react-query": "^5.83.x",
  "recharts": "^2.15.x",
  "lucide-react": "latest",
  "date-fns": "latest",
  "xlsx": "latest",
  "jspdf": "latest",
  "html2canvas": "latest",
  "react-hook-form": "^7.x",
  "zod": "^3.x",
  "@radix-ui/react-*": "latest",
  "tailwindcss": "^3.4.x",
  "tailwindcss-animate": "^1.x",
  "sonner": "latest"
}
```

### Backend Dependencies (Supabase)
```json
{
  "@supabase/supabase-js": "^2.90.x",
  "@supabase/ssr": "latest"
}
```

### Dev Dependencies
```json
{
  "vite": "^5.4.x",
  "@vitejs/plugin-react-swc": "latest",
  "typescript": "^5.8.x",
  "@types/react": "^18.3.x",
  "eslint": "^9.x",
  "autoprefixer": "latest",
  "postcss": "latest"
}
```

### Purpose per Dependency
| Package | Purpose | Alternative |
|---------|---------|------------|
| `recharts` | Charts and data visualization | Chart.js, Victory |
| `lucide-react` | Icon library (tree-shakeable) | react-icons, heroicons |
| `date-fns` | Date formatting (lightweight) | moment.js (heavier) |
| `xlsx` | Excel import/export | exceljs |
| `jspdf` | PDF generation client-side | pdfmake |
| `html2canvas` | Screenshot pentru PDF | dom-to-image |
| `@tanstack/react-query` | Server state & caching | SWR, Apollo |
| `react-hook-form` | Form handling performant | Formik |
| `zod` | Schema validation | Yup, Joi |
| `@supabase/supabase-js` | Supabase client (Auth, DB, Storage) | Firebase SDK |
| `sonner` | Toast notifications modern | react-hot-toast |

## 16. Data Flow & Upload Process

### Balance Upload Flow (End-to-End)
```
┌─────────────┐
│   CLIENT    │ User selectează fișier Excel
│ (Browser)   │ + perioadă (start/end date)
└──────┬──────┘
       │
       ▼ useTrialBalances.uploadBalance()
┌─────────────────────────────────────────────────────────┐
│ 1. Verifică autentificare (useAuth)                     │
│ 2. Verifică companie selectată (useCompany)             │
│ 3. Validare client-side (format, size)                  │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼ Supabase.from('trial_balance_imports').insert()
┌─────────────────────────────────────────────────────────┐
│ SUPABASE DATABASE                                       │
│ - Creare înregistrare în trial_balance_imports         │
│ - Status: 'processing'                                  │
│ - Returnează import_id                                  │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼ Supabase.storage.from('balante').upload()
┌─────────────────────────────────────────────────────────┐
│ SUPABASE STORAGE                                        │
│ - Upload fișier în bucket 'balante'                     │
│ - Path: company_id/import_id/filename.xlsx             │
│ - Returnează storage URL                                │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼ Update import record cu source_file_url
       │
       ▼ Supabase.functions.invoke('parse-balanta')
┌─────────────────────────────────────────────────────────┐
│ EDGE FUNCTION: parse-balanta                            │
│ 1. Rate limiting check (10 req/min)                     │
│ 2. CORS validation                                      │
│ 3. Download fișier din Storage                          │
│ 4. Parse Excel cu XLSX                                  │
│ 5. Validare date (cod cont 3-6 cifre, numere valide)   │
│ 6. Sanitize input (prevenire injection)                │
│ 7. Batch insert în trial_balance_accounts              │
│ 8. Update import status: 'completed' sau 'error'       │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼ React Query invalidate
┌─────────────────────────────────────────────────────────┐
│ CLIENT REFRESH                                          │
│ - queryClient.invalidateQueries(['trial-balances'])    │
│ - UI se actualizează automat cu noile date              │
│ - Toast notification: Success/Error                     │
└─────────────────────────────────────────────────────────┘
```

### KPI Calculation Flow
```
┌─────────────┐
│ DASHBOARD   │ useKPIs(companyId, period)
└──────┬──────┘
       │
       ▼ React Query fetch
┌─────────────────────────────────────────────────────────┐
│ 1. Get import_id pentru perioadă                        │
│ 2. Call RPC: get_import_totals(import_id)              │
│ 3. Calculate KPIs client-side:                          │
│    - Lichiditate: Current Ratio, Quick Ratio, Cash      │
│    - Profitabilitate: Profit Margin, ROA, ROE           │
│    - Îndatorare: Debt-to-Equity, Debt Ratio             │
│    - Eficiență: Asset Turnover                          │
│ 4. Compare cu benchmark-uri                             │
│ 5. Calculate trend vs perioadă anterioară               │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼ Render KPICard components
┌─────────────────────────────────────────────────────────┐
│ UI DISPLAY                                              │
│ - 9 KPI cards cu values, trends, status                │
│ - Color coding: verde (bun), roșu (rău), galben (ok)   │
│ - Sparklines pentru evoluție                            │
└─────────────────────────────────────────────────────────┘
```

---

## 17. Landing Page Sections

Order and purpose:
1. **HeroSection**: Main value proposition + CTA
2. **ProblemSection**: Pain points addressed
3. **SolutionSection**: How FinGuard solves problems
4. **FeaturesSection**: Key features grid (6-8 features)
5. **ComparisonSection**: FinGuard vs alternatives (table format)
6. **TestimonialsSection**: Social proof (3-6 testimonials)
7. **PricingSection**: Pricing tiers (Starter, Pro, Enterprise)
8. **FAQSection**: Common questions (accordion)
9. **FinalCTASection**: Closing CTA cu urgență
10. **Footer**: Links (legal, social, sitemap)

---

## 18. State Management Strategy

### Server State (React Query)
```tsx
// Caching strategy
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: true,
      retry: 1
    }
  }
});

// Usage pattern
const { data, isLoading, error } = useQuery({
  queryKey: ['trial-balances', companyId, period],
  queryFn: () => fetchTrialBalances(companyId, period),
  enabled: !!companyId // Only run if companyId exists
});
```

### Global State (Context API)
- **AuthContext**: User session, sign in/out, loading states
- **CompanyContext**: Current company, switch company, companies list

### Local UI State
- `useState` pentru simple UI state (modals, dropdowns, filters)
- `useReducer` pentru complex state (multi-step forms)

### Form State (React Hook Form)
```tsx
const form = useForm({
  resolver: zodResolver(companySchema),
  defaultValues: {
    name: '',
    cui: '',
    currency: 'RON'
  }
});
```

**Philosophy**: Keep it simple - no Redux/Zustand needed pentru această aplicație.

## 14. Development Workflow

### Commands (Development)
```bash
# Install dependencies
npm install

# Start development server (Vite)
npm run dev                # http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview

# Type check (no emit)
npx tsc --noEmit

# Lint code
npm run lint
```

### Supabase Commands (Local Development)
```bash
# Start local Supabase (requires Docker)
npx supabase start

# Stop local Supabase
npx supabase stop

# Generate TypeScript types from DB schema
npx supabase gen types typescript --local > src/integrations/supabase/types.ts

# Apply migrations to local DB
npx supabase db push

# View database changes (diff)
npx supabase db diff

# Deploy Edge Functions
npx supabase functions deploy parse-balanta

# View Edge Function logs
npx supabase functions serve parse-balanta --debug
```

### Environment Setup
```bash
# .env.local (NEVER commit this file)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Git Workflow
```bash
# Feature development
git checkout -b feature/new-kpi-calculator
git add .
git commit -m "feat: add new KPI calculator for ROE"
git push origin feature/new-kpi-calculator

# Conventional Commits
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation
style:    # Formatting
refactor: # Code restructure
perf:     # Performance improvement
test:     # Tests
chore:    # Build/tooling
```

---

## 15. Export Functionality

### PDF Export (Client-side)
```tsx
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Exportă un element DOM ca PDF
 * @param elementId - ID-ul elementului din DOM
 * @param filename - Numele fișierului PDF
 */
const exportToPDF = async (elementId: string, filename: string = 'report.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');
  
  // Render element la canvas
  const canvas = await html2canvas(element, {
    scale: 2, // Higher quality
    useCORS: true, // Allow cross-origin images
    logging: false
  });
  
  // Create PDF (A4 format)
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210; // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  pdf.addImage(
    canvas.toDataURL('image/png'), 
    'PNG', 
    0, 
    0, 
    imgWidth, 
    imgHeight
  );
  
  pdf.save(filename);
};
```

### Excel Export (Client-side)
```tsx
import * as XLSX from 'xlsx';

/**
 * Exportă date ca fișier Excel
 * @param data - Array de obiecte pentru export
 * @param filename - Numele fișierului Excel (fără extensie)
 * @param sheetName - Numele sheet-ului
 */
const exportToExcel = (
  data: any[], 
  filename: string, 
  sheetName: string = 'Sheet1'
) => {
  // Convert JSON to worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Save file
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// Usage example:
const exportKPIData = () => {
  const data = [
    { indicator: 'Rata Curentă', value: 2.5, benchmark: 2.0, status: 'Bun' },
    { indicator: 'ROE', value: 15.2, benchmark: 12.0, status: 'Excelent' },
    // ...
  ];
  
  exportToExcel(data, 'indicatori-cheie-2026-Q1', 'KPIs');
};
```

### Export Patterns (Best Practices)
```tsx
// Hook pentru export functionality
const useExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  
  const exportReport = async (type: 'pdf' | 'excel') => {
    setIsExporting(true);
    try {
      if (type === 'pdf') {
        await exportToPDF('report-content', 'raport-financiar.pdf');
      } else {
        await exportToExcel(reportData, 'raport-financiar');
      }
      toast.success('Raportul a fost exportat cu succes!');
    } catch (error) {
      toast.error('Eroare la exportul raportului');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };
  
  return { exportReport, isExporting };
};
```

---

## 19. Testing Strategy (Planificat)

### Unit Testing (Vitest - Planificat)
```typescript
// hooks/__tests__/useKPIs.test.ts
describe('useKPIs', () => {
  it('should calculate current ratio correctly', () => {
    const result = calculateCurrentRatio(activeCurente, pasiveCurente);
    expect(result).toBe(2.5);
  });
  
  it('should return benchmark status', () => {
    const status = getKPIStatus(2.5, 2.0, 'higher');
    expect(status).toBe('good');
  });
});
```

### Integration Testing (Playwright - Planificat)
```typescript
// e2e/upload-balance.spec.ts
test('should upload balance sheet successfully', async ({ page }) => {
  await page.goto('/app/incarcare-balanta');
  await page.setInputFiles('input[type="file"]', 'test-balanta.xlsx');
  await page.click('button:has-text("Încarcă Balanță")');
  await expect(page.locator('.toast-success')).toBeVisible();
});
```

---

## 20. Resources & Documentation

### Official Documentation
- [React 18 Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query/latest)
- [React Router v6](https://reactrouter.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Recharts Documentation](https://recharts.org)

### FinGuard Internal Docs
- `planning/about generale/analiza_app.md` - Analiză completă aplicație + probleme rezolvate
- `planning/about generale/tech_stack.md` - Arhitectură tehnică detaliată
- `planning/design-guidelines.jsonc` - Design system complete spec
- `planning/about generale/KNOWLEDGE.md` - Acest document (knowledge base)
- `src/pages/StyleGuide.tsx` - Visual style guide live

### Helpful Tools
- [Supabase CLI](https://supabase.com/docs/guides/cli) - Local development
- [React Query DevTools](https://tanstack.com/query/latest/docs/framework/react/devtools) - Debug queries
- [Recharts Examples](https://recharts.org/en-US/examples) - Chart inspirație

---

## 21. Common Patterns & Recipes

### Pattern: Protected Route cu Multiple Guards
```tsx
<Route path="/app" element={
  <AuthGuard>
    <CompanyGuard>
      <AppLayout />
    </CompanyGuard>
  </AuthGuard>
}>
  <Route path="dashboard" element={<Dashboard />} />
</Route>
```

### Pattern: Data Fetching cu Loading State
```tsx
const Dashboard = () => {
  const { currentCompany } = useCompany();
  const { data: kpis, isLoading } = useKPIs(currentCompany?.id);
  
  if (isLoading) return <Skeleton />;
  if (!kpis) return <EmptyState />;
  
  return <KPIGrid data={kpis} />;
};
```

### Pattern: Optimistic Updates
```tsx
const mutation = useMutation({
  mutationFn: updateCompany,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['companies']);
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['companies']);
    
    // Optimistically update
    queryClient.setQueryData(['companies'], newData);
    
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['companies'], context.previous);
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries(['companies']);
  }
});
```

### Pattern: Pagination Server-side
```tsx
const useAccountsPaginated = (importId: string, page: number = 1, pageSize: number = 50) => {
  return useQuery({
    queryKey: ['accounts', importId, page, pageSize],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_accounts_paginated', {
          _import_id: importId,
          _page: page,
          _page_size: pageSize
        });
      
      if (error) throw error;
      return data;
    }
  });
};
```

---

## 22. Troubleshooting Common Issues

### Issue: Supabase "Invalid JWT" Error
**Cauză**: Token expirat sau invalid  
**Soluție**: 
```tsx
// Verifică refresh automat în AuthContext
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      }
    }
  );
  
  return () => subscription.unsubscribe();
}, []);
```

### Issue: RLS Policy "permission denied"
**Cauză**: User nu are acces la resource  
**Soluție**: Verifică politicile RLS:
```sql
-- Debug: Verifică ce vede user-ul curent
SELECT * FROM trial_balance_imports 
WHERE company_id IN (
  SELECT company_id FROM company_users 
  WHERE user_id = auth.uid()
);
```

### Issue: N+1 Query Problem
**Cauză**: Queries secvențiale în loop  
**Soluție**: Use batch queries sau stored functions:
```tsx
// ❌ BAD: N+1 problem
for (const balance of balances) {
  const accounts = await getAccounts(balance.id);
}

// ✅ GOOD: Batch query
const { data } = await supabase
  .rpc('get_balances_with_accounts', { _company_id: companyId });
```

---

## 23. Roadmap & Future Improvements

### Q1 2026 (Prioritate Înaltă)
- [ ] Completare funcționalitate rapoarte PDF comprehensive
- [ ] Implementare export Excel complet pentru toate secțiunile
- [ ] Îmbunătățire dark mode contrast pentru tabele financiare

### Q2 2026 (Prioritate Medie)
- [ ] Analize comparative avansate (YoY, QoQ)
- [ ] Dashboard customizabil (drag-and-drop widgets)
- [ ] Notificări real-time cu Supabase Realtime

### Q3 2026 (Inovație)
- [ ] AI-powered insights și recomandări
- [ ] Integrare API contabilitate (e-Factura)
- [ ] Mobile app (React Native / Flutter)

### Q4 2026 (Scale & Optimization)
- [ ] Procesare asincronă cu queue pentru fișiere mari (>50MB)
- [ ] Redis caching layer pentru performance
- [ ] Multi-region deployment pentru latență redusă

---

## 📝 Document Metadata

**Versiune**: 2.0  
**Ultima actualizare**: 20 Ianuarie 2026  
**Autor**: FinGuard Development Team  
**Status**: ✅ Production-ready (7/11 critice rezolvate)  

**Actualizări majore în această versiune (Ianuarie 2026):**
- ✅ Documentare completă integrare Supabase (DB, Auth, Storage, Edge Functions)
- ✅ Adăugare schema DB actuală cu RLS policies
- ✅ Documentare custom hooks și contexts noi (useBalante, AuthContext, etc.)
- ✅ Progres implementări și probleme rezolvate
- ✅ Patterns și recipes pentru development
- ✅ Troubleshooting common issues
- ✅ Roadmap pentru următoarele 12 luni
- ✅ Development workflow & commands complete

**Proiect relatat**: Finguard v1 (Next.js + Supabase) - arhitectură similară, stack diferit

---

*Pentru întrebări sau contribuții la documentație, contactați echipa de development.*
