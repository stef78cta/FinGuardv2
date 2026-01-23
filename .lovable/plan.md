
# Plan: Aplicarea Stilurilor din new_StyleGuide.tsx în Întreaga Aplicație

## Obiectiv
Actualizarea design system-ului aplicației pentru a reflecta stilurile definite în `new_StyleGuide.tsx`, focalizându-ne exclusiv pe modificări de stil/design.

---

## Rezumat Modificări Principale

| Element | Stil Actual | Stil Nou (StyleGuide) |
|---------|-------------|----------------------|
| Butoane | `rounded-md` (~6px) | `rounded-[40px]` (pill) |
| Carduri | `rounded-lg` (~20px) | `rounded-[20px]` (explicit) |
| Primary Dark | Variat | `#0F172A` (slate-900) |
| Accent Indigo | `hsl(243 75% 58%)` | `#6366F1` |
| Tabs Active | Gradient bg | Underline `border-b-2 border-indigo-500` |
| Values monetare | Font normal | `font-mono font-bold` |
| Labels | Variat | `text-xs uppercase tracking-widest` |

---

## Faza 1: Actualizare Variabile CSS (`src/index.css`)

### 1.1 Actualizare Border Radius
Modificare `--radius` pentru a reflecta noul sistem:
- Buttons: `40px` (pill shape)
- Cards: `20px`
- Inputs: `8px`

### 1.2 Actualizare Culori Semantice
Aliniere cu paletă nouă:
- Primary Dark: `#0F172A` (222 47% 11%)
- Accent Indigo: `#6366F1`
- Success: `#34D399`
- Danger: `#F43F5E`
- Canvas background: `#F8FAFC`

### 1.3 Actualizare Clase de Utilitate
Modificare clase existente pentru consistență:

```css
/* Butoane - radius pill */
.btn-hero {
  @apply rounded-[40px];
}

.btn-primary {
  @apply bg-indigo-500 hover:bg-indigo-600 rounded-[40px];
}

.btn-secondary {
  @apply rounded-[40px];
}

/* Label style consistent */
.label-uppercase {
  @apply text-xs font-bold text-slate-400 uppercase tracking-widest;
}
```

---

## Faza 2: Actualizare Componente UI Base

### 2.1 `src/components/ui/button.tsx`
Modificare default border-radius la `rounded-[40px]`:

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[40px] text-sm font-medium ...",
  {
    variants: {
      variant: {
        default: "bg-indigo-500 text-white hover:bg-indigo-600",
        // ... restul variantelor
      },
    },
  }
);
```

### 2.2 `src/components/ui/card.tsx`
Actualizare border-radius la `rounded-[20px]`:

```tsx
const Card = React.forwardRef<...>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-[20px] border bg-card ...", className)} {...props} />
));
```

### 2.3 `src/components/ui/tabs.tsx`
Adăugare variant "underline" conform StyleGuide:

```tsx
// TabsList cu stil underline
className={cn(
  "w-full justify-start rounded-none border-b bg-slate-50 p-0 h-auto",
  className
)}

// TabsTrigger cu border-b active
className={cn(
  "rounded-none border-b-2 border-transparent",
  "data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent",
  "px-6 py-3",
  className
)}
```

### 2.4 `src/components/ui/input.tsx`
Ajustare radius și padding:

```tsx
className={cn(
  "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-base ...",
  className
)}
```

---

## Faza 3: Actualizare Clase CSS în `index.css`

### 3.1 Butoane
```css
.btn-hero {
  @apply bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 
         text-white px-10 py-4 rounded-[40px] font-bold text-lg 
         shadow-xl hover:scale-[1.03] transition-all duration-300;
}

.btn-primary {
  @apply bg-indigo-500 hover:bg-indigo-600 text-white 
         px-7 py-3.5 rounded-[40px] font-semibold text-base 
         shadow-lg hover:shadow-xl transition-all duration-300;
}

.btn-secondary {
  @apply bg-white text-gray-700 border border-gray-300 
         px-5 py-2.5 rounded-[40px] font-medium text-sm 
         hover:border-gray-400 hover:bg-gray-50 transition-all duration-300;
}

.btn-ghost {
  @apply bg-transparent text-gray-600 border border-gray-200 
         px-5 py-2.5 rounded-[40px] font-medium text-sm 
         hover:bg-gray-50 hover:border-gray-300 transition-all duration-300;
}
```

### 3.2 Carduri
```css
.card-app {
  @apply bg-white rounded-[20px] border border-gray-100 
         shadow-sm hover:shadow-md transition-all duration-300;
}

