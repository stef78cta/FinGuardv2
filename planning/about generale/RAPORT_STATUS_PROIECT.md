# Raport consolidat — FinGuard v2

**Sursă analiză:** 36 fișiere `.md` unice + verificare cod (`src/`, `supabase/migrations/`, `scripts/`)  
**Data raportului:** 21 iunie 2026  
**Versiune raport:** 2.0 (update post-stabilizare upload)  
**Metodă:** corelare cross-document + verificare runtime (`npm test`, `verify-upload-pipeline.mjs`)

---

## Changelog raport (v1.0 → v2.0)

| Zona                | v1.0 (20 iun.)                           | v2.0 (21 iun.)                                                                     |
| ------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| Pipeline upload     | Parțial, bucket ambiguu, Edge Fn ocolită | Refactorizat end-to-end; bucket **`balante`** canonical                            |
| Format Excel        | 8 coloane (A–H)                          | **10 coloane obligatorii (A–J)** + formule G/H                                     |
| Teste automate      | 0% (doar MD)                             | **Vitest: 13/13 teste** (`excel-parser.test.ts`)                                   |
| Migrări noi         | —                                        | `20260621000000`, `20260621100000`                                                 |
| Documente noi       | —                                        | `RAPORT_STABILIZARE_UPLOAD_BALANTA.md`, `ce_verificari_se_fac_la_upload_baanta.md` |
| MVP estimat         | ~72%                                     | **~78%**                                                                           |
| Pregătire producție | ~58%                                     | **~62%**                                                                           |

---

## Documente duplicate, depășite sau contradictorii

| Problemă                                  | Documente implicate                                                                               | Realitate consolidată (iun. 2026)                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **„100% production ready”**               | `planning/about security patches, types, fix-uri tehnice/IMPLEMENTATION_COMPLETE.md`, `planning/about upload balance/QUICK_START_IMPLEMENTATION.md`, `planning/about upload balance/IMPLEMENTATION_UPLOAD_BALANTA.md` | Cod upload refăcut (21 iun.), dar **deploy Supabase obligatoriu**; test E2E live încă manual                                                    |
| **Bucket `balante` vs `trial-balances`**  | Docs ian. 29 vs `REZOLVARE_EROARE_INCARCARE.md`                                                   | **Rezolvat în cod:** `BALANCE_STORAGE_BUCKET = 'balante'` + migrare `20260621000000` elimină legacy `trial-balances`                            |
| **Edge Function neapelată**               | Workaround v1.9 documentat                                                                        | **Rezolvat:** `importPipeline.ts` invocă `parse-balanta`; fallback client doar la eșec                                                          |
| **View public nefolosit**                 | `FRONTEND_UPDATES_REQUIRED.md`                                                                    | **Parțial rezolvat:** `importPipeline.getImportsReadSource()` preferă `trial_balance_imports_public` cu fallback; script static: 7/8 verificări |
| **`p_user_id` eliminat**                  | Security v1.8 docs                                                                                | **Inconsistent:** `useCompany.tsx` OK; **`CompanyContext.tsx` încă trimite `p_user_id`**; types.ts neactualizat                                 |
| **Validări 16 în `balanceValidation.ts`** | `IMPLEMENTATION_UPLOAD_BALANTA.md`                                                                | **Neconectate la upload** — fluxul folosește `excel-parser.ts` v2.1; `validateBalance()` doar pentru agregare duplicate                         |
| **Index depășit**                         | `planning/about generale/summary_md.md` (22 fișiere, 28 ian.)                                                    | Lipsesc ≥14 documente (upload ian.–iun., rapoarte noi)                                                                                          |
| **Test coverage 90%+**                    | `planning/about security patches, types, fix-uri tehnice/START_HERE.md`, `planning/about security patches, types, fix-uri tehnice/VISUAL_SUMMARY.md` | **Supraestimat:** 13 teste unitare parser; fără Playwright/E2E automat                                                                          |
| **Format 8 coloane**                      | `incarcare_balanta_f.md` v1.8, `TESTING_GUIDE_*` vechi                                            | **Depășit:** format vechi respins; sursă actuală: `ce_verificari_se_fac_la_upload_baanta.md`                                                    |
| **Confidențialitate fără CUI**            | Marketing docs                                                                                    | CUI obligatoriu + UNIQUE constraint                                                                                                             |
| **„Date pe Amazon”**                      | `analiza_app.md`                                                                                  | Stack real: **Supabase**                                                                                                                        |

