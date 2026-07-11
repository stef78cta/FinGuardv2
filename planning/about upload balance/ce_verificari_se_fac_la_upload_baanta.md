# Verificări și mesaje la upload balanță (finguardv2)

**Document central — suport DUAL format (8 / 10 coloane).**

**Versiune:** v3.1  
**Ultima actualizare:** 11 iulie 2026  
**Status:** Reflectă codul din branch-ul curent (fără modificări de cod în această etapă)

> Aplicația acceptă două formate standard de balanță: **8 coloane (A–H)** și **10 coloane (A–J)**.
> Formatul este **detectat automat per import**; la ambiguitate (exact 9 coloane populate) utilizatorul alege manual.
> Formatul **nu este global** pe companie sau user — fiecare lună/import poate diferi.

---

## 0. Rezumat arhitectură (stare actuală)

| Layer | Fișier(e) | Rol |
|-------|-----------|-----|
| UI pagină | `src/pages/IncarcareBalanta.tsx` | Upload, listă imports, replace lunar, retry |
| Formular + preview | `src/hooks/useBalanceUploadForm.ts`, `src/components/upload/BalanceUploadPreview.tsx` | Parsare la selectare fișier, preview, selector format ambiguu |
| Orchestrare upload | `src/hooks/useTrialBalances.tsx` | Validare blocking → pregătire lună → Storage → INSERT → procesare |
| Pregătire lună | `src/lib/prepareBalanceMonthUpload.ts` → RPC `prepare_balance_month_upload` | O balanță activă per companie/lună; replace opțional |
| Perioadă contabilă | `src/lib/balancePeriod.ts` | `balance_month`, `period_start`, `period_end` din luna selectată |
| Parser + validări | `src/lib/excel-parser.ts` | Detectare format, validări blocking/warning (motor principal) |
| Pipeline procesare | `src/lib/importPipeline.ts` | Edge Function `parse-balanta`, polling, fallback client-side |
| Agregare duplicate | `src/utils/balanceValidation.ts` (`aggregateDuplicateAccounts`) | Sumă conturi duplicate la insert (nu validarea completă v1.3) |
| Edge Function | `supabase/functions/parse-balanta/index.ts` | Re-parsare server-side, RPC `process_import_accounts` |
| Storage | bucket **`balante`** (`src/lib/storage/constants.ts`) | Path: `{company_id}/{timestamp}_{filename}` |
| Rapoarte post-upload | `src/lib/financialStatementsPipeline.ts` | Generare situații financiare după import reușit |
| DB format | `supabase/migrations/20260708120000_add_balance_format_dual_support.sql` | Coloană `balance_format`, RPC/view-uri actualizate |

**Componente existente dar nefolosite în fluxul curent de upload:**
- `src/components/upload/ValidationResultsDialog.tsx` — dialog alternativ; UI activ folosește `BalanceUploadPreview`
- `validateBalance()` din `balanceValidation.ts` — suite v1.3 (16 verificări); **nu** este apelată în fluxul de upload; validările blocking sunt în `excel-parser.ts`

**Teste automate (Vitest):** `npm test`
- `src/lib/excel-parser.test.ts` — **31 teste** (8/10 coloane, ambiguitate, control totals)
- `src/hooks/useBalanceUploadForm.test.ts` — 2 teste
- `src/lib/prepareBalanceMonthUpload.test.ts` — 6 teste

---

## 1. Modelul intern canonic

Indiferent de formatul Excel, după parsare aplicația lucrează cu `ParsedAccount`:

| Câmp canonic | Semnificație |
|---|---|
| `account_code` | Cont (3–6 cifre) |
| `account_name` | Denumire (max 200 caractere) |
| `opening_debit` / `opening_credit` | Sold inițial debitor / creditor |
| `debit_turnover` / `credit_turnover` | **Rulaj LUNAR** debitor / creditor |
| `closing_debit` / `closing_credit` | Sold final debitor / creditor |
| `total_sume_debitoare` / `total_sume_creditoare` | Total sume (citite la 10 coloane, calculate la 8 coloane) |

**Regulă:** `total_sume_*` nu înlocuiesc rulajul lunar sau soldul final în analize. Raportarea folosește `debit_turnover`/`credit_turnover` și `closing_*`.

**Prag numeric global:** `CONTROL_THRESHOLD = 0.01` RON (`excel-parser.ts`).

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
| A–F | (ca mai sus) | SI + rulaj |
| G | `total_sume_debitoare` | Total sume debitoare (din Excel) |
| H | `total_sume_creditoare` | Total sume creditoare (din Excel) |
| I | `closing_debit` | SF Debit |
| J | `closing_credit` | SF Credit |

