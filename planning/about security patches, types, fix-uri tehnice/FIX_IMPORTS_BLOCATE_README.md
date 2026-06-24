# 🔧 Fix: Balanțe Blocate în Status "În Procesare"

**Versiune:** 1.9  
**Data:** 29 Ianuarie 2026  
**Severitate:** CRITICĂ (BLOCKER pentru uploads)  
**Status:** ✅ REZOLVAT

---

## 📋 Problema Identificată

### Simptome

- 2 din 3 balanțe încărcate rămân blocate cu status "În procesare"
- TOTAL DEBIT / TOTAL CREDIT = 0,00 RON (nu au fost procesate conturile)
- NR. CONTURI = lipsește (conturile nu au fost extrase din fișier)
- Fișierele sunt încărcate corect în storage, dar nu sunt procesate

### Root Cause

**Inconsistență între Frontend și Funcția DB:**

1. **Frontend** (useTrialBalances.tsx):
   - Creează import cu `status='processing'`
   
2. **Funcție DB** (process_import_accounts):
   - Așteaptă `status='pending'` pentru UPDATE
   - Nu găsește înregistrări cu status='pending'
   - Nu face UPDATE → importul rămâne blocat în 'processing'

### Impact

- ❌ Uploads noi blocate (toate vor rămâne în 'processing')
- ❌ Conturile nu sunt extrase din Excel
- ❌ Totaluri nu sunt calculate
- ❌ Utilizatorii nu pot vizualiza datele

---

## ✅ Soluția Implementată

### Fix #1: Corectare Status Inițial în Frontend

**Fișiere modificate:**
- `src/hooks/useTrialBalances.tsx` (linia 196)
- `src/pages/IncarcareBalanta.tsx` (funcția getStatusBadge)

**Schimbări:**
- Status inițial schimbat de la `'processing'` → `'pending'`
- Adăugate statusuri noi în TypeScript: `'pending'` și `'failed'`
- Badge-uri UI actualizate pentru toate statusurile

### Fix #2: Modificare Funcție DB

**Fișier nou:**
- `supabase/migrations/20260129100000_fix_process_import_accepts_both_statuses.sql`

**Schimbări:**
- Funcția `process_import_accounts()` acceptă AMBELE statusuri: `'pending'` SAU `'processing'`
- Compatibilitate backwards pentru imports existente
- Mapping complet al coloanelor conturilor (opening, turnover, closing)

**Funcție Edge:**
- `supabase/functions/parse-balanta/index.ts`
- Trimite TOATE câmpurile conturilor (nu doar opening_debit/credit)

### Fix #3: Mecanism Cleanup pentru Imports Blocate

**Fișier nou:**
- `supabase/migrations/20260129100001_stale_imports_cleanup_mechanism.sql`

**Funcționalități adăugate:**

1. **`cleanup_stale_imports()`** - Funcție DB
   - Marchează automat imports blocate > 10 min ca 'failed'
   - Returnează numărul de imports curățate
   
2. **`retry_failed_import()`** - Funcție DB
   - Permite retry manual din UI pentru imports failed/error
   - Verifică ownership și resetează status la 'pending'
   
3. **`stale_imports_monitor`** - View pentru monitoring
   - Afișează imports blocate > 5 min (warning threshold)
   
4. **UI - Buton Retry**
   - Icon: RotateCcw (rotire în sens antiorar)
   - Vizibil doar pentru imports cu status 'failed' sau 'error'
   - Tooltip: "Reîncearcă procesarea"

---

## 🚀 Pași de Implementare (Pentru Utilizatori)

### Pas 1: Aplicare Migrări Database

Rulează în ordine în **Supabase SQL Editor**:

```bash
# 1. Fix funcție process_import_accounts
supabase/migrations/20260129100000_fix_process_import_accepts_both_statuses.sql

# 2. Mecanism cleanup stale imports
supabase/migrations/20260129100001_stale_imports_cleanup_mechanism.sql
```

### Pas 2: Deploy Edge Function Actualizată

```bash
# Deploy funcția parse-balanta cu mapping-ul complet
supabase functions deploy parse-balanta
```

### Pas 3: Deploy Frontend Actualizat

```bash
# Build și deploy aplicația React
npm run build
# ... deploy în Vercel/Netlify/etc
```

### Pas 4: Cleanup Imports Existente Blocate

Rulează scriptul manual în **Supabase SQL Editor**:

