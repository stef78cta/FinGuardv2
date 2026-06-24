# Debug Tab Switch - Ghid de Diagnosticare

## Problema
La schimbarea tab-ului și revenire, aplicația se resetează complet.

## Cum să identifici cauza

### Pas 1: Deschide Console-ul browser-ului (F12 → Console)

### Pas 2: Navighează la o pagină cu date (ex: `/app/incarcare-balanta`)

### Pas 3: Setează filtre, scroll, etc.

### Pas 4: Schimbă tab-ul și așteaptă 10-30 secunde

### Pas 5: Revino în tab și verifică console-ul

## Interpretare output

### Scenariul A: HARD RELOAD (Browser Tab Discarding)
```
[MOUNT] Main.tsx executed at 2026-01-29T10:00:00.000Z
[MOUNT] Mount ID: 1706522400000
[NAVIGATION] Type: reload        ← ACESTA ESTE INDICATORUL!
[MOUNT] Previous mount ID: 1706522300000
[ANALYSIS] App was REMOUNTED
[APP] App MOUNTED - count: 1     ← count resetat la 1 = nou process
```

**Cauza**: Browser-ul a „discardat" tab-ul pentru a economisi memorie. La revenire, pagina se reîncarcă complet (ca F5).

**Soluție**: Nu poți preveni acest comportament al browser-ului. Trebuie să salvezi state-ul în `sessionStorage` și să-l restaurezi la încărcare.

---

### Scenariul B: SPA REMOUNT (Cod cauză)
```
[MOUNT] Main.tsx executed at 2026-01-29T10:00:00.000Z
[MOUNT] Mount ID: 1706522400000
[NAVIGATION] Type: navigate      ← ACESTA INDICĂ SPA normal
[APP] App MOUNTED - count: 2     ← count > 1 = remount fără reload
[APP] App UNMOUNTED - was mount #1
```

**Cauza**: Codul face remount la componenta App (key dinamic, recreare provider, etc.)

**Soluție**: Identifică ce face remount și elimină cauza.

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

**Cauza**: Ceva în cod face remount la focus/visibilitychange.

---

### Scenariul D: BF-CACHE (Back-Forward Cache)
```
[EVENT] pageshow - persisted: true
[BF-CACHE] Page restored from bfcache!
```

**Explicație**: Browser-ul a restaurat pagina din cache. UI-ul ar trebui să fie intact. Dacă nu este, verifică dacă React se rehidratează corect.

---

## Ce să faci după diagnosticare

### Dacă e HARD RELOAD (Scenariul A):
1. Verifică dacă ai multe tab-uri deschise → browser-ul descarcă tab-uri inactive
2. Verifică dacă ai extensii care consumă memorie
3. Soluția permanentă: salvează state-ul în sessionStorage și restaurează-l la mount

### Dacă e SPA REMOUNT (Scenariul B sau C):
1. Caută în cod: `key={...}` pe componente de nivel înalt
2. Verifică dacă QueryClient e recreat
3. Verifică dacă provider-ele sunt recreate

---

## După rezolvare: Șterge codul de debug

Din `main.tsx` și `App.tsx`, șterge blocurile marcate cu:
```
// ============================================
// DIAGNOSTIC LOGGING - Tab Switch Debug
// ============================================
```