- `detected_balance_format = "10_COLUMNS"`
- G/H **nu** sunt folosite ca rulaj lunar în analize

---

## 3. Detectare automată a formatului

Funcția `detectBalanceFormat(maxColIndex)` (client + Edge Function), pe baza `getDataMaxColumnIndex`:

| Date până la coloana | Index (0-based) | Rezultat |
|---|---|---|
| H | ≤ 7 | `8_COLUMNS` |
| I (exact 9 coloane) | 8 | `AMBIGUOUS` → alegere manuală în UI |
| J | 9 | `10_COLUMNS` |
| peste J (K+) | > 9 | `INVALID` → blocat |

Opțiune `forcedFormat` la re-parsare (după alegerea userului sau din `balance_format` salvat pe import).

---

## 4. Validări blocking (excel-parser.ts)

Rulează **client-side înainte de upload** (`useBalanceUploadForm` la selectare fișier; `uploadBalance` re-verifică). Replicate în Edge Function.

| Cod | Situație |
|---|---|
| `EXCEL_NO_SHEETS` | Workbook fără foi |
| `EXCEL_INSUFFICIENT_DATA` | < 2 rânduri |
| `EXCEL_AMBIGUOUS_FORMAT` | 9 coloane — necesită alegere |
| `EXCEL_FORCED_FORMAT_MISMATCH` | Format manual contrazice structura |
| `EXCEL_INVALID_COLUMN_COUNT` | Date peste coloana J |
| `EXCEL_MISSING_REQUIRED_COLUMNS` | Lipsesc coloane obligatorii pentru formatul forțat |
| `BALANCE_ROW_ACCOUNT_MISSING` / `BALANCE_ROW_ACCOUNT_INVALID` | Cont lipsă sau invalid |
| `BALANCE_ROW_NAME_TOO_LONG` | Denumire > 200 caractere |
| `BALANCE_INVALID_ROWS_DETECTED` | Agregat erori pe rânduri |
| `BALANCE_CONTROL_OPENING_MISMATCH` | SI Debit ≠ SI Credit |
| `BALANCE_CONTROL_TURNOVER_MISMATCH` | Rulaj D ≠ Rulaj C |
| `BALANCE_CONTROL_TOTAL_MISMATCH` | SF Debit ≠ SF Credit |
| `BALANCE_CONTROL_CLASS6_CLOSING_NOT_ZERO` | Clasa 6, SF nenul |
| `BALANCE_CONTROL_CLASS7_CLOSING_NOT_ZERO` | Clasa 7, SF nenul |
| `BALANCE_ROW_CLOSING_MISMATCH` | (doar 10 col.) SF net ≠ Total Sume D − C |
| `BALANCE_CLOSING_MISMATCH_DETECTED` | Agregat erori identitate sold final |
| `BALANCE_NO_VALID_ACCOUNTS` | Zero conturi valide |

Rotunjiri ≤ 0.01 RON → **warning** (`BALANCE_CONTROL_*_ROUNDING_DIFF`), upload permis.

> `EXCEL_LEGACY_8_COLUMN_FORMAT` — **eliminat**; formatul 8 coloane este acceptat.

---

## 5. Validări warning (non-blocking)

| Cod | Situație |
|---|---|
| `DUPLICATE_ACCOUNTS` | Cod cont duplicat — **warning**; agregare automată la insert |
| `TOTAL_SUME_COMPUTED_FROM_8_COLUMN_FORMAT` | Info la format 8 coloane |
| `MAX_ACCOUNTS_LIMIT_REACHED` | Trunchiere la 10.000 conturi |

---

## 6. Flux complet upload

```
[User] selectează luna (BalanceMonthPicker) + fișier Excel
    ↓
[useBalanceUploadForm] parseExcelFile → preview (BalanceUploadPreview)
    → dacă AMBIGUOUS: dialog 8 vs 10 coloane → re-parse cu forcedFormat
    ↓
[User] Confirmă încărcarea
    ↓
[useTrialBalances.uploadBalance]
    1. parseExcelFile (re-validare; forcedFormat dacă e cazul)
    2. dacă !ok → throw (fără Storage, fără INSERT)
    3. prepare_balance_month_upload (conflict lună / replace)
    4. Storage upload → bucket `balante`
    5. INSERT trial_balance_imports (status=processing, balance_format, balance_month, …)
    6. processImport:
         a) invoke parse-balanta (Edge Fn)
         b) poll status → completed
         c) la eșec Edge Fn → processAccountsClientSide (fallback)
    7. generateFinancialStatementsForImport
    8. refresh listă imports (RPC get_company_imports_with_totals)
```

