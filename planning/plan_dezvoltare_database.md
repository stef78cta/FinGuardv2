# Plan Dezvoltare Database - Security & Correctness Patches

> **Data creării**: 28 Ianuarie 2026  
> **Versiune Plan**: 1.8  
> **Ultima actualizare**: 28 Ianuarie 2026  
> **Status**: AȘTEAPTĂ APROBARE

---

## Plan Update (v1.8)

Această versiune adresează 5 fix-uri critice de robustețe DB și adaugă queries de diagnostic Gate 0:

| # | Punct | Secțiune Afectată | Modificări |
|---|-------|-------------------|------------|
| 1 | Storage policy: cast ::uuid poate fi reordonat de planner | 4, Migrări | Helper `try_uuid()` IMMUTABLE; rescrie policy fără cast direct |
| 2 | Trigger INSERT companie: INSERT+DELETE în seed blochează | 1A, Migrări | Skip verificare dacă compania ștearsă ulterior în tranzacție |
| 3 | Trigger DELETE membru: CASCADE de la companies blochează | 1A, Migrări | Allow DELETE dacă companies.id nu mai există (CASCADE); notă GDPR |
| 4 | create_company_with_member: data:null pe unique_violation periculos | 1B, Migrări | RAISE EXCEPTION explicit (nu RETURN NULL) cu ERRCODE 23505 |
| 5 | CREATE INDEX CONCURRENTLY: nu poate în tranzacție | 1B, Migrări | Clarificare: staging=normal; producție=manual separat după preflight |
| Gate 0(D) | Queries utile diagnostic pre-migrare | Gate 0 (NOU) | 6 queries: RLS activ, policies, constrângeri, privilegii, grants |

---

## Plan Update (v1.7)

Această versiune rafinează implementarea v1.6, adresând colțuri operaționale și aliniament production-ready:

| # | Punct | Secțiune Afectată | Modificări |
|---|-------|-------------------|------------|
| 1 | Trigger DELETE ultimul membru blochează operațiuni legitime (CASCADE, GDPR) | 1A, Migrări | COUNT simplu fără excludere user_id; excepție status archived/deleting |
| 2 | Invariant INSERT companie: colțuri INSERT+DELETE, bulk seed | 1A, Teste | Notă limitări + teste explicite pentru seed/restore |
| 3 | SELECT FOR UPDATE serializează, NU refuză dublări | 2E | pg_try_advisory_xact_lock pentru "refuz", nu "așteptare" |
| 4 | internal_error_detail: REVOKE vs PostgREST, view preferabilă | 2E, Teste | Strategie unică: view-only + test endpoint-uri select=* |
| 5 | CUI UNIQUE: date murdare existente, preflight remediere | 1B, Migrări | Query preflight coliziuni + plan remediere + CREATE INDEX CONCURRENTLY |
| 6 | Storage policy vs frontend: diacritice (balanță.xlsx) | 4, Frontend | Aliniază strict: normalizare ASCII sau extinde regex unicode |
| 7 | 10MB pre-read prea târziu (download deja făcut) | 2C | Verifică file_size_bytes ÎNAINTE de download din storage |
| 8 | CORS Origins "*" prea permisiv | 2A, config.toml | Limitează la origin-uri aplicație, nu wildcard |

---

## Plan Update (v1.6)

Această versiune adresează 8 îmbunătățiri de hardening final și colțuri ascuțite identificate în review-ul planului v1.5:

| # | Punct | Secțiune Afectată | Modificări |
|---|-------|-------------------|------------|
| 1 | Invariant: DELETE ultimul membru → companie orphan | 1A, Migrări | Constraint trigger pe company_users DELETE (blochează ultimul membru) |
| 2 | internal_error_detail expus prin SELECT (RLS rânduri ≠ coloane) | 2E, Migrări | View fără coloane sensibile sau REVOKE SELECT pe coloane |
| 3 | Concurență stale processing: execuții duble | 2E | SELECT ... FOR UPDATE sau advisory lock; include processing_started_at în WHERE |
| 4 | Timeout XLSX nu oprește XLSX.read() (partea scumpă) | 2C | Limită mărime înainte de read; Worker cu timeout real; post-parse guard |
| 5 | CUI: fără UNIQUE → duplicate concurente | 1B, Migrări | UNIQUE constraint pe upper(cui); tratare unique_violation |
| 6 | Storage policy: NULL-uri și extensie case-sensitive | 4 | Robustețe la NULL; regex ~* pentru .XLSX/.xlsx |
| 7 | Decode JWT: atob() nu e base64url-safe | 2A | Corectare decode base64url sau rămâi cu getUser() |
| 8 | Rollback wrappers: risc activare accidentală producție | Plan Rollback | Flag ALLOW_DB_FALLBACK; log/metric/alertă când activ |

---

## Plan Update (v1.5)

Această versiune adresează 9 îmbunătățiri de security hardening și operaționale identificate în review-ul planului v1.4:

| # | Punct | Secțiune Afectată | Modificări |
|---|-------|-------------------|------------|
| 1 | Invariant DB-level: companie fără owner | 1A, Migrări | Constraint trigger deferrable sau owner_user_id în două etape (nu aștepta v2.0) |
| 2 | Storage: validare doar frontend → policy | 4 | Adăugare validare în storage policy: nesting, lungime, regex caractere |
| 3 | Service role: defense-in-depth în process_import | 2E | Validare ownership în DB (p_requester_user_id, verificare contra import) |
| 4 | Observabilitate: guardrails operaționale + go/no-go | Nou: Monitoring | Criterii clare staging: crash-uri, latență, processing stuck |
| 5 | Mesaje eroare: SQLERRM expune detalii interne | 2E | Safe message către user; internal_error_code pentru debugging |
| 6 | XLSX: resource exhaustion (memory, parsare) | 2C | Limite obligatorii: max foi, rânduri, timeout parsare |
| 7 | Latență auth: verify_jwt + getUser() redundant | 2A | Decode JWT direct pentru user_id (opțional, optimizare) |
| 8 | Rollback: wrapper fallback pentru reziliență | Plan Rollback | Edge function: fallback dacă RPC nu există (staging/rollback) |

---

## Plan Update (v1.4)

Această versiune adresează 9 îmbunătățiri de robustețe și claritate identificate în review-ul planului v1.3:

| # | Punct | Secțiune Afectată | Modificări |
|---|-------|-------------------|------------|
| 1 | Policy bootstrap: întărire garanție DB-level | 1A | Recomandare puternică: owner_user_id NOT NULL; notă risc seed/admin paths |
| 2 | Verificare company_id: limitări test static | Gate 0(E), 1A | Notă: grep nu prinde tot; adăugare test comportamental recomandat |
| 3 | Audit log: clarificare "obligatoriu" vs "NU implementa" | 1A | Reformulare: "recomandat post-MVP" (nu obligatoriu în patch curent) |
| 4 | Rate limiting: clarificare unitățile + fail strategy | 2B | reset_in_seconds peste tot; decizie fail-closed pentru import; log unavailable |
| 5 | processing_started_at: alegere obligatorie A vs B | 2E, Migrări | Varianta A obligatorie: migrarea 4a înainte de 00003; scoate "opțional" |
| 6 | process_import_accounts: comportament eșec după DELETE | 2E | Documentare explicită: import fără conturi acceptat (rerun necesită) |
| 7 | parseNumber observabilitate: context missing | 2D | Corectare: logging la nivel parse rând (nu în funcție) sau ctx param |
| 8 | CORS verify_jwt: tratare explicită OPTIONS în handler | 2A | Adăugare cod explicit OPTIONS în edge function (reduce dependență platformă) |
| 9 | Rollback: ordine coordonare + matrice compatibilitate | Plan de Rollback | Playbook: ordine revert (code-first), matrice versiuni compatibile |

---

## Plan Update (v1.3)

Această versiune adresează 10 îmbunătățiri/clarificări de rigoare identificate în review-ul planului v1.2:

| # | Punct | Secțiune Afectată | Modificări |
|---|-------|-------------------|------------|
| 1 | Bootstrap: verificare expunere company_id necomitat | 1A | Acțiune Gate 0: blocare deploy dacă se expune company_id înainte de commit |
| 2 | Inconsistență "Decizie curentă" vs Gate 0 | 1A | Reformulare: "Opțiune preferată" devine "decizie finală după Gate 0" |
| 3 | Audit log: FK către auth.users (nu public.users) | 1A | Corectare schema: referințe auth.users sau fără FK |
| 4 | Audit log: source + metadata | 1A | Extindere schema cu source (ui/admin/rpc) și metadata JSONB |
| 5 | rate_limits_meta: ON CONFLICT + notă concurență | 2B | INSERT cu DO NOTHING; acceptare cleanup simultan |
| 6 | Rate limit: contract 429 explicit (Retry-After) | 2B, Checklist | Header Retry-After + body JSON standardizat; test nou |
| 7 | process_import_accounts: timeout processing stale | 2E | Regulă timeout 10 min; tabel status actualizat cu "stale" |
| 8 | parseNumber: observabilitate cazuri suspecte | 2D | Log/metric pentru pattern "X,YYY" sau "X.YYY" (posibil mii) |
| 9 | xlsx upgrade: proces înghețare reproducibil | 2C | Pas explicit: pin versiune, commit separat, test, merge |
| 10 | Rollback: "sigur" vs "funcțional" (fără reintroducere breșe) | Plan de Rollback | Două șabloane: safe_rollback (păstrează RLS) vs full_rollback |

---

## Plan Update (v1.2)

Această versiune adresează 8 puncte slabe/riscuri identificate în review-ul planului v1.1:

| # | Punct | Secțiune Afectată | Modificări |
|---|-------|-------------------|------------|
| 1 | Gate 0: verificări înainte de migrare | Nou: "Gate 0" | Checklist explicit: căutare INSERT companies, RLS, client edge, constraints |
| 2 | Închidere bootstrap prin design (nu presupuneri) | 1A, 1B | Condiție explicită de siguranță; opțiuni owner_user_id / RPC unic |
| 3 | Race condition: UNIQUE nu e suficient | 1A | Corectare justificare; verificare repo/RLS legată de Gate 0 |
| 4 | "Any member can add": mitigări MVP | 1A | Confirmare UI modal; audit log membership changes |
| 5 | Rate limiting: cleanup predictibil + fixed window | 2B | Înlocuire cleanup probabilistic cu bounded; clarificare tip fereastră |
| 6 | check_rate_limit: client service_role în edge | 2B | Confirmare inițializare client; sanitizare logs; test anon key fail |
| 7 | process_import_accounts: concurență/rerun | 2E | Guard status "processing"; reguli clare rerun completed |
| 8 | Rollback executabil + test browser CORS | Rollback, 2A | Migrare forward-only rollback; test fetch() din browser |

---

## Plan Update (v1.1)

Această versiune integrează 8 îmbunătățiri/clarificări identificate în review-ul planului v1.0:

| # | Punct | Secțiune Afectată | Modificări |
|---|-------|-------------------|------------|
| 1 | Închide "fereastra" bootstrap | 1A, 1B | Confirmare atomicitate creare+membership; test race condition |
| 2 | Clarifică "cine poate adăuga membri" | 1A | Marcare decizie MVP; TODO invites/roles; teste restricții |
| 3 | Rate limiting DB: simplificare | 2B | Cleanup periodic; permisiuni service_role; identificator user_id |
| 4 | process_import_accounts: contract | 2E | Validări JSON; logică status; model permisiuni |
| 5 | parseNumber: comentarii + teste | 2D | Elimină afirmații neimplementate; teste ambigue "1,234" |
| 6 | xlsx upgrade: edge vs web | 2C | Clarifică esm.sh; criteriu versiune; set fișiere test |
| 7 | verify_jwt: test CORS/preflight | 2A | Test OPTIONS; test fără Authorization header |
| 8 | Rollback: practic și reproductibil | Plan de Rollback | Procedură git revert; fișier rollback_snippets.sql |

---

## Sumar Executiv

Acest plan descrie patch-urile de securitate și corectitudine pentru aplicația FinGuard v2 (Supabase multi-tenant + Edge Function `parse-balanta`). Sunt 5 puncte principale identificate, fiecare cu breșe sau bug-uri specifice.

### Puncte Adresate
| # | Categorie | Severitate | Descriere |
|---|-----------|------------|-----------|
| 1A | RLS/Multi-tenant | **CRITICĂ** | company_users: auto-join la orice companie |
| 1B | RLS/Multi-tenant | **CRITICĂ** | create_company_with_member: join by CUI |
| 2A | Edge Function | **ÎNALTĂ** | verify_jwt = false |
| 2B | Edge Function | **MEDIE** | Rate limiting in-memory |
| 2C | Edge Function | **MEDIE** | Vulnerabilitate xlsx@0.18.5 |
| 2D | Edge Function | **MEDIE** | Bug parseNumber format US |
| 2E | Edge Function | **MEDIE** | Lipsă idempotență rerun |
| 3 | SECURITY DEFINER | **MEDIE** | Hardening funcții |
| 4 | Storage | **MICĂ** | Validare file.name |
| 5 | Tipuri Generate | **MICĂ** | Args inversate can_access_import |

---

## PUNCTUL 1 — RLS / Multi-tenant (Breșe Critice)

### 1A. company_users: Auto-join la orice companie

#### Stare Curentă
**Fișier**: `supabase/migrations/20260119094518_8bae7ead-991c-462a-a03a-04039fc01725.sql`

Policy-ul actual permite oricărui user autentificat să se insereze ca membru la ORICE companie:

```sql
CREATE POLICY "Users can add themselves to new companies or existing members can add" 
ON public.company_users 
FOR INSERT 
WITH CHECK (
  (user_id = get_user_id_from_auth())  -- BREȘĂ: permite auto-join oriunde
  OR is_company_member(get_user_id_from_auth(), company_id) 
  OR has_role(get_user_id_from_auth(), 'admin'::app_role)
);
```

#### Problemă Identificată
Un user autentificat poate:
1. Identifica `company_id` al oricărei companii
2. Face INSERT în `company_users` cu `user_id = get_user_id_from_auth()` și orice `company_id`
3. Obține acces la datele companiei respective

#### Soluție Propusă
Permite auto-join DOAR pentru "bootstrap" (primul membru al unei companii nou create):

```sql
DROP POLICY IF EXISTS "Users can add themselves to new companies or existing members can add" 
  ON public.company_users;

CREATE POLICY "Company members can add members (bootstrap allowed)"
ON public.company_users
FOR INSERT
TO authenticated
WITH CHECK (
  -- Bootstrap: user-ul poate fi primul membru al unei companii fără membri
  (
    user_id = public.get_user_id_from_auth()
    AND NOT EXISTS (
      SELECT 1 FROM public.company_users cu2 WHERE cu2.company_id = company_id
    )
  )
  -- SAU: membru existent poate adăuga alți membri
  OR public.is_company_member(public.get_user_id_from_auth(), company_id)
  -- SAU: admin/super_admin poate adăuga
  OR public.has_role(public.get_user_id_from_auth(), 'admin'::public.app_role)
  OR public.has_role(public.get_user_id_from_auth(), 'super_admin'::public.app_role)
);
```

#### Considerații Suplimentare (v1.1 + v1.2)

##### Fereastra Bootstrap și Atomicitate (v1.2 - ACTUALIZAT)

**⚠️ CONDIȚIE DE SIGURANȚĂ EXPLICITĂ**: Companies NU trebuie să existe fără membership/owner.

**Verificare obligatorie (vezi Gate 0)**:
- [ ] Căutare completă în repo pentru orice INSERT în `public.companies`
- [ ] Confirmare că singurul entrypoint este `create_company_with_member()` (SECURITY DEFINER)
- [ ] Confirmare că RLS pe `companies` NU permite INSERT direct pentru authenticated

**DACĂ** se găsesc alte căi de creare companie, alegeți una dintre opțiuni:

| Opțiune | Descriere | Efort |
|---------|-----------|-------|
| **A (preferată)** | Adaugă coloană `owner_user_id UUID NOT NULL` în `companies`, setată la creare | Mediu |
| **B** | Interzice INSERT direct pe `companies` prin RLS; forțează doar RPC | Scăzut |
| **C** | Modifică orice alt cod găsit să folosească `create_company_with_member()` | Variabil |

**Opțiune preferată**: B (RPC unic). Devine **decizie finală după Gate 0** (A+B) cu rezultate documentate. *(v1.3 - ACTUALIZAT)*

#### Întărire Garanție DB-Level (v1.4 - RECOMANDARE PUTERNICĂ)

**⚠️ RISC REZIDUAL**: Chiar după Gate 0, policy-ul bootstrap rămâne vulnerabil la:
- Seed-uri / admin scripts adăugate ulterior
- RPC-uri noi create în viitor
- Import masiv de date
- Erori operaționale (manual INSERT în producție)

**RECOMANDARE PUTERNICĂ (v1.4)**: Implementează Opțiunea A (`owner_user_id NOT NULL`) pentru garanție structurală:

```sql
-- Migrare viitoare (post v1.4 sau în v2.0)
ALTER TABLE public.companies 
ADD COLUMN owner_user_id UUID NOT NULL REFERENCES auth.users(id);

-- Actualizează create_company_with_member
CREATE OR REPLACE FUNCTION public.create_company_with_member(...)
-- ... setează owner_user_id la creare
INSERT INTO public.companies (name, cui, owner_user_id)
VALUES (p_name, p_cui, v_user_id);
```

**Beneficii**:
- Garanție DB-level: **imposibil** să existe companie fără owner
- Policy bootstrap devine redundant (defense in depth)
- Rezistent la seed/admin/import paths viitoare

**Decizie curentă**: Opțiunea B validată prin Gate 0. Opțiunea A **recomandată pentru v2.0** sau la primul incident.

#### Implementare Accelerată Invariant DB-Level (v1.5 - RECOMANDARE CRITICĂ)

**⚠️ RISC OPERAȚIONAL REAL**: Chiar cu Gate 0, seed/admin scripts/import/intervenție manuală pot crea companii fără membri. Policy bootstrap devine mecanism de escaladare pentru oricine.

**OPȚIUNE RECOMANDATĂ (v1.5)**: NU așteptați v2.0 - implementați invariant DB acum.

**Varianta 1** (minimă, fără schimbare schemă): Constraint Trigger Deferrable
```sql
-- v1.8: Constraint trigger cu skip pentru INSERT+DELETE în aceeași tranzacție
CREATE OR REPLACE FUNCTION check_company_has_member()
RETURNS TRIGGER AS $$
BEGIN
  -- v1.8: Skip verificare dacă compania a fost ștearsă ulterior în aceeași tranzacție
  -- Scenarii: seed-uri (INSERT companies apoi DELETE), teste, rollback partial
  IF NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = NEW.id) THEN
    RETURN NEW;  -- v1.8: Compania nu mai există → invariantul nu mai are sens
  END IF;
  
  -- v1.8: Verifică membership doar dacă compania încă există
  IF NOT EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Company must have at least one member';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER enforce_company_has_member
AFTER INSERT ON public.companies
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_company_has_member();
```

**Beneficii**: Prinde seed/admin/import paths; create_company_with_member funcționează (tranzacție comite împreună).

**v1.8 - FIX CRITICĂ**: Permite INSERT+DELETE în aceeași tranzacție (seed-uri, teste) prin skip logic.

**Varianta 2** (preferată long-term): owner_user_id în două etape
```sql
-- Etapa 1 (v1.5): Adaugă coloană NULLABLE + setare în RPC
ALTER TABLE public.companies ADD COLUMN owner_user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_companies_owner ON public.companies(owner_user_id);

-- În create_company_with_member: setează owner_user_id = v_user_id

-- Etapa 2 (când sunteți pregătiți): Backfill + NOT NULL
UPDATE public.companies SET owner_user_id = ... WHERE owner_user_id IS NULL;
ALTER TABLE public.companies ALTER COLUMN owner_user_id SET NOT NULL;
```

**Beneficii**: Pregătește teren pentru RLS bazat pe owner; izolare clară ownership.

**Decizie (v1.5)**: Varianta 1 **recomandată pentru includere în v1.5** (impact minim, protecție imediată).

**Limitări Knowne (v1.7 - NOU)**: Colțuri pentru constraint trigger deferrable

**⚠️ Scenarii care necesită atenție specială**:
1. **INSERT + DELETE în aceeași tranzacție**:
   ```sql
   BEGIN;
   INSERT INTO companies (...) RETURNING id;  -- id=123
   INSERT INTO company_users (company_id=123, ...);
   DELETE FROM companies WHERE id=123;  -- Șterge companie în seed/test
   COMMIT;  -- Constraint trigger poate BLOCA aici
   ```
   
2. **Bulk restore/seed cu timing diferit**:
   ```sql
   -- Script restore: încarcă companii, APOI membri (fără tranzacție atomică)
   COPY companies FROM ...;  -- Trigger va BLOCA toate dacă nu au membri instant
   COPY company_users FROM ...;
   ```

**Mitigări (v1.7)**:
- **Pentru seed-uri**: Dezactivează temporar trigger: `ALTER TABLE companies DISABLE TRIGGER enforce_company_has_member;`
- **Pentru restore**: Încarcă în tranzacție atomică sau folosește `DEFERRABLE INITIALLY DEFERRED`
- **Test obligatoriu**: Rulează pe staging script-uri reale de seed/backup-restore (vezi Test 5.14)

