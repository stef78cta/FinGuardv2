# Debug Tab Switch — Diagnosticare și Mitigări

> **Ultima actualizare:** 11 Iulie 2026

---

## Problema

La schimbarea tab-ului browserului și revenire, aplicația se poate reseta complet (filtre, scroll, stare formular pierdute).

**Cauze posibile:**
1. **Browser Tab Discarding** — browserul descarcă tab-ul inactiv din memorie (hard reload la revenire)
2. **SPA Remount** — codul face remount la componente de nivel înalt
3. **Auth/Company refetch** — guards demontează arborele React la refresh token
4. **BF-Cache** — restaurare din back-forward cache (de obicei păstrează starea)

---

## Stare actuală cod diagnostic

**Cod de diagnostic ÎNCĂ ACTIV** (nu a fost eliminat după investigație):

| Fișier | Flag / mecanism | Efect |
|--------|-----------------|-------|
| `src/main.tsx` | `DEBUG_TAB_SWITCH = true` | Logging colorat, event listeners, sessionStorage debug keys |
| `src/App.tsx` | `appMountCounter` | Log `[APP] App MOUNTED/UNMOUNTED` la fiecare mount |

### Dezactivare diagnostic

1. Setați `DEBUG_TAB_SWITCH = false` în `src/main.tsx`
2. Eliminați blocul `useEffect` diagnostic din `src/App.tsx` (linii marcate `DIAGNOSTIC: App Mount Counter`)

---

## Mitigări implementate (permanente)

Aceste fix-uri rămân active indiferent de flag-ul de diagnostic:

### 1. AuthGuard — stale-while-revalidate

**Fișier:** `src/components/auth/AuthGuard.tsx`

```typescript
// Loading DOAR dacă loading && !user
const shouldShowLoadingScreen = loading && !user;
```

**Efect:** La refresh token în background (revenire tab), UI-ul nu se demontează dacă user-ul există deja.

### 2. CompanyGuard — stale-while-revalidate

**Fișier:** `src/components/auth/CompanyGuard.tsx`

```typescript
// Loading DOAR dacă loading && companies.length === 0 && !activeCompany
```

**Efect:** La refetch companii în background, arborele React rămâne montat.

### 3. React Query — anti-refetch

**Fișier:** `src/App.tsx`

| Opțiune | Valoare | Scop |
|---------|---------|------|
| `refetchOnWindowFocus` | `false` | Nu refetch la revenire tab |
| `refetchOnReconnect` | `false` | Nu refetch la reconectare |
| `staleTime` | 2 min | Date rămân fresh |
| `gcTime` | 5 min | Cache persistă după unmount |
| `placeholderData` | `prev => prev` | Păstrează date anterioare la refetch |

**Notă:** React Query este configurat dar hook-urile `useQuery`/`useMutation` nu sunt folosite încă — beneficiul principal vine din guards și `usePageUiState`.

### 4. usePageUiState — persistență sessionStorage

**Fișier:** `src/hooks/usePageUiState.ts`

| Caracteristică | Detaliu |
|----------------|---------|
| Cheie storage | `ui_state:<routeKey>:<companyId>:<userId>` |
| Salvare | Debounce 300ms + la `visibilitychange:hidden` + la unmount |
| Restaurare | La mount + scroll position |
| Pagină activă | `IncarcareBalanta` (routeKey `'incarcare-balanta'`) |

**Stare persistată pe Încărcare balanță:** filtre, paginare, rânduri expandate, scroll.

### 5. sessionStorage debug keys (doar diagnostic)

| Cheie | Scop |
|-------|------|
| `__app_was_active` | Detectare tab discarding |
| `__debug_last_mount_id` | Tracking mount ID |
| `__debug_last_timestamp` | Timp de la ultimul mount |
| `__debug_hidden_at` | Durată tab ascuns |

---

## Cum să identifici cauza

### Pas 1: Deschide Console-ul browser-ului (F12 → Console)

### Pas 2: Navighează la o pagină cu date (ex: `/app/incarcare-balanta`)

### Pas 3: Setează filtre, scroll, etc.

### Pas 4: Schimbă tab-ul și așteaptă 10–30 secunde

### Pas 5: Revino în tab și verifică console-ul

---

## Interpretare output

### Scenariul A: HARD RELOAD (Browser Tab Discarding)