**Important:** La eșec validare blocking **înainte** de INSERT, nu se creează import în DB (spre deosebire de versiunile vechi care actualizau un rând `error`).

---

## 7. Persistență DB

### `trial_balance_imports`

- `balance_month` — prima zi a lunii (migrare `20260630100000_add_balance_month_to_trial_balance_imports.sql`)
- `balance_format` — `'8_COLUMNS' | '10_COLUMNS' | NULL` (importuri vechi)
- `status` — `draft` | `processing` | `validated` | `completed` | `error`
- Citire UI: view `trial_balance_imports_public` (fallback la tabel dacă view lipsește)

### `trial_balance_accounts`

Per cont: SI, rulaj, SF, `total_sume_*` (calculate sau citite conform formatului).

### RPC-uri relevante

| RPC | Scop |
|-----|------|
| `prepare_balance_month_upload` | Verifică/replace balanță activă pe lună |
| `process_import_accounts` | Insert bulk conturi (+ `p_balance_format`) |
| `get_company_imports_with_totals` | Listă imports cu totaluri + `balance_format` |
| `soft_delete_import` | Ștergere logică |
| `get_import_totals` | Totaluri per import |

---

## 8. Mesaje UX (BalanceUploadPreview)

- **8 coloane:** badge + text despre total_sume calculate și G/H = sold final
- **10 coloane:** badge + text despre G/H = total sume, E/F = rulaj, I/J = SF
- **Ambiguu:** butoane „Format 8 coloane (A–H)” / „Format 10 coloane (A–J)”
- **Erori blocking:** listă în preview; la upload toast error (8s) cu prima linie

---

## 9. Limitări tehnice

| Limită | Valoare | Locație |
|--------|---------|---------|
| Dimensiune fișier | 10 MB | Client + Edge Function |
| Extensii | `.xlsx`, `.xls` | Client |
| MAX_ACCOUNTS | 10.000 | excel-parser |
| PARSE_TIMEOUT | 30s | Edge Function |
| Toleranță control | 0.01 RON | excel-parser |
| Bucket Storage | `balante` | constants.ts + parse-balanta |

---

## 10. Rapoarte și analize

`useFinancialCalculations.tsx` și `generate_financial_statements_from_import` folosesc câmpuri canonice (`opening_*`, `debit_turnover`/`credit_turnover`, `closing_*`), nu `total_sume_*` ca rulaj.

---

## 11. Checklist testare

```bash
npm test -- --run src/lib/excel-parser.test.ts
```

- [x] Acceptă balanță validă 8 coloane (`8_COLUMNS`)
- [x] Acceptă balanță validă 10 coloane (`10_COLUMNS`)
- [x] Calculează `total_sume_*` la 8 coloane
- [x] Validează SF ↔ total_sume doar la 10 coloane
- [x] Respinge date peste J
- [x] Fișier 9 coloane → ambiguu / forced format
- [x] Duplicate → warning (nu blocking)
- [x] Mix ianuarie 8 col + februarie 10 col — rulaje canonice E/F

---

## Fișiere sursă (index)

| Fișier | Rol |
|---|---|
| `src/lib/excel-parser.ts` | Parser + validări blocking/warning |
| `src/lib/importPipeline.ts` | Edge Fn, fallback, formatare erori |
| `src/hooks/useBalanceUploadForm.ts` | Stare formular, parsare la selectare |
| `src/components/upload/BalanceUploadPreview.tsx` | Preview UI activ |
| `src/pages/IncarcareBalanta.tsx` | Pagina upload |
| `src/hooks/useTrialBalances.tsx` | CRUD imports, upload orchestration |
| `src/lib/prepareBalanceMonthUpload.ts` | Wrapper RPC lună |
| `src/lib/balancePeriod.ts` | Calcul perioadă din `balance_month` |
| `src/lib/storage/constants.ts` | Bucket `balante`, view-uri |
| `supabase/functions/parse-balanta/index.ts` | Procesare server |
| `supabase/migrations/20260621000000_stabilize_upload_pipeline.sql` | Pipeline stabilizat |
| `supabase/migrations/20260701120000_prepare_balance_month_upload.sql` | RPC lună |
| `supabase/migrations/20260708120000_add_balance_format_dual_support.sql` | Dual format DB |
| `src/lib/excel-parser.test.ts` | 31 teste Vitest |