**Decizie (v1.7)**: Păstrează constraint trigger, dar **documentează clar limitările** și testează explicit pe staging.

#### Protecție Împotriva Orphan Companies prin DELETE (v1.6 - CRITICĂ)

**⚠️ RISC NEACOPERIT (v1.6)**: Constraint trigger AFTER INSERT prinde doar crearea, dar NU DELETE-ul ultimului membru.

**Scenariu problematic**:
1. Companie are 3 membri
2. 2 membri părăsesc/sunt șterși
3. Ultimul membru părăsește → companie devine **orphan** (0 membri)
4. Policy bootstrap permite **oricui** să devină prim membru din nou

**Soluție OBLIGATORIE (v1.6)**: Constraint trigger pe company_users DELETE/UPDATE

```sql
-- Migrare: trigger care blochează ștergerea ultimului membru
-- v1.7 + v1.8: Ajustat pentru operațiuni legitime (CASCADE, GDPR, seed-uri)
CREATE OR REPLACE FUNCTION prevent_last_member_removal()
RETURNS TRIGGER AS $$
DECLARE
  v_remaining_count INT;
  v_company_status VARCHAR;
BEGIN
  -- v1.8: CRITICĂ - Permite CASCADE delete de la companies
  -- Dacă compania nu mai există, trigger-ul rulează DUPĂ CASCADE → allow
  IF NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = OLD.company_id) THEN
    RETURN OLD;  -- v1.8: Compania ștearsă (CASCADE) → permite DELETE membru
  END IF;
  
  -- v1.7: Obține status companie (dacă există coloana)
  SELECT status INTO v_company_status
  FROM public.companies
  WHERE id = OLD.company_id;
  
  -- v1.7: Ignoră verificare dacă compania e în curs de ștergere sau archived
  IF v_company_status IN ('archived', 'deleting') THEN
    RETURN OLD;  -- Permite DELETE ultimul membru pentru companii inactive
  END IF;
  
  -- v1.7: Numără membri ACTUALI (fără excluderi pe user_id - elimină fals negativ)
  -- Trigger AFTER DELETE: COUNT curent nu mai include OLD.user_id
  SELECT COUNT(*) INTO v_remaining_count
  FROM public.company_users
  WHERE company_id = OLD.company_id;
  
  IF v_remaining_count = 0 THEN
    RAISE EXCEPTION 'Cannot remove last member from active company. Archive company first or transfer ownership.';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER enforce_company_has_member_on_delete
AFTER DELETE ON public.company_users
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION prevent_last_member_removal();

-- Similar pentru UPDATE (dacă company_id poate fi modificat)
CREATE CONSTRAINT TRIGGER enforce_company_has_member_on_update
AFTER UPDATE OF company_id ON public.company_users
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION prevent_last_member_removal();
```

**Flux "închidere companie" (dacă necesar)**:
```sql
-- Alternativ: dacă permiteți companii fără membri, adăugați status
ALTER TABLE public.companies ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
  CHECK (status IN ('active', 'archived'));

-- Actualizați policy bootstrap să excludă archived:
AND NOT EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND status = 'archived')
```

**Decizie (v1.6)**: Trigger pe DELETE **obligatoriu** pentru completarea protecției orphan companies.

**Rafinare (v1.7 - CRITICĂ)**: Operațiuni legitime care pot fi blocate de trigger

**⚠️ Scenarii problematice identificate**:
1. **DELETE CASCADE companie**: FK `company_users.company_id ON DELETE CASCADE` → trigger poate bloca
2. **GDPR/DELETE user**: Dacă userul e ultimul membru, ștergerea contului eșuează
3. **Seed/restore/migrare**: DELETE + INSERT în aceeași tranzacție pentru reorganizare

**Ajustări implementare (v1.7)**:
- **COUNT simplu**: `SELECT COUNT(*) WHERE company_id = OLD.company_id` (fără excludere user_id)
- **Excepție status**: Ignoră verificare dacă `companies.status IN ('archived', 'deleting')`
- **Flux administrativ**: Pentru DELETE ultimul membru, setează status='archived' ÎNAINTE

**Schema companies cu status (v1.7 - RECOMANDATĂ)**:
```sql
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
CHECK (status IN ('active', 'archived', 'deleting'));

-- Actualizează policy bootstrap să excludă inactive:
-- ... AND NOT EXISTS (SELECT 1 FROM public.companies c 
--                     WHERE c.id = company_id AND c.status != 'active')
```

**Flux "închidere companie" (v1.7)**:
1. Admin/owner setează `companies.status = 'archived'`
2. Acum trigger permite DELETE toți membrii (status != 'active')
3. Opțional: job cleanup pentru companii archived > 30 zile

**Decizie GDPR / User Delete (v1.8 - IMPORTANT)**:

**⚠️ RISC**: Dacă utilizatorul e ultimul membru dintr-o companie activă, ștergerea contului (GDPR) va fi blocată de trigger.

**Opțiuni de implementare**:

1. **Varianta SAFE (recomandată pentru multi-tenant)**:
   - Blochează DELETE user dacă e ultimul membru dintr-o companie activă
   - UI: "Nu puteți șterge contul. Transferați ownership sau arhivați companiile."
   - Flux explicit: user transferă ownership → apoi DELETE cont
   - **Beneficiu**: Previne bootstrap vulnerability (companie orphan)

2. **Varianta AUTO-ARCHIVE** (dacă GDPR strict necesită delete imediat):
   ```sql
   -- În handler DELETE user, ÎNAINTE de DELETE:
   UPDATE public.companies
   SET status = 'deleting'
   WHERE id IN (
     SELECT DISTINCT cu.company_id
     FROM public.company_users cu
     WHERE cu.user_id = <user_to_delete>
     GROUP BY cu.company_id
     HAVING COUNT(*) = 1  -- User e ultimul membru
   );
   -- APOI: DELETE FROM auth.users WHERE id = <user_to_delete>
   -- Trigger permite DELETE (status='deleting')
   ```
   - **Risc**: Companiile rămân în status='deleting' (cleanup manual necesar)

**Decizie (v1.8)**: Implementează Varianta SAFE → flux explicit transfer ownership pentru multi-tenant.

##### Verificare Practică: Expunere company_id Necomitat (v1.3 - NOU)

**⚠️ RISC CRITIC**: Dacă un endpoint/UI/log/telemetrie expune `company_id` înainte ca tranzacția să fie comitată, poate exista fereastră de bootstrap.

**Acțiune obligatorie în Gate 0**:
- [ ] Caută în cod: `console.log`, `logger`, telemetrie, responses HTTP care includ `company_id`
- [ ] Verifică că NICIO expunere nu se face înainte de `COMMIT` (în `create_company_with_member` sau alt RPC)
- [ ] **DACĂ există expunere**: BLOCARE DEPLOY până se elimină

**Regula**: `company_id` devine vizibil pentru client/logs **doar după** ce membership este comitat.

##### Risc Race Condition (v1.2 - CORECȚIE)

**⚠️ IMPORTANT**: `UNIQUE(company_id, user_id)` previne duplicate pentru **același user**, dar NU garantează absența unei ferestre în care compania există goală.

**Scenariu teoretic de risc**:
1. User A începe `create_company_with_member()` - INSERT în companies reușește
2. User B (în paralel) vede compania fără membri și încearcă INSERT în company_users
3. Dacă User B reușește primul în company_users, el devine "first member"

**Mitigare structurală** (garantată prin design):
- `create_company_with_member()` inserează companies + company_users în **aceeași tranzacție**
- **NU** există alt mod de a crea companii (verificat în Gate 0)
- User B nu poate vedea compania până nu se comite tranzacția lui User A (izolare tranzacții)

**Test de validare** (adăugat în checklist):
- [ ] Simulare best-effort: două sesiuni simultane încearcă să creeze companie cu același CUI
- [ ] Rezultat așteptat: Una reușește, cealaltă primește "Company with this CUI already exists"

##### Permisivitate "Orice Membru Poate Adăuga Membri" (v1.1 + v1.2)

**⚠️ DECIZIE MVP - DOCUMENTATĂ CA LIMITARE TEMPORARĂ**

Politica propusă permite oricărui membru existent să adauge alți membri. Aceasta este:
- **Permisiv**: Nu există diferențiere între owner/admin/membru
- **Acceptabil pentru MVP**: Echipe mici, trust între membri
- **Risc operațional**: Un membru poate adăuga greșit useri neautorizați (frecvent în practică!)

##### Mitigări MVP (v1.2 + v1.4 - ACTUALIZAT)

**Chiar fără sistem de invitații**, recomandări pentru mitigare:

| # | Mitigare | Implementare | Prioritate (v1.4) |
|---|----------|--------------|-------------------|
| 1 | **Confirmare UI** | Modal înainte de adăugare membru cu text explicit: "Vei adăuga [email] la compania [nume]. Această persoană va avea acces la toate datele financiare." | **Obligatorie în v1.4** (Frontend) |
| 2 | **Audit log** | Tabel `membership_audit` cu: `id`, `company_id`, `target_user_id`, `added_by_user_id`, `action`, `source`, `metadata` | **Recomandată post-MVP** (nu în patch curent) |

**Notă (v1.4)**: Confirmare UI este **obligatorie** pentru UX și prevenție erori. Audit log este **utilă pentru incident response** dar **nu critică** pentru funcționare → implementare post-MVP recomandată.

**Schema audit log (pentru migrare viitoare)** *(v1.3 - ACTUALIZAT)*:
```sql
-- NU IMPLEMENTA ACUM - doar documentație
CREATE TABLE IF NOT EXISTS public.membership_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),      -- v1.3: auth.users, NU public.users
  added_by_user_id UUID NOT NULL REFERENCES auth.users(id),    -- v1.3: auth.users, NU public.users
  action VARCHAR(20) NOT NULL CHECK (action IN ('added', 'removed')),
  source TEXT NOT NULL DEFAULT 'ui',                            -- v1.3: ui/admin/rpc/unknown
  metadata JSONB NULL,                                           -- v1.3: email, reason, request_id etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Index pentru queries pe companie
CREATE INDEX idx_membership_audit_company ON public.membership_audit(company_id, created_at DESC);

-- ALTERNATIVĂ (dacă FK către auth.users nu funcționează): fără FK
-- target_user_id UUID NOT NULL,
-- added_by_user_id UUID NOT NULL,
-- CREATE INDEX idx_membership_audit_target_user ON public.membership_audit(target_user_id);
-- CREATE INDEX idx_membership_audit_added_by ON public.membership_audit(added_by_user_id);
```

**Notă (v1.3)**: `source` poate fi `ui` (frontend), `admin` (admin panel), `rpc` (direct RPC call), sau `unknown`. `metadata` poate include `email`, `reason`, `request_id`, `ip_address` etc.

**Validare**: După implementare, verifică că:
- [ ] UI arată modal de confirmare înainte de orice INSERT în company_users
- [ ] Fiecare INSERT/DELETE în company_users este logat în membership_audit

**TODO POST-MVP** (nu în scope curent):
- [ ] Adaugă tabel `company_user_roles` cu roluri: `owner`, `admin`, `member`
- [ ] Restrânge policy INSERT la `owner`/`admin` only
- [ ] Implementează sistem de invitații cu token + expirare

**Dacă în viitor se adaugă roluri la nivel de companie**, policy-ul devine:
```sql
-- EXEMPLU VIITOR (nu implementa acum)
OR (
  public.is_company_member(public.get_user_id_from_auth(), company_id)
  AND public.has_company_role(public.get_user_id_from_auth(), company_id, 'admin')
)
```

#### Fișiere Afectate
| Fișier | Acțiune |
|--------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_security_patch_company_users_rls.sql` | **CREARE** - migrare nouă |

---

### 1B. create_company_with_member: Join by CUI

#### Stare Curentă
**Fișier**: `supabase/migrations/20260119095336_795e1e99-f2d1-421c-abb1-178fa2981a4e.sql`

Funcția actuală permite "join by CUI" la companie existentă:

```sql
IF v_existing_company_id IS NOT NULL THEN
  -- Check if user is already a member
  IF EXISTS (...) THEN
    RETURN v_existing_company_id;
  END IF;
  
  -- BREȘĂ: Adaugă user la companie existentă fără verificare!
  INSERT INTO public.company_users (company_id, user_id)
  VALUES (v_existing_company_id, p_user_id);
  
  RETURN v_existing_company_id;
END IF;
```

#### Problemă Identificată
- CUI este informație publică (se poate căuta pe ANAF, etc.)
- Oricine știe CUI-ul poate "intra" într-o companie existentă
- Elimină complet conceptul de invitații și permisiuni

#### Soluție Propusă
1. Dacă CUI există → **EROARE** (nu join silențios)
2. Elimină `p_user_id` din parametri → se ia din `get_user_id_from_auth()`

```sql
CREATE OR REPLACE FUNCTION public.create_company_with_member(
  p_name VARCHAR,
  p_cui  VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_cui_normalized VARCHAR;  -- v1.6: pentru normalizare CUI
BEGIN
  -- Obține user-ul curent din JWT
  v_user_id := public.get_user_id_from_auth();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- v1.6: CUI normalizat pentru verificare case-insensitive
  v_cui_normalized := UPPER(TRIM(REPLACE(p_cui, ' ', '')));  -- v1.6: uppercase, fără spații
  
  -- Verifică dacă CUI există deja (verificarea EXISTS rămâne pentru mesaj clar)
  -- v1.6: NOTĂ - UNIQUE constraint pe DB prinde și race conditions (vezi migrare)
  IF EXISTS (SELECT 1 FROM public.companies WHERE UPPER(TRIM(REPLACE(cui, ' ', ''))) = v_cui_normalized) THEN
    RAISE EXCEPTION 'Company with this CUI already exists. Request an invite.';
  END IF;

  -- Creează compania nouă
  -- v1.6: Salvează CUI normalizat (uppercase, fără spații) pentru consistență
  INSERT INTO public.companies (name, cui)
  VALUES (p_name, v_cui_normalized)  -- v1.6: CUI normalizat
  RETURNING id INTO v_company_id;

  -- Adaugă user-ul curent ca prim membru
  INSERT INTO public.company_users (company_id, user_id)
  VALUES (v_company_id, v_user_id);

  RETURN v_company_id;
END;
$$;

-- Revocă acces public și acordă doar authenticated
REVOKE ALL ON FUNCTION public.create_company_with_member(VARCHAR, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company_with_member(VARCHAR, VARCHAR) TO authenticated;
```

#### Unicitate CUI și Race Conditions (v1.6 - NOU, OBLIGATORIU)

**Problemă**: Fără UNIQUE constraint, două tranzacții concurente pot trece de verificarea `EXISTS` și pot insera duplicate.

**Soluție (v1.6)**: UNIQUE constraint pe CUI normalizat

```sql
-- Migrare: UNIQUE constraint pe CUI (case-insensitive)
-- Varianta A (preferată): Index unique pe expresie
CREATE UNIQUE INDEX idx_companies_cui_normalized 
ON public.companies (UPPER(TRIM(REPLACE(cui, ' ', ''))));

-- Varianta B (dacă tabelul e gol sau mic): Adaugă coloană cui_normalized
-- ALTER TABLE public.companies ADD COLUMN cui_normalized VARCHAR GENERATED ALWAYS AS (UPPER(TRIM(REPLACE(cui, ' ', '')))) STORED;
-- CREATE UNIQUE INDEX idx_companies_cui_normalized ON public.companies(cui_normalized);
```

**Tratare unique_violation în funcție (v1.8 - ACTUALIZAT)**:
```sql
EXCEPTION 
  WHEN unique_violation THEN
    -- v1.8: NU returna NULL (poate fi tratat ca "success" în UI)
    -- RAISE EXCEPTION explicit cu mesaj safe + ERRCODE pentru client
    RAISE EXCEPTION 'Company with this CUI already exists. Request an invite.'
      USING ERRCODE = '23505';  -- v1.8: Păstrează SQLSTATE pentru identificare
  WHEN OTHERS THEN
    -- ... alte erori (log SQLSTATE + SQLERRM intern, returnează mesaj generic)
    RAISE;
```

**v1.8 - CRITICĂ**: `RETURN QUERY SELECT NULL::UUID` poate fi tratat ca success în UI dacă verificarea e `if (data)` în loc de `if (data && !error)`. RAISE EXCEPTION e mai sigur.

**Beneficiu**: Protecție completă împotriva duplicate CUI, chiar în concurență.

#### Preflight și Remediere Date Existente (v1.7 - OBLIGATORIU)

**⚠️ RISC MIGRARE (v1.7)**: Dacă există deja companii cu CUI-uri care diferă doar prin spații/case, indexul UNIQUE va eșua la creare.

**Pas 1: Query preflight pentru detectare coliziuni** (rulează ÎNAINTE de migrare):
```sql
-- Detectează duplicate după normalizare
WITH normalized AS (
  SELECT 
    id, 
    name, 
    cui,
    UPPER(TRIM(REPLACE(cui, ' ', ''))) AS cui_normalized,
    COUNT(*) OVER (PARTITION BY UPPER(TRIM(REPLACE(cui, ' ', '')))) AS duplicate_count
  FROM public.companies
)
SELECT * FROM normalized WHERE duplicate_count > 1 ORDER BY cui_normalized, id;
```

**Pas 2: Plan de remediere** (dacă există coliziuni):
```sql
-- Opțiune A: Merge companii duplicate (complex, necesită migrare FK)
-- Opțiune B: Redenumire CUI (adaugă suffix _1, _2) - NU RECOMANDAT
-- Opțiune C: Soft-delete (marchează archived) - SIMPLU
UPDATE public.companies 
SET status = 'archived', 
    name = name || ' (DUPLICATE - merged into company X)'
WHERE id IN (<ids-duplicate>);
```

**Pas 3: Creare index** (v1.7 + v1.8 - CLARIFICARE CRITICĂ):

**⚠️ LIMITARE (v1.8)**: `CREATE INDEX CONCURRENTLY` NU poate rula în tranzacție!

**Problemă**: Majoritatea pipeline-urilor de migrări Supabase rulează migrările în tranzacție atomică.
- `CREATE INDEX CONCURRENTLY` aruncă eroare: `ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block`

**Soluție practică (v1.8)**:

**A) Staging / Development** (tabele goale sau mici):
```sql
-- Migrare normală (în tranzacție, OK pentru <1000 rânduri)
CREATE UNIQUE INDEX idx_companies_cui_normalized 
ON public.companies (UPPER(TRIM(REPLACE(cui, ' ', ''))));
```

**B) Producție** (tabele populate):
1. **În migrare**: Comentează sau exclude `CREATE INDEX CONCURRENTLY`
2. **Pas manual separat** (după preflight + remediere):
   ```bash
   # Conectare directă la DB (nu prin pipeline migrări)
   psql $DATABASE_URL -c "
   CREATE UNIQUE INDEX CONCURRENTLY idx_companies_cui_normalized 
   ON public.companies (UPPER(TRIM(REPLACE(cui, ' ', ''))));
   "
   
   # Verifică success:
   psql $DATABASE_URL -c "
   SELECT schemaname, tablename, indexname, indexdef 
   FROM pg_indexes WHERE indexname = 'idx_companies_cui_normalized';
   "
   ```

**C) Alternative (dacă pas manual imposibil)**:
- Fereastră de mentenanță: CREATE INDEX normal (lock-uri scurte acceptabile)
- Fereastră nocturnă: CONCURRENTLY manual în afara pipeline-ului

**v1.8 - Decizie**: Pentru producție, **PAS MANUAL** după migrări (nu în pipeline).

**Checklist migrare CUI (v1.7)**:
- [ ] Rulează query preflight pe staging + producție
- [ ] Dacă coliziuni: aplică plan remediere (opțiunea C recomandată)
- [ ] Estimare durată: `SELECT COUNT(*) FROM companies;` → <1000: <1s, >10k: CONCURRENTLY
- [ ] Testează migrare pe copie staging
- [ ] Monitorizează lock-uri: `SELECT * FROM pg_stat_activity WHERE wait_event_type = 'Lock';`

#### Fișiere Afectate
| Fișier | Acțiune |
|--------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_security_patch_create_company_function.sql` | **CREARE** - migrare nouă |
| `src/hooks/useCompany.tsx` | **MODIFICARE** - elimină p_user_id din RPC call |
| `src/contexts/CompanyContext.tsx` | **MODIFICARE** - elimină p_user_id din RPC call |
| `src/integrations/supabase/types.ts` | **REGENERARE** - după aplicarea migrării |

#### Modificări Frontend

**useCompany.tsx** (linia 94-99):
```typescript
// ÎNAINTE:
const { data: companyId, error: rpcError } = await supabase
  .rpc('create_company_with_member', { 
    p_name: name, 
    p_cui: cui, 
    p_user_id: userData.id 
  });

// DUPĂ:
const { data: companyId, error: rpcError } = await supabase
  .rpc('create_company_with_member', { 
    p_name: name, 
    p_cui: cui
  });
```

**CompanyContext.tsx** (linia 152-157):
```typescript
// ÎNAINTE:
const { data: companyId, error: rpcError } = await supabase
  .rpc('create_company_with_member', {
    p_name: name,
    p_cui: cui,
    p_user_id: userData.id
  });

// DUPĂ:
const { data: companyId, error: rpcError } = await supabase
  .rpc('create_company_with_member', {
    p_name: name,
    p_cui: cui
  });
```

**NOTĂ**: După modificarea frontend-ului, se poate elimina și fetch-ul `userData` deoarece nu mai e necesar pentru acest RPC.

---

## PUNCTUL 2 — Edge Function parse-balanta

### 2A. verify_jwt = false

#### Stare Curentă
**Fișier**: `supabase/config.toml`

```toml
[functions.parse-balanta]
verify_jwt = false
```

#### Problemă Identificată
- Edge function-ul NU verifică automat JWT-ul la nivel de Supabase
- Deși codul face verificare manuală cu `supabase.auth.getUser(token)`, acest lucru:
  - Adaugă latență (call suplimentar)
  - Poate fi bypassed dacă se schimbă codul
  - Nu e best practice

#### Soluție Propusă
```toml
[functions.parse-balanta]
verify_jwt = true
```

Codul din `index.ts` poate păstra verificarea manuală ca fallback, dar cu `verify_jwt = true` Supabase respinge automat requesturi fără token valid.

#### Tratare Explicită OPTIONS (v1.4 - NOU: Reduce Dependență Platformă)

**Problemă**: Comportamentul OPTIONS preflight depinde de configurația platformei Supabase.

**Soluție (v1.4)**: Tratează OPTIONS **explicit** în handler edge function:

```typescript
// La începutul handler-ului în index.ts
Deno.serve(async (req) => {
  // v1.4: Tratare explicită OPTIONS (reduce dependență platformă)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',  // sau specific origin
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  // Restul logic-ii pentru POST...
});
```

**Beneficii**:
- Garanție că OPTIONS funcționează indiferent de `verify_jwt`
- Control explicit asupra header-elor CORS
- Reduce dependența de comportamentul platformei între environments

#### Optimizare Latență Auth (v1.5 - OPȚIONAL)

**Observație**: Cu `verify_jwt = true`, platforma verifică deja semnătura JWT. Apelul `supabase.auth.getUser(token)` devine redundant pe "happy path".

**Optimizare (v1.5 + v1.6 - OPȚIONAL, doar dacă latența e problemă)**:
```typescript
// v1.6: Decode JWT base64url-safe (NU atob() clasic!)
function getUserIdFromJWT(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // v1.6: base64url decode (nu base64 clasic)
    // JWT folosește base64url: - în loc de +, _ în loc de /, fără padding =
    const base64url = parts[1];
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Adaugă padding dacă lipsește
    const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);
    
    const payload = JSON.parse(atob(paddedBase64));
    return payload.sub || null;  // 'sub' conține user_id
  } catch {
    return null;  // Fallback la getUser()
  }
}

// În handler:
const userId = getUserIdFromJWT(authHeader);
if (!userId) {
  // Fallback: apelează getUser() dacă decode eșuează
  const { data: { user }, error } = await supabase.auth.getUser(token);
  userId = user?.id;
}
```

**⚠️ NOTĂ SECURITATE**: Această optimizare e SIGURĂ doar dacă `verify_jwt = true` (platforma verifică semnătura). NU implementați dacă `verify_jwt = false`.

**Beneficiu**: Elimină 1 round-trip la auth service (~20-50ms economie).

#### CORS Origins: Restricționare Whitelist (v1.7 - RECOMANDATĂ)

**⚠️ RISC IDENTIFICAT (v1.7)**: CORS cu `Access-Control-Allow-Origin: *` permite orice origin să apeleze endpoint-ul.

**Problemă**: Deși JWT protejează autentificarea, wildcard `*` crește suprafața de atac:
- Phishing sites pot face requesturi legitime cu token-uri furate
- Nu ai control asupra origin-urilor care consumă API-ul
- Risc mai mare decât necesar pentru aplicație cu origin-uri cunoscute

**Soluție (v1.7 - RECOMANDATĂ)**: Whitelist explicit de origin-uri

```typescript
// v1.7: Origin whitelist pentru producție
const ALLOWED_ORIGINS = [
  'https://your-app.com',
  'https://app.your-domain.com',
  'https://staging.your-app.com',
  'http://localhost:5173',         // Development Vite
  'http://localhost:3000',         // Development alternate
];

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // v1.7: Verifică dacă origin e în whitelist
  const isAllowed = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? requestOrigin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',  // v1.7: pentru origin-uri specifice
  };
}

// În handler Deno.serve:
Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  // ... rest handler
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

**Configurare environment (v1.7)**:
```typescript
// Pentru flexibilitate, citește din env
const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
  'https://your-app.com'
];
```

**Beneficiu (v1.7)**: Defense-in-depth - limitează suprafața de atac fără a compromite funcționalitatea.

#### Comportament Așteptat (v1.1)

| Scenariu | Request | Răspuns Așteptat |
|----------|---------|------------------|
| Fără Authorization header | `POST /functions/v1/parse-balanta` | `401 Unauthorized` (înainte de consum resurse) |
| Token invalid/expirat | `POST ... -H "Authorization: Bearer invalid"` | `401 Unauthorized` |
| OPTIONS preflight | `OPTIONS /functions/v1/parse-balanta` | `200 OK` + headere CORS (nu necesită token) |
| Token valid | `POST ... -H "Authorization: Bearer <valid>"` | `200 OK` sau eroare aplicație |

**IMPORTANT**: Preflight-ul OPTIONS trebuie să funcționeze fără token (browserele nu trimit Authorization la preflight).

#### Test Browser Obligatoriu (v1.2 - NOU)

Pe lângă testele curl, **OBLIGATORIU** test din browser real (fetch din app/staging):

```javascript
// Rulează în consola browser-ului pe staging/localhost
// Test 1: OPTIONS preflight
fetch('https://gqxopxbzslwrjgukqbha.supabase.co/functions/v1/parse-balanta', {
  method: 'OPTIONS',
  headers: {
    'Origin': window.location.origin,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,content-type'
  }
}).then(r => console.log('OPTIONS:', r.status, r.headers.get('access-control-allow-origin')));

// Test 2: POST fără token
fetch('https://gqxopxbzslwrjgukqbha.supabase.co/functions/v1/parse-balanta', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ import_id: 'test' })
}).then(r => console.log('POST no auth:', r.status));  // AȘTEPTAT: 401
```

**De ce test browser**: curl nu execută preflight CORS; browserele da. Dacă OPTIONS nu funcționează în browser, aplicația nu va putea face request-uri.

#### Fișiere Afectate
| Fișier | Acțiune |
|--------|---------|
| `supabase/config.toml` | **MODIFICARE** - verify_jwt = true |

---

### 2B. Rate Limiting In-Memory

#### Stare Curentă
**Fișier**: `supabase/functions/parse-balanta/index.ts` (liniile 42-81)

```typescript
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
```

#### Problemă Identificată
- Edge Functions sunt stateless și pot rula pe instanțe multiple
- Un Map in-memory se pierde la fiecare cold start
- Rate limiting ineficient în producție cu mai multe instanțe

#### Soluție Propusă
Opțiuni (în ordinea preferinței):
1. **Upstash Redis** - dacă proiectul suportă (extern, cost suplimentar)
2. **Database-based** - tabel `rate_limits` în Supabase (implementare minimă)
3. **Păstrare in-memory cu notă** - acceptabil pentru MVP, documentat ca limitare

**Recomandare**: Database-based rate limiting (fără dependințe externe).

#### Decizii de Design (v1.1 + v1.2)

| Aspect | Decizie | Motivație |
|--------|---------|-----------|
| **Identificator** | `user_id` (NU IP) | Edge functions au IP-uri proxy; user_id e sigur din JWT |
| **Cleanup** | Bounded (v1.2) | Cleanup doar dacă `last_cleanup > 5 min`; predictibil, nu probabilistic |
| **Permisiuni execuție** | `service_role` ONLY | Previne manipulare client; edge function folosește service_role |
| **Tip fereastră** | **Fixed Window** (v1.2) | NU sliding; contorul se resetează la expirarea ferestrei |

##### Clarificare: Fixed Window vs Sliding Window (v1.2)

Implementarea este **Fixed Window**:
- Fiecare user are o fereastră care începe la primul request
- Contorul crește în acea fereastră
- Când fereastra expiră (60s), contorul se resetează la 1
- **NU** este sliding window (care ar lua în calcul ultimele N secunde în mod continuu)

**Implicație practică**: Un user poate face 10 requesturi la secunda 59, apoi încă 10 la secunda 61 (20 în 3 secunde). Acceptabil pentru MVP.

```sql
-- Migrare pentru rate_limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,  -- user_id (nu IP - vezi motivație mai sus)
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(identifier)
);

