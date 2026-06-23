# 🧪 Ghid Testare Upload Balanță - finguardv2

**Versiune:** v2.1 (format 10 coloane A–J)  
**Data:** Iunie 2026  
**Scop:** Suită completă de teste pentru validarea implementării upload balanță

---

## 📋 Cuprins

1. [Setup Mediu Testare](#setup-mediu-testare)
2. [Fișiere Test Excel](#fișiere-test-excel)
3. [Scenarii de Test](#scenarii-de-test)
4. [Validări Critice](#validări-critice)
5. [Validări Warning](#validări-warning)
6. [Edge Cases](#edge-cases)
7. [Performance Tests](#performance-tests)
8. [Checklist Final](#checklist-final)

---

## 🛠️ Setup Mediu Testare

### Prerequisites:

```bash
# 1. Asigură-te că ai latest migrări aplicate
cd c:\_Software\SAAS\finguardv2
supabase db push

# 2. Verifică că bucket 'trial-balances' există
# Supabase Dashboard → Storage → Verifică 'trial-balances'

# 3. Creează cont test (dacă nu există)
# Supabase Dashboard → Authentication → Add User
# Email: test@finguard.ro
# Password: Test123!@#

# 4. Creează companie test
# Login cu test@finguard.ro
# Dashboard → Companii → Adaugă companie
# Nume: "Test Company SRL"
# CUI: "RO12345678"

# 5. Start dev server + teste automate parser
npm run dev
npm test
```

### Structură Fișiere Test:

```
c:\_Software\SAAS\finguardv2\testing\
├── fixtures\
│   ├── valid\
│   │   ├── balanta_simpla_valida.xlsx         # 3 conturi, 10 coloane, echilibrate
│   │   ├── balanta_complexa_valida.xlsx       # 100 conturi, echilibrate
│   │   └── balanta_mare_valida.xlsx           # 1000 conturi, echilibrate
│   ├── invalid\
│   │   ├── balanta_format_vechi_8_coloane.xlsx # Respinge EXCEL_LEGACY_8_COLUMN_FORMAT
│   │   ├── balanta_total_sume_incorect.xlsx   # G/H ≠ formule
│   │   ├── balanta_dezechilibrata_opening.xlsx
│   │   ├── balanta_dezechilibrata_turnover.xlsx
│   │   ├── balanta_dezechilibrata_closing.xlsx
│   │   ├── balanta_duplicate_conturi.xlsx
│   │   ├── balanta_format_invalid.xlsx
│   │   ├── balanta_clase_lipsa.xlsx
│   │   └── balanta_ecuatie_incorecta.xlsx
│   └── edge_cases\
│       ├── balanta_goala.xlsx
│       ├── balanta_valori_negative.xlsx
│       ├── balanta_solduri_duale.xlsx
│       └── balanta_outliers.xlsx
└── README.md (acest fișier)
```

---

## 📊 Fișiere Test Excel

### Template Standard (Coloane A–J):

| A: Cont | B: Denumire | C: SI D | D: SI C | E: Rulaj D | F: Rulaj C | G: Tot. D | H: Tot. C | I: SF D | J: SF C |
|---------|-------------|---------|---------|------------|------------|-----------|-----------|---------|---------|
| 1012 | Bănci | 10000 | 0 | 5000 | 3000 | 15000 | 3000 | 12000 | 0 |

**Formule obligatorii:** G = C + E, H = D + F. SF în coloanele I și J.

---

### 1. balanta_simpla_valida.xlsx ✅

**Descriere:** Balanță minimală validă cu 3 conturi echilibrate.

**Conturi:**

| Cont | Denumire | SI D | SI C | Rulaj D | Rulaj C | Tot. D | Tot. C | SF D | SF C |
|------|----------|------|------|---------|---------|--------|--------|------|------|
| 1012 | Bănci | 10000.00 | 0.00 | 5000.00 | 3000.00 | 15000.00 | 3000.00 | 12000.00 | 0.00 |
| 4111 | Venituri din vânzări | 0.00 | 10000.00 | 0.00 | 5000.00 | 0.00 | 15000.00 | 0.00 | 15000.00 |
| 6111 | Cheltuieli cu materiale | 0.00 | 0.00 | 3000.00 | 0.00 | 3000.00 | 0.00 | 3000.00 | 0.00 |

**Totaluri:**
- Opening: Debit=10000, Credit=10000, Diff=0 ✅
- Turnover: Debit=8000, Credit=8000, Diff=0 ✅
- Closing: Debit=15000, Credit=15000, Diff=0 ✅

**Așteptat:**
- ✅ Validare reușită
- ✅ 0 erori, 0 warnings
- ✅ Upload permis

---

### 2. balanta_dezechilibrata_opening.xlsx ❌

**Descriere:** Balanță cu solduri inițiale dezechilibrate.

**Modificare:** Schimbă SI Credit pentru 4111 la 9000 (în loc de 10000)

**Totaluri:**
- Opening: Debit=10000, Credit=9000, Diff=**1000** ❌

**Așteptat:**
- ❌ Eroare blocking `BALANCE_CONTROL_OPENING_MISMATCH`
- Mesaj: "Total Sold inițial Debit nu este egal cu Total Sold inițial Credit (diferență: 1000.00 RON)"
- Details: `{ opening_debit: 10000, opening_credit: 9000, difference: 1000 }`
- Upload blocat (înainte de Storage)

---

### 3. balanta_duplicate_conturi.xlsx ❌/⚠️

**Descriere:** Balanță cu același cod cont de 2 ori.

**Conturi:**

| Cont | Denumire | SI D | SI C | Rulaj D | Rulaj C | Tot. D | Tot. C | SF D | SF C |
|------|----------|------|------|---------|---------|--------|--------|------|------|
| 1012 | Bănci BRD | 5000.00 | 0.00 | 2000.00 | 1000.00 | 7000.00 | 1000.00 | 6000.00 | 0.00 |
| 1012 | Bănci ING | 5000.00 | 0.00 | 3000.00 | 2000.00 | 8000.00 | 2000.00 | 6000.00 | 0.00 |
| 4111 | Venituri | 0.00 | 10000.00 | 0.00 | 3000.00 | 0.00 | 13000.00 | 0.00 | 13000.00 |
| 6111 | Cheltuieli | 0.00 | 0.00 | 3000.00 | 0.00 | 3000.00 | 0.00 | 3000.00 | 0.00 |

**Așteptat (ENV default - agregare OFF):**
- ❌ Eroare `DUPLICATE_ACCOUNTS`
- Mesaj: "1 cod(uri) duplicate detectate. Fiecare cont trebuie să fie unic."
- Conturi afectate: `["1012"]`
- Upload blocat

**Așteptat (ENV agregare ON):**
- ⚠️ Warning `DUPLICATE_ACCOUNTS`
- Mesaj: "1 cod(uri) duplicate detectate. Vor fi agregate automat."
- Conturi afectate: `["1012"]`
- Upload permis cu agregare

---

### 4. balanta_format_invalid.xlsx ❌

**Descriere:** Conturi cu format OMFP invalid.

**Conturi invalide:**
- `12` (prea scurt - minim 3 cifre)
- `10123456` (prea lung - maxim 6 cifre + opțional .XX)
- `ABC123` (conține litere)
- `9111` (clasa 9 - invalida pentru balanță standard)

**Așteptat:**
- ❌ Eroare `INVALID_ACCOUNT_FORMAT`
- Mesaj: "4 cont(uri) cu format invalid. Verificați codul conturilor."
- Conturi afectate: `["12", "10123456", "ABC123", "9111"]`
- Upload blocat

---

### 5. balanta_ecuatie_incorecta.xlsx ⚠️

**Descriere:** Ecuație contabilă nerespectată (SI + Rulaj ≠ SF).

**Exemplu cont 1012:**
- Opening: D=10000, C=0 → Net=10000
- Turnover: D=5000, C=3000 → Net=+2000
- Calculated Closing: 10000 + 2000 = **12000** Net Debit
- Actual Closing: D=11000, C=0 → Net=11000 ❌ (diferență -1000)

**Așteptat:**
- ⚠️ Warning `ACCOUNT_EQUATION_MISMATCH`
- Mesaj: "1 cont(uri) cu ecuație contabilă nerespectată (SI + Rulaj ≠ SF)."
- Conturi afectate: `["1012"]`
- Details: `{ code: "1012", difference: -1000 }`
- Upload permis (warning, nu eroare)

---

## 🧪 Scenarii de Test

### Scenariu 1: Upload Balanță Validă (Happy Path) ✅

**Pași:**
1. Login ca test@finguard.ro
2. Navighează la `/incarcare-balanta`
3. Selectează data referință: 31.01.2026
4. Upload fișier: `balanta_simpla_valida.xlsx`
5. Așteaptă procesare (5-10s)

**Așteptat:**
- ✅ Progress bar: 0% → 30% → 100%
- ✅ Toast success: "Balanța a fost încărcată și procesată cu succes!"
- ✅ Tabel balanțe: nou rând cu status "Procesat"
- ✅ Totaluri: Debit=15000 RON, Credit=15000 RON, 3 conturi
- ✅ Fișier în storage: `trial-balances/<company_id>/<timestamp>_balanta_simpla_valida.xlsx`

---

### Scenariu 2: Upload Balanță Dezechilibrată (Eroare Critică) ❌

**Pași:**
1. Upload fișier: `balanta_dezechilibrata_opening.xlsx`
2. Verifică dialog validare

**Așteptat:**
- ❌ Toast error (8s): mesaj blocking cu prefix `❌`
- Cod: `BALANCE_CONTROL_OPENING_MISMATCH`
- Mesaj: "Total Sold inițial Debit nu este egal cu Total Sold inițial Credit (diferență: 1000.00 RON)"
- Detalii în consolă: Sold inițial Debit/Credit + Diferență
- ❌ Upload NU este executat (blocat înainte de Storage)

---

### Scenariu 3: Upload cu Warnings (Permis dar Avertizare) ⚠️

**Pași:**
1. Upload fișier: `balanta_ecuatie_incorecta.xlsx`
2. Verifică dialog validare

**Așteptat:**
- ⚠️ Dialog modal: "Validare Reușită" (cu warnings)
- Warnings (1):
  - Badge galben: "Avertizare"
  - Cod: `ACCOUNT_EQUATION_MISMATCH`
  - Mesaj: "1 cont(uri) cu ecuație contabilă nerespectată..."
  - Conturi afectate: 1012
- Alert box galben: "Poți continua cu încărcarea, dar revizuiește aceste avertizări."
- Buton "Confirmă Încărcarea": **ENABLED**
- User poate alege:
  - Confirmă → Upload executat cu warning
  - Anulează → Revenire la formular

---

### Scenariu 4: Upload Duplicate - Agregare ON 🔄

**Setup:**
```bash
# Setează ENV (dacă implementat)
export AGGREGATE_DUPLICATES=true
# SAU schimbă hard-coded în balanceValidation.ts temporar
```

**Pași:**
1. Upload fișier: `balanta_duplicate_conturi.xlsx`
2. Verifică dialog validare

**Așteptat:**
- ⚠️ Warning `DUPLICATE_ACCOUNTS`
- Mesaj: "1 cod(uri) duplicate detectate. Vor fi agregate automat."
- Upload permis
- **Post-upload:** Conturi agregate (suma valorilor pentru cont 1012)

---

### Scenariu 5: Upload Fișier Mare (Performance) ⚡

**Fișier:** `balanta_mare_valida.xlsx` (1000 conturi)

**Pași:**
1. Upload fișier mare
2. Monitorizează timp procesare

**Așteptat:**
- Parsare: < 5 secunde
- Validare: < 1 secundă
- Upload total: < 15 secunde
- UI responsive (progress bar actualizat)
- Nicio blocare browser

---

## ✅ Validări Critice (8 Teste)

### Test V1: Listă nu e goală ✅

**Input:** `balanta_goala.xlsx` (doar header, fără date)  
**Așteptat:** Eroare `EMPTY_BALANCE`  
**Status:** [ ]

---

### Test V2: Echilibru Solduri Inițiale ✅

**Input:** `balanta_dezechilibrata_opening.xlsx`  
**Așteptat:** Eroare blocking `BALANCE_CONTROL_OPENING_MISMATCH`  
**Status:** [ ]

---

### Test V3: Echilibru Rulaje ✅

**Input:** `balanta_dezechilibrata_turnover.xlsx`  
**Așteptat:** Eroare blocking `BALANCE_CONTROL_TURNOVER_MISMATCH`  
**Status:** [ ]

---

### Test V4: Echilibru Solduri Finale ✅

**Input:** `balanta_dezechilibrata_closing.xlsx`  
**Așteptat:** Eroare blocking `BALANCE_CONTROL_TOTAL_MISMATCH`  
**Status:** [ ]

---

### Test V4b: Clasa 6 — sold final zero ✅

**Input:** fișier cu cont 6xx și SF Debit/Credit ≠ 0  
**Așteptat:** Eroare blocking `BALANCE_CONTROL_CLASS6_CLOSING_NOT_ZERO`  
**Status:** [ ]

---

### Test V4c: Clasa 7 — sold final zero ✅

**Input:** fișier cu cont 7xx și SF Debit/Credit ≠ 0  
**Așteptat:** Eroare blocking `BALANCE_CONTROL_CLASS7_CLOSING_NOT_ZERO`  
**Status:** [ ]

---

### Test V4d: Structură coloane (exact A–J) ✅

**Input:** fișier cu date în coloana K (a 11-a coloană)  
**Așteptat:** Eroare blocking `EXCEL_INVALID_COLUMN_COUNT` — date dincolo de coloana J

**Input alternativ:** rând cu celule goale în C–J  
**Așteptat:** ✅ Acceptat; celulele goale = 0  
**Status:** [ ]

---

### Test V4e: Format vechi 8 coloane ❌

**Input:** `balanta_format_vechi_8_coloane.xlsx` (doar A–H, G/H = SF)  
**Așteptat:** Eroare blocking `EXCEL_LEGACY_8_COLUMN_FORMAT`  
**Mesaj:** structura veche cu 8 coloane nu mai este acceptată  
**Status:** [ ]

---

### Test V4f: total_sume_debitoare incorect ❌

**Input:** rând cu G ≠ SI D + Rulaj D (ex. G=1400, așteptat 1500)  
**Așteptat:** `BALANCE_ROW_TOTAL_DEBIT_SUM_MISMATCH` + `BALANCE_TOTAL_SUMS_MISMATCH_DETECTED`  
**Status:** [ ]

---

### Test V4g: total_sume_creditoare incorect ❌

**Input:** rând cu H ≠ SI C + Rulaj C (ex. H=1200, așteptat 1300)  
**Așteptat:** `BALANCE_ROW_TOTAL_CREDIT_SUM_MISMATCH`  
**Status:** [ ]

---

### Test V4h: Toleranță rotunjire total_sume (0,01 RON) ✅

**Input:** G sau H cu diferență ≤ 0,01 față de formulă  
**Așteptat:** Upload acceptat  
**Status:** [ ] (acoperit și de `npm test` / `excel-parser.test.ts`)

---

### Test V5: Clase Obligatorii 1-7 ✅

**Input:** `balanta_clase_lipsa.xlsx` (lipsește clasa 5)  
**Așteptat:** Warning `MISSING_ACCOUNT_CLASSES`  
**Status:** [ ]

---

### Test V6: Format Conturi OMFP ✅

**Input:** `balanta_format_invalid.xlsx`  
**Așteptat:** Eroare `INVALID_ACCOUNT_FORMAT`  
**Status:** [ ]

---

### Test V7: Valori Numerice Finite ✅

**Input:** `balanta_nan_infinity.xlsx` (celule cu text în loc de numere)  
**Așteptat:** Eroare `INVALID_NUMERIC_VALUES`  
**Status:** [ ]

---

### Test V8: Duplicate Cod Cont ✅

**Input:** `balanta_duplicate_conturi.xlsx`  
**Așteptat (agregare OFF):** Eroare `DUPLICATE_ACCOUNTS`  
**Așteptat (agregare ON):** Warning `DUPLICATE_ACCOUNTS`  
**Status:** [ ]

---

## ⚠️ Validări Warning (8 Teste)

### Test W1: Solduri Duale ⚠️

**Input:** Cont cu SI: D=1000 ȘI C=500 simultan  
**Așteptat:** Warning `DUAL_BALANCE`  
**Status:** [ ]

---

### Test W2: Ecuație Contabilă ⚠️

**Input:** `balanta_ecuatie_incorecta.xlsx`  
**Așteptat:** Warning `ACCOUNT_EQUATION_MISMATCH`  
**Status:** [ ]

---

### Test W3: Conturi Inactive ℹ️

**Input:** Cont cu toate valorile = 0  
**Așteptat:** Info `INACTIVE_ACCOUNTS`  
**Status:** [ ]

---

### Test W4: Valori Negative ⚠️

**Input:** `balanta_valori_negative.xlsx`  
**Așteptat:** Warning `NEGATIVE_VALUES`  
**Status:** [ ]

---

### Test W5: Outliers Statistici ℹ️

**Input:** `balanta_outliers.xlsx` (1 cont cu 10M RON, restul < 10K)  
**Așteptat:** Info `ANOMALOUS_VALUES`  
**Status:** [ ]

---

### Test W6: Denumiri Duplicate ℹ️

**Input:** 2 conturi (1012, 1013) cu aceeași denumire "Bănci"  
**Așteptat:** Info `DUPLICATE_NAMES`  
**Status:** [ ]

---

### Test W7: Ierarhie Conturi ℹ️

**Input:** Cont analitic 5121 fără sintetic 512  
**Așteptat:** Info `HIERARCHY_ISSUES`  
**Status:** [ ]

---

### Test W8: Completitudine Date ⚠️

**Input:** Cont cu denumire goală sau prea scurtă  
**Așteptat:** Warning `INCOMPLETE_DATA`  
**Status:** [ ]

---

## 🔥 Edge Cases

### Edge Case 1: Fișier cu Diacritice în Nume

**Fișier:** `balanță_contabilă_2024.xlsx`  
**Așteptat:** Normalizare automată → `balanta_contabila_2024.xlsx`  
**Status:** [ ]

---

### Edge Case 2: Excel cu Multiple Sheets

**Setup:** Balanță în Sheet2, Sheet1 gol  
**Așteptat:** Parsare doar Sheet1 (default) → Eroare `EMPTY_BALANCE`  
**Recomandare:** Mută date în Sheet1  
**Status:** [ ]

---

### Edge Case 3: Excel cu Formule

**Setup:** Celule cu `=SUM(...)` în loc de valori  
**Așteptat:** Parsare valori calculate (Excel formula evaluation)  
**Edge Function:** `cellFormula: false` → parsare valori, NU formule  
**Status:** [ ]

---

### Edge Case 4: Toleranță Rotunjire

**Input:** 
- Total Debit: 10000.50
- Total Credit: 10000.49
- Diferență: 0.01 RON

**Așteptat:** ✅ PASS (diferență ≤ 1 RON)  
**Status:** [ ]

---

### Edge Case 5: Fișier 10MB Exact

**Setup:** Fișier exact la limita MAX_FILE_SIZE_BYTES (10485760 bytes)  
**Așteptat:** ✅ Accept (check e >, nu >=)  
**Status:** [ ]

---

## 📊 Performance Tests

### Perf Test 1: 100 Conturi

**Timp așteptat:** < 3 secunde (parsare + validare + insert)  
**Status:** [ ]

---

### Perf Test 2: 1000 Conturi

**Timp așteptat:** < 10 secunde  
**Status:** [ ]

---

### Perf Test 3: Concurrent Uploads (Stress)

**Setup:** 5 useri upload simultan (5 x 100 conturi)  
**Așteptat:** Toate uploaduri reușesc, fără race conditions  
**Status:** [ ]

---

## ✅ Checklist Final Pre-Production

### Database:

- [ ] Migrări aplicate: `20260129000001_fix_view_rls_security_invoker.sql`
- [ ] Migrări aplicate: `20260129000002_fix_storage_bucket_consistency.sql`
- [ ] Migrări aplicate: `20260621100000_add_total_sume_columns.sql` (coloane G/H în DB)
- [ ] Bucket `balante` există (sau `trial-balances` — verifică constanta din cod)
- [ ] Storage policies verificate (3 policies pentru INSERT/SELECT/DELETE)
- [ ] Views au `security_invoker = true`
- [ ] RLS policies pe views verificate

### Code:

- [ ] `npm test` trece (13 teste parser 10 coloane)
- [ ] Fișiere fixture Excel actualizate la format A–J
- [ ] Hook folosește bucket canonical (`BALANCE_STORAGE_BUCKET` din constants)
- [ ] Edge Function aliniată cu parser client (10 coloane + formule G/H)
- [ ] Validări blocking în `excel-parser.ts` v2.1
- [ ] UI ghid upload afișează 10 coloane

### Funcțional:

- [ ] Upload balanță validă (10 coloane) → SUCCESS
- [ ] Upload format vechi 8 coloane → ERROR `EXCEL_LEGACY_8_COLUMN_FORMAT`
- [ ] Upload cu total_sume G/H greșit → ERROR blocking
- [ ] Upload balanță dezechilibrată → ERROR cu detalii
- [ ] Upload cu warnings → PERMIS cu avertizare
- [ ] Download fișier original → SUCCESS
- [ ] Vizualizare conturi → Paginare funcțională
- [ ] Delete import → Soft delete (deleted_at NOT NULL)

### Security:

- [ ] Cross-tenant isolation verificat (user A nu vede date user B)
- [ ] Upload în folder altei companii → BLOCAT
- [ ] Direct query pe trial_balance_imports → BLOCAT (folosește view)
- [ ] Service role poate vedea internal_error_detail

### Performance:

- [ ] 100 conturi: < 3s
- [ ] 1000 conturi: < 10s
- [ ] UI responsive (fără freeze)
- [ ] Storage nu depășește quota

---

## 📞 Raportare Buguri

Dacă găsești un bug în timpul testării:

1. **Capturează:**
   - Screenshot UI
   - Browser console logs
   - Network tab (request/response)
   - Supabase logs (Logs → Errors)

2. **Raportează în format:**
   ```markdown
   ### Bug: [Titlu scurt]
   
   **Severitate:** [Critică / Înaltă / Medie / Scăzută]
   
   **Pași de reproducere:**
   1. ...
   2. ...
   
   **Așteptat:**
   - ...
   
   **Actual:**
   - ...
   
   **Logs:**
   ```
   [Paste console errors]
   ```
   ```

3. **Contact:** development@finguard.ro

---

## 🎉 Success Criteria

Testarea este **SUCCESS** dacă:

- ✅ Toate 8 validări critice funcționează
- ✅ Toate 8 validări warning funcționează
- ✅ 0 erori în console
- ✅ Performance < 10s pentru 1000 conturi
- ✅ Cross-tenant isolation verificat
- ✅ Upload → Download → Vizualizare → Delete flow complet

**Ready for production!** 🚀

---

**Versiune:** 1.0  
**Data:** 29 Ianuarie 2026  
**Autor:** FinGuard QA Team
