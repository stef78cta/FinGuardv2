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
| **Build Tool** | Vite | Latest |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 3.x |
| **UI Components** | shadcn/ui | Latest |
| **Routing** | React Router DOM | 6.30.x |
| **State Management** | TanStack React Query | 5.83.x |
| **Charts** | Recharts | 2.15.x |
| **Forms** | React Hook Form + Zod | 7.x + 3.x |
| **Animations** | tailwindcss-animate | 1.x |

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

#### Local State
- `useState` pentru UI state local
- `useReducer` pentru state complex
- Context API pentru shared state (e.g., theme, user preferences)

### 🧭 Routing Architecture

#### React Router v6
Structură ierarhică cu nested routes:

```
/                           → Landing Page (Index)
/app                        → Protected App Layout
  /app/dashboard            → Dashboard principal
  /app/incarcare-balanta    → Upload balanță contabilă
  /app/analize-financiare   → Analize financiare
  /app/indicatori-cheie     → KPI Dashboard
  /app/analize-comparative  → Comparații perioade
  /app/previziuni-bugetare  → Forecast & Planning
  /app/rapoarte-financiare  → Generare rapoarte
  /app/alte-analize         → Analize adiționale
```

#### Route Guards Pattern
```typescript
<Route path="/app" element={<AppLayout />}>
  {/* Protected routes nested here */}
  <Route path="dashboard" element={<Dashboard />} />
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
Aplicația este în prezent **frontend-only** cu date mock pentru demonstrație.

### 🚀 Recommended Backend (Lovable Cloud)

Pentru producție, se recomandă integrarea **Lovable Cloud** (Supabase):

#### Database Schema (PostgreSQL)

```sql
-- Users & Authentication
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  company_name TEXT,
  cui TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Balance Sheets
CREATE TABLE balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  period DATE NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  file_name TEXT,
  status TEXT DEFAULT 'processing'
);

-- Account Lines
CREATE TABLE account_lines (
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
);

-- Analysis Results
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_id UUID REFERENCES balances(id),
  type TEXT NOT NULL, -- 'liquidity', 'profitability', 'solvency'
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Edge Functions

| Function | Purpose |
|----------|---------|
| `parse-balance` | Procesare fișier Excel/CSV upload |
| `calculate-kpis` | Calcul indicatori financiari |
| `generate-report` | Generare PDF raport |
| `ai-analysis` | Analiză AI a datelor financiare |

#### Row Level Security (RLS)

```sql
-- Fiecare user vede doar datele proprii
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own balances" ON balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own balances" ON balances
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## Arhitectura Sistemului

### 🏛️ High-Level Architecture

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
│  │                 React Router v6                          │   │
│  │    Landing Page  │  App Layout  │  Protected Routes      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                     LOVABLE CLOUD (Backend)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Auth       │  │   Database   │  │   Storage            │  │
│  │   (Supabase) │  │   (Postgres) │  │   (S3-compatible)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Edge Functions                        │   │
│  │   parse-balance  │  calculate-kpis  │  generate-report   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 📁 Component Architecture

```
src/
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   │
│   ├── Navigation.tsx         # Header navigation
│   ├── AppSidebar.tsx         # Dashboard sidebar
│   ├── HeroSection.tsx        # Landing hero
│   ├── FeaturesSection.tsx    # Features grid
│   ├── PricingSection.tsx     # Pricing cards
│   └── ...
│
├── layouts/
│   └── AppLayout.tsx          # Dashboard wrapper cu sidebar
│
├── pages/
│   ├── Index.tsx              # Landing page
│   ├── Dashboard.tsx          # Main dashboard
│   ├── IncarcareBalanta.tsx   # Upload functionality
│   └── ...
│
├── hooks/
│   ├── use-mobile.tsx         # Responsive detection
│   └── use-toast.ts           # Toast notifications
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

```
┌─────────────────┐
│   Landing Page  │
│   (Marketing)   │
└────────┬────────┘
         │
         ▼ Sign Up / Login
┌─────────────────┐
│   Auth Flow     │
│   (Supabase)    │
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
         │              │  Parse & Store   │
         │              │  (Edge Function) │
         │              └────────┬─────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│   View Reports  │◀────│  Calculate KPIs  │
│   & Analyses    │     │  (Edge Function) │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐
│  Export Report  │
│  (PDF/Excel)    │
└─────────────────┘
```

### 🔄 Data Flow Patterns

#### 1. Balance Upload Flow

```typescript
// 1. User uploads file
const handleUpload = async (file: File) => {
  // 2. Upload to Supabase Storage
  const { data: uploadData } = await supabase.storage
    .from('balances')
    .upload(`${userId}/${file.name}`, file);

  // 3. Trigger Edge Function for parsing
  const { data: parseResult } = await supabase.functions
    .invoke('parse-balance', {
      body: { filePath: uploadData.path }
    });

  // 4. Store parsed data in database
  // (handled by edge function)

  // 5. Invalidate cache & refetch
  queryClient.invalidateQueries(['balances']);
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

```
FinGuard/
├── public/
│   ├── robots.txt
│   ├── sitemap.xml
│   └── favicon.ico
│
├── planning/
│   └── design-guidelines.json   # Design system spec
│
├── src/
│   ├── assets/                  # Images, icons
│   ├── components/              # Reusable components
│   │   └── ui/                  # shadcn primitives
│   ├── hooks/                   # Custom React hooks
│   ├── layouts/                 # Page layouts
│   ├── lib/                     # Utilities
│   ├── pages/                   # Route components
│   ├── App.tsx                  # Root component
│   ├── App.css                  # Global styles (unused)
│   ├── index.css                # Tailwind + Design tokens
│   └── main.tsx                 # Entry point
│
├── tech_stack.md                # This document
├── tailwind.config.ts           # Tailwind configuration
├── vite.config.ts               # Vite build config
├── tsconfig.json                # TypeScript config
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

# Preview production build
npm run preview

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## 📚 Resurse Adiționale

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query)
- [React Router](https://reactrouter.com)
- [Lovable Cloud Docs](https://docs.lovable.dev/features/cloud)

---

*Ultima actualizare: Ianuarie 2026*
