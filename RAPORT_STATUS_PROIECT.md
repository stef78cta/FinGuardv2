# Raport consolidat — FinGuard v2

**Sursă analiză:** 34 fișiere `.md` unice (planning, implementare, testare, brand, Lovable, Cursor) + verificare punctuală în cod (`src/`, `supabase/migrations/`)  
**Data raportului:** 20 iunie 2026 (documentația internă e concentrată ian. 2026)  
**Metodă:** corelare cross-document + identificare contradicții față de codul actual

---

## Documente duplicate, depășite sau contradictorii

| Problemă | Documente implicate | Realitate consolidată |
|----------|-------------------|------------------------|
| **„100% production ready” vs TODO-uri deschise** | `IMPLEMENTATION_COMPLETE.md` vs `planning/IMPLEMENTATION_SUMMARY.md` vs `VISUAL_SUMMARY.md` | Migrările v1.8 există în repo; `IMPLEMENTATION_SUMMARY` listează încă Edge Function + frontend ca TODO. `VISUAL_SUMMARY` menționează explicit TODO pentru view public. |
| **Bucket storage: `balante` vs `trial-balances`** | `IMPLEMENTATION_UPLOAD_BALANTA.md`, `QUICK_START_IMPLEMENTATION.md` vs `REZOLVARE_EROARE_INCARCARE.md` vs cod | Codul actual (`useTrialBalances.tsx`) folosește **`balante`** (revert v1.9). Există migrări pentru ambele nume → risc de policies pe bucket greșit. |
| **Index documentație depășit** | `planning/summary_md.md` (22 fișiere, 28 ian.) | Lipsesc ~12 documente din ian. 29 (upload, validări, fix-uri). |
| **N+1 queries „încă problemă”** | `planning/analiza_app.md` secțiunea 4 vs secțiunea 6/7 | Aceeași analiză spune că N+1 e problemă ȘI că e rezolvată — secțiunea 4 nu a fost actualizată. |
| **Confidențialitate fără CUI** | `planning/analiza_app.md`, `KNOWLEDGE.md` | Schema DB + `create_company_with_member` **cer CUI obligatoriu** și UNIQUE. |
| **Test coverage 90%+** | `START_HERE.md`, `VISUAL_SUMMARY.md` | Doar teste **documentate** în MD; `package.json` **nu** conține Vitest/Playwright/Jest. |
| **Propunere valoare vs stack** | Marketing docs | „Date pe Amazon” — stack real: **Supabase** (PostgreSQL + Storage + Edge Functions). |

---

## 1. Executive Summary

**FinGuard v2** este o platformă SaaS românească de analiză financiară: încărcare balanțe Excel, calcul KPI, dashboard, rapoarte parțiale, multi-company. Stack: **React 18 + Vite + TypeScript + Tailwind/shadcn + Supabase**.

**Scop:** consultant financiar digital pentru IMM-uri, contabili și analiști — upload balanță → indicatori → vizualizări → (planificat) rapoarte și previziuni.

**Nivel estimat de finalizare:**

| Dimensiune | % | Comentariu |
|------------|---|------------|
| **MVP funcțional** | **~72%** | Upload + KPI + auth + multi-company funcționează; export/rapoarte incomplete |
| **Produs complet (marketing)** | **~45%** | AI, previziuni avansate, comparații multi-perioadă, search, onboarding lipsesc |
| **Pregătire producție** | **~58%** | Securitate documentată; deployment + teste automate + aliniere cod-doc rămân |

---

## 2. Funcționalități existente