---

## 1. Executive Summary

**FinGuard v2** este o platformă SaaS românească de analiză financiară: încărcare balanțe Excel (format 10 coloane), calcul KPI, dashboard, rapoarte parțiale, multi-company. Stack: **React 18 + Vite + TypeScript + Tailwind/shadcn + Supabase**.

**Scop:** consultant financiar digital pentru IMM-uri, contabili și analiști.

**Eveniment major (21 iun. 2026):** stabilizarea pipeline-ului upload — refactor `useTrialBalances`, `importPipeline.ts`, migrări SQL, format Excel 10 coloane, reactivare Edge Function `parse-balanta`.

**Nivel estimat de finalizare:**

| Dimensiune                     | %        | Comentariu                                                                    |
| ------------------------------ | -------- | ----------------------------------------------------------------------------- |
| **MVP funcțional**             | **~78%** | Upload + KPI + auth + multi-company; export/rapoarte incomplete               |
| **Produs complet (marketing)** | **~48%** | AI, comparative avansate, search, onboarding, billing lipsesc                 |
| **Pregătire producție**        | **~62%** | Cod upload stabilizat + teste unitare; deploy + E2E + tipuri regenerate rămân |

**Verificări rulate la generarea raportului:**

```
npm test                    → ✅ 13/13 (excel-parser.test.ts)
verify-upload-pipeline.mjs  → ⚠️ 7/8 (view public — pattern grep în hook)
npm run build               → ✅ dist/ disponibil (conform script)
```

---

## 2. Funcționalități existente

| Funcționalitate                | Descriere                                                       | Status                    | Confirmare                                                                          |
| ------------------------------ | --------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------- |
| **Autentificare**              | Email/parolă, Google OAuth, PKCE                                | Implementată              | `AuthContext`, Login/Signup                                                         |
| **Multi-company**              | Creare, switcher, RLS                                           | Implementată              | `CompanyContext`, migrări                                                           |
| **Upload balanță Excel v2.1**  | 10 coloane A–J, validare blocking, Storage → Edge Fn → poll     | **Implementată (cod)**    | `useTrialBalances.tsx`, `importPipeline.ts`, `RAPORT_STABILIZARE_UPLOAD_BALANTA.md` |
| **Format Excel 10 coloane**    | G/H = total sume; I/J = sold final; respinge format vechi 8 col | Implementată              | `excel-parser.ts` v2.1, `ce_verificari_se_fac_la_upload_baanta.md`                  |
| **Parsare server Edge Fn**     | `parse-balanta` + RPC `process_import_accounts`                 | Implementată              | Fix user ID + JSONB array (iun. 2026)                                               |
| **Fallback client-side**       | Dacă Edge Fn eșuează                                            | Implementată              | `importPipeline.processAccountsClientSide`                                          |
| **Coloane DB total_sume**      | `total_sume_debitoare`, `total_sume_creditoare`                 | Implementată (migrare)    | `20260621100000_add_total_sume_columns.sql`                                         |
| **Validări blocking parser**   | SI/Rulaj/SF, formule G/H, clase 6/7, structură 10 col           | Implementată              | `excel-parser.ts`, 13 teste Vitest                                                  |
| **Validări extinse (16 OMFP)** | Echilibru, duplicate, outliers etc.                             | **Neconectate la upload** | `balanceValidation.ts` — doar agregare duplicate activă                             |
| **9 KPI financiari**           | Lichiditate, profitabilitate, îndatorare, eficiență             | Implementată              | `useKPIs.tsx`, Dashboard                                                            |
| **Dashboard & grafice**        | KPI cards, Recharts, Top 5 conturi                              | Implementată              | Multiple pagini                                                                     |
| **Analize financiare**         | Tabs venituri/cheltuieli/patrimoniu                             | Parțial                   | `AnalizeFinanciare.tsx`                                                             |
| **Rapoarte financiare**        | Bilanț, P&L, cash flow, export parțial                          | Parțial                   | `RapoarteFinanciare.tsx`                                                            |
| **Previziuni bugetare**        | Scenarii optimist/realist/pesimist                              | Parțial                   | Date reale, logică simplificată                                                     |
| **Landing & marketing**        | Hero, pricing, FAQ, blog                                        | Implementată              | `Index.tsx` + pagini statice                                                        |
| **Admin panel**                | Roluri admin                                                    | Parțial                   | `Admin.tsx`                                                                         |
| **Security Patches v1.8**      | RLS, CUI unique, rate limits, views                             | Implementată (repo)       | Migrări `202601281*`                                                                |
| **Stabilizare upload v2.0**    | Bucket, view, RPC robust                                        | Implementată (repo)       | `20260621000000_stabilize_upload_pipeline.sql`                                      |
| **Stale import cleanup/retry** | Cleanup >10 min, retry UI                                       | Implementată              | Migrări `202601291*`, retry în UI                                                   |
| **Teste unitare parser**       | Vitest                                                          | Implementată              | `src/lib/excel-parser.test.ts`                                                      |
| **Script verificare statică**  | 8 checks pipeline                                               | Implementată              | `scripts/verify-upload-pipeline.mjs`                                                |
| **Normalizare filename**       | ASCII, path storage                                             | Implementată              | `fileHelpers.ts`                                                                    |
| **Error Boundary**             | Erori pagină upload                                             | Implementată              | `ErrorBoundary.tsx`                                                                 |
| **Brand assets**               | SVG, guidelines                                                 | Parțial                   | `public/brand/`                                                                     |
| **Design system v1.3**         | Style guide nou                                                 | În curs                   | `newa_StyleGuide.tsx`                                                               |

