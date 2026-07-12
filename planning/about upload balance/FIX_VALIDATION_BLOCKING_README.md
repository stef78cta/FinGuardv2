# FIX: Validări Blocking pentru Upload Balanță

> **Actualizare 11 iulie 2026 (v3.1).** Validările blocking sunt în **`src/lib/excel-parser.ts`**. Fluxul curent: parsare + preview în **`useBalanceUploadForm`** → la upload, **`uploadBalance`** re-validează și **aruncă eroare fără Storage/INSERT** dacă `ok === false`. Dual format 8/10 coloane activ. Sursa completă: [`ce_verificari_se_fac_la_upload_baanta.md`](./ce_verificari_se_fac_la_upload_baanta.md).

## Rezumat problemă (ianuarie 2026)

**Problema raportată:** Upload-uri cu erori critice (dezechilibru SI/Rulaj/SF) erau persistate în DB.

**Stare curentă:** Rezolvat. Validarea blocking oprește fluxul **înainte** de `prepare_balance_month_upload`, Storage și INSERT.

---

## 🔍 **ROOT CAUSE ANALYSIS**

### **BUG #1: Lipsește Validare Control Totals**
- **Ce era stricat**: În `src/lib/excel-parser.ts` (liniile 239-245 vechi), se calculau totalurile DAR nu se verifica echilibrul `closing_debit == closing_credit`
- **De ce se întâmpla**: Funcția returna `success: true` chiar dacă diferența era mare
- **Locație**: `src/lib/excel-parser.ts`, funcția `parseExcelFile()`
- **Severitate**: **CRITICĂ**

### **BUG #2: Lipsește Validare Conturi Invalide**
- **Ce era stricat**: Rândurile cu `account_code` gol/invalid erau ignorate (skip cu `continue`) dar nu erau raportate ca erori blocking
- **De ce se întâmpla**: Logica sare peste rânduri invalide fără să le contorizeze sau să respingă upload-ul
- **Locație**: `src/lib/excel-parser.ts`, linia 197
- **Severitate**: **MARE**

### **BUG #3: Contract API Inconsistent**
- **Ce era stricat**: `ParseResult` nu avea câmpuri `ok`, `blockingErrors`, `rowErrors`, `warnings`, `metrics`
- **De ce se întâmpla**: Interface vechi, legacy, fără separare clară între success/fail
- **Locație**: `src/lib/excel-parser.ts`, interface `ParseResult`
- **Severitate**: **MARE**

---

## 🔧 **SOLUȚIA IMPLEMENTATĂ**

### **1. Contract API Nou (v2.0) - `ParseResult`**

**Fișier**: `src/lib/excel-parser.ts`

**Modificări**:
- ✅ Adăugat interfețe noi: `BlockingError`, `RowError`, `ValidationWarning`, `ProcessingMetrics`
- ✅ Extins `ParseResult` cu:
  ```typescript
  {
    ok: boolean,                    // true = valid, false = respins
    blockingErrors: BlockingError[], // Erori care blochează upload-ul
    rowErrors: RowError[],          // Erori la nivel de rând (cont lipsă, etc.)
    warnings: ValidationWarning[],  // Warnings (nu blochează)
    metrics: ProcessingMetrics,     // rowsRead, rowsAccepted, rowsRejected, totals
    accounts: ParsedAccount[],      // Conturi (goale dacă ok === false)
    totals: {...},                  // Totaluri calculate
    accountsCount: number,
    error?: string,                 // Legacy (deprecated)
    success: boolean                // Legacy (deprecated)
  }
  ```

### **2. Validări Blocking în `parseExcelFile()`**

**Fișier**: `src/lib/excel-parser.ts`

**Validare #1: Control Totals (BLOCKING) — SI, Rulaje, SF**

Toate verificările folosesc `applyBalanceControlCheck()` cu prag `CONTROL_THRESHOLD = 0.01`.

| Cod | Verificare |
|---|---|
| `BALANCE_CONTROL_OPENING_MISMATCH` | Total SI Debit = Total SI Credit |
| `BALANCE_CONTROL_TURNOVER_MISMATCH` | Total Rulaj D = Total Rulaj C |
| `BALANCE_CONTROL_TOTAL_MISMATCH` | Total SF Debit = Total SF Credit |
| `BALANCE_CONTROL_CLASS6_CLOSING_NOT_ZERO` | Conturi 6xx: SF Debit = SF Credit = 0 |
| `BALANCE_CONTROL_CLASS7_CLOSING_NOT_ZERO` | Conturi 7xx: SF Debit = SF Credit = 0 |
| ~~`EXCEL_LEGACY_8_COLUMN_FORMAT`~~ | **Eliminat (v3.0)** — 8 coloane acceptat |
| `EXCEL_AMBIGUOUS_FORMAT` | 9 coloane — alegere manuală UI |
| `EXCEL_INVALID_COLUMN_COUNT` | Date peste coloana J |
| `BALANCE_ROW_CLOSING_MISMATCH` | (10 col.) SF net ≠ Total Sume D − C |
| `BALANCE_CLOSING_MISMATCH_DETECTED` | Agregat erori identitate sold final |

