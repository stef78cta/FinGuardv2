

# Plan: Calendar Avansat cu Month/Year Picker și Drill-down Navigation

## Rezumat

Acest plan implementează un Calendar îmbunătățit cu funcționalități avansate de navigare:
1. **Month/Year Picker (Jump-to)** - Dropdown-uri pentru selecție rapidă lună/an
2. **Drill-down Date Picker** - Navigare ierarhică An → Lună → Zi
3. **Decade View** - Vizualizare grid de ani pentru navigare rapidă

---

## Analiză Tehnică

### Librăria Actuală: react-day-picker v8.10.1

| Funcționalitate | Suport Nativ | Implementare |
|-----------------|--------------|--------------|
| Month/Year Dropdown | Da (`captionLayout="dropdown"`) | Necesită `fromYear`/`toYear` |
| Decade View | Nu | Custom implementation |
| Drill-down | Nu | Custom state management |

### Abordare Recomandată

Deoarece `react-day-picker` v8 nu suportă nativ Decade View și Drill-down, vom crea un **wrapper component** care gestionează modul de vizualizare și integrează calendarul existent.

---

## Arhitectură Soluție

```text
┌─────────────────────────────────────────────────────────────────┐
│                    AdvancedCalendar                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Header: Click pe "Ianuarie 2025" → schimbă viewMode       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ viewMode:   │  │ viewMode:   │  │ viewMode:   │            │
│  │   "day"     │  │  "month"    │  │   "year"    │            │
│  │ (DayPicker) │  │ (MonthGrid) │  │ (YearGrid)  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  Flux: decade → year → month → day (drill-down)                │
│        day → month → year → decade (zoom-out via header)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fișiere de Modificat/Creat

### 1. Fișier Nou: `src/components/ui/advanced-calendar.tsx`

Component complet care include:
- State pentru `viewMode`: `'day' | 'month' | 'year' | 'decade'`
- Grid pentru luni (MonthGrid)
- Grid pentru ani (YearGrid/DecadeGrid)
- Animații de tranziție
- Integrare cu Calendar existent pentru day view

### 2. Fișier Modificat: `src/components/ui/calendar.tsx`

Adăugare opțiune `captionLayout="dropdown-buttons"` ca alternativă simplă pentru Month/Year Picker nativ.

### 3. Fișier Modificat: `src/pages/IncarcareBalanta.tsx`

Update la DatePicker pentru a folosi noul component.

---

## Detalii Implementare

### Component: AdvancedCalendar

```tsx
interface AdvancedCalendarProps extends CalendarProps {
  enableDrillDown?: boolean;      // Activează navigare ierarhică
  enableDecadeView?: boolean;     // Activează vizualizare decadă
  defaultViewMode?: ViewMode;     // 'day' | 'month' | 'year' | 'decade'
  yearRange?: { from: number; to: number }; // Range ani disponibili
}

type ViewMode = 'day' | 'month' | 'year' | 'decade';
```

### State Management

```tsx
const [viewMode, setViewMode] = useState<ViewMode>('day');
const [displayMonth, setDisplayMonth] = useState(new Date());
const [displayYear, setDisplayYear] = useState(new Date().getFullYear());
const [displayDecade, setDisplayDecade] = useState(
  Math.floor(new Date().getFullYear() / 10) * 10
);
```

### UI Components

**Header cu Drill-Up**
```tsx
<button onClick={() => handleZoomOut()}>
  {viewMode === 'day' && format(displayMonth, 'MMMM yyyy', { locale: ro })}
  {viewMode === 'month' && displayYear}
  {viewMode === 'year' && `${displayDecade} - ${displayDecade + 9}`}
</button>
```

**Month Grid (12 luni)**
```tsx
<div className="grid grid-cols-3 gap-2">
  {months.map((month, idx) => (
    <button onClick={() => handleMonthSelect(idx)}>
      {format(setMonth(new Date(), idx), 'MMM', { locale: ro })}
    </button>
  ))}
</div>
```

**Year Grid (10 ani per decadă)**
```tsx
<div className="grid grid-cols-4 gap-2">
  {Array.from({ length: 12 }, (_, i) => displayDecade - 1 + i).map(year => (
    <button onClick={() => handleYearSelect(year)}>
      {year}
    </button>
  ))}
</div>
```

**Decade Grid (10 decenii)**
```tsx
<div className="grid grid-cols-4 gap-2">
  {Array.from({ length: 12 }, (_, i) => baseDecade - 10 + i * 10).map(decade => (
    <button onClick={() => handleDecadeSelect(decade)}>
      {decade}s
    </button>
  ))}
</div>
```

---

## Stiluri CSS (NEWA Design Tokens)

```css
/* Container views */
.calendar-view-month-grid,
.calendar-view-year-grid,
.calendar-view-decade-grid {
  display: grid;
  gap: var(--newa-spacing-2);
  padding: var(--newa-spacing-3);
}

/* Grid item button */
.calendar-grid-item {
  padding: var(--newa-spacing-3) var(--newa-spacing-2);
  border-radius: var(--newa-radius-md);
  font-size: var(--newa-font-size-sm);
  font-weight: var(--newa-font-weight-medium);
  transition: all 150ms ease;
}