---

## 3. Funcționalități în dezvoltare

| Funcționalitate                  | Status estimat         | Blocaje                                                                   | Prioritate    |
| -------------------------------- | ---------------------- | ------------------------------------------------------------------------- | ------------- |
| **Deploy pipeline upload v2.0**  | Cod 95%, ops 0%        | `supabase db push` + `functions deploy parse-balanta` neconfirmat pe prod | **P1 critic** |
| **Test E2E live upload**         | Documentat, neautomat  | Necesită Supabase live + fișier Excel 10 col                              | **P1**        |
| **Aliniere `CompanyContext`**    | ~90%                   | Încă trimite `p_user_id` la `create_company_with_member`                  | **P1**        |
| **Regenerare TypeScript types**  | 0%                     | `types.ts` încă arată signature veche cu `p_user_id`                      | **P1**        |
| **Conectare validări OMFP (16)** | Cod există, neintegrat | `validateBalance()` nu e apelat în upload                                 | **P2**        |
| **Export PDF/Excel complet**     | ~40%                   | Librării instalate, UX incomplet                                          | **P2**        |
| **Analize comparative**          | ~35%                   | Logică limitată                                                           | **P2**        |
| **Playwright E2E**               | Planificat în docs     | Lipsă din `package.json`                                                  | **P2**        |
| **Design system v1.3**           | ~30%                   | Rollout incomplet                                                         | **P3**        |
| **Debug tab switch**             | Diagnostic             | Fără fix permanent                                                        | **P3**        |

---

## 4. Funcționalități planificate

| Funcționalitate                             | Beneficiu            | Complexitate |
| ------------------------------------------- | -------------------- | ------------ |
| Invite system + roluri granulare            | Colaborare echipă    | Mare         |
| Audit log complet                           | Conformitate         | Medie        |
| AI insights                                 | Diferențiere produs  | Mare         |
| Procesare asincronă (queue)                 | Fișiere >50MB        | Mare         |
| Integrare e-Factura                         | Automatizare         | Mare         |
| Search global                               | UX power users       | Medie        |
| Onboarding tutorial                         | Retenție             | Medie        |
| Notificări real-time                        | Alertă procesare     | Medie        |
| Edge Fn `calculate-kpis`, `generate-report` | Logică server-side   | Medie        |
| CSV + auto-detect header                    | Flexibilitate import | Medie        |
| Mobile app                                  | Acces nativ          | Mare         |
| Billing / Stripe                            | Monetizare           | Mare         |

