# FinGuard v2 — Documentație Frontend

> **Ultima actualizare:** 11 Iulie 2026  
> **Scop:** Reflectă fidel starea actuală a aplicației frontend, integrărilor Supabase și implementărilor existente.  
> **Regulă:** Aceste fișiere descriu codul existent — nu planificări viitoare.

---

## Index documente

| Fișier | Conținut |
|--------|----------|
| [ARHITECTURA.md](./ARHITECTURA.md) | Stack tehnologic, structură `src/`, routing, autentificare, state management, design system |
| [PAGINI_SI_FEATURES.md](./PAGINI_SI_FEATURES.md) | Inventar pagini, funcționalități implementate vs. incomplete, hook-uri |
| [INTEGRARE_DATABASE.md](./INTEGRARE_DATABASE.md) | Tabele/vizualizări folosite din frontend, RPC-uri, Edge Functions, Storage, tipuri TypeScript |
| [DEBUG_TAB_SWITCH.md](./DEBUG_TAB_SWITCH.md) | Diagnostic reset UI la schimbare tab browser + mitigări implementate |

---

## Rezumat rapid

| Aspect | Stare actuală |
|--------|---------------|
| **Framework** | React 18.3 + Vite 5 + TypeScript 5.8 |
| **UI** | shadcn/ui (Radix) + Tailwind + design system NEWA |
| **Auth** | Supabase Auth (PKCE, OAuth Google) — **nu** Clerk |
| **Backend client** | `@supabase/supabase-js` 2.90, credențiale hardcodate în `client.ts` |
| **State server** | React Query 5.83 configurat, dar **fără** `useQuery`/`useMutation` în cod |
| **Date** | Hook-uri custom (`useState`/`useEffect`) + apeluri directe Supabase |
| **Pagini app** | 10 rute protejate `/app/*` + 1 admin `/admin` |
| **Pagini marketing** | 8 rute publice (landing, blog, legal, style guide) |
| **Teste** | 11 fișiere Vitest în `src/` (logică business, fără E2E) |
| **Debug activ** | `DEBUG_TAB_SWITCH = true` în `main.tsx` (logging consolă) |

---

## Relații cu alte documente `planning/`

```
planning/about frontend/          ← acest folder (UI + integrare client)
planning/about database/        ← schema DB completă, migrări, RPC server-side
planning/about upload balance/  ← pipeline upload balanță (detaliu tehnic)
planning/about generale/        ← analiză business, tech stack general, deployment
```

Pentru schema bazei de date în detaliu, consultați:
- `planning/about database/tabele.md`
- `planning/about database/descriere_database.md`

---

## Comenzi dezvoltare

```bash
npm install          # Instalare dependențe
npm run dev          # Server dev pe port 8080
npm run build        # Build producție
npm run preview      # Preview build
npm run lint         # ESLint
npm test             # Vitest (run once)
npm run test:watch   # Vitest watch mode
```

---

*Documentație sincronizată cu codul din `src/` la 11 Iulie 2026.*