.calendar-grid-item:hover {
  background: var(--newa-state-hover);
}

.calendar-grid-item.selected {
  background: var(--newa-brand-accent-indigo);
  color: var(--newa-text-inverse);
}

.calendar-grid-item.today {
  border: 2px solid var(--newa-brand-accent-indigo);
}

/* Header caption clickable */
.calendar-caption-button {
  font-weight: var(--newa-font-weight-semibold);
  cursor: pointer;
  padding: var(--newa-spacing-1) var(--newa-spacing-2);
  border-radius: var(--newa-radius-sm);
}

.calendar-caption-button:hover {
  background: var(--newa-state-hover);
}
```

---

## Animații Tranziție

```css
.calendar-view-enter {
  opacity: 0;
  transform: scale(0.95);
}

.calendar-view-enter-active {
  opacity: 1;
  transform: scale(1);
  transition: opacity 200ms ease, transform 200ms ease;
}

.calendar-view-exit {
  opacity: 1;
  transform: scale(1);
}

.calendar-view-exit-active {
  opacity: 0;
  transform: scale(1.05);
  transition: opacity 150ms ease, transform 150ms ease;
}
```

---

## Flow Utilizator

```text
1. User vede calendarul în modul "day" (implicit)
   ┌────────────────────────────┐
   │    ◀  Ianuarie 2025  ▶    │ ← Click pe "Ianuarie 2025"
   │  Lu Ma Mi Jo Vi Sâ Du     │
   │        1  2  3  4  5      │
   │   6  7  8  9 10 11 12     │
   └────────────────────────────┘

2. Click pe caption → zoom out la "month" view
   ┌────────────────────────────┐
   │       ◀   2025   ▶        │ ← Click pe "2025"
   │  Ian  Feb  Mar  Apr       │
   │  Mai  Iun  Iul  Aug       │
   │  Sep  Oct  Noi  Dec       │
   └────────────────────────────┘

3. Click pe caption → zoom out la "year" view  
   ┌────────────────────────────┐
   │     ◀  2020-2029  ▶       │ ← Click pt decade
   │  2020  2021  2022  2023   │
   │  2024 [2025] 2026  2027   │
   │  2028  2029  2030  2031   │
   └────────────────────────────┘

4. Click pe caption → zoom out la "decade" view
   ┌────────────────────────────┐
   │       2000 - 2090         │
   │  2000s  2010s [2020s]     │
   │  2030s  2040s  2050s      │
   │  2060s  2070s  2080s      │
   └────────────────────────────┘

5. Drill-down: Click pe element → zoom in
   - Click "2020s" → year view 2020-2029
   - Click "2025" → month view 2025
   - Click "Mar" → day view Martie 2025
   - Click "15" → selectează data
```

---

## Backward Compatibility

Componenta va fi **opt-in**. Calendarul existent rămâne neschimbat.

| Utilizare | Component |
|-----------|-----------|
| Default simplu | `<Calendar />` (neschimbat) |
| Cu dropdowns | `<Calendar captionLayout="dropdown-buttons" fromYear={2020} toYear={2030} />` |
| Full drill-down | `<AdvancedCalendar enableDrillDown enableDecadeView />` |

---

## Actualizare DatePicker în Aplicație

### Opțiunea 1: Quick Win (doar dropdowns)

Modificare minimală în `calendar.tsx`:

```tsx
// Adăugare props pentru dropdown
function Calendar({ 
  className, 
  classNames, 
  showOutsideDays = true,
  captionLayout,
  fromYear,
  toYear,
  ...props 
}: CalendarProps) {
  return (
    <DayPicker
      captionLayout={captionLayout}
      fromYear={fromYear}
      toYear={toYear}
      // ... rest
    />
  );
}
```

Utilizare:
```tsx
<Calendar 
  mode="single" 
  captionLayout="dropdown-buttons"
  fromYear={2015}
  toYear={2035}
  // ...
/>
```

### Opțiunea 2: Full Feature (recomandat)

Utilizare `AdvancedCalendar` în `IncarcareBalanta.tsx`:

```tsx
import { AdvancedCalendar } from "@/components/ui/advanced-calendar";

<AdvancedCalendar
  mode="single"
  selected={referenceDate}
  onSelect={handleDateSelect}
  enableDrillDown
  enableDecadeView
  yearRange={{ from: 2015, to: 2035 }}
  locale={ro}
/>
```

---

## Ordine Implementare

1. **Creare `advanced-calendar.tsx`** - Component complet cu toate view-urile
2. **Adăugare stiluri CSS** în `index.css` - Clase pentru grid și animații
3. **Update `calendar.tsx`** - Export props pentru captionLayout (backward compat)
4. **Update `IncarcareBalanta.tsx`** - Integrare DatePicker avansat
5. **Test** - Verificare pe toate utilizările de Calendar

---

## Rezultat Final

- Navigare rapidă cu 2-3 click-uri la orice dată din ultimii 100 de ani
- UX îmbunătățit pentru selecție date istorice sau viitoare
- Design consistent cu NEWA tokens
- Backward compatible - nu afectează utilizările existente
- Responsive pe mobile și desktop

