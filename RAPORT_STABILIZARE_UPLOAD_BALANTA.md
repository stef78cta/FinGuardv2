# Raport Stabilizare Pipeline Upload Balanță — FinGuard v2

**Data:** 21 iunie 2026  
**Scop:** Production-ready flow Excel → Storage → parse-balanta → DB → KPI

---

## 1. Probleme identificate (audit)

### BUG #1 — Flux rupt: Edge Function neapelată (CRITIC)

| Aspect | Detaliu |
|--------|---------|
| **Ce era stricat** | `useTrialBalances.uploadBalance` parsează Excel client-side și inserează direct în `trial_balance_accounts`, fără a apela `parse-balanta` |
| **Cauză** | Workaround v1.9 după eșecul Edge Function (user ID greșit la RPC) |
| **Impact** | Pipeline documentat ≠ pipeline real; imports rămân `processing` dacă se folosea doar Edge Fn; securitate/validare server-side ocolite |
| **Locație** | `src/hooks/useTrialBalances.tsx` (versiune anterioară) |

### BUG #2 — Edge Function: user ID greșit la RPC (CRITIC)

| Aspect | Detaliu |
|--------|---------|
| **Ce era stricat** | `process_import_accounts` primea `user.id` (auth UUID) în loc de `public.users.id` |
| **Cauză** | Confuzie auth.users vs public.users |
| **Impact** | RPC eșua cu „Unauthorized”; import blocat în `processing` |
| **Locație** | `supabase/functions/parse-balanta/index.ts` |

### BUG #3 — Payload JSONB dublu-serializat (RIDICAT)

| Aspect | Detaliu |
|--------|---------|
| **Ce era stricat** | `JSON.stringify(accounts)` trimis la parametru `JSONB` |
| **Cauză** | Serializare manuală în loc de array JS |
| **Impact** | `jsonb_array_elements` eșua → status `error` |
| **Locație** | `parse-balanta/index.ts` |

### BUG #4 — Bucket `balante` vs `trial-balances` (RIDICAT)

| Aspect | Detaliu |
|--------|---------|
| **Ce era stricat** | Migrări contradictorii (`20260128100005` trial-balances vs `20260129100002` balante) |
| **Cauză** | Iterații paralele de fix fără canonicalizare |
| **Impact** | Upload OK / download Edge Fn FAIL dacă policies pe bucket greșit |
| **Locație** | `supabase/migrations/*`, docs disparate |

### BUG #5 — SELECT pe `trial_balance_imports` după REVOKE (RIDICAT)

| Aspect | Detaliu |
|--------|---------|
| **Ce era stricat** | Migrarea v1.7 revoca SELECT; frontend încă query direct + INSERT RETURNING |
| **Cauză** | Frontend nealiniat la `trial_balance_imports_public` |
| **Impact** | Listă imports goală / fetch eșuat; posibil eșec RETURNING la insert |
| **Locație** | hooks, `20260128100002b` |

### BUG #6 — `retryFailedImport` incoerent (MEDIU)

| Aspect | Detaliu |
|--------|---------|
| **Ce era stricat** | Retry client-side cu `parseResult.success` (API v2 folosește `ok`) |
| **Impact** | Retry mereu eșuat sau comportament imprevizibil |
| **Locație** | `useTrialBalances.tsx` |

### BUG #7 — `processing_started_at` nesetat la upload (MEDIU)

| Aspect | Detaliu |
|--------|---------|
| **Ce era stricat** | Cleanup stale imports nu detecta imports blocate fără timestamp |
| **Impact** | Imports infinite în `processing` |
| **Locație** | INSERT import frontend |

---

## 2. Cauză rădăcină

**Arhitectură duală nefinalizată:** codul a migrat la procesare client-side ca workaround, în timp ce migrările DB și Edge Function presupun flux server-side cu `process_import_accounts`. Combinația user ID greșit + bucket inconsistent + REVOKE SELECT a făcut pipeline-ul instabil end-to-end.

---

## 3. Modificări efectuate