-- Tabel pentru tracking last cleanup (v1.2)
CREATE TABLE IF NOT EXISTS public.rate_limits_meta (
  key VARCHAR(50) PRIMARY KEY,
  value TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- v1.3: ON CONFLICT pentru idempotență
INSERT INTO public.rate_limits_meta (key, value) 
VALUES ('last_cleanup', NOW())
ON CONFLICT (key) DO NOTHING;

-- Index pentru cleanup și lookup
CREATE INDEX idx_rate_limits_window ON public.rate_limits(window_start);
CREATE INDEX idx_rate_limits_identifier ON public.rate_limits(identifier);

-- Funcție pentru check rate limit
-- SECURITATE: Doar service_role poate executa (edge function)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier VARCHAR,
  p_max_requests INT DEFAULT 10,
  p_window_seconds INT DEFAULT 60
)
RETURNS TABLE(allowed BOOLEAN, remaining INT, reset_in_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ := v_now - (p_window_seconds || ' seconds')::INTERVAL;
  v_last_cleanup TIMESTAMPTZ;
BEGIN
  -- CLEANUP BOUNDED (v1.2): Rulează doar dacă ultimul cleanup > 5 minute
  SELECT value INTO v_last_cleanup FROM public.rate_limits_meta WHERE key = 'last_cleanup';
  
  IF v_last_cleanup IS NULL OR v_now - v_last_cleanup > INTERVAL '5 minutes' THEN
    -- Actualizează timestamp-ul cleanup ÎNAINTE de DELETE (previne race condition)
    UPDATE public.rate_limits_meta SET value = v_now WHERE key = 'last_cleanup';
    -- Șterge intrări mai vechi de 10 minute
    DELETE FROM public.rate_limits WHERE window_start < (v_now - INTERVAL '10 minutes');
    -- v1.3: Notă - cleanup poate rula simultan în rare cazuri; acceptabil; worst case: 2 cleanup-uri concomitente
  END IF;
  
  -- Upsert pentru identifier
  INSERT INTO public.rate_limits (identifier, request_count, window_start)
  VALUES (p_identifier, 1, v_now)
  ON CONFLICT (identifier) DO UPDATE
  SET 
    request_count = CASE 
      WHEN rate_limits.window_start < v_window_start THEN 1
      ELSE rate_limits.request_count + 1
    END,
    window_start = CASE
      WHEN rate_limits.window_start < v_window_start THEN v_now
      ELSE rate_limits.window_start
    END
  RETURNING * INTO v_current;
  
  RETURN QUERY SELECT 
    (v_current.request_count <= p_max_requests),
    GREATEST(0, p_max_requests - v_current.request_count),
    EXTRACT(EPOCH FROM (v_current.window_start + (p_window_seconds || ' seconds')::INTERVAL - v_now))::INT;
END;
$$;

-- PERMISIUNI (v1.1): Doar service_role poate executa
REVOKE ALL ON FUNCTION public.check_rate_limit(VARCHAR, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_rate_limit(VARCHAR, INT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(VARCHAR, INT, INT) TO service_role;
```

#### Impact Performanță și Mitigări (v1.1 + v1.2)

| Risc | Impact | Mitigare |
|------|--------|----------|
| Query DB la fiecare request | +5-15ms latență | Index pe `identifier`; conexiune pooled |
| Cleanup DELETE blochează | Potențial lock | Cleanup bounded (v1.2): max 1x la 5 min; DELETE rapid cu index |
| Tabel crește prea mare | Disk usage | Cleanup la 10 minute; maxim ~10K rânduri active |
| (v1.2) Cleanup race condition | Minimal | UPDATE timestamp ÎNAINTE de DELETE; worst case: 2 cleanup-uri simultane |

#### Cerințe Client Edge Function (v1.2 - NOU)

**OBLIGATORIU**: Edge function TREBUIE să folosească SERVICE_ROLE pentru RPC/writes:

```typescript
// ÎN supabase/functions/parse-balanta/index.ts
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;  // NU ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey);
```

**Sanitizare logs (v1.2)**:
```typescript
// ❌ GREȘIT - expune secrete
console.log('Client created with key:', supabaseKey);
console.log('Auth header:', authHeader);

// ✅ CORECT - fără date sensibile
console.log('Client created successfully');
console.log('Processing request for user:', user.id);  // doar user_id, nu token
```

**Test validare (adăugat în checklist)**: Ce eroare apare dacă edge function folosește ANON_KEY în loc de SERVICE_ROLE?
- check_rate_limit RPC → `permission denied for function check_rate_limit`
- Detectabil în staging înainte de deploy producție

**Edge Function Update** *(v1.4 - ACTUALIZAT: unitățile + fail strategy)*:
```typescript
// Înlocuiește checkRateLimit in-memory cu RPC call
async function checkRateLimitDB(
  supabase: SupabaseClient, 
  userId: string
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_identifier: userId,
    p_max_requests: 10,
    p_window_seconds: 60
  });
  
  if (error || !data || data.length === 0) {
    // v1.4: FAIL-CLOSED pentru import fișiere (endpoint critic)
    // Log metric pentru alerting
    console.error('Rate limit unavailable - failing closed', { 
      error, 
      user_id: userId,
      metric: 'rate_limit_unavailable' 
    });
    
    // Returnează denied când check-ul nu funcționează
    return { allowed: false, remaining: 0, resetInSeconds: 60 };
  }
  
  // v1.4: Păstrează în SECUNDE peste tot (nu converti în ms)
  return {
    allowed: data[0].allowed,
    remaining: data[0].remaining,
    resetInSeconds: data[0].reset_in_seconds  // SECUNDE, nu ms
  };
}

// v1.3 + v1.4: Dacă rate limit depășit, returnează 429 cu contract explicit
if (!rateLimitResult.allowed) {
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      reset_in_seconds: rateLimitResult.resetInSeconds,  // v1.4: deja în secunde
      remaining: rateLimitResult.remaining
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': rateLimitResult.resetInSeconds.toString()  // v1.4: deja în secunde
      }
    }
  );
}
```

#### Contract 429 Explicit (v1.3 - NOU)

Când rate limit este depășit, edge function **TREBUIE** să returneze:

| Aspect | Valoare Obligatorie |
|--------|---------------------|
| **HTTP Status** | `429 Too Many Requests` |
| **Header Retry-After** | Număr de secunde până la reset (integer ca string) |
| **Body JSON** | `{ error: 'Too Many Requests', reset_in_seconds: <int>, remaining: 0 }` |

**Exemplu**:
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 45
Content-Type: application/json

{
  "error": "Too Many Requests",
  "reset_in_seconds": 45,
  "remaining": 0
}
```

#### Fail Strategy: Closed vs Open (v1.4 - DECIZIE)

**DECIZIE (v1.4)**: Pentru endpoint import fișiere, **FAIL-CLOSED** când check-ul rate limit eșuează.

| Situație | Comportament | Motivație |
|----------|--------------|-----------|
| RPC `check_rate_limit` eșuează | Returnează `{ allowed: false, ... }` | Import e endpoint critic; prefer refuz temporar decât lipsă protecție în incident |
| DB down / timeout | 429 Too Many Requests sau 503 Service Unavailable | Previne abuz când rate limiting nu funcționează |
| RPC succes | Normal | Procesare bazată pe rezultat real |

**Monitoring (v1.4 - OBLIGATORIU)**:
- Log metric `rate_limit_unavailable` când check eșuează
- Alert dacă > 5% requesturi au rate limit unavailable în 5 min
- Dashboard: % succes check rate limit

**Alternative**: Pentru endpoint-uri non-critice (ex: fetch read-only), fail-open e acceptabil.

#### Fișiere Afectate
| Fișier | Acțiune |
|--------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_rate_limits_table.sql` | **CREARE** - tabel + funcție |
| `supabase/functions/parse-balanta/index.ts` | **MODIFICARE** - înlocuire rate limit |

---

### 2C. Vulnerabilitate xlsx@0.18.5

#### Stare Curentă
**Fișier**: `supabase/functions/parse-balanta/index.ts` (linia 3)

```typescript
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
```

#### Clarificare: Edge Function vs Web App (v1.1)

| Aspect | Valoare | Implicații |
|--------|---------|------------|
| **Locație** | Edge Function (Deno runtime) | NU e în `package.json` al app-ului |
| **Mod import** | URL direct (`esm.sh`) | Nu se aplică `npm audit` |
| **Verificare vulnerabilități** | Manual: CVE database, GitHub advisories | Caută "sheetjs xlsx CVE" |

**IMPORTANT**: xlsx din edge function este **separat** de orice xlsx din aplicația web (dacă există).

#### Problemă Identificată
- xlsx@0.18.5 are vulnerabilități cunoscute de securitate
- SheetJS (xlsx) a avut CVE-uri legate de prototype pollution și ReDoS

#### Soluție Propusă

**Opțiunea A (preferată)**: Upgrade la versiune patched
```typescript
import * as XLSX from "https://esm.sh/xlsx@0.20.3";
```

**Criteriu alegere versiune (v1.1)**:
1. Verifică [SheetJS GitHub releases](https://github.com/SheetJS/sheetjs/releases) pentru ultimul tag stabil
2. Verifică că nu are CVE-uri deschise pe [NVD](https://nvd.nist.gov/vuln/search)
3. Testează pe set de fișiere reale ÎNAINTE de deploy (vezi mai jos)

#### Proces de Înghețare Reproducibil (v1.3 - NOU)

**⚠️ IMPORTANT**: În Deno/esm.sh nu există lockfile ca npm, dar trebuie proces controlat.

**Pași obligatorii**:
1. **Selectare versiune**: Alege versiunea finală (ex: `0.20.3`) conform criteriilor de mai sus
2. **Pin exact**: Modifică importul la versiune exactă: `https://esm.sh/xlsx@0.20.3` (NU `@latest`)
3. **Commit separat**: Creează PR/commit care schimbă DOAR importul xlsx (fără alte modificări)
4. **Test set complet**: Rulează setul de 7 fișiere test (vezi mai jos) pe staging/local
5. **Verificare regresie**: Compară rezultatele cu baseline (dacă există)
6. **Merge**: Doar dacă toate testele trec, merge PR-ul

**Notă**: Pin-ul la versiune + commit-ul sunt obligatorii pentru reproducibilitate. esm.sh cache-uiește versiuni pinned.

**Opțiunea B** *(v1.5 - DEVINE OBLIGATORIE)*: Măsuri de izolare împotriva resource exhaustion

**⚠️ OBLIGATORIU (v1.5)**: Chiar fără CVE-uri, fișierele Excel pot cauza:
- Consum mare memorie (workbook.SheetNames, sheet parsing)
- Timp excesiv parsare (multe foi, celule, formule)
- Cazuri tip zip-bomb

**Limite OBLIGATORII în edge function**:
```typescript
// Constante limite (v1.5)
const MAX_SHEETS = 10;           // Maximum foi procesate
const MAX_ROWS_PER_SHEET = 20000;  // Maximum rânduri per foaie
const MAX_COLUMNS = 30;            // Maximum coloane relevante
const PARSE_TIMEOUT_MS = 30000;    // 30 secunde timeout parsare

// v1.7: Verifică mărime ÎNAINTE de download din storage (economie bandwidth + memorie)
async function validateAndDownloadFile(importId: string, supabase: SupabaseClient): Promise<ArrayBuffer> {
  const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB
  
  // v1.7: Obține file_size_bytes din DB (salvat la upload)
  const { data: importData, error: importError } = await supabase
    .from('trial_balance_imports')
    .select('file_path, file_size_bytes')
    .eq('id', importId)
    .single();
  
  if (importError || !importData) {
    throw new Error('Import not found');
  }
  
  // v1.7: Verifică mărime ÎNAINTE de download
  if (importData.file_size_bytes && importData.file_size_bytes > MAX_FILE_SIZE) {
    throw new Error(`File too large (${Math.round(importData.file_size_bytes/1024/1024)}MB). Maximum: ${MAX_FILE_SIZE/1024/1024}MB`);
  }
  
  // v1.7: Download doar dacă mărimea e OK
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('balante')
    .download(importData.file_path);
  
  if (downloadError || !fileData) {
    throw new Error('Failed to download file from storage');
  }
  
  return await fileData.arrayBuffer();
}

async function parseExcelFile(fileBuffer: ArrayBuffer, import_id: string) {
  // v1.5: Timeout cu AbortController (dacă Deno suportă)
  const startTime = Date.now();
  
  // v1.6: PROTECȚIE PRE-PARSE - verifică mărimea după download (secundară)
  // v1.7: Mărimea AR TREBUI verificată ÎNAINTE de download (vezi validateAndDownloadFile)
  const fileSizeBytes = fileBuffer.byteLength;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB
  
  if (fileSizeBytes > MAX_FILE_SIZE) {
    throw new Error(`File too large (${Math.round(fileSizeBytes/1024/1024)}MB). Maximum: ${MAX_FILE_SIZE/1024/1024}MB`);
  }
  
  // v1.6: NOTĂ - Date.now() check nu poate întrerupe XLSX.read() dacă acesta e lent
  // Protecții practice:
  // 1. Limită mărime pre-read (implementată mai sus)
  // 2. Limite post-parse (MAX_SHEETS, MAX_ROWS) - guard, nu prevenție
  // 3. Ideally: Worker cu timeout real (Deno.Worker dacă disponibil) - TODO v2.0
  
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  
  // v1.5: Limită foi (post-parse guard)
  if (workbook.SheetNames.length > MAX_SHEETS) {
    throw new Error(`File has too many sheets (${workbook.SheetNames.length}). Maximum allowed: ${MAX_SHEETS}`);
  }
  
  for (const sheetName of workbook.SheetNames) {
    // v1.5: Check timeout
    if (Date.now() - startTime > PARSE_TIMEOUT_MS) {
      throw new Error('File parsing timeout exceeded');
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // v1.5: Limită rânduri
    if (data.length > MAX_ROWS_PER_SHEET) {
      throw new Error(`Sheet '${sheetName}' has too many rows (${data.length}). Maximum allowed: ${MAX_ROWS_PER_SHEET}`);
    }
    
    // v1.5: Limită coloane (verifică first row)
    if (data[0] && data[0].length > MAX_COLUMNS) {
      throw new Error(`Sheet '${sheetName}' has too many columns (${data[0].length}). Maximum allowed: ${MAX_COLUMNS}`);
    }
    
    // Procesare normală...
  }
}
```

