# Verificări și mesaje la upload balanță (finguardv2)

**Document central pentru upload balanță — suport DUAL format (8 / 10 coloane).**

**Versiune format:** v3.0 — **două formate acceptate: 8 coloane (A–H) și 10 coloane (A–J)**
**Ultima actualizare:** Iulie 2026

> Aplicația acceptă două formate standard de balanță: **8 coloane** și **10 coloane**.
> Formatul este **detectat automat per import**, iar în caz de ambiguitate utilizatorul poate
> selecta manual formatul. Formatul **nu este o setare globală** pe companie sau user — fiecare
> lună/import poate avea un format diferit (ex. ianuarie 8 coloane, februarie 10 coloane).

Document generat din analiza codului sursă: `IncarcareBalanta.tsx`, `BalanceUploadPreview.tsx`,
`useBalanceUploadForm.ts`, `useTrialBalances.tsx`, `excel-parser.ts`, `importPipeline.ts`,
`balanceValidation.ts`, Edge Function `parse-balanta`, migrația `20260708120000_add_balance_format_dual_support.sql`.

---

## 1. Modelul intern canonic

Indiferent de formatul fișierului, după parsare aplicația lucrează cu un singur model canonic
(`ParsedAccount`). **Nicio poziție de coloană Excel nu iese din parser** — rapoartele, KPI-urile
și analizele lunare folosesc exclusiv câmpurile canonice:

| Câmp canonic | Semnificație |
|---|---|
| `account_code` | Cont (3–6 cifre) |
| `account_name` | Denumire (max 200 caractere) |
| `opening_debit` / `opening_credit` | Sold inițial debitor / creditor |
| `debit_turnover` / `credit_turnover` | **Rulaj LUNAR** debitor / creditor |
| `closing_debit` / `closing_credit` | Sold final debitor / creditor |
| `total_sume_debitoare` / `total_sume_creditoare` | Total sume (citite la 10 coloane, calculate la 8 coloane) |

**Regulă critică:** `total_sume_*` NU sunt folosite niciodată ca rulaj lunar sau ca sold final.
Analiza lunară folosește `debit_turnover`/`credit_turnover`; soldurile finale folosesc
`closing_debit`/`closing_credit`.

---

## 2. Mapping coloane per format

### Format 8 coloane (A–H)

| Coloană | Câmp canonic | Descriere |
|---|---|---|
| A | `account_code` | Cont |
| B | `account_name` | Denumire |
| C | `opening_debit` | SI Debit |
| D | `opening_credit` | SI Credit |
| E | `debit_turnover` | Rulaj lunar debitor |
| F | `credit_turnover` | Rulaj lunar creditor |
| G | `closing_debit` | **SF Debit** |
| H | `closing_credit` | **SF Credit** |

- `total_sume_debitoare = opening_debit + debit_turnover` (calculat intern)
- `total_sume_creditoare = opening_credit + credit_turnover` (calculat intern)
- `detected_balance_format = "8_COLUMNS"`

### Format 10 coloane (A–J)

| Coloană | Câmp canonic | Descriere |
|---|---|---|
| A | `account_code` | Cont |
| B | `account_name` | Denumire |
| C | `opening_debit` | SI Debit |
| D | `opening_credit` | SI Credit |
| E | `debit_turnover` | Rulaj lunar debitor |
| F | `credit_turnover` | Rulaj lunar creditor |
| G | `total_sume_debitoare` | **Total sume debitoare** (citit din Excel) |
| H | `total_sume_creditoare` | **Total sume creditoare** (citit din Excel) |
| I | `closing_debit` | SF Debit |
| J | `closing_credit` | SF Credit |

- `detected_balance_format = "10_COLUMNS"`
- G/H sunt **ignorate pentru analiza rulajelor lunare** (nu sunt rulaj, ci total cumulat).

---

## 3. Detectare automată a formatului

Funcția `detectBalanceFormat(maxColIndex)` (client + Edge Function), pe baza celui mai mare index
de coloană cu date (`getDataMaxColumnIndex`, incluzând header-ul):

| Date până la coloana | Index (0-based) | Rezultat |
|---|---|---|
| H | ≤ 7 | `8_COLUMNS` |
| I (exact 9 coloane) | 8 | `AMBIGUOUS` (cere alegere manuală) |
| J | 9 | `10_COLUMNS` |
| peste J (K+) | > 9 | `INVALID` (blocat) |

