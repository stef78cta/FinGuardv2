# Plan: Aliniere vizuală tab „Bilanț” din Rapoarte Financiare la Style Guide v2

## Obiectiv
Pagina `Rapoarte Financiare`, în special tab-ul `Bilanț`, să respecte vizual regulile din `src/pages/newa_StyleGuide.tsx` (v2.0), fără modificări de logică, calcule, hooks, query-uri sau structuri de date.

---

## Fișiere analizate

### Pagină + tab Bilanț
- `src/pages/RapoarteFinanciare.tsx` — orchestrarea paginii, toolbar, tabs, Card containers, TabsContent „bilant”.
- `src/components/financial-reports/FinancialTreeTable.tsx` — orchestratorul tabelului (nu se modifică — doar clase vizuale la Alert).
- `src/components/financial/FinancialTreeReportTable.tsx` — grid-ul AG Grid pentru Bilanț.
- `src/components/financial/financialTreeStyles.css` — stiluri scoped ale grid-ului financiar.
- `src/components/financial/financialTreeColumns.ts` — doar citit pentru clase de coloane numerice (nu se modifică logica).

### Style guide de referință
- `src/pages/newa_StyleGuide.tsx` (v2.0) — tokens scoped `--fpsg-*`.
- `src/index.css` + `tailwind.config.ts` — tokens globali existenți (`--primary`, `--muted`, `--border`, `--accent`, `--destructive`, `.card-app`, `.page-title`, `.btn-primary`, `.table-financial`, `.label-micro`, `card-accent-*`).

---

## Reguli extrase din Style Guide v2 (relevante pentru Bilanț)

| Zona | Regulă v2 |
|------|-----------|
| Culori text | primary `#0F172A`, secondary `#475569`, muted `#94A3B8` |
| Accent | indigo `#6366F1`, emerald `#34D399`, rose `#F43F5E`, amber `#F59E0B` |
| Suprafețe | card `#FFFFFF`, canvas `#F8FAFC` |
| Border | default `#E2E8F0`, focus `#6366F1` |
| Radius | card `20px`, buton `40px` (pill), input `8px` |
| Typography | valori financiare `font-mono font-bold`, label secundar `text-[10px] uppercase tracking-widest` (`.label-micro`) |
| Tabs | pattern underline (`border-b-2 border-indigo-500` pe tab activ), nu pill background |
| Tabel | header `bg-slate-50`, hover row `bg-indigo-50/30`, negativ `text-rose-600`, tabular-nums |
| Butoane | primary pill indigo; secondary outline pill; toolbar icon-buttons uniformi ca înălțime |
| Alert/warning | fundal `#FFFBEB` + border `#F59E0B` (warning) |
| Card | `rounded-[20px]`, umbră discretă, separator subțire în header |

---

## Diferențe identificate (actual vs v2)

1. **Card containers** din pagină folosesc radius default shadcn (`rounded-lg`), nu `rounded-[20px]` conform v2.
2. **Toolbar card** (linia 385) — padding `p-4` OK, dar Label „Balanță selectată” folosește `text-xs text-muted-foreground` în loc de pattern `.label-micro` (uppercase tracking).
3. **Tabs** (`TabsList`) folosește stilul default shadcn (fundal muted, pill activ). v2 recomandă underline indigo pentru tab activ.
4. **Header tab Bilanț** (`Bilanț contabil`) — border-bottom generic; poate primi accent stânga (`card-accent-indigo`) și subtitlu în `.label-micro` conform v2.
5. **Butoane toolbar** — folosesc `variant="outline"` shadcn cu radius mic; v2 preferă pill (rounded-[40px]) sau cel puțin uniformizate și alignate cu heights `h-9`/`h-10` din memoria de header-alignment.
6. **Alert „Bilanțul nu se închide”** (în `FinancialTreeTable.tsx`) folosește `border-amber-500/50 bg-amber-500/5` — poate deveni consistent cu token semantic warning din v2 (`bg-[#FFFBEB]` + border amber solid) prin utilitare Tailwind semantice.
7. **Grid financiar** (`financialTreeStyles.css`):
   - `--ag-row-hover-color` folosește muted; v2 preferă hover indigo foarte diluat (`indigo-50/30`).
   - `.fin-row-section` folosește muted; v2 acceptă, dar consistent cu paleta indigo/slate ar fi `slate-50` pentru rânduri de secțiune.
   - Culoarea negativelor este `#dc2626` hardcodat; v2 folosește `#F43F5E` (rose) — aliniere la token.
   - `fin-row-warning` folosește `hsl(45 93% 47% / 0.08)` — poate folosi tokenul amber din v2.
8. **Loading state** — `text-primary` OK; păstrat.
9. **Empty state „Nu există linii de bilanț”** — text simplu; poate primi container discret (`bg-muted/30 rounded-[20px]`) pentru consistență cu v2 UI states.
10. **PageHeader** — folosește `.page-title` și `.page-description` existente, deja compatibile v2.

---

## Modificări propuse (strict vizuale)