**Rejectare precoce (v1.5)**:
- Respinge fișiere > 10 MB (deja există file_size_bytes)
- Respinge extensii neacceptate (verificare MIME type)
- Log metric pentru fișiere respinse (observabilitate)

#### Set Fișiere Test pentru Regresie (v1.1)

Înainte de deploy, testează parsarea cu următoarele tipuri de fișiere:

| # | Tip Fișier | Caracteristici | Rezultat Așteptat |
|---|------------|----------------|-------------------|
| 1 | `test_basic.xlsx` | 10 conturi, format standard | Parsare OK |
| 2 | `test_eu_format.xlsx` | Numere format EU (1.234,56) | Numere corecte |
| 3 | `test_us_format.xlsx` | Numere format US (1,234.56) | Numere corecte |
| 4 | `test_empty_cells.xlsx` | Celule goale intercalate | 0 pentru goale |
| 5 | `test_large.xlsx` | 5000+ conturi | Parsare OK, nu timeout |
| 6 | `test_special_chars.xlsx` | Diacritice în nume conturi | Nume corecte |
| 7 | `test_old_xls.xls` | Format XLS (pre-2007) | Parsare OK sau eroare clară |

**Locație sugerată**: `supabase/functions/parse-balanta/test-files/` (nu se deploy-ează)

#### Fișiere Afectate
| Fișier | Acțiune |
|--------|---------|
| `supabase/functions/parse-balanta/index.ts` | **MODIFICARE** - upgrade xlsx |

---

### 2D. Bug parseNumber pentru format US "1,234.56"

#### Stare Curentă
**Fișier**: `supabase/functions/parse-balanta/index.ts` (liniile 159-191)

```typescript
function parseNumber(value: unknown): number {
  // ...
  // Remove thousands separators and convert comma to period
  const normalized = strValue
    .replace(/\s/g, "")
    .replace(/\./g, "")      // Elimină TOATE punctele (greșit pentru US format)
    .replace(",", ".");       // Înlocuiește doar PRIMUL virgulă
  // ...
}
```

#### Problemă Identificată
Pentru input "1,234.56" (format US):
1. `.replace(/\./g, "")` → "1,23456" (elimină punctul zecimal!)
2. `.replace(",", ".")` → "1.23456"
3. Rezultat: `1.23456` în loc de `1234.56`

#### Soluție Propusă
Înlocuiește funcția `parseNumber` cu implementare robustă care detectează automat formatul:

```typescript
/**
 * Parses and validates a numeric value from Excel cells.
 * Handles both European (1.234,56) and US (1,234.56) number formats.
 * 
 * ALGORITM DE DETECȚIE (v1.1):
 * - Detectează separatorul zecimal prin ultima apariție a "." sau ","
 * - Cel care apare ULTIMUL este considerat separator zecimal
 * - NU verifică numărul de cifre după separator (simplificare)
 * 
 * @param value - Raw cell value from Excel
 * @returns Validated numeric value, or 0 if invalid
 */
function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  
  // Direct number - validate range
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    if (value > MAX_NUMERIC_VALUE || value < MIN_NUMERIC_VALUE) return 0;
    return Math.round(value * 100) / 100;
  }
  
  const s = String(value).trim();
  
  // Length check to prevent ReDoS attacks
  if (s.length > 50) return 0;
  
  // Only allow digits, spaces, dots, commas, and minus sign
  if (!/^-?[\d\s.,]+$/.test(s)) return 0;
  
  // Remove spaces
  const noSpaces = s.replace(/\s/g, "");
  
  // Detect decimal separator by last occurrence
  const lastComma = noSpaces.lastIndexOf(",");
  const lastDot = noSpaces.lastIndexOf(".");
  
  // Cel care apare ULTIMUL este separator zecimal
  const decimalSep = lastComma > lastDot ? "," : (lastDot > lastComma ? "." : null);
  
  let normalized = noSpaces;
  
  if (decimalSep === ",") {
    // European format: 1.234,56 → remove dots, replace comma with dot
    normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
  } else if (decimalSep === ".") {
    // US format: 1,234.56 → remove commas
    normalized = normalized.replace(/,/g, "");
  } else {
    // No decimal separator found - just remove any remaining separators
    normalized = normalized.replace(/[.,]/g, "");
  }
  
  const num = Number.parseFloat(normalized);
  
  // Validate the result
  if (!Number.isFinite(num)) return 0;
  if (num > MAX_NUMERIC_VALUE || num < MIN_NUMERIC_VALUE) return 0;
  
  return Math.round(num * 100) / 100;
}
```

#### Cazuri Ambigue și Reguli de Interpretare (v1.1)

**REGULĂ DECISĂ**: Separatorul care apare **ULTIMUL** este considerat separator zecimal.

| Input | lastComma | lastDot | Separator Zecimal | Rezultat | Comentariu |
|-------|-----------|---------|-------------------|----------|------------|
| `"1,234"` | 1 | -1 | `,` | `1.234` | Interpretat ca EU cu 3 zecimale |
| `"1.234"` | -1 | 1 | `.` | `1.234` | Interpretat ca US cu 3 zecimale |
| `"1234"` | -1 | -1 | `null` | `1234` | Întreg, fără separator |
| `"1,234.56"` | 1 | 5 | `.` | `1234.56` | US format clar |
| `"1.234,56"` | 5 | 1 | `,` | `1234.56` | EU format clar |

**⚠️ LIMITARE CUNOSCUTĂ**: Valorile `"1,234"` și `"1.234"` NU pot fi diferențiate corect:
- `"1,234"` → `1.234` (interpretat ca 1 unitate și 234 miimi)
- `"1.234"` → `1.234` (interpretat ca 1 unitate și 234 miimi)
- Dacă user-ul intenționează 1234 (o mie două sute treizeci și patru), interpretarea e greșită

**Decizie de acceptare**: Această ambiguitate este acceptată deoarece:
1. Balanțele contabile au de obicei 2 zecimale, nu 3
2. Formatul Excel nativ trimite valori numerice, nu string-uri
3. Ambiguitatea apare rar în practică

#### Observabilitate: Cazuri Suspecte (v1.3 - NOU)

**Scop**: Detectează valori care pot fi interpretate greșit (pattern de mii fără context).

**Metric/Log**: Numără string-uri care au:
- Un singur separator (`,` sau `.`)
- Exact 3 cifre după separator
- Exemplu: `"1,234"` sau `"1.234"` (ambigue: 1.234 sau 1234?)

**Implementare recomandată (v1.4 - CORECTARE)**:

**Opțiunea A** (preferată): Logging la nivelul parsing rând (NU în funcția parseNumber):
```typescript
// În parseExcelFile, când procesezi fiecare rând:
for (const row of rows) {
  const rawDebit = row['Debit'];
  
  // Verifică pattern suspect ÎNAINTE de parse
  if (typeof rawDebit === "string" && /^-?\d+[.,]\d{3}$/.test(rawDebit.trim())) {
    console.warn('Ambiguous number format detected', {
      import_id,      // disponibil în scope parseExcelFile
      user_id,        // disponibil în scope parseExcelFile
      row_index: i,
      pattern: 'single_sep_3_digits'
      // NU include rawDebit (sensibil)
    });
  }
  
  const debit = parseNumber(rawDebit);
  // ...
}
```

**Opțiunea B**: Trecut context ca parametru (mai complex):
```typescript
function parseNumber(value: unknown, ctx?: { import_id: string; user_id: string }): number {
  // ... verificare pattern suspect
  if (ctx && isSuspicious) {
    console.warn('Ambiguous number format detected', ctx);
  }
  // ...
}
```

**Decizie (v1.4)**: Opțiunea A preferată - logging la nivel superior, funcția parseNumber rămâne pură.

**Notă**: Log-ul NU conține valori brute (securitate); doar count + metadata context.

#### Fișiere Afectate
| Fișier | Acțiune |
|--------|---------|
| `supabase/functions/parse-balanta/index.ts` | **MODIFICARE** - înlocuire parseNumber |

---

### 2E. Idempotență / Rerun pentru Același import_id

#### Stare Curentă
**Fișier**: `supabase/functions/parse-balanta/index.ts` (liniile 446-480)

```typescript
// Insert accounts into database
const { error: insertError } = await supabase
  .from('trial_balance_accounts')
  .insert(accountsToInsert);

if (insertError) {
  // ...error handling
}

// Update import status to completed
await supabase
  .from('trial_balance_imports')
  .update({ status: 'completed', ... })
  .eq('id', import_id);
```

#### Problemă Identificată
1. Dacă re-rulezi pentru același `import_id`:
   - INSERT eșuează pe UNIQUE constraint `(import_id, account_code)`
   - Status rămâne "error" sau nedefinit
   - Date parțiale pot rămâne în DB

2. Nu există tranzacție atomică:
   - INSERT conturi + UPDATE status sunt separate
   - Dacă unul eșuează, starea e inconsistentă

#### Soluție Propusă
Creează o funcție RPC atomică pentru upsert/replace:

#### Contract Funcție și Validări (v1.1 + v1.2)

| Aspect | Specificație |
|--------|--------------|
| **Permisiuni** | `service_role` ONLY (edge function) |
| **Chei obligatorii JSON** | `account_code`, `account_name` |
| **Chei opționale JSON** | `opening_debit`, `opening_credit`, `debit_turnover`, `credit_turnover`, `closing_debit`, `closing_credit` (default 0) |
| **Limită volum** | Max 10.000 conturi per apel (consistent cu MAX_ACCOUNTS din edge function) |
| **Status completed** | Doar dacă inserarea reușește ȘI `v_count > 0` |
| **Status pentru 0 conturi** | `error` cu mesaj "No valid accounts found" |

#### Guard Concurență și Reguli Rerun (v1.2 - NOU)

**Problema**: Două execuții simultane pe același `import_id` pot interfera (una șterge conturile celeilalte).

**Soluție aleasă**: Guard pe status `processing` cu update atomic + timeout pentru stale locks. *(v1.3 - ACTUALIZAT)*

| Status Curent | Acțiune Request Nou | Comportament |
|---------------|---------------------|--------------|
| `draft` | Permite | Setează `processing`, procesează, setează `completed`/`error` |
| `processing` (fresh) | **REFUZĂ** | Returnează eroare "Import already processing" |
| `processing` (stale >10 min) *(v1.3)* | **PERMITE cu warning** | Tratează ca lock pierdut; reprocesează |
| `completed` | **PERMITE RERUN** | Șterge conturi, reprocesează (idempotent) |
| `error` | Permite | Șterge conturi (dacă există), reprocesează |

**Decizie de design**: Rerun pe `completed` este PERMIS pentru a permite corecții fără a crea import nou.

#### Regulă Timeout Processing Stale (v1.3 - NOU)

**Problemă**: Dacă funcția eșuează brusc (crash, timeout network), status rămâne `processing` pentru totdeauna.

**Soluție**: Timeout după 10 minute.

**Implementare aleasă (v1.4 - OBLIGATORIE)**:
- **Varianta A**: Adaugă coloană `processing_started_at TIMESTAMPTZ` setată când intră în `processing`
- ⚠️ **Migrarea 4a devine OBLIGATORIE** și trebuie să ruleze **ÎNAINTE** de migrarea 00003 (funcția)
- Varianta B (reutilizare `updated_at`) **NU** e recomandată: conflict semantic cu update normal al rândului

**Logică în funcție**:
```sql
-- Verifică dacă processing e stale
IF v_current_status = 'processing' THEN
  SELECT processing_started_at INTO v_processing_started
  FROM public.trial_balance_imports
  WHERE id = p_import_id;
  
  IF v_now - v_processing_started > INTERVAL '10 minutes' THEN
    -- Stale lock - permite retry cu warning log
    -- Log: 'Import was stuck in processing; retrying'
  ELSE
    -- Fresh processing - refuză
    RETURN QUERY SELECT FALSE, 0, 'Import already processing. Please wait or retry later.'::TEXT;
    RETURN;
  END IF;
END IF;
```

**Model permisiuni (v1.1 + v1.5 - ACTUALIZAT)**:
- Funcția e SECURITY DEFINER cu acces service_role
- **(v1.5 - DEFENSE-IN-DEPTH OBLIGATORIU)**: Validare ownership în DB chiar dacă funcția e service_role-only

**Motivație (v1.5)**: Service role crește impactul oricărei erori de autorizare. Bug în edge → write cross-tenant.

**Implementare recomandată (v1.5)**:
```sql
-- Adaugă parametru p_requester_user_id (furnizat de edge după auth)
CREATE OR REPLACE FUNCTION public.process_import_accounts(
  p_import_id UUID,
  p_accounts JSONB,
  p_requester_user_id UUID  -- v1.5: NOU parametru
)
...
BEGIN
  -- v1.5: Verifică ownership înainte de orice procesare
  -- Opțiunea A: Dacă trial_balance_imports are user_id/created_by
  IF NOT EXISTS (
    SELECT 1 FROM public.trial_balance_imports
    WHERE id = p_import_id 
      AND user_id = p_requester_user_id
  ) THEN
    RETURN QUERY SELECT FALSE, 0, 'Access denied: import not owned by requester'::TEXT;
    RETURN;
  END IF;
  
  -- Opțiunea B: Dacă importul e legat de company, verifică membership
  IF NOT EXISTS (
    SELECT 1 FROM public.trial_balance_imports tbi
    JOIN public.company_users cu ON cu.company_id = tbi.company_id
    WHERE tbi.id = p_import_id 
      AND cu.user_id = p_requester_user_id
  ) THEN
    RETURN QUERY SELECT FALSE, 0, 'Access denied: not a company member'::TEXT;
    RETURN;
  END IF;
  
  -- Continuă procesarea...
END;
```

**Edge function**: Transmite `user_id` obținut din auth ca `p_requester_user_id`.

**Beneficiu**: Chiar dacă edge greșește parametrii, DB validează ownership → previne cross-tenant writes.

```sql
-- Funcție pentru procesare atomică a conturilor
CREATE OR REPLACE FUNCTION public.process_import_accounts(
  p_import_id UUID,
  p_accounts JSONB  -- Array de obiecte {account_code, account_name, ...}
)
RETURNS TABLE(success BOOLEAN, accounts_count INT, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_array_length INT;
  v_current_status VARCHAR(50);
  v_rows_updated INT;
  v_processing_started TIMESTAMPTZ;  -- v1.3: pentru timeout check
  v_now TIMESTAMPTZ := NOW();         -- v1.3
BEGIN
  -- VALIDARE (v1.1): Verifică structura JSON
  IF p_accounts IS NULL OR jsonb_typeof(p_accounts) != 'array' THEN
    RETURN QUERY SELECT FALSE, 0, 'Invalid accounts: expected JSON array'::TEXT;
    RETURN;
  END IF;
  
  v_array_length := jsonb_array_length(p_accounts);
  
  -- VALIDARE (v1.1): Limită volum
  IF v_array_length > 10000 THEN
    RETURN QUERY SELECT FALSE, 0, 'Too many accounts: max 10000 per import'::TEXT;
    RETURN;
  END IF;
  
  -- VALIDARE (v1.1): Array gol
  IF v_array_length = 0 THEN
    RETURN QUERY SELECT FALSE, 0, 'No accounts provided'::TEXT;
    RETURN;
  END IF;

  -- v1.6 + v1.7: Advisory lock pentru REFUZ (nu așteptare) + SELECT FOR UPDATE pentru consistență
  -- v1.7: pg_try_advisory_xact_lock refuză IMEDIAT dacă altcineva procesează
  -- Dacă nu obții lock-ul → return instant "already processing"
  IF NOT pg_try_advisory_xact_lock(hashtext(p_import_id::text)) THEN
    RETURN QUERY SELECT FALSE, 0, 'Import already processing by another request. Please wait.'::TEXT;
    RETURN;
  END IF;
  
  -- v1.6: SELECT ... FOR UPDATE pentru consistență citire (lock și FK)
  SELECT status, processing_started_at INTO v_current_status, v_processing_started
  FROM public.trial_balance_imports 
  WHERE id = p_import_id
  FOR UPDATE;  -- v1.6: Lock rândul (complementar cu advisory lock)
  
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'Import not found'::TEXT;
    RETURN;
  END IF;

  -- v1.7: Advisory lock a refuzat INSTANT dacă altcineva procesează
  -- Ajungi aici doar dacă ai obținut lock-ul → logica stale devine mai simplă
  
  -- GUARD CONCURENȚĂ (v1.2 + v1.3 + v1.6 + v1.7): Verifică status pentru stale/rerun
  IF v_current_status = 'processing' THEN
    -- v1.7: Dacă status=processing DAR ai obținut advisory lock, înseamnă stale
    -- (procesul anterior a terminat fără să actualizeze status, sau crash)
    
    IF v_processing_started IS NOT NULL AND (v_now - v_processing_started) > INTERVAL '10 minutes' THEN
      -- Stale lock detectat - permite retry cu warning
      -- Log: 'Import was stuck in processing; retrying'
      -- v1.7: Advisory lock garantează că doar UNA dintre tranzacții ajunge aici
      -- Continuă procesarea (nu RETURN)
    ELSE
      -- v1.7: Nu ar trebui să ajungem aici (advisory lock ar fi blocat mai sus)
      -- Dar pentru siguranță, refuză
      RETURN QUERY SELECT FALSE, 0, 'Import already processing. Please wait or retry later.'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- v1.7: NOTĂ diferență mecanisme:
  -- - pg_try_advisory_xact_lock: refuză INSTANT (non-blocking), previne dublări
  -- - SELECT FOR UPDATE: AȘTEAPTĂ (blocking), consistență citire FK
  -- Combinația oferă: refuz rapid + consistență date
  
  -- GUARD CONCURENȚĂ (v1.2 + v1.3): Setează status 'processing' ATOMIC
  -- Doar dacă status-ul nu s-a schimbat între timp (optimistic locking)
  UPDATE public.trial_balance_imports
  SET status = 'processing', 
      error_message = NULL,
      processing_started_at = v_now  -- v1.3 + v1.4: setează timestamp (coloana obligatorie)
  WHERE id = p_import_id AND status = v_current_status;
  
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  IF v_rows_updated = 0 THEN
    -- Alt proces a modificat status-ul între timp
    RETURN QUERY SELECT FALSE, 0, 'Import status changed. Please retry.'::TEXT;
    RETURN;
  END IF;

  -- Șterge conturile existente pentru acest import (idempotență)
  DELETE FROM public.trial_balance_accounts WHERE import_id = p_import_id;
  
  -- Inserează noile conturi (doar cele cu account_code valid)
  INSERT INTO public.trial_balance_accounts (
    import_id, account_code, account_name,
    opening_debit, opening_credit,
    debit_turnover, credit_turnover,
    closing_debit, closing_credit
  )
  SELECT 
    p_import_id,
    (acc->>'account_code')::VARCHAR,
    COALESCE((acc->>'account_name')::VARCHAR, ''),
    COALESCE((acc->>'opening_debit')::NUMERIC, 0),
    COALESCE((acc->>'opening_credit')::NUMERIC, 0),
    COALESCE((acc->>'debit_turnover')::NUMERIC, 0),
    COALESCE((acc->>'credit_turnover')::NUMERIC, 0),
    COALESCE((acc->>'closing_debit')::NUMERIC, 0),
    COALESCE((acc->>'closing_credit')::NUMERIC, 0)
  FROM jsonb_array_elements(p_accounts) AS acc
  WHERE (acc->>'account_code') IS NOT NULL 
    AND length(acc->>'account_code') > 0;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- VALIDARE (v1.1): Cel puțin un cont valid trebuie să existe
  IF v_count = 0 THEN
    UPDATE public.trial_balance_imports
    SET status = 'error', error_message = 'No valid accounts found in file'
    WHERE id = p_import_id;
    RETURN QUERY SELECT FALSE, 0, 'No valid accounts found (all had empty account_code)'::TEXT;
    RETURN;
  END IF;
  
  -- Update status la completed
  UPDATE public.trial_balance_imports
  SET 
    status = 'completed',
    processed_at = NOW(),
    error_message = NULL
  WHERE id = p_import_id;
  
  RETURN QUERY SELECT TRUE, v_count, NULL::TEXT;
  
EXCEPTION WHEN OTHERS THEN
  -- Rollback implicit, setează status error
  
  -- v1.5 + v1.6: NU propaga SQLERRM către user (risc scurgere detalii interne)
  -- Salvează safe message + sqlstate pentru debugging intern
  UPDATE public.trial_balance_imports
  SET status = 'error', 
      error_message = 'Import processing failed. Please contact support.',  -- v1.5: Safe message
      internal_error_code = SQLSTATE,                                        -- v1.5: Pentru debugging
      internal_error_detail = SQLERRM                                        -- v1.5: Detaliu intern (dacă coloana există)
  WHERE id = p_import_id;
  
  -- v1.6 + v1.7: ATENȚIE RLS - RLS controlează rânduri, NU coloane!
  -- Dacă clienții pot SELECT trial_balance_imports, pot vedea și internal_error_detail
  -- v1.7: Protecție ROBUSTĂ: view-only strategy (vezi migrare 3b)
  -- Frontend consumă trial_balance_imports_public (fără coloane interne)
  
  -- Log server-side cu detaliu complet (fără a-l returna clientului)
  RAISE WARNING 'Import % failed: % (SQLSTATE: %)', p_import_id, SQLERRM, SQLSTATE;
  
  -- v1.4: NOTĂ COMPORTAMENT
  -- Dacă exception apare DUPĂ DELETE dar ÎNAINTE de INSERT complet,
  -- importul rămâne cu status='error' și FĂRĂ conturi (șterse prin DELETE).
  -- Acest comportament e ACCEPTAT: rerun va reprocesa complet.
  -- Alternativa (staging table + swap) e prea complexă pentru MVP.
  
  -- v1.5: Returnează safe message (NU SQLERRM)
  RETURN QUERY SELECT FALSE, 0, 'Import processing failed. Please contact support.'::TEXT;
END;
$$;

-- PERMISIUNI (v1.1): Doar service_role
REVOKE ALL ON FUNCTION public.process_import_accounts(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_import_accounts(UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_import_accounts(UUID, JSONB) TO service_role;
```

