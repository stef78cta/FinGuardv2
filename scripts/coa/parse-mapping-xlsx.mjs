// Converts the "Finguard Chart of Accounts Mapping" .xlsx template into:
//   1. a normalized JSON template (scripts/coa/standard-coa-template.json)
//   2. a Supabase seed migration (global report scaffold + CoA template + KPIs)
//
// Usage:
//   node scripts/coa/parse-mapping-xlsx.mjs "tmp/finguard_chart_of_accounts_mapping (2).xlsx"
//
// The JSON + generated SQL are the durable artifacts; the source .xlsx is a
// one-time input. Re-run only when the template changes.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readXlsxSheet } from './lib/xlsx-lite.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');

const srcPath = process.argv[2] || join(repoRoot, 'tmp', 'finguard_chart_of_accounts_mapping (2).xlsx');

const STATEMENT_MAP = {
  'Balance Sheet': 'balance_sheet',
  'Profit & Loss': 'income_statement',
  'Cash Flow': 'cash_flow',
};
const PREFIX = { balance_sheet: 'bs', income_statement: 'pl', cash_flow: 'cf' };

const LINE_TYPE = {
  ACCOUNT_LEAF: 'account',
  ACCOUNT_GROUP: 'group',
  REPORT_GROUP: 'report',
  CALCULATED: 'calculated',
  INTERNAL_ANALYTIC: 'account',
  INTERNAL_GROUP: 'group',
};

/** Leading numeric class of a Romanian account code, or null if non-standard. */
function numericCode(code) {
  const m = String(code || '').match(/^(\d+)/);
  return m ? m[1] : null;
}

/**
 * Derives the accounting account_type (asset/liability/equity/revenue/expense)
 * from the Romanian account class + known exceptions. Presentation sign stays
 * separate (report_sign in statement_line_definitions).
 */
function classifyAccountType(code, normalBalance, reportArea) {
  const num = numericCode(code);
  if (!num) return null; // technical / internal node, not a CoA account
  const c1 = num[0];

  if (c1 === '6') return 'expense';
  if (c1 === '7') return 'revenue';
  if (c1 === '2' || c1 === '3') return 'asset';
  if (c1 === '5') return num.startsWith('519') ? 'liability' : 'asset';

  if (c1 === '1') {
    if (/^(101|105|106|117|121)/.test(num)) return 'equity';
    if (/^(151|158|162|166|167|168)/.test(num)) return 'liability';
    return 'equity';
  }

  if (c1 === '4') {
    const nb = (normalBalance || '').toLowerCase();
    if (nb.startsWith('debit')) return 'asset';
    if (nb.startsWith('credit')) return 'liability';
    // Mixt / unknown: fall back on report placement
    if ((reportArea || '').toLowerCase() === 'active') return 'asset';
    return 'liability';
  }
  return null;
}

/**
 * Derives the Romanian accounting FUNCTION of the account
 * (activ / pasiv / bifunctional) from the `account_balance_type` column of the
 * mapping sheet (debit / credit / mixed). This is a SEPARATE concept from the
 * balance side found in a trial balance; it belongs to the chart of accounts.
 */
function deriveFunctionalType(accountBalanceType) {
  const v = String(accountBalanceType || '').trim().toLowerCase();
  if (v === 'debit') return 'activ';
  if (v === 'credit') return 'pasiv';
  if (v === 'mixed' || v === 'mixt') return 'bifunctional';
  return null;
}

/** Maps a cash-flow row to a section + direction for cash_flow_mapping_rules. */
function cfSectionDirection(row) {
  const area = row.report_area || '';
  const l1 = (row.section_l1 || '').toLowerCase();
  const path = [row.section_l1, row.section_l2, row.section_l3, row.section_l4]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let direction = 'inflow';
  if (area === 'Plăți') direction = 'outflow';
  else if (area === 'Încasări') direction = 'inflow';
  else if (area === 'Sold numerar') direction = l1.includes('final') ? 'closing' : 'opening';

  if (/transfer|virament/.test(path) || /^cf_transfer/i.test(row.account_code || '')) {
    direction = 'internal_transfer';
  }

  let section = 'operating';
  if (area === 'Sold numerar') section = 'cash_balance';
  else if (/virament|transfer/.test(path)) section = 'internal_transfers';
  else if (/neob/.test(path)) section = 'unusual';
  else if (/financiar/.test(path)) section = 'financing';
  else if (/investi/.test(path)) section = 'investing';
  else section = 'operating';

  return { section, direction };
}

const KPI_MAP = {
  '% Marja operațională brută': { code: 'gross_margin_pct', name: 'Marja operațională brută' },
  '% Marja operațională din activitatea recurentă': {
    code: 'recurring_operating_margin_pct',
    name: 'Marja operațională din activitatea recurentă',
  },
  '% Marja EBITDA': { code: 'ebitda_margin_pct', name: 'Marja EBITDA' },
  '% Marja EBIT': { code: 'ebit_margin_pct', name: 'Marja EBIT' },
  '% Marja profit net': { code: 'net_profit_margin_pct', name: 'Marja profit net' },
};

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------
const { rows } = readXlsxSheet(srcPath);