```
[MOUNT] Main.tsx executed at 2026-07-11T10:00:00.000Z
[MOUNT] Mount ID: 1706522400000
[NAVIGATION] Type: reload        ← INDICATOR!
[MOUNT] Previous mount ID: 1706522300000
[ANALYSIS] App was REMOUNTED
[APP] App MOUNTED - count: 1     ← count resetat la 1 = proces nou
```

**Cauză:** Browserul a „discardat" tab-ul pentru economie memorie. La revenire, pagina se reîncarcă complet (ca F5).

**Mitigare activă:** `usePageUiState` restaurează starea UI din `sessionStorage` (doar pe paginile care îl folosesc).

**Limitare:** Nu poți preveni tab discarding — doar restaura starea.

---

### Scenariul B: SPA REMOUNT (cauză în cod)

```
[MOUNT] Main.tsx executed at 2026-07-11T10:00:00.000Z
[MOUNT] Mount ID: 1706522400000
[NAVIGATION] Type: navigate      ← SPA normal
[APP] App MOUNTED - count: 2     ← count > 1 = remount fără reload
[APP] App UNMOUNTED - was mount #1
```

**Cauză:** Codul face remount la componenta App (`key` dinamic, recreare provider, etc.)

**Verificări:**
- `key={...}` pe componente de nivel înalt
- `QueryClient` recreat la fiecare render (actual: creat o singură dată în afara componentei ✅)
- Provider-e recreate

---

### Scenariul C: FOCUS EVENT CAUZEAZĂ PROBLEME

```
[EVENT] window blur
[EVENT] visibilitychange: hidden
... (timp trece) ...
[EVENT] visibilitychange: visible
[EVENT] window focus
[APP] App UNMOUNTED - was mount #1  ← PROBLEMĂ dacă apare aici!
[APP] App MOUNTED - count: 2
```

**Cauză:** Ceva în cod face remount la focus/visibilitychange.

**Mitigare activă:** Guards cu stale-while-revalidate ar trebui să prevină acest scenariu pentru auth/company.

---

### Scenariul D: BF-CACHE (Back-Forward Cache)

```
[EVENT] pageshow - persisted: true
[BF-CACHE] Page restored from bfcache!
```

**Explicație:** Browserul a restaurat pagina din cache. UI-ul ar trebui să fie intact.

---

## Pagini și acoperire mitigări

| Pagină | AuthGuard fix | usePageUiState | Date în sessionStorage |
|--------|---------------|----------------|------------------------|
| Încărcare balanță | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ❌ | ❌ |
| Rapoarte financiare | ✅ | ❌ | ❌ (layout AG Grid în localStorage) |
| Alte pagini app | ✅ | ❌ | ❌ |

**Recomandare viitoare:** Extinde `usePageUiState` pe pagini cu filtre complexe (Rapoarte, Analize comparative).

---

## Ce să faci după diagnosticare

### Dacă e HARD RELOAD (Scenariul A)

1. Verifică numărul de tab-uri deschise → browserul descarcă tab-uri inactive
2. Verifică extensii care consumă memorie
3. Extinde `usePageUiState` pe paginile critice
4. Layout AG Grid deja persistă în `localStorage` (`gridLayoutStorage.ts`)

### Dacă e SPA REMOUNT (Scenariul B sau C)

1. Caută `key={...}` pe componente de nivel înalt
2. Verifică dacă `QueryClient` e recreat (actual: nu ✅)
3. Verifică dacă provider-ele sunt recreate
4. Verifică guards — ar trebui să folosească pattern stale-while-revalidate ✅

### După rezolvare completă

Șterge codul de debug din `main.tsx` și `App.tsx` (blocuri marcate `DIAGNOSTIC`).

---

## Fișiere relevante

| Fișier | Rol |
|--------|-----|
| `src/main.tsx` | Diagnostic logging + tab discarding detection |
| `src/App.tsx` | React Query config + mount counter |
| `src/components/auth/AuthGuard.tsx` | Fix stale-while-revalidate auth |
| `src/components/auth/CompanyGuard.tsx` | Fix stale-while-revalidate company |
| `src/hooks/usePageUiState.ts` | Persistență UI sessionStorage |
| `src/pages/IncarcareBalanta.tsx` | Prima pagină cu usePageUiState |
| `src/components/ag-grid/gridLayoutStorage.ts` | Persistență layout grid |

---

*Document actualizat pentru a reflecta mitigările implementate și starea codului diagnostic la 11 Iulie 2026.*