```sql
-- Fișier: supabase/migrations/CLEANUP_EXISTING_STALE_IMPORTS.sql

-- Pas 1: Verifică imports blocate
SELECT * FROM public.trial_balance_imports
WHERE status = 'processing'
  AND processing_started_at < NOW() - INTERVAL '5 minutes';

-- Pas 2: Rulează cleanup
SELECT * FROM public.cleanup_stale_imports();

-- Pas 3: Verifică rezultate
SELECT COUNT(*) AS imports_still_stale
FROM public.trial_balance_imports
WHERE status = 'processing'
  AND processing_started_at < NOW() - INTERVAL '10 minutes';
```

**Rezultat așteptat:**
- 2 imports marcate ca 'failed'
- Mesaj: "Processing timeout - Import blocat peste 10 minute. Încercați din nou."

### Pas 5: Instrucțiuni pentru Utilizatori Finali

Informează utilizatorii:

1. **Balanțele blocate vor apărea cu status "Eroare"**
2. **Apare un buton nou albastru cu iconul de rotire (🔄)** în coloana Acțiuni
3. **Click pe buton pentru a reîncerca procesarea automat**
4. **Sistemul va reîncerca parsarea fișierului Excel și extragerea conturilor**

---

## 🧪 Testare și Validare

### Test 1: Upload Nou (Happy Path)

```
1. Selectează o companie activă
2. Alege data de referință (ex: 31.12.2024)
3. Uploadează fișier Excel valid (.xlsx sau .xls)
4. Apasă "Încarcă balanța"

✅ Așteptat:
- Status inițial: "În așteptare" (pending)
- După 2-5 secunde: "În procesare" (processing)
- După 5-30 secunde: "Procesat" (completed)
- Nr. conturi afișat (ex: 124)
- Totaluri afișate (ex: 165.354.680,62 RON)
```

### Test 2: Retry Import Blocat

```
1. Identifică un import cu status "Eroare"
2. Click pe butonul albastru cu iconul de rotire (🔄)
3. Așteaptă notificarea "Reîncerc procesarea balanței..."

✅ Așteptat:
- Status schimbat la "În așteptare" → "În procesare" → "Procesat"
- Conturile extrase și afișate
- Totaluri calculate
```

### Test 3: Cleanup Automat (DB)

```sql
-- Simulează un import blocat manual
UPDATE public.trial_balance_imports
SET 
  status = 'processing',
  processing_started_at = NOW() - INTERVAL '15 minutes'
WHERE id = 'test-uuid-aici';

-- Rulează cleanup
SELECT * FROM public.cleanup_stale_imports();

-- Verifică că a fost marcat ca failed
SELECT status, error_message 
FROM public.trial_balance_imports 
WHERE id = 'test-uuid-aici';

✅ Așteptat:
- status = 'failed'
- error_message = 'Processing timeout - Import blocat peste 10 minute...'
```

---

## 📊 Monitorizare și Mentenanță

### Dashboard Quick Checks

```sql
-- 1. Imports blocate în acest moment
SELECT COUNT(*) AS blocked_imports
FROM public.trial_balance_imports
WHERE status = 'processing'
  AND processing_started_at < NOW() - INTERVAL '5 minutes';

-- 2. Imports failed recent (ultimele 24h)
SELECT COUNT(*) AS failed_last_24h
FROM public.trial_balance_imports
WHERE status = 'failed'
  AND updated_at > NOW() - INTERVAL '24 hours';

-- 3. Statistici generale statusuri
SELECT 
  status,
  COUNT(*) AS total,
  ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at))), 2) AS avg_processing_seconds
FROM public.trial_balance_imports
WHERE processed_at IS NOT NULL
GROUP BY status;
```

### Cleanup Automat Periodic (OPȚIONAL)

**Configurare pg_cron în Supabase:**

1. Dashboard → Extensions → pg_cron → Enable
2. Rulează în SQL Editor:

```sql
-- Cleanup la fiecare oră
SELECT cron.schedule(
  'cleanup-stale-imports-hourly',
  '0 * * * *',
  'SELECT public.cleanup_stale_imports()'
);

-- Verifică job-uri active
SELECT * FROM cron.job;
```

**Notă:** Pentru producție, recomandăm monitorizare manuală inițial pentru a înțelege pattern-urile înainte de a activa cleanup automat.

---

## 📝 Changelog

### v1.9 - 29 Ianuarie 2026

**CRITICAL FIXES:**
- ✅ Fix status inconsistency (pending vs processing)
- ✅ Fix DB function pentru accept both statuses
- ✅ Fix Edge Function mapping (toate coloanele conturilor)
- ✅ Adăugat mecanism cleanup stale imports
- ✅ Adăugat funcție retry manual din UI
- ✅ Adăugat monitoring view pentru imports blocate
- ✅ Actualizat UI cu buton Retry pentru imports failed