const sld = [];
const cfRules = [];
const kpis = [];
const coaMap = new Map(); // account_code -> template row (dedup)

for (const r of rows) {
  if (!r.statement_type) continue;
  const statement = STATEMENT_MAP[r.statement_type];
  if (!statement) continue;

  const sort = parseInt(r.sort_order, 10) || 0;
  const rowType = r.row_type || '';
  const displayName =
    r.account_name ||
    r.section_l4 ||
    r.section_l3 ||
    r.section_l2 ||
    r.section_l1 ||
    r.report_area ||
    '(fără nume)';
  const lineKey = `${PREFIX[statement]}_${sort}`;
  const isKpi = statement === 'income_statement' && rowType === 'CALCULATED' && displayName.trim().startsWith('%');
  const lineType = isKpi ? 'kpi' : LINE_TYPE[rowType] || 'report';

  sld.push({
    statement_type: statement,
    line_key: lineKey,
    sort_order: sort,
    display_order: sort,
    display_name: displayName,
    report_area: r.report_area || null,
    section_l1: r.section_l1 || null,
    section_l2: r.section_l2 || null,
    section_l3: r.section_l3 || null,
    section_l4: r.section_l4 || null,
    account_code: r.account_code || null,
    row_type: rowType,
    line_type: lineType,
    normal_balance: r.normal_balance || null,
    report_sign: r.report_sign || null,
    is_leaf_for_calculation: String(r.is_leaf_for_calculation).toUpperCase() === 'TRUE',
    formula_or_rule: r.formula_or_rule || null,
    notes: r.notes || null,
  });

  // chart_of_accounts template: only real accounting accounts from BS/PL
  if (
    (statement === 'balance_sheet' || statement === 'income_statement') &&
    (rowType === 'ACCOUNT_LEAF' || rowType === 'ACCOUNT_GROUP') &&
    r.account_code &&
    numericCode(r.account_code)
  ) {
    const code = r.account_code.trim();
    if (!coaMap.has(code)) {
      const accType = classifyAccountType(code, r.normal_balance, r.report_area);
      if (accType) {
        coaMap.set(code, {
          account_code: code,
          account_name: r.account_name || displayName,
          account_type: accType,
          // Funcțiunea contabilă (activ/pasiv/bifunctional) din coloana
          // account_balance_type; separată de account_type de raportare.
          functional_type: deriveFunctionalType(r.account_balance_type),
          parent_code: (r.parent_code && numericCode(r.parent_code)) ? r.parent_code.trim() : null,
          is_postable: rowType === 'ACCOUNT_LEAF',
          sort_order: sort,
        });
      }
    }
  }

  // cash_flow_mapping_rules: CF leaves / transfers with a code reference
  if (statement === 'cash_flow' && (rowType === 'ACCOUNT_LEAF' || rowType === 'INTERNAL_ANALYTIC') && r.account_code) {
    const { section, direction } = cfSectionDirection(r);
    const isTransfer = direction === 'internal_transfer';
    const counterparty = isTransfer ? null : [r.account_code.trim()];
    const sign = ['+', '-', 'calculated'].includes(r.report_sign) ? r.report_sign : '+';
    cfRules.push({
      line_key: lineKey,
      description: displayName,
      cash_flow_direction: direction,
      section,
      counterparty_account_prefixes: counterparty,
      report_sign: sign,
      display_order: sort,
      formula_or_rule: r.formula_or_rule || null,
    });
  }

  // KPI definitions from % margin rows
  if (isKpi && KPI_MAP[displayName.trim()]) {
    const k = KPI_MAP[displayName.trim()];
    kpis.push({
      code: k.code,
      name: k.name,
      category: 'profitability',
      unit: 'percentage',
      formula: { type: 'ratio', expression: r.formula_or_rule || '', source_line_key: lineKey },
      description: r.formula_or_rule || null,
      display_order: sort,
    });
  }
}

// Parent codes that don't resolve to a template account -> null
const coaRows = [...coaMap.values()];
const codeSet = new Set(coaRows.map((a) => a.account_code));
for (const a of coaRows) if (a.parent_code && !codeSet.has(a.parent_code)) a.parent_code = null;

const template = {
  generated_at: new Date().toISOString(),
  source: 'finguard_chart_of_accounts_mapping (2).xlsx',
  counts: { statement_lines: sld.length, chart_accounts: coaRows.length, cash_flow_rules: cfRules.length, kpis: kpis.length },
  chart_of_accounts: coaRows,
  statement_line_definitions: sld,
  cash_flow_mapping_rules: cfRules,
  kpi_definitions: kpis,
};

writeFileSync(join(__dirname, 'standard-coa-template.json'), JSON.stringify(template, null, 2), 'utf8');

