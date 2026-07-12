# Implementare Upload Balanță — finguardv2

**Versiune document:** 3.2  
**Data:** 12 iulie 2026  
**Status:** Production — reflectă implementarea din cod (cont alfanumeric v3.2)

> **Document de referință pentru detalii tehnice:** [`ce_verificari_se_fac_la_upload_baanta.md`](./ce_verificari_se_fac_la_upload_baanta.md)

---

## Sumar

Pipeline-ul de upload balanță este **stabilizat end-to-end** (iunie–iulie 2026):

- Suport **dual format** Excel: 8 coloane (A–H) și 10 coloane (A–J)
- Validări **blocking în client** înainte de Storage/DB
- Procesare **Edge Function** `parse-balanta` cu **fallback client-side**
- Bucket Storage canonic: **`balante`**
- O balanță activă per **companie + lună** (`balance_month`)
- Generare automată situații financiare după import reușit

---

## Arhitectură

```
IncarcareBalanta.tsx
  ├── useBalanceUploadForm     → parse + preview la selectare fișier
  ├── BalanceUploadPreview     → UI preview / warnings / selector format
  └── useTrialBalances         → upload, listă, delete, retry
        ├── excel-parser.ts    → validări blocking
        ├── prepareBalanceMonthUpload → RPC conflict lună
        ├── importPipeline.ts  → Edge Fn + fallback
        └── financialStatementsPipeline.ts → post-upload
```

---

## Componente principale

| Componentă | Locație | Status |
|------------|---------|--------|
| Pagină upload | `src/pages/IncarcareBalanta.tsx` | ✅ Activ |
| Hook formular | `src/hooks/useBalanceUploadForm.ts` | ✅ Activ |
| Preview UI | `src/components/upload/BalanceUploadPreview.tsx` | ✅ Activ |
| Dialog conturi | `src/components/upload/BalanceAccountsViewDialog.tsx` | ✅ Activ |
| Hook CRUD | `src/hooks/useTrialBalances.tsx` | ✅ Activ |
| Parser | `src/lib/excel-parser.ts` | ✅ Motor validări |
| Validator cont | `src/utils/accountCodeValidation.ts` | ✅ Sursă unică (re-export din `_shared`) |
| Pipeline | `src/lib/importPipeline.ts` | ✅ Edge + fallback |
| Edge Function | `supabase/functions/parse-balanta/index.ts` | ✅ Deploy necesar |
| Constante Storage | `src/lib/storage/constants.ts` | ✅ Bucket `balante` |
| ValidationResultsDialog | `src/components/upload/ValidationResultsDialog.tsx` | ⚠️ Neintegrat în pagină |
| balanceValidation v1.3 | `src/utils/balanceValidation.ts` | ⚠️ Doar `aggregateDuplicateAccounts` folosit |

---

## Validări implementate (excel-parser.ts)

### Blocking

- Structură fișier (foi, rânduri, coloane, format ambiguu/forțat)
- Conturi (lipsă, format 3–6 caractere alfanumerice cu min. o cifră, clasa 9 respinsă, sufix analitic opțional, denumire prea lungă)
- Echilibru global SI / Rulaj / SF (prag 0.01 RON)
- Clase 6 și 7 — sold final zero
- Identitate SF ↔ total_sume (**doar format 10 coloane**)

### Warning

- Duplicate cod cont → agregare la insert
- Total_sume calculate (format 8 coloane)
- Rotunjiri ≤ 0.01 RON

### Neimplementate în fluxul activ

Suitea `validateBalance()` (16 verificări OMFP din `balanceValidation.ts`) există ca utilitar dar **nu** este invocată la upload.

---

## Storage și securitate

| Aspect | Valoare actuală |
|--------|-----------------|
| Bucket | `balante` (frontend + Edge Function + migrări recente) |
| Path | `{company_id}/{timestamp}_{filename}` |
| View citire | `trial_balance_imports_public` |
| Scriere | `trial_balance_imports` (tabel) |
| RLS | `is_company_member` pe companie |

Migrări relevante:
- `20260621000000_stabilize_upload_pipeline.sql`
- `20260129000001_fix_view_rls_security_invoker.sql`
- `20260129000002_fix_storage_bucket_consistency.sql` (istoric trial-balances → consolidat la `balante`)

---

## Migrări DB (upload)

| Migrare | Scop |
|---------|------|
| `20260621000000_stabilize_upload_pipeline.sql` | Pipeline, bucket, view, RPC |
| `20260630100000_add_balance_month_to_trial_balance_imports.sql` | Coloană `balance_month` |
| `20260701120000_prepare_balance_month_upload.sql` | RPC conflict/replace lună |
| `20260708120000_add_balance_format_dual_support.sql` | `balance_format`, RPC/view actualizate |

---

## Deployment

```bash
cd c:\_Software\SAAS\finguardv2
supabase db push
supabase functions deploy parse-balanta
npm test
npm run build
```

### Verificări post-deploy (SQL)

```sql
SELECT id, name FROM storage.buckets WHERE id = 'balante';

SELECT policyname FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname LIKE 'balante_%';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'trial_balance_imports'
  AND column_name IN ('balance_month', 'balance_format');
```

### Test manual

1. `/incarcare-balanta` — upload valid 10 coloane → status `completed`
2. Upload valid 8 coloane → `balance_format = 8_COLUMNS`
3. Upload dezechilibrat → blocat în preview, fără rând nou în listă
4. Re-upload aceeași lună → dialog replace

---

## Teste automate

| Fișier | Teste |
|--------|-------|
| `src/lib/excel-parser.test.ts` | 33 |
| `src/utils/accountCodeValidation.test.ts` | 13 |
| `src/lib/prepareBalanceMonthUpload.test.ts` | 6 |
| `src/hooks/useBalanceUploadForm.test.ts` | 2 |

```bash
npm test -- src/lib/excel-parser.test.ts src/utils/accountCodeValidation.test.ts
```

---

## Known issues / note

1. **ValidationResultsDialog** — componentă creată în ian. 2026, nefolosită; preview-ul activ este `BalanceUploadPreview`.
2. **Documentație ian. 2026** menționa bucket `trial-balances` — codul curent folosește **`balante`**.
3. **Fișiere mari** (>5000 conturi) — posibil timeout parsare Edge Function (30s).
4. **Excel cu formule** — `cellFormula: false`; recomandat export valori.

---

## Istoric versiuni document

| Versiune | Data | Note |
|----------|------|------|
| v1.4 | Ian 2026 | Fix bucket, RLS, 16 validări planificate |
| v2.x | Iun 2026 | Stabilizare pipeline, format 10 coloane |
| v3.0 | Iul 2026 | Dual format 8/10 coloane |
| v3.2 | Iul 2026 | Cont alfanumeric — validator central `accountCodeValidation.ts` |
| v3.1 | 11 Iul 2026 | Aliniere la cod: balance_month, prepare RPC, preview UI, teste 31 |
