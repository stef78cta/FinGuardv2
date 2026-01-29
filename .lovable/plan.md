

# Plan: Transformare Accordion "Specificații Tehnice" în Help Callout

## Obiectiv

Transformarea secțiunii accordion "Specificații Tehnice și Format Acceptat" într-un element de help vizibil și diferențiat, folosind design tokens NEWA existente (semantic info colors).

---

## Modificări Propuse

### Fișier: `src/pages/IncarcareBalanta.tsx`

**Secțiunea afectată:** Liniile 452-562

### Vizual Nou - Help Callout

| Element | Stil Actual | Stil Nou |
|---------|-------------|----------|
| Container | `bg-white border border-border` | `bg-[var(--newa-alert-info-bg)] border border-[var(--newa-semantic-info)]/30 border-l-4 border-l-[var(--newa-semantic-info)]` |
| Header hover | `hover:bg-muted/30` | `hover:bg-[var(--newa-semantic-info)]/10` |
| Titlu | `font-semibold` simplu | `font-bold` + icon `Info` în stânga |
| Subtitlu | Nu există | Text descriptiv sub titlu |
| Chevron | Standard | Cu animație și culoare accent |
| Conținut | `px-4 pb-4` | `p-5 space-y-6` (padding generos) |

---

## Structură Nouă Header

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ░░│  ℹ  Specificații tehnice și format acceptat           ▼        │
│ ░░│      Vezi structura fișierului, coloanele obligatorii          │
│ ░░│      și regulile de validare.                                  │
└─────────────────────────────────────────────────────────────────────┘
   ^                                                       ^
   │                                                       │
   Bara accent info (border-l-4)                     Chevron animat
```

---

## Detalii Tehnice

### 1. Container Exterior (Help Callout Style)

```tsx
<div className={cn(
  "bg-[var(--newa-alert-info-bg)]",
  "border border-[var(--newa-semantic-info)]/30",
  "border-l-4 border-l-[var(--newa-semantic-info)]",
  "rounded-[var(--newa-radius-md)]",
  "overflow-hidden"
)}>
```

### 2. Header Trigger cu Icon + Subtitlu

```tsx
<CollapsibleTrigger className={cn(
  "w-full flex items-start gap-3 p-4",
  "hover:bg-[var(--newa-semantic-info)]/10",
  "focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-[var(--newa-focus-ring-color)]",
  "focus-visible:ring-offset-2",
  "transition-colors"
)}>
  {/* Icon Info */}
  <Info className="w-5 h-5 text-[var(--newa-semantic-info)] flex-shrink-0 mt-0.5" />
  
  {/* Text Group */}
  <div className="flex-1 text-left">
    <h3 className="font-bold text-foreground">
      Specificații tehnice și format acceptat
    </h3>
    <p className="text-sm text-muted-foreground mt-1">
      Vezi structura fișierului, coloanele obligatorii și regulile de validare.
    </p>
  </div>
  
  {/* Chevron */}
  <ChevronDown className={cn(
    "w-5 h-5 text-[var(--newa-semantic-info)] flex-shrink-0 mt-0.5",
    "transition-transform duration-200",
    detailedSpecsOpen && "rotate-180"
  )} />
</CollapsibleTrigger>
```

### 3. Conținut Cu Padding Generos + Secțiuni Claire

- Formaturi acceptate ca badge-uri
- Coloane obligatorii în grid
- Reguli cheie cu iconițe check
- Exemplu într-un bloc separat

### 4. Structură Conținut Reorganizată

```text
┌──────────────────────────────────────────────────────────────────┐
│ FORMATE ACCEPTATE                                                │
│ [.xlsx] [.xls]  Max 10MB                                        │
├──────────────────────────────────────────────────────────────────┤
│ COLOANE OBLIGATORII (A-H)                                        │
│ ┌──────────┬──────────┬──────────┬──────────┐                   │
│ │ A: Cont  │ B: Denumire│ C: SI D │ D: SI C │                   │
│ │ E: Rul D │ F: Rul C  │ G: SF D │ H: SF C │                   │
│ └──────────┴──────────┴──────────┴──────────┘                   │
├──────────────────────────────────────────────────────────────────┤
│ REGULI CHEIE                                                     │
│ ✓ Prima linie = header (ignorată)                                │
│ ✓ Numere: format românesc (,) sau internațional (.)              │
│ ✓ Conturi: 3-6 cifre                                             │
│ ✓ Linii goale: ignorate automat                                  │
├──────────────────────────────────────────────────────────────────┤
│ EXEMPLU                                                          │
│ [tabel cu 2 rânduri]                                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Design Tokens Utilizate

| Token CSS | Valoare | Utilizare |
|-----------|---------|-----------|
| `--newa-alert-info-bg` | `#EFF6FF` | Fundal container |
| `--newa-semantic-info` | `#3B82F6` | Accent stânga + icon + chevron |
| `--newa-radius-md` | `10px` | Border radius container |
| `--newa-focus-ring-color` | `#6366F1` | Focus ring accesibil |
| `--newa-spacing-4` | `16px` | Padding intern |
| `--newa-spacing-5` | `20px` | Padding conținut |

---

## Comportament

| Aspect | Implementare |
|--------|--------------|
| Stare inițială | Collapsed (păstrat) |
| Click zone | Întregul header (deja implementat) |
| Animație | `transition-transform duration-200` pe chevron |
| Hover | Background `info/10` pe header |
| Focus | Ring `2px` offset `2px` indigo |
| Mobile | Full-width, padding adaptat |

---

## Cod Complet Modificat

Se modifică doar secțiunea din liniile **452-562** din `IncarcareBalanta.tsx`:
- Se păstrează logica existentă (`detailedSpecsOpen`, `setDetailedSpecsOpen`)
- Se schimbă doar stilurile și structura vizuală
- Se adaugă subtitlul descriptiv
- Se reorganizează conținutul pentru scanare ușoară

---

## Rezultat Vizual

- Fundal albastru deschis diferențiat de restul paginii (albe)
- Bara accent info pe stânga pentru a atrage atenția
- Icon help clar vizibil
- Descriere scurtă sub titlu
- Stări hover/focus evidente
- Conținut organizat în secțiuni cu subtitluri