**BREAKING CHANGES:**
- Niciuna (backwards compatible)

**MIGRATIONS:**
- `20260129100000_fix_process_import_accepts_both_statuses.sql`
- `20260129100001_stale_imports_cleanup_mechanism.sql`
- `CLEANUP_EXISTING_STALE_IMPORTS.sql` (manual run)

---

## ❓ Întrebări Frecvente (FAQ)

### Q1: Ce se întâmplă cu imports-urile deja blocate?

**R:** Rulează scriptul `CLEANUP_EXISTING_STALE_IMPORTS.sql` care le va marca automat ca 'failed'. Utilizatorii vor putea apoi să apese butonul Retry din UI.

### Q2: Cât durează procesarea unei balanțe normale?

**R:** Între 5-30 secunde, în funcție de:
- Dimensiunea fișierului (număr de conturi)
- Complexitatea datelor
- Loadul serverului Supabase Edge Functions

### Q3: Ce înseamnă "Processing timeout"?

**R:** Importul a fost marcat ca 'processing' de peste 10 minute fără să fie finalizat. Cauze posibile:
- Edge Function crashed
- Network timeout
- Bug în parsare Excel

### Q4: Pot să șterge imports-urile failed?

**R:** Da, butonul de ștergere (coș de gunoi) funcționează pentru toate statusurile, inclusiv 'failed'. Recomandăm să încercați mai întâi Retry.

### Q5: Cum verific că fix-ul funcționează corect?

**R:** 
1. Uploadează o balanță test
2. Verifică că statusul trece: "În așteptare" → "În procesare" → "Procesat"
3. Verifică că Nr. Conturi și Totaluri sunt afișate
4. Click pe butonul "Vizualizează conturi" (ochi) pentru a vedea datele extrase

---

## 🆘 Suport și Troubleshooting

### Problema: Import rămâne în "În așteptare" > 1 minut

**Cauză:** Edge Function nu a fost apelată sau a crăpat instant

**Soluție:**
1. Verifică logs Supabase Edge Functions în Dashboard
2. Verifică că funcția `parse-balanta` este deployed
3. Verifică că fișierul există în storage bucket 'trial-balances'

### Problema: Import trece la "Eroare" imediat

**Cauză:** Fișier Excel invalid sau format nesuportat

**Soluție:**
1. Verifică `error_message` în tabel (coloana Status)
2. Asigură-te că fișierul are structura corectă:
   - Coloana A: Cont (3-6 cifre)
   - Coloana B: Denumire
   - Coloana C-H: Solduri și rulaje numerice
3. Folosește template-ul oficial sau un fișier exportat din sistem contabil

### Problema: Butonul Retry nu apare

**Cauză:** Import nu are status 'failed' sau 'error'

**Soluție:**
1. Verifică că ai deployed versiunea nouă a frontend-ului
2. Hard refresh (Ctrl+Shift+R sau Cmd+Shift+R)
3. Verifică că statusul importului este exact 'failed' sau 'error' (nu 'processing')

---

## 📚 Resurse Adiționale

- **Plan complet bugfix:** `planning/about upload balance/plan_upload_balanta.md`
- **Documentație DB:** `planning/about database/descriere_database.md`
- **Testing guide:** `planning/about upload balance/TESTING_GUIDE_UPLOAD_BALANTA.md`
- **Security patches:** `planning/about security patches, types, fix-uri tehnice/SECURITY_PATCHES_V1.8_README.md`

---

## ✅ Checklist Post-Deploy

- [ ] Migrări DB aplicate (verifică cu `SELECT * FROM pg_tables WHERE tablename LIKE '%trial_balance%'`)
- [ ] Edge Function deployed (verifică în Supabase Dashboard → Edge Functions)
- [ ] Frontend deployed (verifică versiune în browser DevTools)
- [ ] Cleanup manual rulat pentru imports existente blocate
- [ ] Test upload nou (happy path) - PASSED
- [ ] Test retry import failed - PASSED
- [ ] Utilizatori informați despre butonul Retry
- [ ] Monitoring dashboard configurat (opțional)
- [ ] pg_cron configurat pentru cleanup automat (opțional)

---

**Autor:** AI Assistant (Claude Sonnet 4.5)  
**Reviewer:** [Numele tău]  
**Aprobat pentru deploy:** [ ] DA / [ ] NU  
**Data deploy:** ____ / ____ / 2026