| Funcționalitate | Descriere | Status | Confirmare |
|-----------------|-----------|--------|------------|
| **Autentificare** | Email/parolă, Google OAuth, PKCE, refresh token | Implementată | `KNOWLEDGE.md`, `AuthContext`, pagini Login/Signup |
| **Multi-company** | Creare companie, switcher, RLS per tenant | Implementată | `useCompany.tsx`, `CompanyContext`, migrări companies |
| **Upload balanță Excel** | Drag-drop, validare client, storage, Edge Function | Parțial implementată | `IncarcareBalanta.tsx`, `useTrialBalances.tsx`, `parse-balanta` — instabilități documentate (status, bucket) |
| **Parsare & persistență conturi** | Excel → `trial_balance_accounts` via RPC | Implementată | `process_import_accounts`, `incarcare_balanta_f.md` |
| **Validări contabile (16)** | 8 blocking + 8 warnings OMFP | Implementată (client) | `balanceValidation.ts`, `FIX_VALIDATION_BLOCKING_README.md` |
| **Validări blocking parsare** | Control totals, clasa 6/7, max 8 coloane (goale=0), conturi invalide | Implementată | `excel-parser.ts` v2.0 |
| **9 KPI financiari** | Lichiditate, profitabilitate, îndatorare, eficiență | Implementată | `useKPIs.tsx`, `IndicatoriCheie.tsx`, `Dashboard.tsx` |
| **Dashboard & grafice** | KPI cards, Recharts, Top 5 conturi | Implementată | `analiza_app.md`, `tech_stack.md` |
| **Analize financiare (tabs)** | Venituri, cheltuieli, patrimoniu | Parțial implementată | `AnalizeFinanciare.tsx` — UI există; profunzime variabilă |
| **Rapoarte financiare** | Bilanț, P&L, cash flow | Parțial implementată | `RapoarteFinanciare.tsx` — jsPDF/xlsx importate, flux incomplet |
| **Previziuni bugetare** | Scenarii optimist/realist/pesimist | Parțial implementată | `PreviziuniBugetare.tsx` — calcule pe date reale, nu mock pur |
| **Landing & marketing** | Hero, pricing, FAQ, blog, about | Implementată | `Index.tsx`, pagini About/Blog/Careers |
| **Admin panel** | Roluri admin/super_admin | Parțial implementată | `Admin.tsx`, `AdminGuard` |
| **Securitate RLS** | Politici pe toate tabelele critice | Implementată | `descriere_database.md`, migrări ian. 2026 |
| **Security Patches v1.8** | Auto-join, CUI unique, rate limits, views | Implementată (migrări) | 11 migrări `202601281*`, `IMPLEMENTATION_COMPLETE.md` |
| **Performance SQL** | Batch queries, paginare, soft delete | Implementată | `20260120100000_performance_optimizations.sql` |
| **Error Boundary** | Gestionare erori pagină upload | Implementată | `ErrorBoundary.tsx` |
| **Normalizare filename** | ASCII, path storage | Implementată | `fileHelpers.ts` |
| **Stale import cleanup** | Retry, cleanup >10 min | Implementată (DB) | `FIX_IMPORTS_BLOCATE_README.md`, migrări `202601291*` |
| **Brand assets** | Logo SVG, guidelines, manifest | Parțial implementată | `.lovable/plan.md`, `BRAND_GUIDELINES.md` — PNG-uri posibil incomplete |
| **Design system v1.3** | Style guide nou | În curs | `newa_StyleGuide.tsx`, `plan_update_style.md` — migrare incompletă |

---

## 3. Funcționalități în dezvoltare

| Funcționalitate | Status estimat | Blocaje | Prioritate |
|-----------------|----------------|---------|------------|
| **Stabilizare pipeline upload** | ~85% cod, ~60% operațional | Bucket `balante`/`trial-balances`, status pending/processing, migrări neaplicate uniform | **P1 critic** |
| **Aliniere frontend Security v1.8** | ~70% | Cod încă folosește `trial_balance_imports` direct, nu `trial_balance_imports_public` | **P1** |
| **Export PDF/Excel complet** | ~40% | Librării instalate, UX incomplet | **P2** |
| **Analize comparative** | ~35% | Pagină există, logică limitată | **P2** |
| **Design system v1.3 rollout** | ~30% | Plan pe 6 faze, parțial aplicat | **P3** |
| **Debug tab switch / session restore** | Diagnostic | `DEBUG_TAB_SWITCH.md` — investigație, fără fix permanent | **P3** |
| **Teste automate** | 0% cod, 100% documentație | Doar ghiduri MD, fără runner | **P1 pentru prod** |

---

## 4. Funcționalități planificate

