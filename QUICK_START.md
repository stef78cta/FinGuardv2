# ⚡ Quick Start - Security Patches v1.8

> **Deployment în 5 pași simpli**

---

## 📋 Pașii de Urmat

### ✅ Pas 1: Gate 0 (5 minute)

```bash
cd c:\_Software\SAAS\finguardv2

# Verificări SQL
supabase db exec < planning/gate0_verificari.sql > planning/gate0_db_state.txt

# Verificări cod
bash planning/gate0_code_checks.sh | tee planning/gate0_code_results.txt

# Review rezultate
cat planning/gate0_db_state.txt | grep "❌"
cat planning/gate0_code_results.txt | grep "❌"

# ⚠️ DACĂ găsești ❌ → STOP și remediază
```

**Criterii Go**: Zero ❌, toate ✅

---

### ✅ Pas 2: Apply Migrations (2 minute)

```bash
# Staging/Dev
supabase db push

# Verifică success
supabase migration list
# Toate cu ✅

# Verifică funcții create
supabase db exec -c "
SELECT proname FROM pg_proc 
WHERE proname IN ('create_company_with_member', 'check_rate_limit', 'try_uuid');
"
# Trebuie: 3 rânduri
```

**Criterii Go**: Toate migrările aplicate ✅

---

### ✅ Pas 3: Deploy Edge Function (1 minut)

```bash
# Deploy
supabase functions deploy parse-balanta

# Test
curl -X POST https://<project>.supabase.co/functions/v1/parse-balanta \
  -H "Content-Type: application/json" \
  -d '{"import_id":"test"}'

# Așteptat: 401 (verify_jwt = true blochează)
```

**Criterii Go**: 401 Unauthorized (corect!)

---

### ✅ Pas 4: Regenerare Types (1 minut)

```bash
npx supabase gen types typescript \
  --project-id gqxopxbzslwrjgukqbha \
  > src/integrations/supabase/types.ts

# Verifică
grep "create_company_with_member" src/integrations/supabase/types.ts
# Trebuie: (p_name: string, p_cui: string) - fără p_user_id
```

**Criterii Go**: Types regenerate, fără p_user_id

---

### ✅ Pas 5: Build & Deploy Frontend (5 minute)

```bash
# Build
npm run build

# Verifică erori
npm run type-check

# Deploy (Vercel, Netlify, etc.)
# ... specific platform ...
```

**Criterii Go**: Build success, zero erori TypeScript

---

## 🧪 Quick Test (Post-Deployment)

### Test 1: Create Company

```typescript
// În UI sau console
const { data, error } = await supabase.rpc('create_company_with_member', {
  p_name: 'Test Company',
  p_cui: 'RO12345678'
});

console.log('Company ID:', data);  // UUID
console.log('Error:', error);      // null
```

**Așteptat**: ✅ Success, company_id returnat

### Test 2: Duplicate CUI

```typescript
// Create duplicate
const { data, error } = await supabase.rpc('create_company_with_member', {
  p_name: 'Duplicate',
  p_cui: 'RO12345678'  // Același CUI
});

console.log('Error code:', error?.code);  // '23505'
console.log('Error message:', error?.message);
```

**Așteptat**: ❌ Error 23505, mesaj friendly

### Test 3: Upload Filename

```typescript
// În component upload
const file = new File([...], 'balanță.xlsx');
const safeName = normalizeFilename(file.name);
console.log('Normalized:', safeName);  // "balanta.xlsx"

// Upload
const { error } = await supabase.storage
  .from('trial-balances')
  .upload(`${user.id}/${safeName}`, file);

console.log('Upload error:', error);  // null
```

**Așteptat**: ✅ Success, filename normalizat

---

## ⚠️ IMPORTANT: Manual Steps Producție

### Dacă DB Producție > 1,000 Companies

**MANUAL STEP după migrări**:

```bash
# 1. Pre-flight: detectează coliziuni
supabase db exec -c "
WITH normalized AS (
  SELECT id, cui, UPPER(REGEXP_REPLACE(cui, '[^A-Z0-9]', '', 'gi')) AS cui_norm
  FROM public.companies WHERE cui IS NOT NULL
)
SELECT cui_norm, COUNT(*) FROM normalized GROUP BY cui_norm HAVING COUNT(*) > 1;
"

# DACĂ coliziuni → remediază (arhivează duplicate)

# 2. CREATE INDEX CONCURRENTLY (în afara pipeline)
psql $DATABASE_URL -c "
CREATE UNIQUE INDEX CONCURRENTLY idx_companies_cui_normalized 
ON public.companies (UPPER(REGEXP_REPLACE(cui, '[^A-Z0-9]', '', 'gi')));
"

# 3. Verifică
psql $DATABASE_URL -c "
SELECT indexname FROM pg_indexes WHERE indexname = 'idx_companies_cui_normalized';
"
```

---

## 📞 Need Help?

| Problemă | Soluție |
|----------|---------|
| Migrare eșuează | Vezi DEPLOYMENT_GUIDE.md → Troubleshooting |
| Gate 0 găsește ❌ | Vezi GATE0_README.md → Remediere |
| Frontend errors | Vezi FRONTEND_UPDATES_REQUIRED.md |
| Test failures | Vezi SECURITY_PATCHES_TEST_SUITE.md |

---

## 📈 Progress Tracker

- [ ] Gate 0 executat și validat
- [ ] Backup DB creat (producție)
- [ ] Commit hash salvat
- [ ] Migrări aplicate (toate ✅)
- [ ] CUI UNIQUE manual step (producție, dacă aplicabil)
- [ ] Edge Function deployed
- [ ] Types regenerate
- [ ] Frontend built & deployed
- [ ] Teste post-deployment rulate
- [ ] Monitoring activ
- [ ] Documentație în PR

---

**🚀 Ready to Deploy? Follow the 5 steps above!**

**⏱️ Timp Total Estimat**: 15-20 minute (staging)  
**⏱️ Timp Total Estimat**: 30-45 minute (producție cu manual steps)

---

**Versiune**: 1.0  
**Ultima Actualizare**: 28 Ianuarie 2026