- Dacă există header, numărul de coloane populate din header participă la `maxColIndex` (semnal suplimentar).
- Dacă utilizatorul alege manual formatul, parserul validează alegerea față de structura reală
  (`forcedFormat`); dacă alegerea contrazice structura → `EXCEL_FORCED_FORMAT_MISMATCH`.

---

## 4. Validări comune (ambele formate)

Rulează în `excel-parser.ts` (client, blocking) **înainte** de upload, replicate în Edge Function.

- Cont lipsă → `BALANCE_ROW_ACCOUNT_MISSING`
- Cont invalid (nu 3–6 cifre) → `BALANCE_ROW_ACCOUNT_INVALID`
- Denumire > 200 caractere → `BALANCE_ROW_NAME_TOO_LONG`
- Rânduri complet goale → ignorate
- Celule numerice goale → tratate ca 0
- Duplicate cod cont → **warning** + agregare automată la insert
- Echilibru global (toleranță **0,01 RON**):
  - Total SI Debit = Total SI Credit → `BALANCE_CONTROL_OPENING_MISMATCH`
  - Total Rulaj Debit = Total Rulaj Credit → `BALANCE_CONTROL_TURNOVER_MISMATCH`
  - Total SF Debit = Total SF Credit → `BALANCE_CONTROL_TOTAL_MISMATCH`
- Conturi clasa 6/7 cu sold final nenul → `BALANCE_CONTROL_CLASS6/7_CLOSING_NOT_ZERO`
- Zero conturi valide → `BALANCE_NO_VALID_ACCOUNTS`

## 5. Validări specifice format 8 coloane

- G/H sunt **sold final** (NU total sume).
- `total_sume_*` sunt **calculate intern** din SI + rulaj (warning informativ
  `TOTAL_SUME_COMPUTED_FROM_8_COLUMN_FORMAT`).
- **NU** se aplică validarea per-rând `SF ↔ total_sume` (fișierul nu conține total_sume).

## 6. Validări specifice format 10 coloane

- G/H sunt **total sume** (citite ca atare, pot fi lunare sau cumulate).
- I/J sunt **sold final**.
- Identitate per rând blocking (toleranță 0,01 RON):
  `(SF Debit − SF Credit) = (Total Sume Debitoare − Total Sume Creditoare)`
  → `BALANCE_ROW_CLOSING_MISMATCH` / agregat `BALANCE_CLOSING_MISMATCH_DETECTED`.

---

## 7. Mesaje de eroare (coduri)

| Cod | Situație |
|---|---|
| `EXCEL_NO_SHEETS` | Workbook fără foi |
| `EXCEL_INSUFFICIENT_DATA` | < 2 rânduri (header + date) |
| `EXCEL_AMBIGUOUS_FORMAT` | Structură ambiguă (9 coloane) — necesită alegere manuală |
| `EXCEL_FORCED_FORMAT_MISMATCH` | Formatul ales manual contrazice structura fișierului |
| `EXCEL_INVALID_COLUMN_COUNT` | Date peste coloana J sau structură necorespunzătoare |
| `BALANCE_CLOSING_MISMATCH_DETECTED` | (10 coloane) SF ≠ Total Sume D − Total Sume C |
| `BALANCE_CONTROL_OPENING/TURNOVER/TOTAL_MISMATCH` | Dezechilibru global SI / Rulaj / SF |
| `BALANCE_CONTROL_CLASS6/7_CLOSING_NOT_ZERO` | Clasa 6/7 cu sold final nenul |
| `BALANCE_NO_VALID_ACCOUNTS` | Zero conturi valide |

> Nota: eroarea `EXCEL_LEGACY_8_COLUMN_FORMAT` **a fost eliminată** — formatul 8 coloane este acum
> acceptat, nu respins.

### Mesaje UX (pagina „Încărcare balanță")

- 8 coloane: „Format detectat: balanță 8 coloane. Coloanele Total sume nu există în fișier și sunt
  calculate automat din sold inițial + rulaj lunar. Coloanele G/H sunt interpretate ca sold final."
- 10 coloane: „Format detectat: balanță 10 coloane. Coloanele Total sume (G/H) sunt citite din Excel
  și validate, dar analiza lunară folosește rulajele lunare din coloanele E/F. Soldul final din I/J."