### 1. `src/pages/RapoarteFinanciare.tsx`
- Adaugă `rounded-[20px]` pe toate `<Card>`-urile din pagină (toolbar card, tab content cards, empty-state card).
- Toolbar Label „Balanță selectată”: schimbă `text-xs text-muted-foreground` → `label-micro` (dacă clasa există; altfel `text-[10px] font-bold text-muted-foreground uppercase tracking-widest`).
- `TabsList`: adaugă clase pentru pattern underline v2 — `bg-transparent border-b border-border p-0 h-auto`, iar `TabsTrigger` primește `data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none px-4 py-2`.
- Header „Bilanț contabil”: aplică `card-accent-indigo` pe cardul tab-ului Bilanț și convertește sub-title la `.label-micro` peste titlu (fără schimbare de text).
- Toolbar butoane: uniformizează `size="sm"` → `h-9`, adaugă `rounded-[40px]` pentru consistență pill; `btn-primary` deja folosit rămâne.
- Empty-states și loading rămân funcțional identice, doar containerele preiau radius v2.

### 2. `src/components/financial-reports/FinancialTreeTable.tsx`
- Alert warning: înlocuiește `border-amber-500/50 bg-amber-500/5 text-foreground` cu clase aliniate token semantic warning v2 (`bg-[hsl(45_100%_96%)] border-amber-500 text-foreground` sau clasă utilitară deja existentă `alert-warning` dacă apare în `index.css`; altfel se lasă utilitare Tailwind semantice).
- Buton „Vezi detalii diferență”: `rounded-[40px]` pentru consistență pill.

### 3. `src/components/financial/financialTreeStyles.css`
- `--ag-row-hover-color`: schimbă în `color-mix(in srgb, var(--primary) 8%, transparent)` (hover indigo foarte diluat).
- `--ag-header-background-color`: `color-mix(in srgb, var(--muted) 55%, transparent)` → păstrat, dar reglat spre `slate-50`.
- `.fin-row-section`: fundal `color-mix(in srgb, var(--primary) 4%, transparent)` pentru accent v2.
- `.ag-cell.fin-value-negative`: schimbă `#dc2626 !important` → `hsl(var(--destructive)) !important` (mapează pe rose v2 din tokens).
- `.fin-row-warning`: fundal aliniat token warning (`color-mix(in srgb, #F59E0B 10%, transparent)`).
- Font header numeric: `font-weight: 600` păstrat; se adaugă `letter-spacing: 0.02em` pentru un look mai „report”.

### 4. (Opțional) `src/index.css`
- Dacă `.label-micro` sau `.card-accent-indigo` nu există deja global, se adaugă mici utilitare (deja definite în plan v1.3 conform memoriei — verific și adaug doar dacă lipsesc). Fără modificări de tokens globali.

---

## Ce NU se modifică
- `useGeneratedFinancialStatements`, `useStatementLineDefinitions`, `useBalante`, `useBalanceSheetDiagnostic` — 0 modificări.
- `buildFinancialTreeRows`, `applyParentChildValidation`, `checkBalanceSheetEquation` — 0 modificări.
- Export Excel/PDF, print, email — 0 modificări.
- `financialTreeColumns.ts`, `financialTreeMapper.ts` — 0 modificări (păstrează formatare, agregări, ordine).
- Comportament expand/collapse, quick filter, layout persistence — 0 modificări.
- Structuri de date, denumiri câmpuri, query-uri Supabase — 0 modificări.

---

## Riscuri identificate
1. Modificarea `TabsList` la pattern underline poate afecta vizual și tab-urile `Profit & Pierdere` / `Cash Flow` (același `TabsList`). Este acceptabil — consistență în toată pagina, fără schimbare de logică.
2. Schimbarea `--ag-row-hover-color` și `.fin-row-section` afectează orice pagină care folosește `.financial-tree-report` (clasa e scoped, deci doar tabele financiare — efectul e dorit, consistență globală).
3. Înlocuirea `#dc2626` → token `--destructive` schimbă nuanța roșu spre rose v2 în TOATE grid-urile financiare. Este exact ce cere style-guide-v2.
4. `rounded-[20px]` pe carduri poate crea o discrepanță scurtă cu alte pagini care încă folosesc `rounded-lg`. Nu este blocant — poate fi propagat ulterior.

---

## Pași de verificare vizuală (după implementare)
1. Deschide `/app/rapoarte-financiare`, selectează o balanță cu rapoarte generate.
2. Verifică tab-ul `Bilanț`:
   - Card cu radius 20px + accent indigo stânga.
   - Toolbar cu butoane pill uniforme.
   - Tabs cu underline indigo pe activ, fără fundal pill.
   - Grid: header slate deschis, hover row indigo diluat, valori negative rose, secțiuni cu fundal foarte fin.
   - Alert warning „Bilanțul nu se închide” cu fundal amber deschis + border amber.
3. Verifică pe mobil: toolbar wrap, tabs full-width.
4. Verifică tab-urile `P&L` și `Cash Flow` — trebuie să rămână funcționale, doar Tabs-ul preia stilul underline.
5. Rulează un export Excel + Print — trebuie să funcționeze identic (nemodificate).

---

## Estimare linii modificate
- `RapoarteFinanciare.tsx`: ~15 linii (className)
- `FinancialTreeTable.tsx`: ~2 linii (className Alert + Button)
- `financialTreeStyles.css`: ~8 linii (variabile CSS și 2 reguli)
- `index.css`: 0-10 linii (doar dacă `.label-micro` / `.card-accent-indigo` lipsesc)

Total: ~25-35 linii, exclusiv stiluri.