**Edge Function Update**:
```typescript
// Înlocuiește INSERT individual + UPDATE cu RPC atomic
const { data: result, error: rpcError } = await supabase.rpc('process_import_accounts', {
  p_import_id: import_id,
  p_accounts: parseResult.accounts  // trimite ca JSONB
});

if (rpcError || !result?.[0]?.success) {
  const errorMsg = rpcError?.message || result?.[0]?.error_message || 'Unknown error';
  console.error('Process accounts error:', errorMsg);
  
  await supabase
    .from('trial_balance_imports')
    .update({ status: 'error', error_message: errorMsg })
    .eq('id', import_id);
    
  return new Response(
    JSON.stringify({ error: errorMsg }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

#### Fișiere Afectate
| Fișier | Acțiune |
|--------|---------|
| `supabase/migrations/YYYYMMDDHHMMSS_process_import_accounts_function.sql` | **CREARE** |
| `supabase/functions/parse-balanta/index.ts` | **MODIFICARE** - folosește RPC |

---

## PUNCTUL 3 — SECURITY DEFINER Hardening

#### Stare Curentă
Funcțiile cu `SECURITY DEFINER` au deja `SET search_path = public`, ceea ce e corect.

#### Verificări Efectuate
1. ✅ `create_company_with_member` - are `SET search_path = public`
2. ✅ `can_access_import` - are `SET search_path = public`
3. ✅ `is_company_member` - are `SET search_path = public`
4. ✅ `has_role` - are `SET search_path = public`

#### Acțiuni Suplimentare (în cadrul fix-ului 1B)
1. Elimină `p_user_id` din parametri → previne impersonare
2. Validează identitatea din JWT direct în funcție
3. Mesajele de eroare NU expun detalii interne:
   - "Company with this CUI already exists. Request an invite." (nu spune ID-ul companiei)
   - "Not authenticated" (nu dă detalii despre JWT)

#### Fișiere Afectate
| Fișier | Acțiune |
|--------|---------|
| — | Acoperit de patch-ul 1B |

---

## PUNCTUL 4 — Storage Policies: Path + Validări

### Stare Curentă

**Storage policies** (din migrare `20260118224720`):
```sql
CREATE POLICY "Company members can upload balance files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'balante'
  AND public.is_company_member(
    public.get_user_id_from_auth(),
    (storage.foldername(name))[1]::UUID  -- companyId din path
  )
);
```

**Frontend upload** (din `useTrialBalances.tsx`):
```typescript
const filePath = `${companyId}/${timestamp}_${file.name}`;
```

### Verificare
✅ Path-ul folosit în frontend este `companyId/...`
✅ Policy-ul extrage `companyId` din primul folder și verifică membership

### Validare Storage: Frontend + Policy (v1.5 - ACTUALIZAT)

**⚠️ IMPORTANT (v1.5)**: Validare doar în frontend NU protejează împotriva apelurilor directe API.

**Strategie Defense-in-Depth**:
1. **Frontend**: Validare UX (feedback rapid utilizator)
2. **Storage Policy**: Validare server-side (protecție reală)

#### Validare în Storage Policy (v1.5 - NOU, OBLIGATORIU)

```sql
-- Actualizare policy INSERT pentru balante
-- v1.8: Helper try_uuid() pentru cast safe în policies (NU aruncă excepție)
-- Postgres planner poate reordona expresii în policy → ::uuid evaluat înaintea guard-urilor
-- Rezultat: eroare internă în loc de policy violation
CREATE OR REPLACE FUNCTION public.try_uuid(p_text text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN p_text::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS "Company members can upload balance files" ON storage.objects;

CREATE POLICY "Company members can upload balance files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'balante'

  -- v1.5 + v1.6 + v1.8: Validări server-side (robustețe completă)
  AND storage.foldername(name) IS NOT NULL                      -- v1.6: Guard NULL
  AND array_length(storage.foldername(name), 1) = 1             -- Interzice nesting: doar companyId/file
  AND public.try_uuid((storage.foldername(name))[1]) IS NOT NULL -- v1.8: Cast safe (nu aruncă excepție)

  -- v1.8: is_company_member cu try_uuid() (previne eroare internă)
  AND public.is_company_member(
    public.get_user_id_from_auth(),
    public.try_uuid((storage.foldername(name))[1])
  )

  AND storage.filename(name) IS NOT NULL                         -- v1.6: Guard NULL
  AND (storage.filename(name))[1] IS NOT NULL                    -- v1.6: Guard NULL filename
  AND length((storage.filename(name))[1]) BETWEEN 1 AND 200     -- v1.8: BETWEEN (mai clar)
  AND (storage.filename(name))[1] ~ '^[a-zA-Z0-9._\- ]+$'       -- Doar caractere safe
  AND (storage.filename(name))[1] ~* '\.(xlsx|xls)$'            -- v1.6: Case-insensitive pentru .XLSX/.xlsx
);

-- v1.8: NOTĂ CRITICĂ - Ordinea expresiilor în policy NU e garantată!
-- Planner-ul Postgres poate reordona pentru optimizare.
-- NU te baza pe "verifică IS NOT NULL înainte de cast" - folosește try_uuid()!

-- v1.7: ATENȚIE NEALINIERE cu frontend!
-- Policy acceptă DOAR [a-zA-Z0-9._\- ] (fără diacritice)
-- Frontend poate permite diacritice → erori "misterioase" la upload
-- Soluție obligatorie (alege UNA):
-- A) Extinde regex pentru Unicode (complex, vezi mai jos)
-- B) Normalizare ASCII în frontend (simplu, recomandat)

-- Varianta A (v1.7): Regex Unicode pentru diacritice românești
-- AND (storage.filename(name))[1] ~ '^[a-zA-Z0-9._\- ăâîșțĂÂÎȘȚ]+$'

-- Varianta B (v1.7 - RECOMANDATĂ): Frontend normalizează înainte de upload
-- în useTrialBalances.tsx: fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
-- Rezultat: "balanță.xlsx" → "balanta.xlsx"
```

**Notă (v1.5)**: 
- `storage.foldername(name)` returnează array de folder-uri
- `storage.filename(name)` returnează array cu filename-ul
- Regex `~` e case-sensitive în Postgres; folosiți `~*` pentru case-insensitive

#### Validare file.name în Frontend (`useTrialBalances.tsx`)

```typescript
const uploadBalance = async (
  file: File,
  periodStart: Date,
  periodEnd: Date,
  userId: string
): Promise<TrialBalanceImport> => {
  if (!companyId) throw new Error('No company selected');

  // VALIDARE NOUĂ: Verifică file.name
  const fileName = file.name;
  
  // Lungime maximă
  if (fileName.length > 200) {
    throw new Error('Numele fișierului este prea lung (max 200 caractere)');
  }
  
  // v1.7: Normalizare ASCII înainte de alte validări (aliniament cu storage policy)
  // Convertește diacritice în echivalente ASCII: ă→a, â→a, î→i, ș→s, ț→t
  const normalizedFileName = fileName
    .normalize('NFD')                          // Descompune diacritice în bază + accent
    .replace(/[\u0300-\u036f]/g, '')          // Elimină accentele
    .replace(/\s+/g, ' ')                      // Spații multiple → unul singur
    .trim();
  
  // Caractere permise: litere, cifre, spații, puncte, cratime, underscore
  // v1.7: ALINIAT cu storage policy [a-zA-Z0-9._\- ]
  // Exclude caractere problematice pentru storage: /, \, :, *, ?, ", <, >, |
  const invalidCharsRegex = /[^a-zA-Z0-9._\- ]/;  // v1.7: Acceptă DOAR safe chars
  if (invalidCharsRegex.test(normalizedFileName)) {
    throw new Error('Numele fișierului conține caractere invalide (folosește doar litere, cifre, spații, puncte, cratime)');
  }

  // Generate unique file path cu nume normalizat (v1.7: ASCII-safe)
  const timestamp = Date.now();
  const filePath = `${companyId}/${timestamp}_${normalizedFileName}`;  // v1.7: folosește normalizedFileName

  // ... rest of upload logic
};
```

### Despre UPDATE Policy
- Nu există feature de rename/move în aplicație
- Nu e necesară o policy de UPDATE pentru storage în acest moment
- **Notă în plan**: Dacă se adaugă feature de rename, va fi nevoie de UPDATE policy

#### Fișiere Afectate
| Fișier | Acțiune |
|--------|---------|
| `src/hooks/useTrialBalances.tsx` | **MODIFICARE** - adaugă validare file.name |

---

## PUNCTUL 5 — Tipuri Generate: Inconsistențe Args

### Stare Curentă

**types.ts** (liniile 365-367):
```typescript
can_access_import: {
  Args: { _import_id: string; _user_id: string }
  Returns: boolean
}
```

**SQL** (din migrare `20260118224720`, linia 191):
```sql
CREATE OR REPLACE FUNCTION public.can_access_import(_user_id UUID, _import_id UUID)
```

### Problemă Identificată
- În SQL: `can_access_import(_user_id, _import_id)` - user_id PRIMUL
- În types.ts: `{ _import_id, _user_id }` - import_id PRIMUL
- Tipurile sunt generate automat, deci **ordinea în obiect nu contează** pentru apeluri RPC
- Dar e confuz pentru dezvoltatori și ar trebui să fie consistent

### Soluție Propusă
După aplicarea tuturor migrărilor, regenerează tipurile:

```bash
# Din directorul proiectului
npx supabase gen types typescript --project-id gqxopxbzslwrjgukqbha > src/integrations/supabase/types.ts
```

**NOTĂ**: Ordinea în TypeScript Args object nu afectează funcționalitatea (sunt named parameters). Dar regenerarea va sincroniza cu schema actuală.

#### Fișiere Afectate
| Fișier | Acțiune |
|--------|---------|
| `src/integrations/supabase/types.ts` | **REGENERARE** - după toate migrările |

---

## Sumar Migrări SQL Necesare

Toate migrările vor fi create ca fișiere noi, fără modificarea migrărilor existente.

| # | Nume Fișier (propus) | Conținut |
|---|---------------------|----------|
| 1 | `20260128100000_security_patch_company_users_rls.sql` | DROP + CREATE policy company_users |
| 2 | `20260128100001_security_patch_create_company_function.sql` | CREATE OR REPLACE create_company_with_member |
| 3 | `20260128100002_rate_limits_table.sql` | Tabel + funcție rate limiting (cu GRANT service_role; v1.3: rate_limits_meta cu ON CONFLICT) |
| 3a | **(v1.4 - OBLIGATORIE)** `20260128100002a_add_processing_started_at.sql` | Adaugă `processing_started_at TIMESTAMPTZ` la `trial_balance_imports`<br>**SQL**: `ALTER TABLE public.trial_balance_imports ADD COLUMN processing_started_at TIMESTAMPTZ NULL;`<br>**Index**: `CREATE INDEX idx_trial_balance_imports_processing ON public.trial_balance_imports(processing_started_at) WHERE status = 'processing';` |
| 3b | **(v1.5 + v1.6 + v1.7 - OBLIGATORIE)** `20260128100002b_add_internal_error_tracking.sql` | Adaugă coloane + **VIEW-ONLY strategy** (v1.7 preferabilă)<br>**SQL**: `ALTER TABLE ... ADD COLUMN internal_error_code/detail;`<br>**v1.7**: `REVOKE SELECT ON trial_balance_imports FROM authenticated;`<br>**v1.7**: `CREATE VIEW trial_balance_imports_public AS SELECT [coloane safe] ... WHERE [RLS];`<br>**v1.7**: `GRANT SELECT ON trial_balance_imports_public TO authenticated;` |
| 4 | `20260128100003_process_import_accounts_function.sql` | Funcție atomică pentru idempotență (cu validări JSON; v1.3: timeout stale; v1.5: safe messages; **depinde de 3a+3b**) |
| 5 | **(v1.5 + v1.6 - OBLIGATORIE)** `20260128100004_company_member_constraint.sql` | Constraint triggers: (1) INSERT companie cu membru; **(2) v1.6: DELETE ultimul membru blocat** |
| 6 | **(v1.5 + v1.6 - OBLIGATORIE)** `20260128100005_storage_policy_hardening.sql` | Policy storage: validări server-side; **v1.6: NULL guards + ~\* case-insensitive** |
| 6a | **(v1.7 - OPȚIONAL RECOMANDATĂ)** `20260128100000a_add_companies_status.sql` | ADD COLUMN status VARCHAR(20) pentru archived/deleting; CHECK constraint |
| 6b | **(v1.8 - OBLIGATORIE)** `20260128100000b_try_uuid_helper.sql` | CREATE FUNCTION try_uuid() IMMUTABLE pentru cast safe în policies |
| 7 | **(v1.6 + v1.7 + v1.8 - OBLIGATORIE)** `20260128100006_cui_unique_constraint.sql` | **v1.7: PREFLIGHT + remediere**; **v1.8: PAS MANUAL producție** (CONCURRENTLY nu poate în tranzacție) |
| 5 | **(v1.1)** `rollback_snippets.sql` | Fișier referință (NU se execută) cu definiții vechi pentru rollback |
| 6 | **(v1.3)** `safe_rollback_*.sql` | Șablon rollback SIGUR (NU reintroduce breșe RLS) |
| 7 | **(v1.3)** `full_rollback_*.sql` | Șablon rollback COMPLET (urgență; reintroduce riscuri) |

---

## Riscuri și Mitigări

| Risc | Probabilitate | Impact | Mitigare |
|------|---------------|--------|----------|
| Breaking change în frontend (create_company) | Medie | Mediu | Deploy frontend + backend împreună |
| Rate limiting DB adaugă latență | Scăzută | Scăzut | Index pe `identifier`; cleanup bounded (v1.2); funcție simplă |
| xlsx upgrade cauzează incompatibilități | Scăzută | Mediu | Set de 7 fișiere test pentru regresie înainte de deploy; pin versiune |
| Rerun import șterge date bune | Scăzută | Înalt | Guard status "processing" (v1.2); DELETE doar pentru import_id specific |
| **(v1.1)** Race condition bootstrap "first member wins" | Foarte scăzută | Scăzut | Tranzacție atomică în RPC; verificare Gate 0 |
| **(v1.1)** Orice membru poate adăuga membri (prea permisiv) | Medie | Mediu | Mitigări MVP: confirmare UI + audit log (v1.2) |
| **(v1.1)** Interpretare ambiguă "1,234" vs "1.234" | Scăzută | Scăzut | Documentat în plan; valorile Excel native sunt numerice, nu string |
| **(v1.1)** process_import_accounts expus la authenticated | N/A (nu în plan) | Înalt | Restricționat la service_role; notă în cod pentru viitor |
| **(v1.2)** Cleanup rate_limits bounded poate rata | Scăzută | Scăzut | Cleanup la 5 min interval; worst case 2 cleanup-uri simultan |
| **(v1.1)** verify_jwt blochează preflight OPTIONS | Foarte scăzută | Înalt | Test browser obligatoriu (v1.2); Supabase gestionează OPTIONS |
| **(v1.2)** Edge function cu ANON_KEY în loc de SERVICE_ROLE | Medie (greșeală dev) | Înalt | Verificare Gate 0 (C); test fail detectabil înainte de deploy |
| **(v1.2)** Companie goală poate exista (alt INSERT path) | Scăzută | Critic | Gate 0 (A+B): căutare exhaustivă repo; RLS pe companies |
| **(v1.2)** Concurență pe process_import_accounts | Scăzută | Mediu | Guard status "processing" cu optimistic locking + timeout stale (v1.3) |
| **(v1.2)** Rollback DB necesită intervenție manuală | N/A | Mediu | Migrare forward-only pregătită; pași clari documentați |
| **(v1.3)** Expunere company_id înainte de commit | Scăzută | Critic | Verificare Gate 0(E); blocare deploy dacă există; test comportamental recomandat (v1.4) |
| **(v1.3)** Processing stuck infinit (fără timeout) | Medie | Mediu | Timeout 10 min; permite retry pe stale lock; migrare 3a obligatorie (v1.4) |
| **(v1.3)** Rollback complet reintroduce breșe critice | N/A | Critic | Două șabloane: safe_rollback (preferată) vs full_rollback (urgență); playbook ordine (v1.4) |
| **(v1.3)** Cazuri ambigue parseNumber nedetectate | Scăzută | Scăzut | Observabilitate: log metric la nivel rând (v1.4: corectare context) |
| **(v1.3)** 429 fără Retry-After confundă clienți | Scăzută | Scăzut | Contract explicit: header + body JSON standardizat; unitățile clarificate (v1.4) |
| **(v1.4)** Policy bootstrap vulnerabil la seed/admin paths | Scăzută | Înalt | Gate 0 reduce risc; **v1.5: constraint trigger deferrable** implementat |
| **(v1.4)** Rate limit fail-open lasă endpoint fără protecție | Medie | Înalt | Fail-closed pentru import; log metric unavailable + alert |
| **(v1.4)** Rollback DB înainte de code → crash runtime | Scăzută | Critic | Playbook: code-first rollback; **v1.5: wrapper fallback** pentru reziliență |
| **(v1.4)** Eșec import după DELETE lasă fără conturi | Scăzută | Mediu | Documentat explicit; acceptat; rerun reprocesează |
| **(v1.4)** CORS OPTIONS depinde de platformă | Foarte scăzută | Mediu | Handler explicit OPTIONS în edge function |
| **(v1.5)** Storage: apeluri directe bypass validare frontend | Medie | Mediu | Validare în storage policy: nesting, lungime, regex obligatorii |
| **(v1.5)** Service role: bug autorizare → cross-tenant write | Medie | Critic | Defense-in-depth: validare ownership în DB (process_import_accounts) |
| **(v1.5)** SQLERRM expune detalii interne schema/constraints | Scăzută | Scăzut | Safe messages către user; internal_error_code pentru debugging |
| **(v1.5)** XLSX resource exhaustion (memory, CPU, zip-bomb) | Medie | Înalt | Limite obligatorii: max foi, rânduri, coloane, timeout parsare |
| **(v1.5)** Lipsă monitoring → incident detection tardiv | Înaltă | Înalt | Dashboard obligatoriu + alerte; go/no-go criterii staging |
| **(v1.5)** Deploy fără validare → regresii în producție | Medie | Critic | Go/no-go checklist obligatoriu: 6 criterii verificate pe staging |
| **(v1.6)** DELETE ultimul membru → orphan company | Medie | Critic | Constraint trigger pe company_users DELETE (blochează ultimul membru) |
| **(v1.6)** internal_error_detail expus prin RLS | Scăzută | Mediu | REVOKE SELECT pe coloane sau view fără coloane interne |
| **(v1.6)** Concurență stale processing → execuții duble | Scăzută | Mediu | SELECT ... FOR UPDATE serializează complet accesul |
| **(v1.6)** XLSX.read() lent nu e întreruptibil | Medie | Înalt | Limită pre-read (10MB); post-parse guards; Worker timeout (v2.0) |
| **(v1.6)** CUI duplicate prin race condition | Scăzută | Mediu | UNIQUE index pe CUI normalizat (case-insensitive) |
| **(v1.6)** Storage policy: NULL-uri neașteptate | Scăzută | Scăzut | NULL guards explicite în policy |
| **(v1.6)** atob() base64 clasic pentru JWT base64url | Foarte scăzută | Scăzut | Decode base64url corect sau rămâi cu getUser() |
| **(v1.6)** Fallback wrapper activ accidental în producție | Medie | Critic | Flag ALLOW_DB_FALLBACK + metric + alertă obligatorii |
| **(v1.7)** Trigger DELETE ultimul membru blochează CASCADE/GDPR | Medie | Mediu | Excepție status archived/deleting; COUNT simplu fără excluderi |
| **(v1.7)** Constraint trigger INSERT: colțuri seed/bulk | Scăzută | Mediu | Test explicit seed-uri; documentare limitări; DISABLE trigger pentru restore |
| **(v1.7)** FOR UPDATE așteaptă, nu refuză dublări | Scăzută | Scăzut | pg_try_advisory_xact_lock pentru refuz instant |
| **(v1.7)** internal_error_detail: column REVOKE incomplet | Scăzută | Mediu | Strategie view-only preferabilă; test endpoint-uri select=* |
| **(v1.7)** CUI UNIQUE eșuează pe date murdare existente | Medie | Înalt | Query preflight + plan remediere + CREATE INDEX CONCURRENTLY |
| **(v1.7)** Storage filename: diacritice reject misterios | Medie | Scăzut | Normalizare ASCII frontend (aliniament cu policy) |
| **(v1.7)** 10MB check după download (bandwidth plătit) | Scăzută | Scăzut | Verifică file_size_bytes ÎNAINTE de download din storage |
| **(v1.7)** CORS "*" permite orice origin | Scăzută | Mediu | Whitelist origin-uri aplicație (defense-in-depth) |
| **(v1.8)** Storage policy: ::uuid cast reordonat de planner | Medie | Înalt | Helper try_uuid() IMMUTABLE (nu aruncă excepție) |
| **(v1.8)** Trigger INSERT companie: INSERT+DELETE seed blochează | Scăzută | Mediu | Skip verificare dacă compania ștearsă în tranzacție |
| **(v1.8)** Trigger DELETE membru: CASCADE blochează | Medie | Înalt | Allow DELETE dacă companies.id nu mai există |
| **(v1.8)** create_company: data:null pe unique_violation = success? | Scăzută | Mediu | RAISE EXCEPTION explicit (nu RETURN NULL) |
| **(v1.8)** CREATE INDEX CONCURRENTLY: eroare în pipeline tranzacție | Medie | Înalt | Pas manual producție (nu în migrare atomică) |

---

## Plan de Rollback

### Procedură Generală (v1.1 + v1.2)

**⚠️ IMPORTANT (v1.2)**: `git revert` NU revine schema DB. Migrările Supabase sunt **forward-only**.

#### Rollback DB: Migrare Forward-Only (v1.2 + v1.3)

**⚠️ DECIZIE CRITICĂ (v1.3)**: Alege tip de rollback în funcție de urgență și risc.

##### Opțiunea A: Rollback SIGUR (Recomandat) - Păstrează Restricții Multi-Tenant

**Ce face**:
- **PĂSTREAZĂ** policy-ul nou company_users (NU reintroduce auto-join la orice companie)
- **PĂSTREAZĂ** funcția nouă create_company_with_member (NU reintroduce join-by-CUI)
- Poate dezactiva: rate_limits, process_import_accounts, verify_jwt (dacă cauzează probleme)

**Când se folosește**: Problemă cu rate limiting DB, edge function, dar RLS/multi-tenant funcționează corect.

```bash
# 1. Creează migrare de rollback SIGUR
supabase migration new safe_rollback_non_critical_features