_Sursă: `planning/about generale/KNOWLEDGE.md` roadmap, `planning/about security patches, types, fix-uri tehnice/START_HERE.md` v2.0 planificat_

---

## 5. Arhitectura aplicației

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT                                                      │
│  React 18 + Vite + TS + Tailwind + shadcn/ui                │
│  excel-parser.ts (validare blocking) → importPipeline.ts    │
│  useTrialBalances (orchestrare) | useBalante (citire KPI)   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│  SUPABASE                                                    │
│  Auth │ PostgreSQL + RLS + RPC (~27 migrări)                │
│  Storage bucket: balante / {company_id}/{timestamp}_file    │
│  Edge Function: parse-balanta → process_import_accounts     │
│  Views: trial_balance_imports_public (citiri)              │
└─────────────────────────────────────────────────────────────┘
```

### Flux upload production-ready (v2.0)

```
UI validare client (10 col A–J, formule G/H, control totals)
  → Storage bucket `balante`
  → INSERT trial_balance_imports (status=processing, processing_started_at)
  → Edge Fn parse-balanta (download, parse, RPC)
  → status=completed
  → poll trial_balance_imports_public
  → Dashboard/KPI via useBalante → get_balances_with_accounts
```

| Layer            | Tehnologii                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Frontend**     | React 18.3, Vite 5.4, TS 5.8, TanStack Query 5.83, Recharts, Vitest 3.2                                                                                                        |
| **Backend**      | Supabase — PostgreSQL, Auth, Storage, Edge Functions (Deno)                                                                                                                    |
| **Baza de date** | `users`, `companies`, `company_users`, `trial_balance_imports`, `trial_balance_accounts` (+ `total_sume_*`), `rate_limits`                                                     |
| **API-uri RPC**  | `create_company_with_member`, `process_import_accounts`, `get_balances_with_accounts`, `get_import_totals`, `check_rate_limit`, `cleanup_stale_imports`, `retry_failed_import` |
| **Integrări**    | Google OAuth, Lovable deploy                                                                                                                                                   |
| **Hosting**      | Lovable + domeniu `finguard.ro` (CORS whitelist)                                                                                                                               |

---

## 6. Modulele aplicației

| Modul                 | Rol                                         | Status iun. 2026                            |
| --------------------- | ------------------------------------------- | ------------------------------------------- |
| **Auth**              | Sesiune, profil                             | ✅ Stabil                                   |
| **Company**           | Multi-tenant, creare firmă                  | ⚠️ `CompanyContext` — fix `p_user_id` rămas |
| **Upload/Parse**      | Import Excel E2E                            | ✅ Refactorizat; necesită deploy            |
| **importPipeline**    | Invoke Edge Fn, polling, erori UI, fallback | ✅ Nou                                      |
| **excel-parser**      | Validări blocking v2.1                      | ✅ + 13 teste                               |
| **Validation (OMFP)** | 16 reguli contabile                         | ⚠️ Cod există, neintegrat                   |
| **Analytics/KPI**     | 9 indicatori, grafice                       | ✅ Client-side                              |
| **Reports**           | Bilanț, P&L, export                         | ⚠️ Parțial                                  |
| **Admin**             | Panou administrare                          | ⚠️ Parțial                                  |
| **Security**          | RLS, rate limits, views                     | ✅ DB; ⚠️ types regenerate                  |

**Separare hooks (post-refactor):**

- `useTrialBalances` — upload, listare, retry, delete (pagina Încărcare)
- `useBalante` — citire balanțe `completed` pentru Dashboard/KPI/Rapoarte

---

## 7. Probleme și riscuri

### Rezolvate recent (iun. 2026)

| #   | Problemă                                        | Rezolvare                                  |
| --- | ----------------------------------------------- | ------------------------------------------ |
| 1   | Edge Function neapelată (workaround client)     | `importPipeline.ts` invocă `parse-balanta` |
| 2   | User ID greșit la RPC (auth vs public.users)    | Fix în Edge Fn + RPC ownership             |
| 3   | JSONB dublu-serializat                          | Array JS direct, nu `JSON.stringify`       |
| 4   | Bucket inconsistent                             | Canonical `balante` + migrare consolidare  |
| 5   | Format Excel ambiguu (8 vs 10 col)              | v2.1: doar 10 coloane A–J                  |
| 6   | retryFailedImport API vechi (`success` vs `ok`) | Aliniat la `parseResult.ok`                |

### Deschise / parțial rezolvate

| #   | Problemă                                 | Severitate | Locație                                |
| --- | ---------------------------------------- | ---------- | -------------------------------------- |
| 1   | **Deploy migrări iun. neconfirmat**      | Critic     | Supabase remote                        |
| 2   | **`CompanyContext` trimite `p_user_id`** | Ridicat    | `CompanyContext.tsx:182`               |
| 3   | **Types.ts neactualizat**                | Mediu      | `src/integrations/supabase/types.ts`   |
| 4   | **16 validări OMFP neconectate**         | Mediu      | `balanceValidation.ts`                 |
| 5   | **Tab switch reset app**                 | Mediu      | `planning/about frontend/DEBUG_TAB_SWITCH.md`                  |
| 6   | **Docs vechi format 8 coloane**          | Scăzut     | `incarcare_balanta_f.md`, ghiduri ian. |
| 7   | **Fără E2E Playwright**                  | Mediu      | Lipsă din repo                         |
| 8   | **Admin query direct tabel**             | Scăzut     | `Admin.tsx`                            |

### Datorie tehnică

- ~15 README-uri „IMPLEMENTATION_COMPLETE" contradictorii
- `planning/about generale/summary_md.md` index depășit
- Marketing claims (fără CUI, Amazon cloud)
- KPI calculate client-side (Edge Fn `calculate-kpis` planificat)

---

## 8. Roadmap actual (reconstruit iun. 2026)

### Prioritate 1 — critic (săptămâna curentă)

1. **`supabase db push`** — migrări `20260621000000` + `20260621100000`
2. **`supabase functions deploy parse-balanta`**
3. Test manual E2E: upload Excel 10 col → status `completed` → KPI Dashboard
4. Fix `CompanyContext.tsx` — elimină `p_user_id`
5. `npx supabase gen types typescript` — regenerare types
6. `node scripts/verify-upload-pipeline.mjs` — 8/8 verificări

### Prioritate 2 — important (2–4 săptămâni)

7. Playwright E2E: signup → company → upload
8. Finalizare export PDF/Excel rapoarte
9. Integrare opțională `validateBalance()` în flux upload (warnings UI)
10. Gate 0 + deploy staging Security v1.8 (dacă neaplicat)
11. CUI UNIQUE CONCURRENTLY pe producție (>1000 companii)
12. Actualizare docs vechi (format 10 col) + deprecare README duplicate

### Prioritate 3 — nice to have

13. Invite system + RBAC granular
14. Analize comparative YoY/QoQ
15. AI insights
16. Procesare async queue
17. Design system v1.3 rollout
18. Onboarding tutorial
19. Billing / abonamente
20. Search global

---

## 9. Recomandări

**Urgent (blocant go-live upload):** deploy migrări iun. + Edge Function + test E2E manual cu fișier 10 coloane.

**Impact maxim următor:** export PDF balanță/KPI + invite multi-user pentru cabinete contabilitate.

**Poate fi amânat:** AI, mobile, redesign v1.3 complet, search global.

**Documentație:** folosește **`RAPORT_STATUS_PROIECT.md`** (acest fișier) + **`ce_verificari_se_fac_la_upload_baanta.md`** ca referințe live; tratează `IMPLEMENTATION_*` din ian. ca arhivă.

---

## 10. Concluzie finală

### 1. În ce stadiu este aplicația?

**Beta avansat, aproape de MVP.** Upload-ul a fost refactorizat fundamental pe 21 iun. 2026; rămâne validarea operațională post-deploy.

### 2. Ce funcționează deja?

Auth, multi-company, parser Excel v2.1 (10 col), pipeline upload refăcut (cod), 9 KPI, dashboard, analize parțiale, landing, securitate DB (migrări în repo), 13 teste unitare parser, script verificare statică.

### 3. Ce lipsește pentru MVP complet?

Deploy upload v2.0 verificat, export PDF/Excel, analize comparative minime, fix CompanyContext, types regenerate, E2E automat, onboarding.

### 4. Ce lipsește pentru lansarea în producție?

Deploy + monitoring 24h, Playwright E2E, invite/RBAC, billing, audit log, legal review, performanță fișiere mari, consolidare documentație.

### 5. Următorii 10 pași recomandați

1. `supabase db push` (migrări iun. 2026)
2. `supabase functions deploy parse-balanta`
3. Test upload manual cu Excel 10 coloane
4. Fix `p_user_id` în `CompanyContext.tsx`
5. Regenerare `types.ts`
6. `npm test` + `verify-upload-pipeline.mjs` (țintă 8/8)
7. Adaugă Playwright pentru flux critic
8. Finalizează export PDF rapoarte
9. Deploy staging + monitoring stale imports
10. Actualizează `planning/about generale/summary_md.md` sau depreciază-l

---

## Tabel final — funcționalități și status

| #   | Funcționalitate             | Status | Evidență                                 |
| --- | --------------------------- | ------ | ---------------------------------------- |
| 1   | Landing & marketing         | ✅     | `Index.tsx`, About/Blog                  |
| 2   | Auth email + Google         | ✅     | Auth pages                               |
| 3   | Multi-company + RLS         | ✅     | Migrări, contexts                        |
| 4   | Creare companie (CUI)       | ⚠️     | RPC OK; `CompanyContext` bug `p_user_id` |
| 5   | Upload balanță Excel v2.1   | ⚠️     | Cod refactorizat; deploy necesar         |
| 6   | Format 10 coloane A–J       | ✅     | `excel-parser.ts`, 13 teste              |
| 7   | Edge Function parse-balanta | ✅     | Reactivată via `importPipeline`          |
| 8   | Coloane total_sume DB       | ✅     | Migrare `20260621100000`                 |
| 9   | Validări blocking parser    | ✅     | SI/Rulaj/SF, formule G/H                 |
| 10  | Validări OMFP (16) extinse  | ❌     | Neconectate la upload                    |
| 11  | Stale import cleanup/retry  | ✅     | DB + UI retry                            |
| 12  | Dashboard KPI (9)           | ✅     | `useKPIs`, Dashboard                     |
| 13  | Grafice Recharts            | ✅     | Multiple pagini                          |
| 14  | Analize financiare          | ⚠️     | UI există                                |
| 15  | Analize comparative         | ⚠️     | Logică limitată                          |
| 16  | Previziuni bugetare         | ⚠️     | Scenarii pe date reale                   |
| 17  | Rapoarte PDF                | ⚠️     | jsPDF, incomplet                         |
| 18  | Export Excel                | ❌     | xlsx fără UX                             |
| 19  | AI Analysis                 | ❌     | Menționat în UI                          |
| 20  | Search global               | ❌     | Placeholder                              |
| 21  | Notificări reale            | ❌     | Popover placeholder                      |
| 22  | Onboarding tutorial         | ❌     | Planificat                               |
| 23  | Admin panel                 | ⚠️     | Parțial                                  |
| 24  | Security Patches v1.8 (DB)  | ✅     | Migrări în repo                          |
| 25  | Security Patches v1.8 (FE)  | ⚠️     | View via importPipeline; types vechi     |
| 26  | Stabilizare upload v2.0     | ⚠️     | Cod ✅; deploy ❓                        |
| 27  | Rate limiting DB            | ✅     | Edge Fn + RPC                            |
| 28  | Performance SQL             | ✅     | Batch, paginare                          |
| 29  | Teste unitare (Vitest)      | ✅     | 13 teste parser                          |
| 30  | Teste E2E (Playwright)      | ❌     | Doar documentat                          |
| 31  | Script verify pipeline      | ✅     | 7/8 checks                               |
| 32  | Invite system               | ❌     | v2.0 roadmap                             |
| 33  | Audit log                   | ❌     | Gap securitate                           |
| 34  | Billing/abonamente          | ❌     | Pricing UI only                          |
| 35  | Procesare async/queue       | ❌     | Planificat                               |
| 36  | Brand assets                | ⚠️     | SVG + guidelines                         |
| 37  | Design system v1.3          | ⚠️     | Rollout incomplet                        |

**Legendă:** ✅ Implementată | ⚠️ Parțial / deploy pending | ❌ Lipsă

---

## Top 20 acțiuni prioritizate după impact

| Rank | Acțiune                                    | Impact           | Efort |
| ---- | ------------------------------------------ | ---------------- | ----- |
| 1    | Deploy migrări `20260621*` + Edge Function | 🔴 Critic        | Mic   |
| 2    | Test E2E manual upload 10 coloane          | 🔴 Critic        | Mic   |
| 3    | Fix `p_user_id` în `CompanyContext.tsx`    | 🔴 Securitate    | Mic   |
| 4    | Regenerare TypeScript types                | 🔴 Mentenanță    | Mic   |
| 5    | Playwright E2E flux critic                 | 🔴 Calitate      | Mediu |
| 6    | Finalizare export PDF rapoarte             | 🟠 Produs        | Mediu |
| 7    | Invite system multi-user                   | 🟠 Produs B2B    | Mare  |
| 8    | Integrare warnings `validateBalance()`     | 🟠 Calitate date | Mediu |
| 9    | Export Excel KPI/rapoarte                  | 🟠 Produs        | Mediu |
| 10   | Analize comparative YoY/QoQ                | 🟠 Produs        | Mare  |
| 11   | Gate 0 + staging Security v1.8             | 🟠 Securitate    | Mediu |
| 12   | CUI UNIQUE CONCURRENTLY prod               | 🟠 Securitate    | Mic   |
| 13   | Monitoring stale imports + alerting        | 🟡 Ops           | Mediu |
| 14   | Actualizare docs format 10 col             | 🟡 Docs          | Mic   |
| 15   | Deprecare README duplicate ian.            | 🟡 Docs          | Mic   |
| 16   | Procesare async fișiere mari               | 🟡 Scalabilitate | Mare  |
| 17   | Rollout design system v1.3                 | 🟡 UX            | Mare  |
| 18   | Fix session restore tab switch             | 🟡 UX            | Mediu |
| 19   | Onboarding tutorial                        | 🟢 Retenție      | Mediu |
| 20   | Billing / Stripe                           | 🟢 Monetizare    | Mare  |

---

## Scor maturitate proiect (0–100)

| Dimensiune              | v1.0 | **v2.0** | Justificare                                                  |
| ----------------------- | ---- | -------- | ------------------------------------------------------------ |
| **Produs**              | 62   | **65**   | Upload stabilizat în cod; export/AI încă lipsesc             |
| **Arhitectură**         | 70   | **76**   | Pipeline unificat, constants, importPipeline; deploy pending |
| **Documentație**        | 78   | **80**   | Docs noi excelente (`ce_verificari_*`); fragmentare rămasă   |
| **Scalabilitate**       | 58   | **58**   | Fără queue; Edge timeout risc                                |
| **Pregătire producție** | 52   | **62**   | Vitest + script verify; E2E + deploy lipsesc                 |

**Scor mediu ponderat: ~68/100** (+4 față de v1.0) — progres semnificativ pe upload; gap principal = deploy operațional + E2E.

---

## Inventar documentație `.md` (36 fișiere unice)

### Sursă de adevăr (actualizate iun. 2026)

| Fișier                                         | Rol                                        |
| ---------------------------------------------- | ------------------------------------------ |
| **`RAPORT_STATUS_PROIECT.md`**                 | Status consolidat proiect (acest document) |
| **`RAPORT_STABILIZARE_UPLOAD_BALANTA.md`**     | Audit + fix-uri pipeline upload            |
| **`ce_verificari_se_fac_la_upload_baanta.md`** | Referință validări + mesaje UI (v2.1)      |

### Implementare & fix-uri (ian.–iun. 2026 — arhivă parțial depășită)

| Fișier                                                              | Notă                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------- |
| `planning/about security patches, types, fix-uri tehnice/IMPLEMENTATION_COMPLETE.md`, `planning/about security patches, types, fix-uri tehnice/START_HERE.md`, `planning/about security patches, types, fix-uri tehnice/VISUAL_SUMMARY.md`  | Security v1.8 — util deploy, status „100%" supraestimat |
| `planning/about upload balance/IMPLEMENTATION_UPLOAD_BALANTA.md`, `planning/about upload balance/QUICK_START_IMPLEMENTATION.md` | Upload v1.4 — parțial depășit (bucket trial-balances)   |
| `planning/about security patches, types, fix-uri tehnice/FIX_IMPORTS_BLOCATE_README.md`, `planning/about security patches, types, fix-uri tehnice/REZOLVARE_EROARE_INCARCARE.md`    | Fix-uri ian. 29 — context istoric                       |
| `planning/about upload balance/FIX_VALIDATION_BLOCKING_README.md`, `planning/about upload balance/TESTS_VALIDATION_BLOCKING.md` | Validări blocking — acoperite de excel-parser v2.1      |
| `planning/about upload balance/TESTING_GUIDE_UPLOAD_BALANTA.md`                                   | Verifică format 10 col înainte de utilizare             |

### Planning & arhitectură

| Fișier                                                                   | Notă                                           |
| ------------------------------------------------------------------------ | ---------------------------------------------- |
| `planning/about generale/KNOWLEDGE.md`, `planning/about generale/tech_stack.md`                        | Referință zilnică — actualizează bucket/format |
| `planning/about generale/analiza_app.md`                                                | Analiză ian. — secțiune N+1 depășită           |
| `planning/about generale/summary_md.md`                                                 | **Index depășit** (22 vs 36 fișiere)           |
| `planning/about upload balance/plan_upload_balanta.md`                                        | Plan detaliat — util istoric                   |
| `planning/about upload balance/incarcare_balanta_f.md`                                        | v1.8 — format 8 col depășit                    |
| `planning/about database/descriere_database.md`, `planning/about database/plan_dezvoltare_database.md` | Schema DB exhaustivă                           |

### Altele

| Fișier                                            | Rol                            |
| ------------------------------------------------- | ------------------------------ |
| `planning/about generale/DEPLOYMENT_GUIDE.md`, `planning/GATE0_README.md` | Deploy Security v1.8           |
| `planning/about security patches, types, fix-uri tehnice/SECURITY_PATCHES_TEST_SUITE.md`          | 29+ teste documentate (manuel) |
| `planning/about frontend/DEBUG_TAB_SWITCH.md`                             | Diagnostic UX                  |
| `README.md`                                       | Setup Lovable generic          |
| `.lovable/plan*.md`, `BRAND_GUIDELINES.md`        | Brand & design                 |

---

## Referințe rapide comenzi

```bash
# Deploy upload v2.0
supabase db push
supabase functions deploy parse-balanta

# Verificări locale
npm test
node scripts/verify-upload-pipeline.mjs
npm run build

# Types
npx supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts
```

---

## Observație finală

Proiectul a trecut de la **„upload instabil cu workaround client"** la **„pipeline coerent documentat și testat unitar"** în iunie 2026. Riscul principal s-a mutat de la arhitectură la **operațiuni**: migrările noi trebuie aplicate pe Supabase remote, iar documentația din ianuarie trebuie tratată ca arhivă — nu ca status curent.

**Actualizează acest raport** la fiecare milestone: deploy reușit, E2E verde, feature major livrat.

---

_Generat: 21 iunie 2026 | Versiune raport: 2.0_