| Funcționalitate | Beneficiu | Complexitate |
|-----------------|-----------|--------------|
| **Invite system + roluri granulare** | Colaborare echipă, securitate multi-user | Mare |
| **Audit log complet** | Conformitate, debugging | Medie |
| **AI insights / recomandări** | Diferențiere produs | Mare |
| **Procesare asincronă (queue)** | Fișiere mari >50MB, timeout Edge | Mare |
| **Integrare e-Factura / API contabilitate** | Automatizare date | Mare |
| **Search global funcțional** | UX power users | Medie |
| **Onboarding tutorial** | Retenție utilizatori noi | Medie |
| **Dashboard customizabil (widgets)** | Personalizare | Mare |
| **Notificări real-time** | Alertă procesare/erori | Medie |
| **Mobile app** | Acces mobil nativ | Mare |
| **Redis caching** | Scale enterprise | Medie |
| **pg_cron cleanup automat** | Mentenanță rate_limits/imports | Mică |
| **Edge Functions: calculate-kpis, generate-report** | Logică server-side | Medie |
| **CSV + auto-detect header** | Flexibilitate import | Medie |

*Sursă: `KNOWLEDGE.md` roadmap Q1–Q4 2026, `START_HERE.md` v2.0, `plan_upload_balanta.md`*

---

## 5. Arhitectura aplicației

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT: React 18 + Vite + TS + Tailwind + shadcn/ui     │
│  State: React Query + AuthContext + CompanyContext      │
│  Charts: Recharts | Forms: RHF + Zod | Export: jsPDF/xlsx │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS (Supabase JS client)
┌──────────────────────────▼──────────────────────────────┐
│  SUPABASE                                               │
│  ├─ Auth (email, Google OAuth)                          │
│  ├─ PostgreSQL + RLS + RPC (20+ migrări)                │
│  ├─ Storage bucket: balante (sau trial-balances)        │
│  └─ Edge Function: parse-balanta (Deno)                 │
└─────────────────────────────────────────────────────────┘
```

| Layer | Tehnologii |
|-------|------------|
| **Frontend** | React 18.3, Vite 5.4, TS 5.8, Tailwind 3.4, Radix/shadcn, React Router 6.30, TanStack Query 5.83 |
| **Backend** | Supabase 2.90 — PostgreSQL, Auth, Storage, Edge Functions |
| **Baza de date** | Tabele: `users`, `user_roles`, `companies`, `company_users`, `trial_balance_imports`, `trial_balance_accounts`, `rate_limits`; views: `trial_balance_imports_public`, `active_trial_balance_imports` |
| **API-uri** | Supabase client + RPC: `create_company_with_member`, `get_import_totals`, `get_balances_with_accounts`, `process_import_accounts`, `check_rate_limit`, `cleanup_stale_imports`, `retry_failed_import` |
| **Integrări** | Google OAuth; Lovable (CI/deploy); fără Stripe/billing documentat |
| **Hosting** | Lovable Publish + domeniu custom `finguard.ro` (planificat în CORS) |

---

## 6. Modulele aplicației

```
Landing (/) ──► Auth (/login, /signup)
                    │
                    ▼
              AppLayout (/app) [AuthGuard + CompanyGuard]
                    │
    ┌───────────────┼───────────────┬──────────────┐
    ▼               ▼               ▼              ▼
Dashboard    IncarcareBalanta   Analize/KPI   Rapoarte/Previziuni
    │               │               │              │
    │          useTrialBalances  useKPIs      useFinancialCalculations
    │          balanceValidation useBalante
    │               │
    └───────────────┴──────► Supabase DB + Storage + parse-balanta