# 2. Adaugă conținut selectiv (vezi șablon mai jos)
# 3. Aplică migrarea
supabase db push
```

**Șablon safe_rollback_***:
```sql
-- ROLLBACK SIGUR - PĂSTREAZĂ RESTRICȚII MULTI-TENANT
-- NU reintroduce auto-join și NU reintroduce join-by-CUI

-- Dezactivează rate_limits (dacă e problematic)
DROP FUNCTION IF EXISTS public.check_rate_limit(VARCHAR, INT, INT);
DROP TABLE IF EXISTS public.rate_limits_meta;
DROP TABLE IF EXISTS public.rate_limits;

-- Dezactivează process_import_accounts (dacă e problematic)
DROP FUNCTION IF EXISTS public.process_import_accounts(UUID, JSONB);

-- Policy-uri și create_company_with_member RĂMÂN CU RESTRICȚII NOI (securizate)
```

##### Opțiunea B: Rollback FUNCȚIONAL (Urgență) - Restaurare Completă cu Riscuri

**⚠️ RISCURI EXPLICITE**:
- Reintroduce auto-join la orice companie (breșă critică 1A)
- Reintroduce join-by-CUI (breșă critică 1B)
- **Folosește DOAR în caz de urgență absolută** (aplicația nu funcționează deloc)

**Când se folosește**: Eroare gravă care blochează aplicația complet și nu există fix rapid.

```bash
# 1. Creează migrare de rollback COMPLET
supabase migration new full_rollback_emergency_only

# 2. Adaugă conținutul COMPLET din rollback_snippets.sql
# 3. Aplică migrarea
supabase db push
```

**Șablon full_rollback_*** (conținut complet):
```sql
-- 20260128XXXXXX_rollback_security_patches_v1.sql
-- ACEASTĂ MIGRARE RESTAUREAZĂ STAREA ANTERIOARĂ PATCH-URILOR DE SECURITATE

-- PASUL 1: Rollback policy company_users
DROP POLICY IF EXISTS "Company members can add members (bootstrap allowed)" ON public.company_users;

CREATE POLICY "Users can add themselves to new companies or existing members can add" 
ON public.company_users 
FOR INSERT 
WITH CHECK (
  (user_id = get_user_id_from_auth())
  OR is_company_member(get_user_id_from_auth(), company_id) 
  OR has_role(get_user_id_from_auth(), 'admin'::app_role)
);

