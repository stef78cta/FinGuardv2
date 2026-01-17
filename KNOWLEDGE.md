# FinGuard - Custom Knowledge File

## 1. Project Overview
- **Name**: FinGuard - Financial Analysis Dashboard
- **Language**: Romanian (RO)
- **Purpose**: Financial analysis platform for businesses
- **Target Users**: Romanian business owners, accountants, financial analysts

## 2. Technology Stack
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + tailwindcss-animate
- **UI Components**: Radix UI primitives + shadcn/ui
- **Charts**: Recharts with custom ChartContainer
- **Routing**: React Router DOM v6
- **State**: React Query for server state
- **Forms**: React Hook Form + Zod validation
- **Export**: jsPDF + html2canvas for PDF, xlsx for Excel

## 3. Design System

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

## 4. Component Patterns

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
- **KPICard**: KPI display with value, label, trend, optional sparkline
- **ChartCard**: Chart wrapper with title, description, and content
- **StatCard**: Simple stat display with icon

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

### Pages Structure
```
src/pages/
├── Index.tsx              # Landing page
├── Dashboard.tsx          # Main dashboard with KPIs
├── IndicatoriCheie.tsx    # Key indicators grid
├── AnalizeFinanciare.tsx  # Financial analysis tabs
├── AlteAnalize.tsx        # Other analyses (charts + tables)
├── AnalizeComparative.tsx # Comparative analysis
├── IncarcareBalanta.tsx   # Balance upload
├── PreviziuniBugetare.tsx # Budget forecasts
├── RapoarteFinanciare.tsx # Financial reports
└── NotFound.tsx           # 404 page
```

### Components Structure
```
src/components/
├── ui/                    # shadcn/ui base components
├── app/                   # App-specific reusable components
│   ├── PageHeader.tsx
│   ├── KPICard.tsx
│   ├── ChartCard.tsx
│   └── StatCard.tsx
├── AppSidebar.tsx         # Main navigation sidebar
├── Navigation.tsx         # Landing page navigation
├── *Section.tsx           # Landing page sections
└── *Popover.tsx           # Popover components
```

### Layouts
```
src/layouts/
└── AppLayout.tsx          # App shell with sidebar
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

## 11. Best Practices

### DO:
1. Use semantic design tokens from `index.css`
2. Use HSL colors with CSS variables
3. Create focused, reusable components
4. Use TypeScript interfaces for all data
5. Follow Romanian language conventions
6. Maintain consistent spacing scale
7. Use `ChartContainer` for all Recharts

### DON'T:
1. Hardcode colors (use `--primary`, `--accent`, etc.)
2. Use inline styles for theming
3. Create monolithic components
4. Mix languages in UI text
5. Skip responsive considerations
6. Forget accessibility (labels, contrast)

## 12. Key Dependencies

```json
{
  "recharts": "Charts and data visualization",
  "lucide-react": "Icons",
  "date-fns": "Date formatting",
  "xlsx": "Excel export",
  "jspdf": "PDF export",
  "html2canvas": "Screenshot for PDF",
  "@tanstack/react-query": "Server state",
  "react-hook-form": "Form handling",
  "zod": "Validation"
}
```

## 13. Landing Page Sections

Order and purpose:
1. **HeroSection**: Main value proposition + CTA
2. **ProblemSection**: Pain points addressed
3. **SolutionSection**: How FinGuard solves problems
4. **FeaturesSection**: Key features grid
5. **ComparisonSection**: FinGuard vs alternatives
6. **TestimonialsSection**: Social proof
7. **PricingSection**: Pricing tiers
8. **FAQSection**: Common questions
9. **FinalCTASection**: Closing CTA
10. **Footer**: Links and legal

## 14. State Management

- **Server State**: React Query for API data
- **UI State**: React useState/useReducer
- **Form State**: React Hook Form
- **No global state library** - keep it simple

## 15. Export Functionality

### PDF Export
```tsx
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const exportToPDF = async (elementId: string) => {
  const element = document.getElementById(elementId);
  const canvas = await html2canvas(element);
  const pdf = new jsPDF();
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0);
  pdf.save('report.pdf');
};
```

### Excel Export
```tsx
import * as XLSX from 'xlsx';

const exportToExcel = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};
```
