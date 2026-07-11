# Quick Start — Upload Balanță (stare actuală)

**Versiune:** 3.1  
**Data:** 11 iulie 2026  
**Status:** Implementat în cod — necesită deploy Supabase pentru mediu remote

---

## Ce face aplicația acum

1. Acceptă Excel **8 coloane (A–H)** sau **10 coloane (A–J)** — detectare automată
2. Validează **blocking în browser** înainte de upload (preview cu `BalanceUploadPreview`)
3. Permite **o balanță activă per lună** per companie (replace opțional)
4. Încarcă în Storage bucket **`balante`**
5. Procesează via **Edge Function** `parse-balanta` (fallback client dacă eșuează)
6. Generează **situații financiare** după import reușit

Detalii complete: [`ce_verificari_se_fac_la_upload_baanta.md`](./ce_verificari_se_fac_la_upload_baanta.md)

---

## Fișiere cheie

```
src/
├── pages/IncarcareBalanta.tsx
├── hooks/
│   ├── useBalanceUploadForm.ts      # parse + preview
│   └── useTrialBalances.tsx         # upload orchestration
├── components/upload/
│   ├── BalanceUploadPreview.tsx     # UI preview (activ)
│   └── BalanceAccountsViewDialog.tsx
├── lib/
│   ├── excel-parser.ts              # validări + dual format
│   ├── importPipeline.ts            # Edge Fn + fallback
│   ├── prepareBalanceMonthUpload.ts
│   ├── balancePeriod.ts
│   └── storage/constants.ts         # BALANCE_STORAGE_BUCKET = 'balante'
supabase/
├── functions/parse-balanta/index.ts
└── migrations/
    ├── 20260621000000_stabilize_upload_pipeline.sql
    ├── 20260701120000_prepare_balance_month_upload.sql
    └── 20260708120000_add_balance_format_dual_support.sql
```

---

## Deploy în 4 pași

### 1. Migrări

```bash
cd c:\_Software\SAAS\finguardv2
supabase db push
```

### 2. Edge Function

```bash
supabase functions deploy parse-balanta
```

### 3. Teste locale

```bash
npm test
npm run dev
```

Navigare: `http://localhost:5173/incarcare-balanta`

### 4. Verificare rapidă

- Upload `.xlsx` valid 10 coloane → listă imports, status Procesat
- Upload `.xlsx` valid 8 coloane → badge format 8 coloane
- Upload dezechilibrat → eroare în preview, fără persistență

---

## Checklist

### Database
- [ ] Migrări până la `20260708120000_*` aplicate
- [ ] Bucket `balante` există
- [ ] RPC `prepare_balance_month_upload` disponibil
- [ ] Coloane `balance_month`, `balance_format` pe `trial_balance_imports`

### Cod
- [ ] `npm test` — 39+ teste upload-related trec
- [ ] `npm run build` — SUCCESS
- [ ] Edge Function deployată

### Funcțional
- [ ] Upload 10 coloane valid
- [ ] Upload 8 coloane valid
- [ ] Blocare dezechilibru SI/Rulaj/SF
- [ ] Replace balanță existentă pe aceeași lună
- [ ] Delete (soft) import

---

## Documentație

| Document | Conținut |
|----------|----------|
| `ce_verificari_se_fac_la_upload_baanta.md` | **Sursa principală** — validări, flux, DB |
| `IMPLEMENTATION_UPLOAD_BALANTA.md` | Rezumat tehnic implementare |
| `TESTING_GUIDE_UPLOAD_BALANTA.md` | Scenarii manuale + fixtures |
| `RAPORT_STABILIZARE_UPLOAD_BALANTA.md` | Audit + fix-uri iunie 2026 |
| `plan_upload_balanta.md` | Plan istoric (parțial depășit) |

---

## Support

- Erori upload: browser console + Supabase Logs → Edge Functions
- Validări: rulează `npm test -- --run src/lib/excel-parser.test.ts`
- SQL imports recente:

```sql
SELECT id, balance_month, balance_format, status, accounts_count, created_at
FROM trial_balance_imports
ORDER BY created_at DESC LIMIT 10;
```