// ---------------------------------------------------------------------------
// Generate seed migration
// ---------------------------------------------------------------------------
const q = (v) => (v === null || v === undefined || v === '' ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const qb = (v) => (v ? 'TRUE' : 'FALSE');
const qn = (v) => (v === null || v === undefined || v === '' ? 'NULL' : String(v));
const qarr = (arr) =>
  arr === null || arr === undefined ? 'NULL' : `ARRAY[${arr.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(',')}]::TEXT[]`;

let sql = `-- ============================================================================
-- MIGRARE (GENERATA): seed template standard de raportare (global)
-- Data: 2026-07-03
-- Sursa: scripts/coa/parse-mapping-xlsx.mjs  (nu edita manual)
-- Continut: chart_of_accounts_template, statement_line_definitions (global),
--           cash_flow_mapping_rules (global), kpi_definitions (global)
-- ============================================================================

BEGIN;

-- Coloana functiunii contabile (activ/pasiv/bifunctional). Auto-continut, ca
-- seed-ul sa functioneze indiferent de ordinea migrarilor.
ALTER TABLE public.chart_of_accounts_template
    ADD COLUMN IF NOT EXISTS functional_type TEXT
        CHECK (functional_type IN ('activ', 'pasiv', 'bifunctional'));

-- Idempotenta: reincarca datele globale
DELETE FROM public.statement_line_definitions WHERE company_id IS NULL;
DELETE FROM public.cash_flow_mapping_rules     WHERE company_id IS NULL;
DELETE FROM public.chart_of_accounts_template;
DELETE FROM public.kpi_definitions
 WHERE company_id IS NULL
   AND code IN (${kpis.map((k) => q(k.code)).join(', ') || 'NULL'});

`;

// chart_of_accounts_template
sql += `-- chart_of_accounts_template (${coaRows.length} conturi standard, deduplicate)\n`;
sql += `INSERT INTO public.chart_of_accounts_template (account_code, account_name, account_type, functional_type, parent_code, is_postable, sort_order) VALUES\n`;
sql += coaRows
  .map((a) => `(${q(a.account_code)}, ${q(a.account_name)}, ${q(a.account_type)}, ${q(a.functional_type)}, ${q(a.parent_code)}, ${qb(a.is_postable)}, ${qn(a.sort_order)})`)
  .join(',\n');
sql += `;\n\n`;

// statement_line_definitions
sql += `-- statement_line_definitions (global, ${sld.length} randuri)\n`;
sql += `INSERT INTO public.statement_line_definitions
 (company_id, statement_type, line_key, sort_order, display_order, display_name, report_area,
  section_l1, section_l2, section_l3, section_l4, account_code, row_type, line_type,
  normal_balance, report_sign, is_leaf_for_calculation, formula_or_rule, notes) VALUES\n`;
sql += sld
  .map(
    (s) =>
      `(NULL, ${q(s.statement_type)}, ${q(s.line_key)}, ${qn(s.sort_order)}, ${qn(s.display_order)}, ${q(s.display_name)}, ${q(s.report_area)}, ` +
      `${q(s.section_l1)}, ${q(s.section_l2)}, ${q(s.section_l3)}, ${q(s.section_l4)}, ${q(s.account_code)}, ${q(s.row_type)}, ${q(s.line_type)}, ` +
      `${q(s.normal_balance)}, ${q(s.report_sign)}, ${qb(s.is_leaf_for_calculation)}, ${q(s.formula_or_rule)}, ${q(s.notes)})`
  )
  .join(',\n');
sql += `;\n\n`;

// cash_flow_mapping_rules
sql += `-- cash_flow_mapping_rules (global, ${cfRules.length} reguli)\n`;
sql += `INSERT INTO public.cash_flow_mapping_rules
 (company_id, line_key, description, cash_flow_direction, section,
  counterparty_account_prefixes, report_sign, display_order, formula_or_rule) VALUES\n`;
sql += cfRules
  .map(
    (r) =>
      `(NULL, ${q(r.line_key)}, ${q(r.description)}, ${q(r.cash_flow_direction)}, ${q(r.section)}, ` +
      `${qarr(r.counterparty_account_prefixes)}, ${q(r.report_sign)}, ${qn(r.display_order)}, ${q(r.formula_or_rule)})`
  )
  .join(',\n');
sql += `;\n\n`;

// kpi_definitions
sql += `-- kpi_definitions (global)\n`;
sql += `INSERT INTO public.kpi_definitions (company_id, code, name, category, formula, unit, description, display_order) VALUES\n`;
sql += kpis
  .map(
    (k) =>
      `(NULL, ${q(k.code)}, ${q(k.name)}, ${q(k.category)}, ${q(JSON.stringify(k.formula))}::jsonb, ${q(k.unit)}, ${q(k.description)}, ${qn(k.display_order)})`
  )
  .join(',\n');
sql += `;\n\nCOMMIT;\n`;

writeFileSync(join(repoRoot, 'supabase', 'migrations', '20260703100005_seed_standard_report_template.sql'), sql, 'utf8');

console.log('OK');
console.log('  statement_line_definitions:', sld.length);
console.log('  chart_of_accounts_template:', coaRows.length);
console.log('  cash_flow_mapping_rules   :', cfRules.length);
console.log('  kpi_definitions           :', kpis.length);
