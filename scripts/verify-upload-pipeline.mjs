#!/usr/bin/env node
/**
 * Script verificare pipeline Upload Balanță (E2E checklist automatizabil).
 *
 * Rulează verificări statice în cod + instrucțiuni pentru test live.
 * Pentru test live: necesită .env cu VITE_SUPABASE_URL și sesiune autentificată.
 *
 * Usage: node scripts/verify-upload-pipeline.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const checks = [];

function pass(name) {
  checks.push({ name, ok: true });
  console.log(`✅ ${name}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  console.log(`❌ ${name}: ${detail}`);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

// 1. Bucket canonical în cod
const constants = read('src/lib/storage/constants.ts');
if (constants.includes("BALANCE_STORAGE_BUCKET = 'balante'")) {
  pass('Bucket canonical: balante în constants.ts');
} else {
  fail('Bucket canonical', 'BALANCE_STORAGE_BUCKET != balante');
}

// 2. Edge Function apelează bucket balante
const edgeFn = read('supabase/functions/parse-balanta/index.ts');
if (edgeFn.includes('BALANCE_STORAGE_BUCKET') && !edgeFn.includes('"trial-balances"')) {
  pass('Edge Function folosește bucket balante');
} else {
  fail('Edge Function bucket', 'Verificați parse-balanta/index.ts');
}

// 3. Edge Function rezolvă public.users.id
if (edgeFn.includes('auth_user_id') && edgeFn.includes('publicUser.id')) {
  pass('Edge Function: mapare auth → public user id');
} else {
  fail('Edge Function user id', 'Lipsește maparea auth_user_id → users.id');
}

// 4. Frontend invocă parse-balanta
const pipeline = read('src/lib/importPipeline.ts');
if (pipeline.includes("invoke('parse-balanta'")) {
  pass('Frontend invocă parse-balanta via importPipeline');
} else {
  fail('Frontend edge invoke', 'Lipsește supabase.functions.invoke parse-balanta');
}

// 5. useTrialBalances nu face insert direct în trial_balance_accounts
const hook = read('src/hooks/useTrialBalances.tsx');
if (!hook.includes(".from('trial_balance_accounts').insert")) {
  pass('useTrialBalances: fără insert direct conturi (server-side RPC)');
} else {
  fail('useTrialBalances', 'Încă există insert direct client-side în trial_balance_accounts');
}

// 6. View public pentru SELECT
if (hook.includes('TRIAL_BALANCE_IMPORTS_VIEW')) {
  pass('useTrialBalances: SELECT pe trial_balance_imports_public');
} else {
  fail('useTrialBalances view', 'Nu folosește view public');
}

// 7. Migrări pipeline
if (existsSync(join(root, 'supabase/migrations/20260621000000_stabilize_upload_pipeline.sql'))) {
  pass('Migrare 20260621000000_stabilize_upload_pipeline.sql există');
} else {
  fail('Migrare', 'Lipsește migrarea de stabilizare');
}

if (constants.includes('balance_month')) {
  pass('constants.ts: balance_month în TRIAL_BALANCE_IMPORTS_SELECT_COLUMNS');
} else {
  fail('balance_month column', 'Lipsește balance_month din SELECT columns');
}

if (existsSync(join(root, 'supabase/migrations/20260630100000_add_balance_month_to_trial_balance_imports.sql'))) {
  pass('Migrare 20260630100000_add_balance_month există');
} else {
  fail('Migrare balance_month', 'Lipsește migrarea balance_month');
}

if (existsSync(join(root, 'src/lib/balancePeriod.ts'))) {
  pass('Helper calculateBalancePeriod există');
} else {
  fail('balancePeriod.ts', 'Lipsește helper-ul de calcul perioadă');
}

// 8. Build artifacts (optional)
if (existsSync(join(root, 'dist/index.html'))) {
  pass('Build production disponibil (dist/)');
} else {
  console.log('ℹ️  Rulează npm run build pentru verificare build');
}

console.log('\n--- REZUMAT ---');
const failed = checks.filter((c) => !c.ok);
console.log(`${checks.length - failed.length}/${checks.length} verificări trecute`);

if (failed.length > 0) {
  process.exit(1);
}

console.log(`
--- TEST E2E MANUAL (după deploy migrare + Edge Function) ---

1. supabase db push   (sau aplică migrarea în Dashboard)
2. supabase functions deploy parse-balanta
3. Login în app → selectează companie
4. Încarcă balanță Excel validă (.xlsx)
5. Verifică:
   - Fișier în Storage → bucket "balante" → {company_id}/...
   - trial_balance_imports.status = 'completed'
   - trial_balance_accounts are rânduri pentru import_id
   - Dashboard afișează KPI-uri
6. SQL verificare:
   SELECT id, status, accounts_count FROM trial_balance_imports ORDER BY created_at DESC LIMIT 5;
   SELECT COUNT(*) FROM trial_balance_accounts WHERE import_id = '<import_id>';
`);
