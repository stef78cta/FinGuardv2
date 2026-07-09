// Generates a migration that adds `functional_type` (activ/pasiv/bifunctional)
// to chart_of_accounts + chart_of_accounts_template and populates it from the
// `account_balance_type` column (debit/credit/mixed) of the Chart of Accounts
// mapping template, plus explicit user-provided overrides for accounts that are
// absent from the mapping sheet.
//
// Usage: node scripts/coa/emit-functional-type-migration.mjs "tmp/chart_of_accounts_cu_tip_cont.xlsx"

import { inflateRawSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const srcPath = process.argv[2] || join(repoRoot, 'tmp', 'chart_of_accounts_cu_tip_cont.xlsx');

// --- minimal xlsx reader (namespace-aware) ---------------------------------
function readZipEntries(buf) {
  const entries = new Map();
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  const total = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOff = buf.readUInt32LE(ptr + 42);
    const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);
    entries.set(name, method === 0 ? Buffer.from(raw) : inflateRawSync(raw));
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
function parseShared(xml) {
  const out = [];
  const si = /<(?:x:)?si>([\s\S]*?)<\/(?:x:)?si>/g;
  let m;
  while ((m = si.exec(xml)) !== null) {
    const tRe = /<(?:x:)?t[^>]*>([\s\S]*?)<\/(?:x:)?t>/g;
    let t, s = '';
    while ((t = tRe.exec(m[1])) !== null) s += t[1];
    out.push(decode(s));
  }
  return out;
}
const colToNum = (col) => { let n = 0; for (let i = 0; i < col.length; i++) n = n * 26 + (col.charCodeAt(i) - 64); return n; };
function parseSheet(xml, shared) {
  const rows = [];
  const rowRe = /<(?:x:)?row[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/(?:x:)?row>/g;
  let rm;
  while ((rm = rowRe.exec(xml)) !== null) {
    const cells = {};
    const cellRe = /<(?:x:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:x:)?c>)/g;
    let cm;
    while ((cm = cellRe.exec(rm[2])) !== null) {
      const attrs = cm[1];
      const content = cm[2] || '';
      const rMatch = /\br="([A-Z]+)\d+"/.exec(attrs);
      if (!rMatch) continue;
      const col = colToNum(rMatch[1]);
      let val = '';
      const vMatch = /<(?:x:)?v>([\s\S]*?)<\/(?:x:)?v>/.exec(content);
      if (/t="s"/.test(attrs) && vMatch) val = shared[parseInt(vMatch[1], 10)] || '';
      else if (/t="(str|inlineStr)"/.test(attrs)) { const isM = /<(?:x:)?t[^>]*>([\s\S]*?)<\/(?:x:)?t>/.exec(content); val = isM ? decode(isM[1]) : (vMatch ? vMatch[1] : ''); }
      else if (vMatch) val = vMatch[1];
      cells[col] = val;
    }
    rows.push({ r: parseInt(rm[1], 10), cells });
  }
  return rows;
}
function readSheet(path, sheet = 'xl/worksheets/sheet1.xml') {
  const buf = readFileSync(path);
  const entries = readZipEntries(buf);
  const shared = entries.has('xl/sharedStrings.xml') ? parseShared(entries.get('xl/sharedStrings.xml').toString('utf8')) : [];
  const raw = parseSheet(entries.get(sheet).toString('utf8'), shared);
  const maxCol = Math.max(...raw.flatMap((r) => Object.keys(r.cells).map(Number)));
  const headers = [];
  const hc = raw[0].cells;
  for (let c = 1; c <= maxCol; c++) headers.push(hc[c] || `col${c}`);
  return raw.slice(1).map((r) => { const o = {}; for (let c = 1; c <= maxCol; c++) o[headers[c - 1]] = r.cells[c] ?? ''; return o; });
}

// --- functional type derivation --------------------------------------------
const BALANCE_TO_FUNCTIONAL = { debit: 'activ', credit: 'pasiv', mixed: 'bifunctional' };

// User overrides: accounts absent from the mapping sheet OR explicitly stated
// in the task requirements. These win over any derived value.
const OVERRIDES = {
  '378': 'bifunctional',
  '4093': 'activ',
  '4452': 'activ',
  '4511': 'bifunctional',
  '4551': 'pasiv',
  '4752': 'pasiv',
};

const rows = readSheet(srcPath);
const map = new Map(); // code -> functional_type
const conflicts = [];

for (const r of rows) {
  const code = (r.account_code || '').trim();
  if (!code) continue;
  const abt = (r.account_balance_type || '').trim().toLowerCase();
  const ft = BALANCE_TO_FUNCTIONAL[abt];
  if (!ft) continue;
  if (map.has(code) && map.get(code) !== ft) {
    conflicts.push({ code, existing: map.get(code), incoming: ft, abt });
    // Prefer 'bifunctional' when conflicting sides appear.
    map.set(code, 'bifunctional');
  } else if (!map.has(code)) {
    map.set(code, ft);
  }
}

// apply overrides
for (const [code, ft] of Object.entries(OVERRIDES)) map.set(code, ft);

const entries = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));

