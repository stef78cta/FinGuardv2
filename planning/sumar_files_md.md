# Sumar fișiere — `planning/`

> **Ultima actualizare:** 24 iunie 2026  
> **Scop:** Index al tuturor fișierelor din `planning/`, cu rolul fiecăruia și momentul când îl consulți.

Documentația este organizată pe **5 categorii** + **fișiere comune la rădăcina** `planning/`. Versiunea canonică a fiecărui document este în subfolderul categoriei; la rădăcina `planning/` pot exista **copii vechi** (vezi secțiunea finală).

---

## Puncte de intrare rapide

| Scenariu                     | Începe cu                                            |
| ---------------------------- | ---------------------------------------------------- |
| Proiect nou / arhitectură    | `about generale/KNOWLEDGE.md` → `tech_stack.md`      |
| Status curent proiect        | `about generale/RAPORT_STATUS_PROIECT.md`            |
| Deploy Security Patches v1.8 | `about security patches.../START_HERE.md`            |
| Upload balanță               | `about upload balance/QUICK_START_IMPLEMENTATION.md` |
| Schema bazei de date         | `about database/prezentare_finguard_database.md` → `tabele.md` → `descriere_database.md` |
| Index navigare categorii     | `README.md`                                          |

---

## Rădăcina `planning/` (comune)

| Fișier                     | Tip      | Rol                                                                                                          |
| -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `README.md`                | Markdown | Index navigare — linkuri către toate categoriile și punctele de intrare principale.                          |
| `GATE0_README.md`          | Markdown | Ghid complet **Gate 0** — verificări obligatorii pre-migrare (checklist, Go/No-Go, FAQ, troubleshooting).    |
| `gate0_verificari.sql`     | SQL      | Script SQL cu 6+ queries diagnostice (RLS, policies, constraints, CUI, grants) — rulează înainte de migrări. |
| `gate0_code_checks.sh`     | Bash     | Verificări cod sursă (expunere `company_id`, SERVICE_ROLE, CORS, etc.) — complement la SQL Gate 0.           |
| `newa_design-tokens.jsonc` | JSONC    | Design tokens v2.0 (culori, tipografie, density, forms, tables, charts) — referință pentru UI/brand.         |
| `sumar_files_md.md`        | Markdown | **Acest fișier** — catalog roluri pentru toate fișierele din `planning/`.                                    |

---

## `about generale/` — proiect, arhitectură, status

| Fișier                     | Rol                                                                                                    | Când îl consulți                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `KNOWLEDGE.md`             | Knowledge base principal (~1.300 linii): overview proiect, stack, hooks, API, best practices, roadmap. | Referință zilnică; prima oprire la orice întrebare despre aplicație.                 |
| `tech_stack.md`            | Documentație tehnică: frontend, backend Supabase, flux date, design system, structură repo, comenzi.   | Onboarding dezvoltatori; înțelegere arhitectură.                                     |
| `analiza_app.md`           | Analiză aplicație: cerințe business, funcționalități, probleme rezolvate, troubleshooting.             | Context produs; status funcționalități.                                              |
| `DEPLOYMENT_GUIDE.md`      | Ghid pas-cu-pas deploy **Security Patches v1.8** (migrări, edge functions, frontend, producție).       | Înainte/during deploy staging sau producție.                                         |
| `RAPORT_STATUS_PROIECT.md` | Raport consolidat iun. 2026: ce e gata, ce e depășit, riscuri, inventar documentație.                  | Vedere de ansamblu actuală; prioritizare task-uri.                                   |
| `summary_md.md`            | Index detaliat fișiere `.md` (navigare, timpi de citire, matrice teme).                                | Găsire rapidă document după subiect; index vechi (parțial depășit ca număr fișiere). |

---

## `about database/` — schemă și planificare DB

| Fișier                        | Rol                                                                                                                  | Când îl consulți                                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `prezentare_finguard_database.md` | Prezentare onboarding DB (~500 linii): arhitectură, module, securitate, migrări, fluxuri — sinteză actualizată iun. 2026. | **Prima oprire** pentru overview rapid; fondatori, onboarding echipă. |
| `tabele.md`                   | Sumar compact al tabelelor (15+ tabele), RLS, relații — „cheat sheet" schema.                                        | Referință rapidă la nume tabele și scop.                     |
| `descriere_database.md`       | Documentație exhaustivă DB (~2.300 linii): arhitectură, tabele, funcții, triggere, RLS, views, migrări, performance. | Lucru profund cu schema; debugging RLS/policies.             |
| `plan_dezvoltare_database.md` | Plan original Security Patches v1.8 (~3.600 linii): vulnerabilități, SQL propus, raționamente, rollback.             | Înțelegere „de ce" din spatele migrărilor; audit securitate. |

---

## `about upload balance/` — încărcare și procesare balanță