-- PASUL 2: Rollback funcție create_company_with_member (restaurează cu 3 parametri)
DROP FUNCTION IF EXISTS public.create_company_with_member(VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION public.create_company_with_member(
  p_name VARCHAR,
  p_cui VARCHAR,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_existing_company_id UUID;
BEGIN
  SELECT id INTO v_existing_company_id FROM public.companies WHERE cui = p_cui;
  
  IF v_existing_company_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.company_users WHERE company_id = v_existing_company_id AND user_id = p_user_id) THEN
      RETURN v_existing_company_id;
    END IF;
    INSERT INTO public.company_users (company_id, user_id) VALUES (v_existing_company_id, p_user_id);
    RETURN v_existing_company_id;
  END IF;
  
  INSERT INTO public.companies (name, cui) VALUES (p_name, p_cui) RETURNING id INTO v_company_id;
  INSERT INTO public.company_users (company_id, user_id) VALUES (v_company_id, p_user_id);
  RETURN v_company_id;
END;
$$;

-- PASUL 3: Șterge rate_limits (dacă există)
DROP FUNCTION IF EXISTS public.check_rate_limit(VARCHAR, INT, INT);
DROP TABLE IF EXISTS public.rate_limits_meta;
DROP TABLE IF EXISTS public.rate_limits;

-- PASUL 4: Șterge process_import_accounts (dacă există)
DROP FUNCTION IF EXISTS public.process_import_accounts(UUID, JSONB);
```

#### Rollback Frontend și Edge (git)

```bash
# 1. Identifică commit-ul anterior stabil
git log --oneline -10

# 2. Revert frontend
git checkout <commit-anterior> -- src/hooks/useCompany.tsx
git checkout <commit-anterior> -- src/contexts/CompanyContext.tsx
git checkout <commit-anterior> -- src/hooks/useTrialBalances.tsx

# 3. Revert edge function
git checkout <commit-anterior> -- supabase/functions/parse-balanta/
git checkout <commit-anterior> -- supabase/config.toml

# 4. Commit și deploy
git add .
git commit -m "Rollback: frontend + edge to pre-patch state"
supabase functions deploy parse-balanta
npm run build && <deploy-command>
```

### Rollback Edge Function (v1.1)

```bash
# Identifică commit anterior pentru edge function
git log --oneline -- supabase/functions/parse-balanta/

# Checkout versiunea veche
git checkout <commit-hash-anterior> -- supabase/functions/parse-balanta/

# Restaurează config.toml
git checkout <commit-hash-anterior> -- supabase/config.toml

# Re-deploy
supabase functions deploy parse-balanta
```

### Rollback Frontend (v1.1)

```bash
# Identifică commit anterior
git log --oneline -- src/hooks/useCompany.tsx src/contexts/CompanyContext.tsx

# Revert fișierele specifice
git checkout <commit-hash-anterior> -- src/hooks/useCompany.tsx
git checkout <commit-hash-anterior> -- src/contexts/CompanyContext.tsx
git checkout <commit-hash-anterior> -- src/hooks/useTrialBalances.tsx

# Commit și deploy
git add .
git commit -m "Rollback: frontend to pre-patch state"
npm run build && <deploy-command>
```

#### Ordine Rollback și Matrice Compatibilitate (v1.4 - PLAYBOOK)

**⚠️ IMPORTANT (v1.4)**: Ordinea rollback-ului este critică pentru a evita runtime errors.

##### Regula Generală: CODE-FIRST Rollback

**Ordinea recomandată**:
1. **Code revert PRIMUL** (frontend + edge functions)
2. **Apoi** DB rollback (safe sau full)

**Motivație**: Dacă faci DB rollback primul (ștergi funcții), codul existent va apela funcții inexistente → crash.

##### Matrice Compatibilitate Versiuni

| Versiune Code (Frontend + Edge) | DB cu Patch | DB după Safe Rollback | DB după Full Rollback |
|----------------------------------|-------------|----------------------|----------------------|
| **Pre-patch** (original) | ❌ Incompatibil (RPC fără p_user_id) | ❌ Incompatibil | ✅ Compatibil |
| **Post-patch** (v1.4) | ✅ Compatibil | ⚠️ Parțial (rate limit/import absent) | ❌ Incompatibil (policy diferit) |

##### Procedură Rollback SAFE (Recomandată)

**Scenariu**: Probleme cu rate_limits sau process_import_accounts, dar RLS funcționează.

```bash
# PAS 1: Revert code la versiune care NU folosește check_rate_limit/process_import_accounts
git revert <commit-hash-edge-function> --no-commit
git revert <commit-hash-frontend-changes> --no-commit  # dacă folosește process_import_accounts
git commit -m "Rollback: code to safe state"
supabase functions deploy parse-balanta
npm run build && <deploy-frontend>

# PAS 2: Aplică safe_rollback DB (după code e deployed)
supabase migration new safe_rollback_non_critical
# ... adaugă SQL din safe_rollback șablon
supabase db push

# PAS 3: Verificare
# Testează că aplicația funcționează fără rate_limits/process_import_accounts
```

**Compatibilitate**: Code pre-patch cu rate limit in-memory + INSERT direct în trial_balance_accounts.

##### Procedură Rollback FULL (Urgență)

**⚠️ Reintroduce breșe RLS critice! Doar pentru urgență absolută.**

```bash
# PAS 1: Revert code COMPLET la pre-patch
git checkout <commit-hash-pre-patch> -- supabase/functions/parse-balanta/
git checkout <commit-hash-pre-patch> -- supabase/config.toml
git checkout <commit-hash-pre-patch> -- src/hooks/useCompany.tsx
git checkout <commit-hash-pre-patch> -- src/contexts/CompanyContext.tsx
git commit -m "Emergency rollback: code to pre-patch"
supabase functions deploy parse-balanta
npm run build && <deploy-frontend>

# PAS 2: Aplică full_rollback DB
supabase migration new full_rollback_emergency
# ... adaugă SQL din full_rollback șablon
supabase db push

# PAS 3: Incident post-mortem OBLIGATORIU
# Documentează ce a cauzat rollback complet și cum se previne
```

**⚠️ DUPĂ FULL ROLLBACK**: Aplicația are din nou breșele critice 1A + 1B. Plan de re-patch urgent necesar.

#### Wrapper Fallback pentru Reziliență Rollback (v1.5 - NOU)

**Problemă**: Dacă rollback DB șterge funcții (safe_rollback), codul deployed poate apela funcții inexistente → crash runtime.

**Soluție (v1.5)**: Implementează wrapper cu fallback în edge function pentru operațiuni critice.

**Exemplu - process_import_accounts cu fallback**:
```typescript
// v1.5: Wrapper care detectează dacă funcția există
async function processImportAccountsSafe(
  supabase: SupabaseClient,
  importId: string,
  accounts: any[]
): Promise<{ success: boolean; error?: string }> {
  
  // Încearcă RPC nou (post-patch)
  const { data: rpcResult, error: rpcError } = await supabase.rpc('process_import_accounts', {
    p_import_id: importId,
    p_accounts: accounts,
    p_requester_user_id: userId
  });
  
  // v1.5: Dacă funcția nu există (rollback), fallback la metoda veche
  if (rpcError && rpcError.code === 'PGRST202') {  // function not found
    console.warn('process_import_accounts not found, using fallback method');
    
    // Fallback: INSERT direct (metoda pre-patch)
    const { error: insertError } = await supabase
      .from('trial_balance_accounts')
      .insert(accounts.map(acc => ({ ...acc, import_id: importId })));
    
    if (insertError) {
      return { success: false, error: insertError.message };
    }
    
    await supabase
      .from('trial_balance_imports')
      .update({ status: 'completed' })
      .eq('id', importId);
    
    return { success: true };
  }
  
  if (rpcError) {
    return { success: false, error: rpcError.message };
  }
  
  return { success: rpcResult[0]?.success || false, error: rpcResult[0]?.error_message };
}
```

**Când se folosește**: 
- Staging/development pentru testare rollback
- Incident response când rollback DB e necesar rapid
- **NU** pentru producție long-term (crește complexitate)

**Similar pentru check_rate_limit**: Fallback la in-memory dacă RPC nu există.

#### Protecție Împotriva Activării Accidentale în Producție (v1.6 - OBLIGATORIU)

**⚠️ RISC (v1.6)**: Wrapper-ele cu fallback pot reintroduce implicit riscuri (rate limit in-memory, INSERT direct) dacă se activează accidental în producție.

**Soluție (v1.6)**: Flag de mediu + monitoring obligatoriu

```typescript
// v1.6: Verificare explicită flag de mediu
const ALLOW_DB_FALLBACK = Deno.env.get('ALLOW_DB_FALLBACK') === 'true';

async function processImportAccountsSafe(...) {
  const { data, error } = await supabase.rpc('process_import_accounts', ...);
  
  if (error && error.code === 'PGRST202') {  // function not found
    // v1.6: Verifică flag ÎNAINTE de fallback
    if (!ALLOW_DB_FALLBACK) {
      console.error('process_import_accounts not found and fallback disabled');
      throw new Error('Service temporarily unavailable. Please contact support.');
    }
    
    // v1.6: Log metric + alertă când fallback este activ
    console.warn('DB_FALLBACK_ACTIVE', {
      function: 'process_import_accounts',
      environment: Deno.env.get('ENVIRONMENT'),
      metric: 'db_fallback_active'
    });
    
    // Fallback la metoda veche...
  }
}
```

**Configurare environment**:
- **Production**: `ALLOW_DB_FALLBACK=false` (default, NU setați explicit)
- **Staging**: `ALLOW_DB_FALLBACK=true` (pentru teste rollback)
- **Development**: `ALLOW_DB_FALLBACK=true`

**Alertă obligatorie (v1.6)**: Dacă `db_fallback_active` apare în producție → incident major.

### Verificare Post-Rollback

- [ ] Testează crearea companiei cu parametru `p_user_id` (dacă full rollback)
- [ ] Testează că auto-join la companie existentă funcționează (dacă full rollback)
- [ ] Testează că edge function acceptă requesturi fără JWT valid (dacă full rollback)
- [ ] **(v1.4)** Verifică că codul deployed NU apelează funcții DB șterse în rollback

---

## Monitoring și Go/No-Go Operațional (v1.5 - NOU)

### Metrici Obligatorii Production

**⚠️ IMPORTANT (v1.5)**: Planul menționează observabilitate, dar nu definește clar "ce monitorizăm" și pragurile.

| Metrică | Colectare | Prag Alertă | Acțiune |
|---------|-----------|-------------|---------|
| **Edge function crashes** | Log exceptions în edge | > 0 crash-uri / 100 requesturi | Blocare deploy producție |
| **Rate limit unavailable** | `rate_limit_unavailable` metric | > 0.5% requesturi în 5 min | Alert + investigate DB |
| **Importuri stuck în processing** | Query DB: `status='processing' AND processing_started_at < NOW() - 15 min` | > 0 după 15 min | Alert + manual cleanup |
| **Latență parsare fișiere** | Timer în edge: `parse_duration_ms` | P95 > 10 sec pentru <5MB | Investigate + optimize |
| **429 rate limit rate** | Count 429 responses | > 5% requesturi legitime | Ajustare limite sau scale |
| **401 unauthorized spike** | Count 401 responses | Creștere bruscă >10x baseline | CORS/verify_jwt issue |
| **XLSX parse errors** | Exceptions în parseExcelFile | > 2% fișiere valid | Regresie la parsare |
| **Storage policy violations** | Rejected uploads | Track + review patterns | Atacatori sau UX issue |

### Dashboard Minimal Production

**Componente obligatorii** (v1.5):
1. **Edge function health**: Success rate, latență P50/P95/P99, error rate
2. **Import pipeline**: Pending, processing, completed, error (breakdown status)
3. **Rate limiting**: Check success rate, 429 rate, unavailable rate
4. **Parse performance**: Duration distribution, error types, file size correlation
5. **DB queries**: Slow queries (>1sec), lock waits, connection pool usage

### Go/No-Go Criterii Staging

**ÎNAINTE de deploy producție** (v1.5 - OBLIGATORIU):

| # | Criteriu | Cum se verifică | Prag Accept |
|---|----------|-----------------|-------------|
| 1 | **0 crash-uri edge** | Upload N=50 fișiere diverse pe staging | 100% success sau erori așteptate (validare) |
| 2 | **Rate limit operational** | Verifică `rate_limit_unavailable` < 0.5% | <0.5% în 30 min observare |
| 3 | **Parsare performantă** | Upload fișier "large" (5MB, 5000 rânduri) | <8 sec timp parsare |
| 4 | **0 stuck imports** | Așteaptă 15 min după test | 0 importuri în `processing` >10 min |
| 5 | **CORS funcțional** | Test OPTIONS + POST din browser | 100% success preflight |
| 6 | **Rollback testat** | Deploy → rollback safe → verificare funcționalitate | Aplicația funcționează post-rollback |

**Decizie**: Dacă oricare criteriu eșuează → BLOCARE deploy + root cause analysis.

---

## Checklist de Testare

### Teste RLS / Multi-tenant (Punctul 1)

- [ ] **Test 1.1**: Nu pot auto-join la companie existentă
  ```sql
  -- User A creează companie
  SELECT create_company_with_member('Test Corp', 'RO12345678');
  
  -- User B (autentificat diferit) încearcă join direct
  INSERT INTO company_users (company_id, user_id) 
  VALUES ('company-id-existent', 'user-b-id');
  -- AȘTEPTAT: Policy violation / Error
  ```

- [ ] **Test 1.2**: Bootstrap - primul membru poate intra
  ```sql
  -- User creează companie nouă
  SELECT create_company_with_member('New Corp', 'RO99999999');
  -- AȘTEPTAT: Returnează company_id, user e membru
  
  SELECT * FROM company_users WHERE company_id = 'returned-id';
  -- AȘTEPTAT: Un singur rând cu user-ul curent
  ```

- [ ] **Test 1.3**: create_company_with_member cu CUI existent => error
  ```sql
  -- Creează prima companie
  SELECT create_company_with_member('First Corp', 'RO11111111');
  
  -- Încearcă să creezi alta cu același CUI (alt user sau același)
  SELECT create_company_with_member('Second Corp', 'RO11111111');
  -- AȘTEPTAT: EXCEPTION 'Company with this CUI already exists. Request an invite.'
  ```

- [ ] **Test 1.4**: Membri existenți pot adăuga alți membri
  ```sql
  -- User A e membru în companie
  -- User A adaugă User B
  INSERT INTO company_users (company_id, user_id) VALUES ('company-id', 'user-b-id');
  -- AȘTEPTAT: Succes
  ```

- [ ] **Test 1.5 (v1.1 + v1.2)**: Race condition - "first member wins"
  ```
  Scenariu:
  1. Creează companie "Test Race" prin create_company_with_member (User A)
  2. SIMULTAN: User B încearcă INSERT în company_users pentru aceeași companie
  3. AȘTEPTAT: User B primește policy violation (compania are deja membru)
  
  Notă (v1.2): Mitigare structurală validată în Gate 0 - nu există alt path de creare companie
  ```

- [ ] **Test 1.6 (v1.1)**: User non-membru NU poate adăuga membri
  ```sql
  -- User C NU e membru în compania X
  -- User C încearcă să adauge User D
  INSERT INTO company_users (company_id, user_id) 
  VALUES ('company-x-id', 'user-d-id');
  -- AȘTEPTAT: Policy violation (User C nu e membru și compania are deja membri)
  ```

- [ ] **Test 1.7 (v1.2)**: Gate 0 - verificare căutare INSERT companies
  ```bash
  # Rulează comenzile din Gate 0 secțiunea A
  # AȘTEPTAT: Singurele INSERT-uri sunt în create_company_with_member() și (opțional) seed-uri
  ```

- [ ] **Test 1.8 (v1.2)**: Gate 0 - verificare RLS pe companies
  ```sql
  -- Rulează query-ul din Gate 0 secțiunea B
  -- AȘTEPTAT: Nu există policy INSERT permisivă pentru authenticated
  ```

- [ ] **Test 1.9 (v1.3)**: Gate 0 - verificare expunere company_id necomitat
  ```bash
  # Caută în cod expuneri de company_id înainte de commit
  grep -r "company_id" --include="*.ts" --include="*.tsx" supabase/functions/
  grep -r "console.log.*company" --include="*.ts" src/
  grep -r "logger.*company" --include="*.ts" supabase/
  
  # Verifică manual în create_company_with_member:
  # - NICIO expunere (return, log, telemetrie) înainte de COMMIT final
  # AȘTEPTAT: company_id devine vizibil DOAR după tranzacția completă
  ```

- [ ] **Test 1.10 (v1.4 - RECOMANDAT, OPȚIONAL)**: Test comportamental company_id necomitat
  ```
  Test black-box (manual sau automatizat):
  1. Pornește două sesiuni browser (User A, User B)
  2. User A: apelează create_company_with_member() și interceptează network
  3. User B: simultan, încearcă să vadă companii noi (polling sau WebSocket)
  4. Verifică că User B NU vede company_id până la SUCCESS final User A
  5. Verifică logs/telemetrie că company_id NU apare între START și COMMIT
  
  Status: RECOMANDAT dar COMPLEXITATE MARE → opțional în v1.4
  ```

### Teste Edge Function (Punctul 2)

- [ ] **Test 2.1**: parseNumber cu format US "1,234.56"
  ```typescript
  parseNumber("1,234.56") === 1234.56  // US format
  ```

- [ ] **Test 2.2**: parseNumber cu format EU "1.234,56"
  ```typescript
  parseNumber("1.234,56") === 1234.56  // EU format
  ```

- [ ] **Test 2.3**: parseNumber edge cases
  ```typescript
  parseNumber("1234") === 1234
  parseNumber("1 234,56") === 1234.56  // cu spații
  parseNumber("-1234.56") === -1234.56  // negativ
  parseNumber("abc") === 0  // invalid
  parseNumber("") === 0  // empty
  ```

- [ ] **Test 2.3a (v1.1)**: parseNumber cazuri ambigue
  ```typescript
  // ATENȚIE: Aceste valori sunt ambigue, rezultatul documentat
  parseNumber("1,234") === 1.234  // Interpretat ca EU cu 3 zecimale
  parseNumber("1.234") === 1.234  // Interpretat ca US cu 3 zecimale
  // LIMITARE CUNOSCUTĂ: Dacă intenția era 1234, interpretarea e greșită
  ```

- [ ] **Test 2.3b (v1.3)**: parseNumber observabilitate - cazuri suspecte logate
  ```
  Verificare pe staging:
  1. Upload fișier cu valori "1,234" sau "1.234" (pattern suspect)
  2. Verifică logs edge function pentru warning "Ambiguous number format detected"
  3. Confirmă că log-ul conține: import_id, user_id, pattern (NU valoarea brută)
  4. Confirmă că parsarea continuă normal (nu blochează)
  ```

- [ ] **Test 2.4**: Rerun import - nu rămân date parțiale
  ```
  1. Upload fișier → status completed
  2. Rerun parse pentru același import_id
  3. Verifică: doar conturile din ultimul parse există
  4. Status e 'completed', nu 'error'
  ```

- [ ] **Test 2.4a (v1.1)**: Import cu 0 conturi valide
  ```
  1. Trimite JSON cu array gol sau toate account_code invalide
  2. AȘTEPTAT: success=false, error_message="No valid accounts found"
  3. Status import: 'error'
  ```

- [ ] **Test 2.4b (v1.1)**: Import cu >10000 conturi
  ```
  1. Trimite JSON cu 10001 conturi
  2. AȘTEPTAT: success=false, error_message="Too many accounts: max 10000 per import"
  ```

- [ ] **Test 2.4c (v1.2)**: Import refuzat dacă status = "processing"
  ```sql
  -- Setează manual status processing pe un import
  UPDATE trial_balance_imports SET status = 'processing' WHERE id = 'test-import-id';
  
  -- Încearcă process_import_accounts
  SELECT * FROM process_import_accounts('test-import-id', '[{"account_code":"101"}]'::jsonb);
  -- AȘTEPTAT: success=false, error_message conține "already processing"
  ```

- [ ] **Test 2.4d (v1.2)**: Rerun pe status "completed" este permis
  ```sql
  -- Import cu status completed
  SELECT * FROM process_import_accounts('completed-import-id', '[{"account_code":"102"}]'::jsonb);
  -- AȘTEPTAT: success=true, conturile vechi sunt înlocuite
  ```

- [ ] **Test 2.4e (v1.3)**: Timeout processing stale (>10 min) permite retry
  ```sql
  -- Setează manual status processing + timestamp vechi
  UPDATE trial_balance_imports 
  SET status = 'processing', 
      processing_started_at = NOW() - INTERVAL '15 minutes'
  WHERE id = 'stale-import-id';
  
  -- Încearcă process_import_accounts
  SELECT * FROM process_import_accounts('stale-import-id', '[{"account_code":"103"}]'::jsonb);
  -- AȘTEPTAT: success=true (stale lock tratat ca pierdut; reprocessează)
  ```

- [ ] **Test 2.6a (v1.2)**: Edge function folosește SERVICE_ROLE (nu ANON)
  ```
  Verificare manuală în cod:
  1. Deschide supabase/functions/parse-balanta/index.ts
  2. Confirmă: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  3. NU: Deno.env.get("SUPABASE_ANON_KEY")
  
  Test indirect: dacă RPC check_rate_limit funcționează, service_role e folosit
  ```

- [ ] **Test 2.5**: verify_jwt - endpoint respinge fără token valid
  ```bash
  curl -X POST https://xxx.supabase.co/functions/v1/parse-balanta \
    -H "Content-Type: application/json" \
    -d '{"import_id": "test", "file_path": "test"}'
  # AȘTEPTAT: 401 Unauthorized (nu 200 sau eroare de autorizare tardivă)
  ```

- [ ] **Test 2.5a (v1.1)**: OPTIONS preflight funcționează fără token (curl)
  ```bash
  curl -X OPTIONS https://xxx.supabase.co/functions/v1/parse-balanta \
    -H "Origin: http://localhost:8080" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: authorization,content-type" \
    -v
  # AȘTEPTAT: 200 OK sau 204 No Content
  # AȘTEPTAT: Header-uri CORS prezente:
  #   Access-Control-Allow-Origin: http://localhost:8080 (sau *)
  #   Access-Control-Allow-Methods: POST, OPTIONS
  #   Access-Control-Allow-Headers: authorization, content-type
  ```

- [ ] **Test 2.5b (v1.2)**: OPTIONS preflight funcționează din BROWSER
  ```javascript
  // Rulează în consola browser-ului pe staging
  fetch('https://gqxopxbzslwrjgukqbha.supabase.co/functions/v1/parse-balanta', {
    method: 'OPTIONS',
    headers: { 'Origin': window.location.origin }
  }).then(r => console.log(r.status, r.headers.get('access-control-allow-origin')));
  // AȘTEPTAT: 200 sau 204, header CORS prezent
  ```

- [ ] **Test 2.5c (v1.2)**: POST fără token din browser
  ```javascript
  // Rulează în consola browser-ului
  fetch('https://gqxopxbzslwrjgukqbha.supabase.co/functions/v1/parse-balanta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ import_id: 'test' })
  }).then(r => console.log('Status:', r.status));
  // AȘTEPTAT: 401 Unauthorized
  ```

- [ ] **Test 2.5d (v1.4)**: OPTIONS explicit handler în edge function
  ```bash
  # Test direct OPTIONS
  curl -X OPTIONS https://xxx.supabase.co/functions/v1/parse-balanta \
    -H "Origin: https://app.example.com" \
    -v
  
  # AȘTEPTAT:
  # HTTP/1.1 204 No Content (sau 200)
  # Access-Control-Allow-Origin: * (sau specific origin)
  # Access-Control-Allow-Methods: POST, OPTIONS
  # Access-Control-Allow-Headers: authorization, content-type, x-client-info, apikey
  # Access-Control-Max-Age: 86400
  
  # Verifică că funcționează chiar dacă verify_jwt = true
  ```

- [ ] **Test 2.6 (v1.1)**: Rate limiting funcționează
  ```bash
  # Trimite 11 requesturi rapide cu același user
  for i in {1..11}; do
    curl -X POST ... -H "Authorization: Bearer <valid-token>"
  done
  # AȘTEPTAT: Primele 10 reușesc, al 11-lea primește 429 Too Many Requests
  ```

- [ ] **Test 2.6a (v1.3)**: Contract 429 explicit - Header Retry-After + Body JSON
  ```bash
  # Request care depășește rate limit
  curl -X POST https://xxx.supabase.co/functions/v1/parse-balanta \
    -H "Authorization: Bearer <valid-token>" \
    -H "Content-Type: application/json" \
    -d '{"import_id":"test"}' \
    -v
  
  # AȘTEPTAT (după 10 requesturi):
  # HTTP/1.1 429 Too Many Requests
  # Retry-After: <secunde>  (header prezent, integer)
  # Body: {"error":"Too Many Requests","reset_in_seconds":<int>,"remaining":0}
  ```

- [ ] **Test 2.6b (v1.4)**: Rate limit fail-closed când RPC indisponibil
  ```
  Simulare (dev/staging):
  1. Dezactivează temporar funcția check_rate_limit (DROP sau rename)
  2. Apelează edge function parse-balanta cu token valid
  3. AȘTEPTAT: 429 Too Many Requests sau 503 Service Unavailable
  4. AȘTEPTAT: Log "rate_limit_unavailable" prezent
  5. Restaurează funcția și verifică că se recuperează
  ```

- [ ] **Test 2.7 (v1.1)**: xlsx upgrade - regresie pe fișiere test
  ```
  Testează toate cele 7 tipuri de fișiere din setul de test:
  - [ ] test_basic.xlsx
  - [ ] test_eu_format.xlsx
  - [ ] test_us_format.xlsx
  - [ ] test_empty_cells.xlsx
  - [ ] test_large.xlsx
  - [ ] test_special_chars.xlsx
  - [ ] test_old_xls.xls
  ```

### Teste Storage (Punctul 4)

- [ ] **Test 4.1**: Upload cu file.name valid
  ```
  Upload "balanta_2025.xlsx" → Succes
  ```

- [ ] **Test 4.2**: Upload cu file.name prea lung (>200 chars)
  ```
  Upload "a" * 250 + ".xlsx" → Error înainte de upload
  ```

- [ ] **Test 4.3**: Upload cu caractere invalide
  ```
  Upload "balanta/test.xlsx" → Error înainte de upload
  Upload "balanta:test.xlsx" → Error înainte de upload
  ```

### Teste Post-Regenerare Tipuri (Punctul 5)

- [ ] **Test 5.1**: types.ts compilează fără erori
  ```bash
  npm run build
  ```

- [ ] **Test 5.2**: RPC calls funcționează corect
  ```typescript
  // Testează can_access_import în app
  const { data } = await supabase.rpc('can_access_import', {
    _user_id: 'xxx',
    _import_id: 'yyy'
  });
  ```

### Teste Ordine Migrări (v1.4)

- [ ] **Test 5.3 (v1.4)**: Verificare ordine migrări - processing_started_at înainte de funcție
  ```bash
  # Listează migrări în ordinea aplicării
  ls -la supabase/migrations/ | grep "20260128"
  
  # Verifică ordinea:
  # 100002a_add_processing_started_at TREBUIE să apară ÎNAINTE de
  # 100003_process_import_accounts_function
  
  # Dacă ordinea e greșită, redenumește fișierele pentru a o corecta
  ```

### Teste Security Hardening (v1.5 - NOU)

- [ ] **Test 5.4 (v1.5)**: Constraint trigger INSERT - companie fără membri
  ```sql
  -- Încercă să creezi companie fără membri (bypass RPC)
  BEGIN;
  INSERT INTO public.companies (name, cui) VALUES ('Test Orphan', 'RO99999999');
  COMMIT;
  -- AȘTEPTAT: EXCEPTION 'Company must have at least one member'
  ```

- [ ] **Test 5.4a (v1.6)**: Constraint trigger DELETE - ultimul membru blocat
  ```sql
  -- Creează companie cu 1 membru prin RPC
  SELECT create_company_with_member('Test Company', 'RO88888888');
  
  -- Încearcă să ștergi unicul membru
  DELETE FROM public.company_users WHERE company_id = '<returned-id>';
  -- AȘTEPTAT: EXCEPTION 'Cannot remove last member from company'
  ```

- [ ] **Test 5.4b (v1.6)**: CUI UNIQUE - duplicate concurente blocate
  ```sql
  -- Sesiune 1: creează companie cu CUI
  SELECT create_company_with_member('First', 'RO12345678');
  
  -- Sesiune 2 (simultan): încearcă același CUI (case diferit, spații)
  SELECT create_company_with_member('Second', 'ro 12345678');
  -- AȘTEPTAT: EXCEPTION sau unique_violation (primul trece, al doilea eșuează)
  ```

- [ ] **Test 5.5 (v1.5)**: Storage policy - interzice nesting
  ```bash
  # Încearcă upload cu path nested
  curl -X POST <storage-url>/balante/<company-id>/subfolder/file.xlsx ...
  # AȘTEPTAT: Policy violation (array_length check)
  ```

- [ ] **Test 5.6 (v1.5)**: Storage policy - interzice caractere invalide
  ```bash
  # Încearcă upload cu filename invalid
  curl -X POST <storage-url>/balante/<company-id>/<script>alert</script>.xlsx ...
  # AȘTEPTAT: Policy violation (regex check)
  ```

- [ ] **Test 5.6a (v1.6)**: Storage policy - case-insensitive extensie
  ```bash
  # Upload cu extensie uppercase
  Upload fișier "balanta.XLSX" sau "balanta.XLS"
  # AȘTEPTAT: Succes (regex ~* acceptă case-insensitive)
  ```

- [ ] **Test 5.6b (v1.6)**: Storage policy - robustețe la path-uri atipice
  ```bash
  # Testează edge cases pentru storage.foldername/filename
  # Upload cu path: doar "/", "//", fără folder, etc.
  # AȘTEPTAT: Policy violation (NULL guards sau array_length)
  ```

- [ ] **Test 5.7 (v1.5)**: process_import - defense-in-depth ownership
  ```sql
  -- User A creează import pentru company X
  -- User B (din company Y) încearcă să proceseze importul lui A
  SELECT * FROM process_import_accounts(
    '<import-id-user-a>', 
    '[...]'::jsonb,
    '<user-b-id>'::uuid
  );
  -- AȘTEPTAT: FALSE, 'Access denied: not a company member'
  ```

- [ ] **Test 5.8 (v1.5)**: XLSX limite - max foi
  ```
  Upload fișier cu 15 foi (>MAX_SHEETS=10)
  AȘTEPTAT: Error "File has too many sheets"
  ```

- [ ] **Test 5.9 (v1.5)**: XLSX limite - max rânduri
  ```
  Upload fișier cu 25000 rânduri într-o foaie (>MAX_ROWS=20000)
  AȘTEPTAT: Error "Sheet has too many rows"
  ```

- [ ] **Test 5.10 (v1.5)**: XLSX timeout parsare
  ```
  Upload fișier complex care ia >30 sec parsare (sau mock delay)
  AȘTEPTAT: Error "File parsing timeout exceeded"
  ```

- [ ] **Test 5.10a (v1.6)**: XLSX limită pre-read (înainte de XLSX.read)
  ```
  Upload fișier >10 MB
  AȘTEPTAT: Error "File too large" ÎNAINTE de parsare (economie resurse)
  ```

- [ ] **Test 5.11 (v1.5)**: Safe error messages - SQLERRM nu e expus
  ```
  Cauzează eroare SQL în process_import (ex: JSON invalid)
  Verifică răspuns: NU conține detalii SQL (table names, constraints)
  AȘTEPTAT: "Import processing failed. Please contact support."
  ```

- [ ] **Test 5.12 (v1.6)**: Rollback wrapper - flag ALLOW_DB_FALLBACK
  ```bash
  # Staging: cu flag activat
  ALLOW_DB_FALLBACK=true <deploy-edge-function>
  # Șterge funcția process_import_accounts temporar
  # Apelează edge function
  # AȘTEPTAT: Fallback activ, log "DB_FALLBACK_ACTIVE" prezent
  
  # Production: fără flag (sau explicit false)
  ALLOW_DB_FALLBACK=false <deploy-edge-function>
  # Șterge funcția (simulare rollback incomplet)
  # Apelează edge function
  # AȘTEPTAT: Error "Service temporarily unavailable" (NU fallback)
  ```

- [ ] **Test 5.13 (v1.6)**: internal_error_detail NU e vizibil pentru authenticated
  ```sql
  -- Ca user authenticated, încearcă SELECT
  SELECT internal_error_code, internal_error_detail 
  FROM public.trial_balance_imports 
  WHERE company_id = '<my-company>';
  -- AȘTEPTAT: Permission denied PE COLOANE sau view-ul nu le include
  ```

- [ ] **Test 5.14 (v1.7)**: Constraint trigger INSERT - seed/bulk timing
  ```sql
  -- Test seed: COPY companii apoi membri (timing diferit)
  BEGIN;
  INSERT INTO companies (name, cui) VALUES ('Seed1', 'RO111'), ('Seed2', 'RO222');
  -- La COMMIT: Trigger va verifica membri (ar trebui să eșueze dacă nu există)
  COMMIT;  -- AȘTEPTAT: EXCEPTION sau SUCCESS (depinde de DEFERRABLE)
  
  -- Test disable pentru restore:
  ALTER TABLE companies DISABLE TRIGGER enforce_company_has_member;
  -- Restore data...
  ALTER TABLE companies ENABLE TRIGGER enforce_company_has_member;
  ```

- [ ] **Test 5.15 (v1.7)**: Trigger DELETE + status archived
  ```sql
  -- Creează companie cu 2 membri
  SELECT create_company_with_member('Test', 'RO999');
  INSERT INTO company_users (company_id, user_id, role) VALUES ('<id>', '<user2>', 'member');
  
  -- Șterge 1 membru: OK
  DELETE FROM company_users WHERE user_id = '<user2>';
  
  -- Încearcă DELETE ultimul membru (status=active): BLOCAT
  DELETE FROM company_users WHERE company_id = '<id>';
  -- AȘTEPTAT: EXCEPTION "Cannot remove last member from active company"
  
  -- Archive companie
  UPDATE companies SET status = 'archived' WHERE id = '<id>';
  
  -- Acum DELETE ultimul membru: OK
  DELETE FROM company_users WHERE company_id = '<id>';
  -- AȘTEPTAT: SUCCESS (status != 'active')
  ```

- [ ] **Test 5.16 (v1.7)**: Advisory lock refuz instant (nu așteptare)
  ```javascript
  // Sesiune 1: start procesare
  await supabase.rpc('process_import_accounts', { p_import_id: 'abc', ... });
  // (nu aștepta să se termine)
  
  // Sesiune 2 (simultan): încearcă același import
  const { data, error } = await supabase.rpc('process_import_accounts', { p_import_id: 'abc', ... });
  // AȘTEPTAT: Răspuns INSTANT "already processing" (nu așteaptă 30sec)
  ```

- [ ] **Test 5.17 (v1.7)**: CUI preflight query - detectează coliziuni
  ```sql
  -- Creează date test cu CUI-uri similare
  INSERT INTO companies (name, cui) VALUES 
    ('Company A', 'RO12345678'),
    ('Company B', 'ro 12345678'),  -- Același CUI, case/spații diferite
    ('Company C', 'RO 123 456 78');
  
  -- Rulează query preflight
  WITH normalized AS (
    SELECT id, cui, UPPER(TRIM(REPLACE(cui, ' ', ''))) AS cui_normalized,
           COUNT(*) OVER (PARTITION BY UPPER(TRIM(REPLACE(cui, ' ', '')))) AS dup_count
    FROM companies
  )
  SELECT * FROM normalized WHERE dup_count > 1;
  -- AȘTEPTAT: Returnează cele 3 companii (coliziune detectată)
  ```

- [ ] **Test 5.18 (v1.7)**: Filename diacritice - normalizare ASCII
  ```javascript
  // Frontend: upload fișier "balanță.xlsx"
  const file = new File([...], "balanță.xlsx");
  await uploadFile(file);
  
  // AȘTEPTAT: 
  // - Frontend normalizează la "balanta.xlsx"
  // - Storage policy acceptă (doar ASCII)
  // - SUCCESS (nu eroare "caractere invalide")
  ```

- [ ] **Test 5.19 (v1.7)**: File size check ÎNAINTE de download
  ```javascript
  // Creează import cu file_size_bytes > 10MB în DB
  const { data: importData } = await supabase.from('trial_balance_imports')
    .insert({ ..., file_size_bytes: 15_000_000 });
  
  // Apelează edge function
  const response = await fetch('/functions/v1/parse-balanta', {
    method: 'POST',
    body: JSON.stringify({ import_id: importData.id })
  });
  
  // AȘTEPTAT: 
  // - Error "File too large" INSTANT (nu după download de 15MB)
  // - Log: NU apare "download completed" pentru acest request
  ```

- [ ] **Test 5.20 (v1.7)**: CORS origin whitelist
  ```javascript
  // Request din origin NU în whitelist
  fetch('https://your-edge-function.supabase.co/parse-balanta', {
    method: 'POST',
    headers: { 
      'Origin': 'https://malicious-site.com',
      'Authorization': 'Bearer <valid-token>'
    }
  });
  
  // AȘTEPTAT: 
  // - CORS error în browser (origin nu e în Access-Control-Allow-Origin)
  // - SAU răspuns cu Access-Control-Allow-Origin: <primul-origin-valid> (nu malicious)
  ```

---

## Gate 0: Verificări Pre-Migrare (v1.2)

**OBLIGATORIU**: Completează acest checklist ÎNAINTE de a crea orice migrare SQL.

### Checklist Gate 0

#### A) Căutare INSERT în `public.companies`
```bash
# Caută în tot repo-ul orice referință la INSERT în companies
grep -r "INSERT.*companies" --include="*.sql" --include="*.ts" --include="*.tsx" .
grep -r "\.from\(['\"]companies" --include="*.ts" --include="*.tsx" .
grep -r "companies.*insert" -i --include="*.ts" --include="*.tsx" .
```

**Rezultat așteptat**: Singurele INSERT-uri trebuie să fie în:
- [ ] `create_company_with_member()` - RPC (OK, include membership)
- [ ] Migrări seed (dacă există) - verifică că includ și membership

**⚠️ DACĂ** găsești alt INSERT în companies (admin UI, alt RPC, script):
- [ ] Acel cod TREBUIE să insereze și membership în aceeași tranzacție
- [ ] SAU trebuie eliminat/înlocuit cu apel la `create_company_with_member()`

#### B) Confirmare RLS pe `public.companies`
```sql
-- Verifică policies pe companies
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'companies';
```

**Rezultat așteptat**:
- [ ] NU există policy FOR INSERT care permite useri authenticated să insereze direct
- [ ] SAU policy-ul INSERT are WITH CHECK care garantează membership simultan

#### C) Confirmare client Supabase în Edge Function
```typescript
// În supabase/functions/parse-balanta/index.ts, verifică:
const supabase = createClient(supabaseUrl, supabaseKey);
// supabaseKey TREBUIE să fie SUPABASE_SERVICE_ROLE_KEY (nu ANON_KEY)
```

**Checklist securitate edge**:
- [ ] `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` este folosit pentru client-ul care face RPC/writes
- [ ] NU se loghează niciodată: `supabaseKey`, `authHeader`, `token`, sau headers sensibile
- [ ] Orice `console.log`/`console.error` nu include date sensibile

#### D) Confirmare constraints pe tabele afectate
```sql
-- v1.8: Query completă diagnostic stare DB
-- Verifică UNIQUE și FK pe company_users
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.company_users'::regclass;