.card-feature {
  @apply bg-white p-5 rounded-[20px] shadow-sm hover:shadow-md 
         transition-all duration-300 hover:-translate-y-0.5 border border-gray-100;
}

.kpi-card {
  @apply bg-white rounded-[20px] border border-gray-100 p-5 
         hover:shadow-md transition-all duration-300 hover:border-indigo-100;
}

.chart-card {
  @apply bg-white rounded-[20px] border border-gray-100 overflow-hidden;
}
```

### 3.3 Typography
```css
/* Label style pentru categorii/secțiuni */
.label-category {
  @apply text-xs font-bold text-slate-400 uppercase tracking-widest;
}

/* Valori financiare în font mono */
.value-financial {
  @apply font-mono font-bold text-[#0F172A];
}

/* Trend indicators */
.trend-positive {
  @apply text-emerald-500 flex items-center gap-1 text-xs font-bold;
}

.trend-negative {
  @apply text-rose-500 flex items-center gap-1 text-xs font-bold;
}
```

### 3.4 Tabs Underline Style
```css
.tabs-list-underline {
  @apply w-full justify-start rounded-none border-b bg-slate-50 p-0 h-auto;
}

.tabs-trigger-underline {
  @apply rounded-none border-b-2 border-transparent 
         data-[state=active]:border-indigo-500 
         data-[state=active]:bg-transparent px-6 py-3;
}
```

---

## Faza 4: Actualizare Componente App

### 4.1 `src/components/app/KPICard.tsx`
- Adăugare `rounded-[20px]` pe container
- Valori în `font-mono font-bold`
- Labels cu stil `text-xs uppercase tracking-widest`

### 4.2 `src/components/app/ChartCard.tsx`
- Border radius `rounded-[20px]`

### 4.3 `src/components/app/StatCard.tsx`
- Actualizare la noul stil cu radius 20px
- Valori monetare în font-mono

---

## Faza 5: Actualizare Landing Page Components

### 5.1 `src/components/HeroSection.tsx`
- Butoane cu `rounded-[40px]`

### 5.2 `src/components/PricingSection.tsx`
- Carduri cu `rounded-[20px]`
- Badge-uri stilizate

### 5.3 `src/components/FeaturesSection.tsx`
- Carduri feature cu noul radius

### 5.4 `src/components/Navigation.tsx`
- Butoane auth cu `rounded-[40px]`

---

## Faza 6: Actualizare Pagini App

### 6.1 Dashboard, AnalizeFinanciare, etc.
- Toate cardurile cu `rounded-[20px]`
- Valori financiare cu `font-mono`
- Tables cu stil consistent

### 6.2 Tabele Financiare
- Header cu `bg-slate-50`
- Row hover cu `hover:bg-indigo-50/30`
- Status indicators cu cercuri colorate

---

## Sumar Fișiere de Modificat

### CSS/Config:
1. `src/index.css` - Clase de utilitate și variabile
2. `tailwind.config.ts` - Actualizare tokens (radius, culori)

### Componente UI Base:
3. `src/components/ui/button.tsx` - Radius 40px
4. `src/components/ui/card.tsx` - Radius 20px
5. `src/components/ui/tabs.tsx` - Variant underline
6. `src/components/ui/input.tsx` - Radius 8px
7. `src/components/ui/badge.tsx` - Stiluri actualizate

### Componente App:
8. `src/components/app/KPICard.tsx`
9. `src/components/app/ChartCard.tsx`
10. `src/components/app/StatCard.tsx`

### Landing Components:
11. `src/components/HeroSection.tsx`
12. `src/components/PricingSection.tsx`
13. `src/components/FeaturesSection.tsx`
14. `src/components/Navigation.tsx`
15. `src/components/SolutionSection.tsx`
16. `src/components/ComparisonSection.tsx`

---

## Beneficii

1. **Consistență vizuală**: Toate componentele vor urma același design system
2. **Look premium**: Butoane pill și carduri cu radius mare creează un aspect modern
3. **Profesionalism financiar**: Font mono pentru valori, labels uppercase pentru categorii
4. **Ușor de întreținut**: Stiluri centralizate în CSS utilities