```

| Modul | Rol | Dependențe | Lacune |
|-------|-----|------------|--------|
| **Auth** | Sesiune, profil user | Supabase Auth | — |
| **Company** | Tenant switching, creare firmă | RLS, `create_company_with_member` | Fără invite |
| **Upload/Parse** | Import Excel end-to-end | Storage, Edge Fn, RPC | Instabilitate bucket/status |
| **Validation** | Integritate contabilă | `balanceValidation.ts`, `excel-parser.ts` | Duplicate policy v1.2 vs v1.3 neclar |
| **Analytics/KPI** | Indicatori + grafice | Conturi din DB | KPI client-side, nu server |
| **Reports** | Bilanț, P&L, export | useBalante, jsPDF | Export incomplet |
| **Admin** | Administrare | user_roles | Funcționalitate limitată |
| **Security layer** | RLS, rate limits, views | Migrări v1.8 | Frontend nealiniat complet |

---

## 7. Probleme și riscuri

### Bug-uri documentate (ian. 2026)

1. **Imports blocate în „processing”** — mismatch status frontend/DB (`FIX_IMPORTS_BLOCATE_README.md`) — fix parțial aplicat
2. **„Eroare la încărcare” generică** — bucket/policies lipsă (`REZOLVARE_EROARE_INCARCARE.md`)
3. **Balanțe invalide acceptate** — lipsă validări blocking (`FIX_VALIDATION_BLOCKING_README.md`) — rezolvat în cod
4. **Tab switch resetează app** — diagnostic fără fix (`DEBUG_TAB_SWITCH.md`)
5. **Bucket name inconsistent** — risc upload 100% blocat (`plan_upload_balanta.md` v1.4.1)

### Arhitectură

- **Dualitate hooks** `useBalante` vs `useTrialBalances` — suprapunere, mentenanță dificilă
- **Parsare client + server** — validări duplicate, risc divergență
- **Edge Function timeout** — fișiere mari fără queue
- **~25 migrări SQL** — ordine și aplicare pe medii diferite = risc drift DB

### Funcționalități critice lipsă pentru prod

- Teste automate (0 în repo)
- Invite system / RBAC granular
- Billing / abonamente (pricing UI există, backend absent)
- Monitoring/alerting producție documentat dar neimplementat
- Consolidare documentație (index depășit)

### Datorie tehnică

- `trial_balance_imports` direct vs view public
- Secțiunea N+1 neactualizată în `analiza_app.md`
- Design system v1.2 → v1.3 neterminat
- Debug logging în `main.tsx`/`App.tsx` (tab switch)
- Claims marketing ≠ implementare (CUI, Amazon)

### Documentație

- **Foarte voluminoasă** (~20.000+ linii) dar **fragmentată** pe valuri (v1.8 security → v1.4 upload → v1.9 quick fixes)
- **Index `summary_md.md` depășit**
- **Contradicții status** între documente de implementare

---

## 8. Roadmap actual (reconstruit)

### Prioritate 1 — critic

1. Aplicare uniformă migrări pe staging/prod + Gate 0
2. Decizie definitivă bucket: **`balante`** (cod actual) sau **`trial-balances`** — aliniere migrări + policies + Edge Function
3. Fix frontend: `trial_balance_imports_public`, eliminare `p_user_id` dacă rămâne
4. Verificare E2E upload (ghid `TESTING_GUIDE_UPLOAD_BALANTA.md`)
5. Setup teste automate minime (Playwright upload + create company)

### Prioritate 2 — important

6. Finalizare export PDF/Excel în `RapoarteFinanciare.tsx`
7. Completare analize comparative multi-perioadă
8. Invite system + roluri (viewer/editor/admin)
9. CUI UNIQUE CONCURRENTLY pe producție (>1000 companii)
10. Consolidare documentație — un singur `STATUS.md` sursă de adevăr
11. Rollout design system v1.3
12. Procesare asincronă pentru fișiere mari

### Prioritate 3 — nice to have

13. AI insights
14. Search global
15. Onboarding tutorial
16. Notificări real-time
17. Integrare e-Factura
18. Mobile app
19. Redis caching
20. Dashboard widgets drag-and-drop

---

## 9. Recomandări

**Finalizare urgentă:** pipeline upload stabil (bucket + status + migrări), aliniere security v1.8 în frontend, primul suite E2E automatizat, decizie go-live pe staging cu checklist din `DEPLOYMENT_GUIDE.md`.

**Poate fi amânat:** AI, mobile, dashboard customizabil, redesign complet v1.3, search global.

**Impact maxim:** upload fiabil + KPI corecte + export PDF balanță/KPI + invite multi-user pentru cabinete contabilitate.

**Refactorizări necesare:** unificare `useBalante`/`useTrialBalances`; mutare KPI pe server (`calculate-kpis` planificat); canonicalizare bucket storage; actualizare `summary_md.md` + `analiza_app.md`.

---

## 10. Concluzie finală

### 1. În ce stadiu este aplicația?

**Beta avansat / pre-producție.** Core-ul funcționează; zona upload a trecut prin multiple fix-uri; documentația declară „production ready” dar codul și migrările nu sunt complet aliniate.

### 2. Ce funcționează deja?

Autentificare, multi-company, upload Excel (cu rezerve), parsare conturi, 9 KPI, dashboard, analize parțiale, landing, securitate DB (dacă migrările sunt aplicate), validări contabile client-side.

### 3. Ce lipsește pentru MVP complet?

Export PDF/Excel funcțional, analize comparative minime, pipeline upload stabil verificat E2E, teste automate, onboarding, eliminare mesaje generice de eroare, documentație unică de status.

### 4. Ce lipsește pentru lansarea în producție?

Deployment verificat (Gate 0 + migrări), teste automate, monitoring, invite/RBAC, billing (dacă e monetizat), CUI UNIQUE manual pe prod, consolidare bucket storage, legal/compliance review, performanță fișiere mari.

### 5. Următorii 10 pași recomandați

1. Rulează Gate 0 pe environment-ul țintă
2. Inventariază migrări aplicate vs repo (`supabase migration list`)
3. Standardizează bucket **`balante`** (sau migrează tot la `trial-balances`)
4. Înlocuiește `.from('trial_balance_imports')` cu view public în hooks
5. Test manual complet upload (valid/invalid/retry)
6. Adaugă Playwright pentru flux signup → company → upload
7. Finalizează export PDF din rapoarte
8. Creează `STATUS.md` unic, depreciază duplicatele de implementare
9. Deploy staging + 24h monitoring
10. Planifică invite system pentru Q2

---

## Tabel final — funcționalități și status

| # | Funcționalitate | Status | Evidență |
|---|-----------------|--------|----------|
| 1 | Landing & marketing | ✅ Implementată | `Index.tsx`, pagini About/Blog |
| 2 | Auth email + Google | ✅ Implementată | `KNOWLEDGE.md`, Auth pages |
| 3 | Multi-company + RLS | ✅ Implementată | Migrări, `useCompany` |
| 4 | Creare companie (CUI) | ✅ Implementată | RPC, Security v1.8 |
| 5 | Upload balanță Excel | ⚠️ Parțial | Fix-uri v1.9, bucket drift |
| 6 | Parsare server Edge Fn | ✅ Implementată | `parse-balanta` |
| 7 | Validări blocking (16) | ✅ Implementată | `balanceValidation.ts` |
| 8 | Stale import cleanup/retry | ✅ Implementată | Migrări `202601291*` |
| 9 | Dashboard KPI (9 indicatori) | ✅ Implementată | `useKPIs`, `Dashboard` |
| 10 | Grafice Recharts | ✅ Implementată | Multiple pagini |
| 11 | Analize financiare | ⚠️ Parțial | `AnalizeFinanciare.tsx` |
| 12 | Indicatori cheie (pagină) | ✅ Implementată | `IndicatoriCheie.tsx` |
| 13 | Analize comparative | ⚠️ Parțial | UI există, logică limitată |
| 14 | Previziuni bugetare | ⚠️ Parțial | Scenarii pe date reale |
| 15 | Rapoarte PDF | ⚠️ Parțial | jsPDF importat, incomplet |
| 16 | Export Excel | ❌ Neimplementat | xlsx instalat, fără UX |
| 17 | AI Analysis | ❌ Neimplementat | Menționat în UI |
| 18 | Search global | ❌ Neimplementat | `analiza_app.md` |
| 19 | Notificări reale | ❌ Neimplementat | Popover placeholder |
| 20 | Onboarding tutorial | ❌ Neimplementat | Roadmap |
| 21 | Admin panel | ⚠️ Parțial | `Admin.tsx` |
| 22 | Security Patches v1.8 (DB) | ✅ Implementată (repo) | 11 migrări |
| 23 | Security Patches v1.8 (FE) | ⚠️ Parțial | View public nefolosit |
| 24 | Rate limiting DB | ✅ Implementată | `rate_limits`, Edge Fn |
| 25 | Performance (batch, paginare) | ✅ Implementată | Migrare ian. 2026 |
| 26 | Error Boundary | ✅ Implementată | Component există |
| 27 | Brand assets | ⚠️ Parțial | SVG + guidelines |
| 28 | Design system v1.3 | ⚠️ În dezvoltare | `plan_update_style.md` |
| 29 | Teste automate | ❌ Neimplementat | Doar MD |
| 30 | Invite system | ❌ Planificat | v2.0 roadmap |
| 31 | Audit log | ❌ Planificat | Security gap rămas |
| 32 | Billing/abonamente | ❌ Neimplementat | Pricing UI only |
| 33 | Procesare async/queue | ❌ Planificat | Scalabilitate |
| 34 | Integrări contabilitate | ❌ Planificat | Q3 2026 |

**Legendă:** ✅ Implementată | ⚠️ Parțial | ❌ Lipsă/Planificat

---

## Top 20 acțiuni prioritizate după impact

| Rank | Acțiune | Impact | Efort |
|------|---------|--------|-------|
| 1 | Stabilizare pipeline upload (bucket + status + migrări) | 🔴 Critic | Mediu |
| 2 | Aplicare Gate 0 + deploy migrări pe staging | 🔴 Critic | Mic |
| 3 | Aliniere frontend la `trial_balance_imports_public` | 🔴 Securitate | Mic |
| 4 | Test E2E manual + automat upload | 🔴 Calitate | Mediu |
| 5 | Consolidare documentație (STATUS.md unic) | 🟠 Mentenanță | Mic |
| 6 | Finalizare export PDF rapoarte | 🟠 Produs | Mediu |
| 7 | Unificare hooks balanțe | 🟠 Mentenanță | Mediu |
| 8 | Invite system multi-user | 🟠 Produs B2B | Mare |
| 9 | Export Excel KPI/rapoarte | 🟠 Produs | Mediu |
| 10 | Analize comparative YoY/QoQ | 🟠 Produs | Mare |
| 11 | CUI UNIQUE CONCURRENTLY prod | 🟠 Securitate | Mic |
| 12 | Monitoring stale imports + alerting | 🟡 Ops | Mediu |
| 13 | Procesare async fișiere mari | 🟡 Scalabilitate | Mare |
| 14 | Completare analize financiare | 🟡 Produs | Mediu |
| 15 | Rollout design system v1.3 | 🟡 UX | Mare |
| 16 | Fix session restore tab switch | 🟡 UX | Mediu |
| 17 | Onboarding tutorial | 🟡 Retenție | Mediu |
| 18 | Search funcțional | 🟢 UX | Mediu |
| 19 | pg_cron cleanup rate_limits | 🟢 Ops | Mic |
| 20 | Actualizare index `summary_md.md` | 🟢 Docs | Mic |

---

## Scor maturitate proiect (0–100)

| Dimensiune | Scor | Justificare |
|------------|------|-------------|
| **Produs** | **62** | Core solid; funcții promovate incomplete (export, AI, comparative) |
| **Arhitectură** | **70** | Stack modern, RLS, Edge Fn; drift bucket/hooks, fără queue |
| **Documentație** | **78** | Volum mare, utilă, dar contradictorie și parțial depășită |
| **Scalabilitate** | **58** | Optimizări SQL OK; Edge timeout, fără cache server, fără async |
| **Pregătire producție** | **52** | Migrări există; fără teste auto, deployment neconfirmat, doc-code gap |

**Scor mediu ponderat: ~64/100** — proiect matur tehnic pe fundație, imatur operațional pentru lansare publică sigură.

---

## Referințe documentație cheie

| Categorie | Fișiere principale |
|-----------|-------------------|
| Knowledge base | `planning/KNOWLEDGE.md`, `planning/tech_stack.md` |
| Status aplicație | `planning/analiza_app.md` |
| Security v1.8 | `START_HERE.md`, `IMPLEMENTATION_COMPLETE.md`, `planning/DEPLOYMENT_GUIDE.md` |
| Upload balanță | `plan_upload_balanta.md`, `IMPLEMENTATION_UPLOAD_BALANTA.md`, `incarcare_balanta_f.md` |
| Fix-uri upload | `FIX_IMPORTS_BLOCATE_README.md`, `REZOLVARE_EROARE_INCARCARE.md`, `FIX_VALIDATION_BLOCKING_README.md` |
| Testare | `TESTING_GUIDE_UPLOAD_BALANTA.md`, `testing/SECURITY_PATCHES_TEST_SUITE.md` |
| Index documente | `planning/summary_md.md` (depășit — de actualizat) |

---

## Observație finală

Documentația FinGuard v2 este **de calitate peste medie** pentru un proiect SaaS, dar suferă de **„documentație de valuri”**: fiecare sprint (security v1.8 → upload v1.4 → fix v1.9) a generat propriile README-uri „100% complete”, fără reconciliere. Riscul principal nu e lipsa funcționalității, ci **decalajul între ce declară markdown-ul și ce rulează în producție** — în special upload, storage bucket și view-uri RLS.

**Acest document (`RAPORT_STATUS_PROIECT.md`) este sursa consolidată de status.** La fiecare milestone major, actualizează secțiunile 2, 3, 7, 8 și tabelul final.

---

*Generat: 20 iunie 2026 | Versiune: 1.0*