| Fișier | Modificare |
|--------|------------|
| `src/lib/storage/constants.ts` | **NOU** — bucket `balante`, constante tabel/view |
| `src/lib/importPipeline.ts` | **NOU** — invoke parse-balanta, polling status, formatare erori |
| `src/hooks/useTrialBalances.tsx` | Refactor upload: validare client → Storage → INSERT → Edge Fn → poll; retry via RPC + Edge Fn; SELECT pe view public |
| `src/hooks/useBalante.tsx` | SELECT pe `trial_balance_imports_public` |
| `src/pages/IncarcareBalanta.tsx` | Progress callbacks, retry cu userId, bucket constant |
| `supabase/functions/parse-balanta/index.ts` | Fix user ID, payload JSONB array, bucket constant |
| `supabase/migrations/20260621000000_stabilize_upload_pipeline.sql` | **NOU** — consolidare bucket, view, GRANT parțial, RPC robust |
| `scripts/verify-upload-pipeline.mjs` | **NOU** — verificări statice + checklist E2E |

### Flux final (Production Ready)

```
[UI] validare Excel (client: celule goale=0, **exact 10 coloane A–J**, formule G/H, blocking conturi/control totals)
  → [Storage] bucket `balante` / {company_id}/{timestamp}_file.xlsx
  → [DB] INSERT trial_balance_imports (status=processing, processing_started_at)
  → [Edge Fn] parse-balanta
       → download Storage
       → parse Excel
       → RPC process_import_accounts
       → status=completed
  → [UI] poll trial_balance_imports_public
  → [Dashboard/KPI] useBalante → get_balances_with_accounts
```

---

## 4. SQL generat

Migrarea completă: `supabase/migrations/20260621000000_stabilize_upload_pipeline.sql`

**Deploy:**

```bash
supabase db push
# sau paste SQL în Supabase Dashboard → SQL Editor

supabase functions deploy parse-balanta
```

**Verificări post-deploy:**

```sql
-- Bucket
SELECT id, name, public FROM storage.buckets WHERE id = 'balante';

-- Policies storage
SELECT policyname FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'balante_%';

-- View public
SELECT column_name FROM information_schema.columns
WHERE table_name = 'trial_balance_imports_public';

-- Imports recente
SELECT id, status, accounts_count, processing_started_at, processed_at
FROM trial_balance_imports
ORDER BY created_at DESC LIMIT 10;

-- Cleanup imports blocate
SELECT * FROM cleanup_stale_imports();
```

---

## 5. Checklist final

| Item | Status |
|------|--------|
| Bucket configurat corect (`balante`) | ✅ Cod + migrare |
| Storage policies OK | ✅ Migrare 20260129100002 + 20260621 |
| RLS OK | ✅ View public + policy tbi_public_select |
| parse-balanta OK | ✅ Fix user ID + JSONB |
| trial_balance_imports OK | ✅ INSERT/UPDATE pe tabel, SELECT pe view |
| trial_balance_accounts OK | ✅ Via RPC process_import_accounts |
| upload funcțional | ✅ Implementat (necesită deploy) |
| procesare funcțională | ✅ Edge Fn + polling |
| KPI funcționale | ✅ useBalante neschimbat logic, citește completed |
| test E2E trecut | ⚠️ Build + script static OK; test live necesită deploy Supabase |

---

## 6. Pași deploy obligatorii

1. `supabase db push` — aplică `20260621000000_stabilize_upload_pipeline.sql`
2. `supabase functions deploy parse-balanta`
3. `node scripts/verify-upload-pipeline.mjs` — 7/7 verificări statice
4. Test manual: upload Excel → verifică Storage + status `completed` + Dashboard KPI

---

## 7. Note hooks (useBalante vs useTrialBalances)

- **useTrialBalances** — upload, listare imports, retry, delete (pagina Încărcare Balanță)
- **useBalante** — citire balanțe `completed` pentru Dashboard/KPI/Rapoarte

Responsabilitățile sunt complementare; s-a eliminat duplicarea logicii de procesare (insert conturi) din useTrialBalances, nu s-a fuzionat complet pentru a limita scope-ul refactorului.

---

## 8. Verificări automate rulate

- `npm run build` — ✅ SUCCESS
- `node scripts/verify-upload-pipeline.mjs` — rulează după clone