console.log('Total mapped codes:', entries.length);
console.log('Conflicts (multi-side):', conflicts.length);
if (conflicts.length) console.log(JSON.stringify(conflicts, null, 2));
const counts = { activ: 0, pasiv: 0, bifunctional: 0 };
for (const [, ft] of entries) counts[ft]++;
console.log('Counts:', counts);

// cross-check against existing template JSON coverage
const tmpl = JSON.parse(readFileSync(join(__dirname, 'standard-coa-template.json'), 'utf8'));
const tmplCodes = new Set(tmpl.chart_of_accounts.map((a) => a.account_code));
const missingInMap = [...tmplCodes].filter((c) => !map.has(c));
console.log('Template codes without functional_type:', missingInMap.length, missingInMap.slice(0, 40));

// --- emit migration --------------------------------------------------------
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const valuesSql = entries.map(([code, ft]) => `  (${q(code)}, ${q(ft)})`).join(',\n');

const sql = `-- ============================================================================
-- MIGRARE (GENERATA): functional_type (functiunea contului) pe chart_of_accounts
-- Data: 2026-07-09
-- Sursa: scripts/coa/emit-functional-type-migration.mjs
--        (coloana account_balance_type din chart_of_accounts_cu_tip_cont.xlsx
--         + override-uri explicite din cerinta)
-- ============================================================================
-- Scop:
--   Separa clar FUNCTIUNEA contabila a contului (activ / pasiv / bifunctional)
--   de SOLDUL din balanta (closing_debit / closing_credit). Soldul ramane date
--   brute in trial_balance_accounts; functiunea este definita in planul de
--   conturi (chart_of_accounts / chart_of_accounts_template).
--
--   NU modifica date brute din trial_balance_accounts.
--   NU recalculeaza situatii financiare istorice.
--   Doar adauga si populeaza o coloana noua, aditiv si idempotent.
--
--   Mapare: debit -> activ, credit -> pasiv, mixed -> bifunctional.
-- ============================================================================

-- 1) Coloana noua (idempotent) -----------------------------------------------
ALTER TABLE public.chart_of_accounts
    ADD COLUMN IF NOT EXISTS functional_type TEXT
        CHECK (functional_type IN ('activ', 'pasiv', 'bifunctional'));

ALTER TABLE public.chart_of_accounts_template
    ADD COLUMN IF NOT EXISTS functional_type TEXT
        CHECK (functional_type IN ('activ', 'pasiv', 'bifunctional'));

COMMENT ON COLUMN public.chart_of_accounts.functional_type IS
    'Functiunea contabila a contului (activ/pasiv/bifunctional). NU este soldul din balanta.';
COMMENT ON COLUMN public.chart_of_accounts_template.functional_type IS
    'Functiunea contabila a contului (activ/pasiv/bifunctional). NU este soldul din balanta.';

-- 2) Sursa de adevar: mapare cod -> functiune ---------------------------------
CREATE TEMP TABLE _ft_map (account_code VARCHAR(20) PRIMARY KEY, functional_type TEXT) ON COMMIT DROP;
INSERT INTO _ft_map (account_code, functional_type) VALUES
${valuesSql};

-- 3) Populeaza template-ul standard -------------------------------------------
UPDATE public.chart_of_accounts_template t
SET functional_type = m.functional_type
FROM _ft_map m
WHERE t.account_code = m.account_code;

-- 3b) Fallback minim pentru conturi de template inca fara functiune, derivat
--     din account_type deja existent (NU din prima cifra a codului):
--       asset -> activ, liability -> pasiv, equity -> pasiv.
--     Conturile de rezultat (revenue/expense) raman NULL: functiunea
--     activ/pasiv/bifunctional se aplica bilantului, nu contului de profit.
UPDATE public.chart_of_accounts_template t
SET functional_type = CASE t.account_type
    WHEN 'asset' THEN 'activ'
    WHEN 'liability' THEN 'pasiv'
    WHEN 'equity' THEN 'pasiv'
    ELSE NULL
END
WHERE t.functional_type IS NULL
  AND t.account_type IN ('asset', 'liability', 'equity');

-- 4) Backfill conturile companiilor existente ---------------------------------
--    a) din maparea autoritativa (cod exact)
UPDATE public.chart_of_accounts c
SET functional_type = m.functional_type
FROM _ft_map m
WHERE c.account_code = m.account_code
  AND c.functional_type IS DISTINCT FROM m.functional_type;

--    b) din template pentru orice cod ramas
UPDATE public.chart_of_accounts c
SET functional_type = t.functional_type
FROM public.chart_of_accounts_template t
WHERE c.account_code = t.account_code
  AND c.functional_type IS NULL
  AND t.functional_type IS NOT NULL;

--    c) fallback din account_type propriu, pentru conturi care nu exista in template
UPDATE public.chart_of_accounts c
SET functional_type = CASE c.account_type
    WHEN 'asset' THEN 'activ'
    WHEN 'liability' THEN 'pasiv'
    WHEN 'equity' THEN 'pasiv'
    ELSE NULL
END
WHERE c.functional_type IS NULL
  AND c.account_type IN ('asset', 'liability', 'equity');

-- 5) seed_standard_chart_of_accounts: copiaza si functional_type ---------------
CREATE OR REPLACE FUNCTION public.seed_standard_chart_of_accounts(_company_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    _user_id UUID;
    _inserted INT;
BEGIN
    _user_id := public.get_user_id_from_auth();

    IF NOT public.is_company_member(_user_id, _company_id)
       AND NOT public.has_role(_user_id, 'admin')
       AND NOT public.has_role(_user_id, 'super_admin') THEN
        RAISE EXCEPTION 'Acces interzis la compania % ', _company_id;
    END IF;

    INSERT INTO public.chart_of_accounts
        (company_id, account_code, account_name, account_type, functional_type, is_postable, is_system)
    SELECT _company_id, t.account_code, t.account_name, t.account_type, t.functional_type, t.is_postable, TRUE
    FROM public.chart_of_accounts_template t
    ON CONFLICT (company_id, account_code) DO NOTHING;

    GET DIAGNOSTICS _inserted = ROW_COUNT;

    UPDATE public.chart_of_accounts c
    SET parent_id = p.id
    FROM public.chart_of_accounts_template t
    JOIN public.chart_of_accounts p
      ON p.company_id = _company_id
     AND p.account_code = t.parent_code
    WHERE c.company_id = _company_id
      AND c.account_code = t.account_code
      AND t.parent_code IS NOT NULL
      AND c.parent_id IS DISTINCT FROM p.id;

    -- Completeaza functiunea pentru conturile deja existente ale companiei
    UPDATE public.chart_of_accounts c
    SET functional_type = t.functional_type
    FROM public.chart_of_accounts_template t
    WHERE c.company_id = _company_id
      AND c.account_code = t.account_code
      AND t.functional_type IS NOT NULL
      AND c.functional_type IS DISTINCT FROM t.functional_type;

    UPDATE public.statement_line_definitions sld
    SET chart_account_id = c.id
    FROM public.chart_of_accounts c
    WHERE sld.company_id = _company_id
      AND c.company_id = _company_id
      AND sld.account_code = c.account_code
      AND sld.chart_account_id IS NULL;

    RETURN _inserted;
END;
$fn$;

ALTER FUNCTION public.seed_standard_chart_of_accounts(UUID) OWNER TO postgres;
REVOKE EXECUTE ON FUNCTION public.seed_standard_chart_of_accounts(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.seed_standard_chart_of_accounts(UUID) TO authenticated;

-- ============================================================================
-- FIN
-- ============================================================================
`;

const outPath = join(repoRoot, 'supabase', 'migrations', '20260709100000_add_functional_type.sql');
writeFileSync(outPath, sql, 'utf8');
console.log('Wrote migration:', outPath, '(', Buffer.byteLength(sql, 'utf8'), 'bytes )');
