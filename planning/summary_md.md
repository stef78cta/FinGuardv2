# Sumar Fișiere Markdown - FinGuard v2

> **Ultima actualizare:** 26 Ianuarie 2026  
> **Total fișiere `.md`:** 6

---

## 1. README.md

**Locație:** `finguardv2/README.md`  
**Scop:** Fișier README standard generat de platforma Lovable

### Ce conține:
- Link către proiectul Lovable pentru editare online
- Instrucțiuni de instalare și rulare locală (`npm install`, `npm run dev`)
- Tehnologiile folosite: Vite, TypeScript, React, shadcn-ui, Tailwind CSS
- Opțiuni de editare (Lovable, IDE local, GitHub, Codespaces)
- Instrucțiuni pentru deploy și conectare domeniu custom

### Când să-l consulți:
- La setup-ul inițial al proiectului
- Pentru instrucțiuni de deployment

---

## 2. KNOWLEDGE.md

**Locație:** `finguardv2/planning/KNOWLEDGE.md`  
**Scop:** Knowledge base completă a proiectului - documentație centralizată pentru dezvoltatori și AI

### Ce conține:
- **Project Overview:** Descriere FinGuard, propunere de valoare, target users
- **Technology Stack:** React 18, Vite, TypeScript, Tailwind, Supabase
- **Backend Architecture:** Schema PostgreSQL completă (users, companies, trial_balance_imports, trial_balance_accounts)
- **React Architecture:** Contexts (AuthContext, CompanyContext), Custom Hooks (useBalante, useKPIs, etc.)
- **Design System:** Color tokens, typography, button hierarchy, card styles
- **Component Patterns:** Structura paginilor, pattern-uri reutilizabile
- **Data Visualization:** Chart colors, ChartContainer usage
- **File Organization:** Structura completă a proiectului cu explicații
- **Romanian Language Conventions:** Termeni financiari în română
- **Development Workflow:** Comenzi npm și Supabase
- **Export Functionality:** Pattern-uri pentru PDF și Excel
- **Best Practices:** DO și DON'T pentru cod și securitate
- **Troubleshooting:** Probleme comune și soluții
- **Roadmap:** Planuri pentru 2026

### Când să-l consulți:
- **Prima referință** la orice întrebare despre proiect
- Pentru pattern-uri de cod și convenții
- Pentru schema bazei de date și RLS policies

---

## 3. analiza_app.md

**Locație:** `finguardv2/planning/analiza_app.md`  
**Scop:** Analiză completă a aplicației FinGuard v2 din perspectivă UI, UX, funcționalitate, performanță, securitate și scalabilitate

### Ce conține:
- **Despre FinGuard:** Propunere de valoare, funcționalități principale, grup țintă
- **Analiză UI:** Design system, componente, responsive design, puncte slabe
- **Analiză UX:** Fluxuri intuitive, feedback vizual, navigare, probleme identificate
- **Funcționalitate:** Ce e implementat vs ce lipsește (upload balanțe, KPI-uri, multi-company)
- **Performanță:** Puncte forte (Vite, React Query), probleme (N+1 queries - rezolvate)
- **Securitate:** RLS comprehensive, vulnerabilități rezolvate (CORS, rate limiting, input validation)
- **Scalabilitate:** Arhitectura sistemului, limitări și soluții
- **Progres rezolvare:** 7/11 probleme rezolvate (64%)
- **Changelog:** Modificări securitate și performanță din Ianuarie 2026

### Când să-l consulți:
- Pentru a înțelege starea actuală a aplicației
- Pentru prioritizarea task-urilor de îmbunătățire
- Pentru a verifica ce probleme au fost deja rezolvate

---

## 4. tech_stack.md

**Locație:** `finguardv2/planning/tech_stack.md`  
**Scop:** Documentație tehnică și arhitectură pentru dezvoltatori

### Ce conține:
- **Tech Stack Summary:** Tabel cu toate tehnologiile și versiunile
- **Frontend Architecture:** React 18 + Vite, TypeScript, state management (React Query, Context API)
- **Custom Hooks:** Lista completă cu descriere pentru fiecare
- **Routing Architecture:** Structura rutelor cu Route Guards
- **Backend Architecture:** Schema DB implementată, stored functions, Edge Functions
- **Diagrame arhitectură:** High-level system architecture (ASCII)
- **Data Flow Patterns:** Balance Upload Flow, Dashboard Data Flow
- **Design System:** Color palette, typography, animations
- **Structura proiectului:** Arborele complet de foldere și fișiere
- **Development Commands:** npm și Supabase CLI

### Când să-l consulți:
- Pentru referință rapidă la stack-ul tehnic
- Pentru înțelegerea fluxului de date
- Pentru comenzi de development

---

## 5. plan_update_style.md

**Locație:** `finguardv2/.lovable/plan_update_style.md`  
**Scop:** Plan detaliat pentru actualizarea design system-ului la versiunea 1.3

### Ce conține:
- **Obiectiv:** Înlocuire StyleGuide.tsx și aplicare stiluri noi
- **Analiză diferențe:** Tabel comparativ stil actual vs stil nou v1.3
- **Faza 1:** Înlocuire completă new_StyleGuide.tsx
- **Faza 2:** Actualizări CSS în index.css (label-micro, stat-mini, nav-item, density, card-accent)
- **Faza 3:** Actualizare componente app (KPICard, ChartCard, StatCard)
- **Faza 4:** Actualizare UI Components base (badge, table)
- **Faza 5:** Actualizare Landing Components (Hero, Pricing, Features)
- **Faza 6:** Actualizare pagini App
- **Detalii tehnice:** Pattern-uri status indicators, font stack, culori exacte

### Când să-l consulți:
- La implementarea design system-ului v1.3
- Pentru referință la clasele CSS noi
- Pentru pattern-uri vizuale (status indicators, stat cards)

---

## 6. rule-guideline.md

**Locație:** `finguardv2/.cursor/rules/rule-guideline.md`  
**Scop:** Ghid pentru crearea și gestionarea regulilor Cursor IDE

### Ce conține:
- **Best Practices:** Reguli specifice, context, exemple
- **Rule Management Strategy:** Începe cu 3-5 reguli, iterează, documentează
- **Recommended Global Rules:** Code style, documentation, error handling, testing, security
- **Rule Description Best Practices:** Task-based, context-based, problem-based, technology-based
- **Advanced Usage:** Ierarhii de reguli, testare reguli

### Când să-l consulți:
- La crearea de noi reguli pentru Cursor
- Pentru best practices în configurarea IDE-ului

---

## Hartă Rapidă

| Fișier | Scop Principal | Prioritate Consultare |
|--------|----------------|----------------------|
| `KNOWLEDGE.md` | Knowledge base completă | 🔴 Înaltă - Prima referință |
| `analiza_app.md` | Analiză stare curentă + probleme | 🟠 Medie-Înaltă |
| `tech_stack.md` | Arhitectură tehnică | 🟡 Medie |
| `plan_update_style.md` | Plan actualizare stiluri | 🟢 La nevoie |
| `README.md` | Setup & deployment | 🟢 La nevoie |
| `rule-guideline.md` | Configurare Cursor | 🟢 La nevoie |

---

*Document generat automat - 26 Ianuarie 2026*