**Validare #3: Conturi Invalide/Lipsă (BLOCKING)**
```typescript
// În buclă de parsare rânduri:
if (!row[0]) {
  rowErrors.push({
    rowIndex: i + 1,
    code: 'BALANCE_ROW_ACCOUNT_MISSING',
    message: `Rândul ${i + 1}: Cont lipsă (coloana A este goală)`,
    field: 'account_code',
  });
  rowsRejected++;
  continue; // Skip rând
}

if (!isValidAccountCode(accountCode)) {
  rowErrors.push({
    rowIndex: i + 1,
    code: 'BALANCE_ROW_ACCOUNT_INVALID',
    message: `Rândul ${i + 1}: Cont invalid "${accountCode}" — ${getAccountCodeErrorMessage(accountCode, reason)}`,
    field: 'account_code',
  });
  rowsRejected++;
  continue; // Skip rând
}

// La final, verifică dacă există rowErrors:
if (rowErrors.length > 0) {
  blockingErrors.push({
    code: 'BALANCE_INVALID_ROWS_DETECTED',
    message: `${rowErrors.length} rând(uri) cu erori detectate: conturi lipsă sau invalide`,
    details: {
      invalidRowsCount: rowErrors.length,
      firstErrors: rowErrors.slice(0, 5), // Primele 5 erori
    },
  });
}
```

**Decizie Finală**:
```typescript
const isValid = blockingErrors.length === 0;

return {
  ok: isValid,
  blockingErrors,
  rowErrors,
  warnings,
  metrics: {...},
  accounts: isValid ? accounts : [], // ZERO ACCOUNTS dacă invalid
  totals,
  accountsCount: accounts.length,
  error: isValid ? undefined : blockingErrors.map(e => e.message).join('; '),
  success: isValid,
};
```

### 3. Hook `uploadBalance` — verificare blocking (stare actuală)

**Fișier:** `src/hooks/useTrialBalances.tsx`

```typescript
const parseResult = await parseExcelFile(file, { forcedFormat: options?.forcedFormat });

if (!parseResult.ok) {
  const errorMessage = formatBlockingValidationErrors(parseResult);
  throw new Error(errorMessage);  // Fără Storage, fără INSERT
}
```

**Rezultat:**
- Upload respins complet la validare blocking
- **Nu** se creează rând în `trial_balance_imports` (validarea e înainte de INSERT)
- UI: toast error (8s) via `IncarcareBalanta.tsx`; erori vizibile și în `BalanceUploadPreview`

---

## 🎯 **COMPORTAMENT FINAL (DUPĂ FIX)**

### **Scenariu 1: Upload Valid (Control OK, Conturi OK)**
```
1. User selectează fișier valid
2. Parser: ok = true, blockingErrors = [], rowErrors = []
3. Hook: Insert conturi în DB batch
4. Status = 'completed'
5. UI: Toast success "Balanța a fost încărcată și procesată cu succes!"
```

### **Scenariu 2: Upload Invalid - Control Totals Mismatch**
```
1. User selectează fișier cu Debit ≠ Credit (ex: Debit=100.00, Credit=99.50)
2. Parser: ok = false, blockingErrors = [{code: 'BALANCE_CONTROL_TOTAL_MISMATCH', ...}]
3. Hook: throw Error("❌ Total Sold final Debit nu este egal cu Total Sold final Credit (diferență: 0.50 RON)\n  • Sold final Debit: 100.00 RON\n  • Sold final Credit: 99.50 RON\n  • Diferență: 0.50 RON")
4. Status = 'error', ZERO insert în trial_balance_accounts
5. UI: Toast error cu mesaj detaliat (8s)
```