-- Verifică UNIQUE pe trial_balance_accounts
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.trial_balance_accounts'::regclass;
```

**Rezultat așteptat**:
- [ ] `company_users`: UNIQUE(company_id, user_id) există
- [ ] `trial_balance_accounts`: UNIQUE(import_id, account_code) există

#### E) Verificare expunere company_id necomitat (v1.3 - NOU)

**⚠️ RISC CRITIC**: Dacă `company_id` este expus (logs, telemetrie, response) înainte de commit tranzacție, poate exista fereastră de bootstrap.

```bash
# Caută expuneri potențiale
grep -r "console.log.*company" --include="*.ts" --include="*.tsx" .
grep -r "logger.*company_id" --include="*.ts" .
grep -r "return.*company_id" supabase/functions/
grep -r "company_id" supabase/migrations/ | grep -i "return\|log"
```

**Checklist**:
- [ ] NICIO expunere de `company_id` în `create_company_with_member` înainte de COMMIT
- [ ] NICIO expunere în edge functions înainte de verificare membership
- [ ] NICIO expunere în frontend logs înainte de confirmare server

**⚠️ BLOCARE DEPLOY**: Dacă există expunere, BLOCAT până se elimină.

#### Limitări Test Static (v1.4 - NOU)

**⚠️ IMPORTANT**: `grep` detectează multe cazuri, dar **NU prinde**:
- Telemetrie async (ex: Sentry, analytics)
- Logs din librării third-party
- company_id în URL sau query params
- Debug payloads serializate JSON
- Logs condiționale (doar în dev/staging)

**Tratare**: Test static `grep` este **defense in depth**, NU garanție completă.

**RECOMANDARE (v1.4)**: Adaugă test comportamental minimal:
```javascript
// Test integrat black-box (manual sau automatizat)
// 1. Pornește două sesiuni user diferite
// 2. User A: apelează create_company_with_member
// 3. Interceptează toate răspunsurile/logs între START și SUCCESS
// 4. Verifică că company_id NU apare în client înainte de final commit
// 5. User B: verifică că nu poate vedea compania până la commit complet
```

**Status**: Test comportamental **recomandat** dar **opțional** în v1.4 (complexitate).

#### F) Queries Diagnostic Stare DB (v1.8 - NOU, RECOMANDATĂ)

**Scop**: Rulează aceste queries ÎNAINTE de migrare pentru a vedea exact starea reală DB și a detecta probleme.

**Query D1: RLS activ pe tabele critice**
```sql
-- Verifică dacă RLS este activat și forțat
SELECT 
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname IN ('companies', 'company_users', 'trial_balance_imports', 'trial_balance_accounts')
  AND relnamespace = 'public'::regnamespace;
```

**Rezultat așteptat**:
- [ ] Toate tabelele: `rls_enabled = true`
- [ ] `trial_balance_imports`, `trial_balance_accounts`: `rls_forced = false` (OK, authenticated poate accesa)
- [ ] `companies`, `company_users`: `rls_forced = false` (verificare policy mai jos)

**Query D2: Policies pe tabele critice**
```sql
-- Lista toate policies și ce permit
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check AS check_expression
FROM pg_policies
WHERE tablename IN ('companies', 'company_users', 'trial_balance_imports', 'trial_balance_accounts')
ORDER BY tablename, cmd, policyname;
```

**Verificări**:
- [ ] `companies`: NU există policy INSERT pentru authenticated (doar prin RPC)
- [ ] `company_users`: Policy bootstrap ("first member") există și e corectă
- [ ] `trial_balance_imports`: Policy verifică company membership pentru toate operațiuni
- [ ] `trial_balance_accounts`: Policy verifică ownership prin trial_balance_imports

**Query D3: Constrângeri company_users (UNIQUE/FK)**
```sql
-- Verifică constraints pentru prevenire duplicate și integritate
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.company_users'::regclass
ORDER BY contype, conname;
```

**Rezultat așteptat**:
- [ ] `UNIQUE (company_id, user_id)` - previne duplicate membership
- [ ] `FOREIGN KEY (company_id) REFERENCES companies(id)` - integritate referențială
- [ ] `FOREIGN KEY (user_id) REFERENCES auth.users(id)` - utilizatori valizi

**Query D4: Constrângeri trial_balance_accounts (UNIQUE import+account)**
```sql
-- Verifică unicitate conturi per import
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.trial_balance_accounts'::regclass
ORDER BY contype, conname;
```

**Rezultat așteptat**:
- [ ] `UNIQUE (import_id, account_code)` - previne duplicate conturi în același import
- [ ] `FOREIGN KEY (import_id) REFERENCES trial_balance_imports(id) ON DELETE CASCADE`

**Query D5: Privilegii funcții critice**
```sql
-- Verifică că funcțiile critice NU sunt EXECUTE pentru authenticated din greșeală
SELECT 
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_userbyid(p.proowner) AS owner,
  CASE 
    WHEN p.proacl IS NULL THEN 'PUBLIC (default)'
    ELSE array_to_string(p.proacl, ', ')
  END AS acl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('create_company_with_member', 'process_import_accounts', 
                     'check_rate_limit', 'can_access_import', 'try_uuid')
ORDER BY p.proname;
```

**Rezultat așteptat**:
- [ ] `create_company_with_member`: `GRANT EXECUTE TO authenticated` (OK, e entrypoint)
- [ ] `process_import_accounts`: `GRANT EXECUTE TO service_role` (NU authenticated direct)
- [ ] `check_rate_limit`: `GRANT EXECUTE TO service_role` (NU authenticated direct)
- [ ] `can_access_import`: poate fi authenticated (helper pentru policies)
- [ ] `try_uuid`: `GRANT EXECUTE TO authenticated` (helper pentru policies - v1.8)

**Query D6: Cine poate SELECT trial_balance_imports**
```sql
-- Verifică grants pe tabel (înainte de view-only strategy v1.7)
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'trial_balance_imports'
ORDER BY grantee, privilege_type;
```

**Rezultat așteptat (v1.7+)**:
- [ ] `authenticated`: NU are SELECT pe tabel direct (REVOKE aplicat)
- [ ] `authenticated`: ARE SELECT pe view `trial_balance_imports_public`
- [ ] `service_role`: ARE toate privilegiile (owner implicit)

**Documentare rezultate**:
- [ ] Rulează toate queries D1-D6
- [ ] Salvează output în `planning/gate0_db_state.txt`
- [ ] Notează orice deviere de la "așteptat"
- [ ] Remediază devieri ÎNAINTE de migrări

---

## Ordine de Implementare Recomandată

### Pas 0: Gate 0 - Verificări Pre-Migrare (v1.2 + v1.3 + v1.8 OBLIGATORIU)
- [ ] **A)** Rulează căutare INSERT în companies (vezi Gate 0)
- [ ] **B)** Verifică RLS pe companies (vezi Gate 0)
- [ ] **C)** Confirmă SERVICE_ROLE în edge function (vezi Gate 0)
- [ ] **D)** Verifică constraints pe tabele (vezi Gate 0)
- [ ] **E) (v1.3)** Verifică expunere company_id necomitat (vezi Gate 0)
- [ ] **F) (v1.8 - NOU, RECOMANDATĂ)** Queries diagnostic stare DB (D1-D6):
  - [ ] D1: RLS activ pe tabele critice
  - [ ] D2: Policies pe tabele critice
  - [ ] D3: Constrângeri company_users
  - [ ] D4: Constrângeri trial_balance_accounts
  - [ ] D5: Privilegii funcții critice
  - [ ] D6: Grants pe trial_balance_imports
- [ ] Documentează rezultatele în issue/PR (+ output D1-D6 în `planning/gate0_db_state.txt`)
- [ ] **BLOCARE**: Dacă Gate 0(E) găsește expunere, BLOCAT până se elimină

### Pas 0.5: Pregătire (v1.1)
- [ ] Creează `supabase/migrations/rollback_snippets.sql` cu definițiile vechi (sau migrare forward-only de rollback pregătită)
- [ ] Creează directorul `supabase/functions/parse-balanta/test-files/` cu cele 7 fișiere test
- [ ] Commit și notează hash-ul pentru referință rollback

### Pas 1: Migrări SQL (în ordine) *(v1.4 + v1.5 + v1.6 + v1.7 + v1.8 - ACTUALIZAT)*
- [ ] `20260128100000_security_patch_company_users_rls.sql`
- [ ] **(v1.7 - OPȚIONAL RECOMANDATĂ)** `20260128100000a_add_companies_status.sql` (ADD COLUMN status pentru archived/deleting)
- [ ] **(v1.8 - OBLIGATORIE)** `20260128100000b_try_uuid_helper.sql` (CREATE FUNCTION try_uuid() IMMUTABLE)
- [ ] **(v1.6 + v1.7 + v1.8)** `20260128100001_security_patch_create_company_function.sql`
  - v1.6 + v1.7: normalizare CUI + bootstrap exclude archived
  - **v1.8**: RAISE EXCEPTION pe unique_violation (nu RETURN NULL)
- [ ] `20260128100002_rate_limits_table.sql`
- [ ] **(v1.4 - OBLIGATORIE)** `20260128100002a_add_processing_started_at.sql` **TREBUIE ÎNAINTE DE 00003**
- [ ] **(v1.5 + v1.6 + v1.7 - OBLIGATORIE)** `20260128100002b_add_internal_error_tracking_view.sql` **ÎNAINTE DE 00003**
  - **v1.7**: VIEW-ONLY strategy (REVOKE SELECT tabel + CREATE VIEW public + GRANT SELECT view)
- [ ] **(v1.6 + v1.7 - OBLIGATORIE)** `20260128100003_process_import_accounts_function.sql`
  - **v1.7**: pg_try_advisory_xact_lock pentru refuz instant
  - v1.6: SELECT FOR UPDATE; depinde de 100002a + 100002b
- [ ] **(v1.5 + v1.6 + v1.7 + v1.8 - OBLIGATORIE)** `20260128100004_company_member_constraint.sql`
  - **v1.8**: Trigger INSERT cu skip dacă compania ștearsă (INSERT+DELETE seed)
  - **v1.8**: Trigger DELETE cu allow pentru CASCADE (companies nu mai există)
  - **v1.7**: Excepție status archived/deleting; COUNT simplu
- [ ] **(v1.5 + v1.6 + v1.8 - OBLIGATORIE)** `20260128100005_storage_policy_hardening.sql`
  - **v1.8**: Rescris cu try_uuid() (cast safe, nu aruncă excepție)
  - v1.6: NULL guards + case-insensitive
- [ ] **(v1.6 + v1.7 + v1.8 - OBLIGATORIE)** `20260128100006_cui_unique_constraint.sql`
  - **v1.8 CRITICĂ**: PAS MANUAL producție (CONCURRENTLY nu poate în tranzacție pipeline)
  - **v1.7**: PRE-FLIGHT query + remediere obligatorii
  - Staging/dev: CREATE INDEX normal în migrare (OK)

**⚠️ ORDINE CRITICĂ (v1.4 + v1.5 + v1.6 + v1.7 + v1.8)**: 
- **v1.8**: Migrarea 100000b (try_uuid) TREBUIE înainte de 100005 (storage policy folosește try_uuid)
- Migrările 100002a + 100002b TREBUIE înainte de 100003 (funcția referă coloanele + view)
- Migrarea 100000a (status) opțională, dar RECOMANDATĂ înainte de 100004 (triggers DELETE)
- **v1.8**: Migrarea 100006 (CUI UNIQUE) - **PAS MANUAL în producție** după preflight + remediere
- Migrările 100004 (constraint triggers) și 100005 (storage) pot rula oricând după dependencies lor

### Pas 2: Edge Function Updates
- [ ] `config.toml` - verify_jwt = true
- [ ] **(v1.7 - RECOMANDATĂ)** `index.ts` - CORS origins whitelist (nu wildcard *)
- [ ] `index.ts` - parseNumber (versiunea v1.1 cu comentarii corecte; v1.3: logging la nivel rând)
- [ ] `index.ts` - rate limit DB (cu check_rate_limit RPC; v1.4: fail-closed; v1.6: flag fallback)
- [ ] `index.ts` - idempotență (cu process_import_accounts RPC; v1.5: p_requester_user_id; v1.6: flag fallback)
- [ ] `index.ts` - xlsx upgrade (testează mai întâi cu set fișiere!)
- [ ] **(v1.5 + v1.6 + v1.7 - OBLIGATORIU)** `index.ts` - XLSX limite resource exhaustion:
  - [ ] **(v1.7)** Verificare file_size_bytes ÎNAINTE de download din storage (validateAndDownloadFile)
  - [ ] **(v1.6)** Verificare pre-parse: fileSizeBytes < 10MB ÎNAINTE de XLSX.read() (secundară)
  - [ ] MAX_SHEETS = 10 (post-parse guard)
  - [ ] MAX_ROWS_PER_SHEET = 20000 (post-parse guard)
  - [ ] MAX_COLUMNS = 30 (post-parse guard)
  - [ ] PARSE_TIMEOUT_MS = 30000 (Date.now() check în buclă - incomplet, dar util)
  - [ ] TODO v2.0: Worker cu timeout real (întrerupe parsare lungă)
- [ ] **(v1.5 + v1.6 - OPȚIONAL)** `index.ts` - Optimizare latență auth (decode JWT base64url-safe)
- [ ] **(v1.5 + v1.6 - OPȚIONAL)** `index.ts` - Wrapper fallback pentru RPC cu flag ALLOW_DB_FALLBACK
- [ ] **(v1.4)** `index.ts` - Handler explicit OPTIONS (CORS)

### Pas 3: Frontend Updates
- [ ] `useCompany.tsx` - elimină p_user_id din RPC call
- [ ] `CompanyContext.tsx` - elimină p_user_id din RPC call
- [ ] **(v1.7 - OBLIGATORIU)** `useTrialBalances.tsx` - Normalizare ASCII filename (aliniament storage policy):
  - [ ] `.normalize('NFD').replace(/[\u0300-\u036f]/g, '')` pentru diacritice
  - [ ] Regex validare: `/[^a-zA-Z0-9._\- ]/` (doar safe chars)
- [ ] **(v1.7 - RECOMANDATĂ)** `trial_balance_imports_public` view consumption:
  - [ ] Înlocuiește query-uri `from('trial_balance_imports')` cu `from('trial_balance_imports_public')`
  - [ ] Verifică că coloanele expuse în view sunt suficiente pentru UI

### Pas 4: Regenerare Tipuri
- [ ] Rulează `npx supabase gen types typescript --project-id gqxopxbzslwrjgukqbha > src/integrations/supabase/types.ts`
- [ ] Verifică că tipurile pentru funcțiile noi sunt corecte

### Pas 5: Testare & Deploy
- [ ] Testează local TOATE testele din checklist (inclusiv v1.1-v1.5)
- [ ] **(v1.4)** Verifică ordine migrări: 100002a ÎNAINTE de 100003 - Test 5.3
- [ ] **(v1.5 + v1.6 + v1.7)** Testează security hardening - Tests 5.4-5.20:
  - [ ] Constraint triggers: INSERT companie (5.4) + DELETE ultimul membru (5.4a)
  - [ ] **(v1.7)** Constraint trigger INSERT: seed/bulk timing (5.14)
  - [ ] **(v1.7)** Trigger DELETE + status archived (5.15)
  - [ ] CUI UNIQUE duplicate concurente (5.4b)
  - [ ] **(v1.7)** CUI preflight query detectează coliziuni (5.17)
  - [ ] Storage policy: validări (5.5, 5.6) + case-insensitive (5.6a) + NULL guards (5.6b)
  - [ ] **(v1.7)** Filename diacritice normalizare ASCII (5.18)
  - [ ] Defense-in-depth ownership (5.7)
  - [ ] XLSX limite: foi/rânduri/timeout (5.8, 5.9, 5.10) + pre-read (5.10a)
  - [ ] **(v1.7)** File size check ÎNAINTE de download (5.19)
  - [ ] Safe error messages (5.11)
  - [ ] Rollback wrapper flag (5.12)
  - [ ] internal_error_detail protected (5.13)
  - [ ] **(v1.7)** Advisory lock refuz instant (5.16)
  - [ ] **(v1.7)** CORS origin whitelist (5.20)
- [ ] Testează regresie xlsx cu cele 7 fișiere + limite noi
- [ ] Testează OPTIONS preflight + 401 fără token (curl)
- [ ] **(v1.2)** Testează din browser real (fetch) pe staging - Tests 2.5b, 2.5c
- [ ] **(v1.4)** Testează OPTIONS explicit handler - Test 2.5d
- [ ] **(v1.2)** Testează concurență process_import_accounts - Tests 2.4c, 2.4d
- [ ] **(v1.3)** Testează timeout processing stale - Test 2.4e
- [ ] **(v1.3)** Testează contract 429 (Retry-After header + body JSON) - Test 2.6a
- [ ] **(v1.4)** Testează rate limit fail-closed - Test 2.6b
- [ ] **(v1.3)** Verifică observabilitate parseNumber pe staging - Test 2.3b
- [ ] **(v1.4 - OPȚIONAL)** Test comportamental company_id - Test 1.10
- [ ] Deploy pe staging
- [ ] **(v1.5 - OBLIGATORIU)** Verifică criterii Go/No-Go:
  - [ ] 0 crash-uri edge (N=50 fișiere)
  - [ ] Rate limit unavailable <0.5%
  - [ ] Parsare fișier large <8 sec
  - [ ] 0 stuck imports după 15 min
  - [ ] CORS funcțional (OPTIONS + POST browser)
  - [ ] Rollback safe testat și funcțional
- [ ] **(v1.5)** Configurare monitoring: Dashboard + alerte pentru metrici obligatorii
- [ ] Testare finală pe staging (24-48h observation period)
- [ ] **Commit final** (notează hash pentru rollback)
- [ ] **(v1.3 + v1.4)** Pregătește AMBELE migrări de rollback (safe + full) cu playbook ordine
- [ ] **(v1.4)** Documentează matrice compatibilitate versiuni code/DB
- [ ] **(v1.5)** Pregătește wrapper fallback pentru RPC (staging/rollback resilience)
- [ ] Deploy producție
- [ ] **(v1.5)** Post-deploy: Verifică metrici primele 4 ore (alerte active)

---

## NOTĂ FINALĂ

**NU IMPLEMENTA NIMIC DIN ACEST PLAN FĂRĂ APROBARE EXPLICITĂ.**

Planul e complet. Așteaptă confirmarea pentru a începe implementarea.
