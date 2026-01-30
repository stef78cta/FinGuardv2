# Plan: Calendar Avansat cu Month/Year Picker și Drill-down Navigation

## ✅ STATUS: IMPLEMENTAT

---

## Rezumat

Calendar îmbunătățit cu funcționalități avansate de navigare:
1. **Month/Year Picker (Jump-to)** - Click pe header pentru selecție rapidă
2. **Drill-down Date Picker** - Navigare ierarhică An → Lună → Zi
3. **Decade View** - Vizualizare grid de ani pentru navigare rapidă

---

## Componente Create

### `src/components/ui/advanced-calendar.tsx`

Component complet care include:
- State pentru `viewMode`: `'day' | 'month' | 'year' | 'decade'`
- Grid pentru luni (MonthGrid) - 3x4 layout
- Grid pentru ani (YearGrid) - 4x3 layout, 12 ani per view
- Grid pentru decenii (DecadeGrid) - 4x3 layout
- Animații și tranziții
- Integrare cu DayPicker pentru day view

### Props Disponibile

```tsx
interface AdvancedCalendarProps {
  enableDrillDown?: boolean;      // Activează navigare ierarhică (default: true)
  enableDecadeView?: boolean;     // Activează vizualizare decadă (default: true)
  defaultViewMode?: ViewMode;     // 'day' | 'month' | 'year' | 'decade'
  yearRange?: { from: number; to: number }; // Range ani (default: 1950-2100)
  locale?: Locale;                // Locale date-fns (default: ro)
  selected?: Date;                // Data selectată
  onSelect?: (date: Date) => void;// Handler selecție
}
```

---

## Utilizare

```tsx
import { AdvancedCalendar } from "@/components/ui/advanced-calendar";

<AdvancedCalendar
  selected={date}
  onSelect={setDate}
  enableDrillDown
  enableDecadeView
  yearRange={{ from: 2000, to: 2050 }}
  locale={ro}
/>
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
   │     ◀  2020-2029  ▶       │ ← Click pentru decade
   │  2020  2021  2022  2023   │
   │  2024 [2025] 2026  2027   │
   │  2028  2029  2030  2031   │
   └────────────────────────────┘

4. Click pe caption → zoom out la "decade" view
   ┌────────────────────────────┐
   │       2000 - 2099         │
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

## Integrare în Aplicație

### IncarcareBalanta.tsx
- ✅ Înlocuit `<Calendar>` cu `<AdvancedCalendar>`
- ✅ Props: `enableDrillDown`, `enableDecadeView`, `yearRange={{ from: 2000, to: 2050 }}`

---

## Design Tokens Utilizate

- `--newa-state-hover` pentru hover effects
- `--newa-radius-md` pentru border-radius grid items
- `--newa-radius-sm` pentru caption button
- `--newa-focus-ring-color` pentru focus states
- `primary` / `primary-foreground` pentru selected state