### **Scenariu 3: Upload Invalid - Conturi Lipsă**
```
1. User selectează fișier cu rânduri care au coloana A goală
2. Parser: ok = false, rowErrors = [{rowIndex: 5, code: 'BALANCE_ROW_ACCOUNT_MISSING', ...}, ...], blockingErrors = [{code: 'BALANCE_INVALID_ROWS_DETECTED', ...}]
3. Hook: throw Error("❌ 3 rând(uri) cu erori detectate: conturi lipsă sau invalide\n  • Total rânduri invalide: 3\n  • Exemple erori:\n    - Rândul 5: Cont lipsă (coloana A este goală)\n    - Rândul 12: Cont invalid 'ABC' — Contul trebuie să conțină între 3 și 6 caractere alfanumerice…\n    - Rândul 18: Cont lipsă (coloana A este goală)")
4. Status = 'error', ZERO insert în trial_balance_accounts
5. UI: Toast error cu mesaj detaliat (8s)
```

### **Scenariu 4: Upload Invalid - AMBELE Erori**
```
1. User selectează fișier cu AMBELE probleme (Debit ≠ Credit ȘI conturi lipsă)
2. Parser: ok = false, blockingErrors = [control_mismatch, invalid_rows], rowErrors = [...]
3. Hook: throw Error cu AMBELE erori concatenate
4. Status = 'error', ZERO insert
5. UI: Toast error cu TOATE erorile (8s)
```

---

## 🛡️ **PROTECȚII IMPLEMENTATE**

### **1. No Partial Writes (Tranzacție Implicită)**
- ✅ Parsare → Validare → Decizie (ok/!ok) → Insert DOAR dacă ok
- ⛔ NICIODATĂ insert parțial (dacă ok = false, accounts = [])

### **2. Control Threshold (Rotunjiri Acceptate)**
- ✅ Diferență <= 0.01 RON → ACCEPTAT cu warning (nu blocking)
- ⛔ Diferență > 0.01 RON → RESPINS cu blocking error

### **3. Row-Level Error Tracking**
- ✅ Fiecare rând invalid → `rowError` cu `rowIndex`, `code`, `message`, `field`
- ✅ Agregare la nivel de upload → `blockingError` cu `details.firstErrors` (primele 5)

### **4. Audit Trail**
- ✅ `internal_error_detail` (JSON): blockingErrors, rowErrors (primele 10), metrics
- ✅ `internal_error_code`: cod primary error (ex: `BALANCE_CONTROL_TOTAL_MISMATCH`)
- ✅ `error_message`: mesaj user-friendly pentru UI

---

## 📊 **METRICI ȘI LOGGING**

### **Parser Output (`metrics`)**
```json
{
  "rowsRead": 128,
  "rowsAccepted": 125,
  "rowsRejected": 3,
  "totals": {
    "finDebit": 100000.50,
    "finCredit": 100000.00,
    "diff": 0.50
  }
}
```

### **Console Logs (Success)**
```
[uploadBalance] Validare OK - Parsed 125 accounts
[uploadBalance] Metrics: {rowsRead: 128, rowsAccepted: 125, rowsRejected: 3, totals: {...}}
[uploadBalance] Warnings: [{code: 'BALANCE_CONTROL_ROUNDING_DIFF', message: '...'}]
```

### **Console Logs (Failure)**
```
[uploadBalance] BLOCKING ERRORS detected: [{code: 'BALANCE_CONTROL_TOTAL_MISMATCH', ...}]
[uploadBalance] Row errors: [{rowIndex: 5, code: 'BALANCE_ROW_ACCOUNT_MISSING', ...}, ...]
[handleUpload] Upload error: ❌ Total Sold final Debit...
[handleUpload] Validation errors: ['❌ Total...', '  • Sold final Debit: ...', ...]
```

---

## 🧪 **TESTE NECESARE (TODO)**

### **Test #1: Valid Upload (Happy Path)**
```typescript
// Fișier: total Debit = total Credit, toate conturile OK
expect(parseResult.ok).toBe(true);
expect(parseResult.blockingErrors).toHaveLength(0);
expect(parseResult.accounts.length).toBeGreaterThan(0);
// DB: status = 'completed', conturi inserate
```

### **Test #2: Control Totals Mismatch (Blocking)**
```typescript
// Fișier: Debit = 100.00, Credit = 99.50 (diff = 0.50)
expect(parseResult.ok).toBe(false);
expect(parseResult.blockingErrors[0].code).toBe('BALANCE_CONTROL_TOTAL_MISMATCH');
expect(parseResult.accounts).toHaveLength(0); // ZERO accounts
// DB: status = 'error', ZERO insert în trial_balance_accounts
```

### **Test #3: Cont Lipsă (Blocking)**
```typescript
// Fișier: rând 5 cu coloana A goală
expect(parseResult.ok).toBe(false);
expect(parseResult.rowErrors[0].code).toBe('BALANCE_ROW_ACCOUNT_MISSING');
expect(parseResult.blockingErrors[0].code).toBe('BALANCE_INVALID_ROWS_DETECTED');
// DB: status = 'error', ZERO insert
```