- Ambiguu: dialog cu două butoane — „Format 8 coloane (A–H)" / „Format 10 coloane (A–J)".
- Date peste J: „Fișierul conține date peste coloana J. Sunt acceptate doar formatele standard cu
  8 coloane sau 10 coloane."

---

## 8. Flux client → Edge Function → Supabase

```
UI → parseExcelFile (client, detectare + validare blocking, forcedFormat opțional)
   → Storage upload
   → INSERT trial_balance_imports (inclusiv balance_format detectat)
   → Edge Function parse-balanta (re-parsare cu balance_format ca forcedFormat)
       → process_import_accounts RPC (p_balance_format) → status completed
   → (fallback client-side dacă Edge eșuează: processAccountsClientSide setează balance_format)
```

- Clientul și Edge Function folosesc **aceeași logică** de detectare/normalizare/validare.
- Edge Function preia `balance_format` din import (setat de client) ca format forțat → aliniere garantată.

---

## 9. Persistență DB

- Coloană nouă `trial_balance_imports.balance_format` (`'8_COLUMNS' | '10_COLUMNS' | NULL`),
  cu `CHECK`. Migrație: `20260708120000_add_balance_format_dual_support.sql`.
- Formatul este salvat **per import** (nu global).
- `trial_balance_accounts` salvează pentru fiecare cont: SI, rulaj, SF, `total_sume_*`.
  - 8 coloane: `total_sume_*` = valori calculate (SI + rulaj).
  - 10 coloane: `total_sume_*` = valori citite din Excel.
- View-uri actualizate: `trial_balance_imports_public`, `trial_balance_imports_internal`,
  `active_trial_balance_imports`; RPC `get_company_imports_with_totals` expune `balance_format`.

---

## 10. Rapoarte și analize lunare

`useFinancialCalculations.tsx` și `generate_financial_statements_from_import` folosesc **doar**
câmpuri canonice: `opening_*`, `debit_turnover`/`credit_turnover`, `closing_*`.
`total_sume_*` **nu** sunt folosite în calculele de raportare — deci luni cu formate diferite
(8 vs 10) se compară corect pentru că toate folosesc rulajele E/F și soldurile finale canonice.

---

## 11. Checklist de testare

Fișier: `src/lib/excel-parser.test.ts` (Vitest) — `npm test`.

- [x] Acceptă balanță validă 8 coloane; detectează `8_COLUMNS`.
- [x] Mapează corect A–H (G/H = sold final).
- [x] Calculează `total_sume_* = SI + rulaj`.
- [x] Nu returnează `EXCEL_LEGACY_8_COLUMN_FORMAT`.
- [x] Nu aplică validarea per-rând total_sume la 8 coloane.
- [x] Acceptă balanță validă 10 coloane; detectează `10_COLUMNS`.
- [x] G/H = total_sume, I/J = sold final; total_sume NU sunt rulaj.
- [x] Validează identitatea SF ↔ total_sume la 10 coloane.
- [x] Respinge date peste J (`EXCEL_INVALID_COLUMN_COUNT`).
- [x] Fișier 9 coloane → `EXCEL_AMBIGUOUS_FORMAT`.
- [x] Forțare format contradictorie → `EXCEL_FORCED_FORMAT_MISMATCH`.
- [x] Import ianuarie 8 coloane + februarie 10 coloane → rulaje canonice identice E/F.

---

## Fișiere sursă relevante

| Fișier | Rol |
|---|---|
| `src/lib/excel-parser.ts` | Detectare format + parsare + validări (motor comun `runParse`) |
| `src/lib/importPipeline.ts` | Formatare erori, procesare server/fallback, persistă balance_format |
| `src/hooks/useBalanceUploadForm.ts` | Stare upload, format detectat, alegere manuală |
| `src/components/upload/BalanceUploadPreview.tsx` | Badge format, mesaje UX, selector ambiguitate |
| `src/pages/IncarcareBalanta.tsx` | UI upload, ghid dual 8/10 coloane |
| `src/hooks/useTrialBalances.tsx` | Orchestrare flux upload + balance_format |
| `supabase/functions/parse-balanta/index.ts` | Procesare server-side aliniată (dual-format) |
| `supabase/migrations/20260708120000_add_balance_format_dual_support.sql` | Coloană balance_format + RPC + view-uri |
| `src/lib/excel-parser.test.ts` | Teste Vitest (8/10 coloane, ambiguitate, mixt) |