| Fișier                                     | Rol                                                                                                            | Când îl consulți                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `incarcare_balanta_f.md`                   | Documentație funcțională upload balanță v1.8 (flux, format fișier, validări, storage).                         | Înțelegere end-to-end a feature-ului upload.            |
| `plan_upload_balanta.md`                   | Plan detaliat bugfix-uri upload v1.4 (~6.500 linii): analiză inconsistențe, contract API, migrări, rollback.   | Referință istorică; debugging complex upload.           |
| `IMPLEMENTATION_UPLOAD_BALANTA.md`         | Sumar implementare v1.4: fix-uri critice (bucket, RLS views, storage), validări contabile, fișiere modificate. | Ce s-a livrat concret la upload v1.4.                   |
| `QUICK_START_IMPLEMENTATION.md`            | Quick start deploy upload v1.4 în 5 pași (migrări, types, test local).                                         | Deploy rapid feature upload.                            |
| `TESTING_GUIDE_UPLOAD_BALANTA.md`          | Ghid testare manuală/E2E upload — format 10 coloane A–J (v2.1).                                                | QA upload; scenarii Excel și verificări Supabase.       |
| `ce_verificari_se_fac_la_upload_baanta.md` | Catalog validări + mesaje UI (din cod sursă), format v2.3.                                                     | Referință validări per rând și mesaje afișate userului. |
| `FIX_VALIDATION_BLOCKING_README.md`        | Documentație fix validări blocking (respingere balanțe invalide înainte de persist).                           | Context fix ian. 2026; validări critice vs warnings.    |
| `TESTS_VALIDATION_BLOCKING.md`             | Specificații teste pentru validări blocking (unit/integration).                                                | Scriere/rulare teste validări upload.                   |
| `RAPORT_STABILIZARE_UPLOAD_BALANTA.md`     | Audit + stabilizare pipeline iun. 2026 (Excel → Storage → parse-balanta → DB).                                 | Status production-ready upload; fix-uri recente.        |

---

## `about security patches, types, fix-uri tehnice/` — Security v1.8

| Fișier                            | Rol                                                                                        | Când îl consulți                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `START_HERE.md`                   | Hub de intrare Security v1.8 — inventar livrabile, lanț citire, opțiuni deploy.            | **Primul fișier** la deploy patch-uri securitate. |
| `QUICK_START.md`                  | Deploy Security v1.8 în 5 pași (Gate 0 → migrări → edge function → types → build).         | Deploy rapid staging/dev.                         |
| `SECURITY_PATCHES_V1.8_README.md` | README patch-uri v1.8: quick commands, navigare, structură fișiere, rollback.              | Overview rapid patch-uri securitate.              |
| `IMPLEMENTATION_SUMMARY.md`       | Sumar implementare v1.8 (~358 linii): migrări, Gate 0, checklist completare.               | Status implementare fără detaliu maxim.           |
| `IMPLEMENTATION_COMPLETE.md`      | Inventar complet v1.8 (~630 linii): toate fișierele create, statistici, pași deployment.   | Audit complet ce s-a livrat la v1.8.              |
| `VISUAL_SUMMARY.md`               | Hartă vizuală ASCII a implementării v1.8 (Gate 0 → migrări → docs).                        | Prezentare vizuală; overview non-tehnic.          |
| `SECURITY_PATCHES_TEST_SUITE.md`  | 29+ teste documentate (RLS, funcții, rate limit, storage, E2E).                            | QA post-deploy Security Patches.                  |
| `FRONTEND_UPDATES_REQUIRED.md`    | Modificări frontend obligatorii după migrări (RPC, filename, error handling).              | Actualizare cod React după `db push`.             |
| `REGENERATE_TYPES.md`             | Ghid regenerare `src/integrations/supabase/types.ts` după migrări.                         | După orice schimbare schema Supabase.             |
| `FIX_IMPORTS_BLOCATE_README.md`   | Fix importuri blocate în status „În procesare" (`process_import_accounts`, cleanup stale). | Debugging importuri stuck ian. 2026.              |
| `REZOLVARE_EROARE_INCARCARE.md`   | Fix eroare generică „Eroare la încărcare" (bucket `balante` → `trial-balances`, policies). | Troubleshooting upload eșuat la storage.          |

---

## `about frontend/` — debugging UI

| Fișier                | Rol                                                                                            | Când îl consulți                                   |
| --------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `DEBUG_TAB_SWITCH.md` | Ghid diagnosticare reset app la schimbare tab browser (hard reload vs SPA remount vs bfcache). | UX bug tab switch; interpretare log-uri `[MOUNT]`. |

---

## Statistici

| Categorie                                         | Fișiere (canonice)       |
| ------------------------------------------------- | ------------------------ |
| Rădăcină `planning/`                              | 6 (inclusiv acest sumar) |
| `about generale/`                                 | 6                        |
| `about database/`                                 | 4                        |
| `about upload balance/`                           | 9                        |
| `about security patches, types, fix-uri tehnice/` | 11                       |
| `about frontend/`                                 | 1                        |
| **Total canonic**                                 | **37**                   |

---

## Relații între documente cheie

```
README.md / sumar_files_md.md (index)
        │
        ├── about generale/KNOWLEDGE.md ──► tech_stack.md, analiza_app.md
        │
        ├── about database/tabele.md ──► descriere_database.md ◄── plan_dezvoltare_database.md
        │
        ├── about security patches.../START_HERE.md
        │         ├── QUICK_START.md
        │         ├── ../GATE0_README.md + gate0_*.sql/sh
        │         ├── ../about generale/DEPLOYMENT_GUIDE.md
        │         └── SECURITY_PATCHES_TEST_SUITE.md
        │
        └── about upload balance/QUICK_START_IMPLEMENTATION.md
                  ├── IMPLEMENTATION_UPLOAD_BALANTA.md
                  ├── TESTING_GUIDE_UPLOAD_BALANTA.md
                  └── ce_verificari_se_fac_la_upload_baanta.md
```

---

## Note de mentenanță

- **`summary_md.md`** (în `about generale/`) și **`sumar_files_md.md`** (acest fișier) se completează: primul e index detaliat cu timpi de citire; al doilea e catalog pe categorii cu roluri.
- **`RAPORT_STATUS_PROIECT.md`** marchează documente parțial depășite — verifică data din header înainte de a te baza pe status „100% ready".
- Fișierele **upload** referă format **10 coloane A–J** (v2.1+); documentele **v1.8** cu 8 coloane pot fi depășite parțial.