### **Test #4: Cont Invalid Format (Blocking)**
```typescript
// Fișier: rând 12 cu cont 'ABC' (doar litere, fără cifră — invalid)
// Notă: 'ABC123' este VALID din v3.2 (cont alfanumeric)
expect(parseResult.ok).toBe(false);
expect(parseResult.rowErrors[0].code).toBe('BALANCE_ROW_ACCOUNT_INVALID');
// DB: status = 'error', ZERO insert
```

### **Test #5: Rotunjiri Acceptate (Non-Blocking)**
```typescript
// Fișier: Debit = 100.00, Credit = 100.01 (diff = 0.01)
expect(parseResult.ok).toBe(true); // ACCEPTAT
expect(parseResult.warnings[0].code).toBe('BALANCE_CONTROL_ROUNDING_DIFF');
// DB: status = 'completed', conturi inserate
```

---

## 📁 **FIȘIERE MODIFICATE**

### **1. `src/lib/excel-parser.ts`**
- ✅ Adăugat interfețe noi: `BlockingError`, `RowError`, `ValidationWarning`, `ProcessingMetrics`
- ✅ Extins `ParseResult` cu câmpuri noi
- ✅ Modificat `parseExcelFile()` cu validări blocking
- **Linii modificate**: ~150 linii (interfețe + funcție)

### **2. `src/hooks/useTrialBalances.tsx`**
- ✅ Modificat `uploadBalance()` cu verificare `parseResult.ok`
- ✅ Adăugat construire mesaj error detaliat
- ✅ Update `trial_balance_imports` cu `internal_error_detail`, `internal_error_code`
- **Linii modificate**: ~50 linii

### **3. `src/pages/IncarcareBalanta.tsx`**
- ✅ Îmbunătățit catch block cu toast duration 8s
- ✅ Log detalii validare în console
- **Linii modificate**: ~15 linii

---

## ✅ **CHECKLIST COMPLETARE**

- [x] **1. Reproducere**: Identificat fluxul de upload și parsing
- [x] **2. Validări blocking**: Control totals SI + Rulaje + SF + clasa 6/7 + **10 coloane A–J** + identitate sold final (SF = Total Sume D − Total Sume C) + conturi invalide
- [x] **3. Contract API**: Adăugat `ok`, `blockingErrors`, `rowErrors`, `warnings`, `metrics`
- [x] **4. Hook verificare**: `uploadBalance()` verifică `ok === false` și aruncă eroare
- [x] **5. No partial writes**: ZERO insert în DB dacă `ok === false`
- [x] **6. UI feedback**: Toast error cu mesaj detaliat (8s)
- [x] **7. Audit trail**: `internal_error_detail`, `internal_error_code` în DB
- [x] **8. Teste automate:** `excel-parser.test.ts` (33) + `accountCodeValidation.test.ts` (13) — Vitest (`npm test`)
- [x] **9. Dual format + balance_month:** migrări 20260701, 20260708

---

## 🚀 **NEXT STEPS (OPȚIONAL)**

### **1. Teste Automate**
- Creare suite teste pentru validări blocking (vezi secțiunea Teste)
- Mockare `parseExcelFile()` pentru scenarii edge-case
- Verificare tranzacții DB (rollback dacă eroare)

### **2. Logging Server-Side (Edge Function)**
- ✅ v2.1: Edge Function `parse-balanta` aliniată cu validările client (10 coloane, formule G/H, control totals)

### **3. UI Dialog Erori (Enhancement)**
- În loc de toast simplu, dialog modal cu structură:
  - ❌ Titlu eroare
  - 📊 Metrici (rânduri citite/acceptate/respinse)
  - 📋 Lista blockingErrors cu expand/collapse
  - 📝 Lista primelor 10 rowErrors cu scroll

### **4. Export Raport Erori**
- Buton "Descarcă raport erori" → CSV/Excel cu toate `rowErrors`
- Util pentru fișiere mari cu multe erori

---

## 📞 **CONTACT / QUESTIONS**

Implementare v2.0 (29 ianuarie 2026) + format 10 coloane v2.1 (iunie 2026)

Pentru întrebări sau clarificări:
- Verifică console logs pentru detalii debugging
- Verifică `internal_error_detail` în DB pentru istoric erori
- Rulează teste manuale cu fișiere invalide pentru validare

---

**🎉 FIX COMPLET IMPLEMENTAT!**
