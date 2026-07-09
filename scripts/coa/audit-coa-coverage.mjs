/**
 * Audit complet CoA + SLD + balanță — raport JSON/CSV pentru reconciliere.
 * Usage: node scripts/coa/audit-coa-coverage.mjs [mapping.xlsx] [tip_cont.xlsx] [balanta.xlsx]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readXlsxSheet } from './lib/xlsx-lite.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');

const balantaPath =
  process.argv[4] ||
  process.argv[3] ||
  process.argv[2] ||
  join(repoRoot, 'tmp/files_ex/WPE august 2025.xlsx');

const jsonPath = join(repoRoot, 'scripts/coa/standard-coa-template.json');
const template = JSON.parse(readFileSync(jsonPath, 'utf8'));

const CONTRA_PREFIXES = ['28', '29', '39', '49', '19'];
const BS_TYPES = new Set(['asset', 'liability', 'equity']);

/** Frunze din migrări care nu sunt încă în JSON (până la regenerare seed). */
const MIGRATION_BS_LEAVES = [
  { line_key: 'bs_35', account_code: '205', report_area: 'Active' },
  { line_key: 'bs_38', account_code: '2071', report_area: 'Active' },
  { line_key: 'bs_55', account_code: '2805', report_area: 'Active' },
  { line_key: 'bs_65', account_code: '2807', report_area: 'Active' },
  { line_key: 'bs_95', account_code: '261', report_area: 'Active' },
  { line_key: 'bs_1085', account_code: '4411', report_area: 'Active' },
  { line_key: 'bs_215', account_code: '4093', report_area: 'Active' },
  { line_key: 'bs_296', account_code: '4452', report_area: 'Active' },
  { line_key: 'bs_481', account_code: '357', report_area: 'Active' },
  { line_key: 'bs_482', account_code: '378', report_area: 'Active' },
  { line_key: 'bs_483', account_code: '381', report_area: 'Active' },
  { line_key: 'bs_484', account_code: '378', report_area: 'Pasive' },
  { line_key: 'bs_606', account_code: '4511', report_area: 'Active' },
  { line_key: 'bs_1295', account_code: '4511', report_area: 'Pasive' },
  { line_key: 'bs_701', account_code: '5125', report_area: 'Active' },
  { line_key: 'bs_1285', account_code: '4551', report_area: 'Pasive' },
  { line_key: 'bs_605', account_code: '4551', report_area: 'Active' },
  { line_key: 'bs_1435', account_code: '4752', report_area: 'Pasive' },
  { line_key: 'bs_615', account_code: '473', report_area: 'Active' },
  { line_key: 'bs_1145', account_code: '4428', report_area: 'Active' },
  { line_key: 'bs_1146', account_code: '4428', report_area: 'Pasive' },
  { line_key: 'bs_1225', account_code: '448', report_area: 'Active' },
  { line_key: 'bs_1226', account_code: '448', report_area: 'Pasive' },
  { line_key: 'bs_1075', account_code: '438', report_area: 'Active' },
  { line_key: 'bs_1076', account_code: '438', report_area: 'Pasive' },
  { line_key: 'bs_865', account_code: '428', report_area: 'Active' },
  { line_key: 'bs_866', account_code: '428', report_area: 'Pasive' },
];

function economicNet(debit, credit) {
  return (Number(debit) || 0) - (Number(credit) || 0);
}

function economicSide(debit, credit) {
  const net = economicNet(debit, credit);
  if (Math.abs(net) <= 0.01) return 'zero';
  return net > 0 ? 'debit' : 'credit';
}

function isContra(code) {
  return CONTRA_PREFIXES.some((p) => code.startsWith(p)) || code === '378';
}

function longestPrefixLeaves(code, leaves) {
  const matches = leaves.filter(
    (l) => code === l.account_code || code.startsWith(`${l.account_code}`),
  );
  const maxLen = Math.max(0, ...matches.map((m) => m.account_code.length));
  return matches.filter((m) => m.account_code.length === maxLen);
}

function resolveCoa(tbCode, coaByCode) {
  if (coaByCode.has(tbCode)) return coaByCode.get(tbCode);
  const prefix = [...coaByCode.keys()]
    .filter((k) => tbCode.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? coaByCode.get(prefix) : null;
}

function auditBifunctional(coa, leaves, side, lookupCode) {
  const matching = longestPrefixLeaves(lookupCode ?? coa.account_code, leaves);
  if (matching.length === 0) return { status: 'not_in_report', routes: [] };
  if (coa.account_type === 'equity') {
    const hasPassive = matching.some((l) => l.report_area === 'Pasive');
    return hasPassive
      ? { status: 'equity_routed_ok', routes: matching.map((l) => l.line_key) }
      : { status: 'equity_missing_pasive', routes: matching.map((l) => l.line_key) };
  }
  const hasActive = matching.some((l) => l.report_area === 'Active');
  const hasPassive = matching.some((l) => l.report_area === 'Pasive');
  if (!hasActive || !hasPassive) {
    return { status: 'dual_route_incomplete', routes: matching.map((l) => l.line_key) };
  }
  const route =
    side === 'debit'
      ? matching.find((l) => l.report_area === 'Active')
      : matching.find((l) => l.report_area === 'Pasive');
  return {
    status: route ? 'dual_routed_ok' : 'dual_missing_side_route',
    routes: matching.map((l) => `${l.line_key}:${l.report_area}`),
    activeRoute: route?.line_key,
  };
}

function parseTrialBalance(path) {
  const { rows } = readXlsxSheet(path);
  const accounts = [];
  for (const r of rows) {
    const code = String(r.cont ?? r.account_code ?? r['Cod cont'] ?? '').trim();
    if (!/^\d/.test(code)) continue;
    const closingDebit = Number(r.fin_d ?? r.closing_debit ?? 0) || 0;
    const closingCredit = Number(r.fin_c ?? r.closing_credit ?? 0) || 0;
    if (Math.abs(closingDebit) <= 0.01 && Math.abs(closingCredit) <= 0.01) continue;
    accounts.push({
      account_code: code,
      account_name: String(r.denumire ?? r.account_name ?? ''),
      closing_debit: closingDebit,
      closing_credit: closingCredit,
    });
  }
  return accounts;
}

const coaAccounts = [...template.chart_of_accounts];
const coaByCode = new Map(coaAccounts.map((c) => [c.account_code, c]));

const bsLeaves = [
  ...template.statement_line_definitions.filter(
    (l) => l.statement_type === 'balance_sheet' && l.is_leaf_for_calculation && l.account_code,
  ),
  ...MIGRATION_BS_LEAVES.filter(
    (m) =>
      !template.statement_line_definitions.some(
        (l) => l.statement_type === 'balance_sheet' && l.line_key === m.line_key,
      ),
  ),
];

const plLeaves = template.statement_line_definitions.filter(
  (l) => l.statement_type === 'income_statement' && l.is_leaf_for_calculation && l.account_code,
);

let tbAccounts = [];
try {
  tbAccounts = parseTrialBalance(balantaPath);
} catch (e) {
  console.warn('TB parse failed:', e.message);
}

const auditRows = [];
const summary = {
  coa_postable_bs_without_leaf: [],
  coa_bifunctional_issues: [],
  tb_unmapped: [],
  tb_not_in_report: [],
  tb_pnl_closing_balance: [],
  tb_bifunctional_issues: [],
  tb_contra_normal: [],
  tb_included: [],
};

for (const coa of coaAccounts.filter((c) => c.is_postable && BS_TYPES.has(c.account_type))) {
  const leaves = longestPrefixLeaves(coa.account_code, bsLeaves);
  if (leaves.length === 0) summary.coa_postable_bs_without_leaf.push(coa.account_code);
}

for (const tb of tbAccounts) {
  const coa = resolveCoa(tb.account_code, coaByCode);
  const side = economicSide(tb.closing_debit, tb.closing_credit);
  const net = economicNet(tb.closing_debit, tb.closing_credit);
  const c1 = tb.account_code[0];

  const row = {
    account_code: tb.account_code,
    account_name: tb.account_name,
    closing_debit: tb.closing_debit,
    closing_credit: tb.closing_credit,
    economic_net: net,
    economic_side: side,
    coa_code: coa?.account_code ?? null,
    account_type: coa?.account_type ?? null,
    functional_type: coa?.functional_type ?? null,
    report_line: null,
    report_area: null,
    inclusion: 'excluded',
    issue_type: null,
    notes: null,
  };

  if (!coa) {
    row.issue_type = 'unmapped';
    row.notes = 'Cont absent din chart_of_accounts_template';
    summary.tb_unmapped.push(tb.account_code);
    auditRows.push(row);
    continue;
  }

  if ((c1 === '6' || c1 === '7') && side !== 'zero') {
    const plMatch = longestPrefixLeaves(coa.account_code, plLeaves);
    row.issue_type = 'pnl_closing_balance';
    row.notes = 'Sold final nenul pe cont P&L — verificați închiderea exercițiului';
    row.report_line = plMatch[0]?.line_key ?? null;
    summary.tb_pnl_closing_balance.push(tb.account_code);
    auditRows.push(row);
    continue;
  }

  if (!BS_TYPES.has(coa.account_type)) {
    row.notes = 'Cont nematerial pentru bilanț';
    auditRows.push(row);
    continue;
  }

  if (coa.functional_type === 'bifunctional') {
    const bf = auditBifunctional(coa, bsLeaves, side, tb.account_code);
    const routeLeaf = longestPrefixLeaves(tb.account_code, bsLeaves);
    row.report_line = routeLeaf[0]?.line_key ?? bf.activeRoute ?? bf.routes[0] ?? null;
    row.report_area = routeLeaf[0]?.report_area ?? null;
    if (bf.status.includes('ok')) {
      row.inclusion = 'included';
      row.issue_type = bf.status;
      summary.tb_included.push(tb.account_code);
    } else {
      row.inclusion = 'excluded';
      row.issue_type = bf.status;
      summary.tb_bifunctional_issues.push({ code: tb.account_code, status: bf.status });
    }
  } else {
    const leaves = longestPrefixLeaves(tb.account_code, bsLeaves);
    if (leaves.length === 0) {
      row.issue_type = 'not_in_report';
      summary.tb_not_in_report.push(tb.account_code);
    } else {
      row.inclusion = 'included';
      row.report_line = leaves[0].line_key;
      row.report_area = leaves[0].report_area;
      summary.tb_included.push(tb.account_code);
      if (isContra(tb.account_code)) {
        row.issue_type = 'contra_normal';
        row.notes = 'Cont rectificativ — sold pe partea opusă poate fi normal';
        summary.tb_contra_normal.push(tb.account_code);
      }
    }
  }

  auditRows.push(row);
}

const outDir = join(repoRoot, 'tmp/audit');
mkdirSync(outDir, { recursive: true });

const report = {
  generated_at: new Date().toISOString(),
  sources: { jsonPath, balantaPath },
  counts: {
    coa_total: coaAccounts.length,
    coa_postable_bs: coaAccounts.filter((c) => c.is_postable && BS_TYPES.has(c.account_type)).length,
    bs_leaves: bsLeaves.length,
    pl_leaves: plLeaves.length,
    tb_with_balance: tbAccounts.length,
    tb_included: summary.tb_included.length,
    ...Object.fromEntries(Object.entries(summary).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])),
  },
  summary,
  rows: auditRows,
};

writeFileSync(join(outDir, 'coa-audit-report.json'), JSON.stringify(report, null, 2));

const csvHeader =
  'account_code;account_name;closing_debit;closing_credit;economic_net;economic_side;coa_code;account_type;functional_type;report_line;inclusion;issue_type;notes\n';
const csvBody = auditRows
  .map((r) =>
    [
      r.account_code,
      r.account_name,
      r.closing_debit,
      r.closing_credit,
      r.economic_net,
      r.economic_side,
      r.coa_code,
      r.account_type,
      r.functional_type,
      r.report_line,
      r.inclusion,
      r.issue_type,
      r.notes,
    ]
      .map((v) => (v == null ? '' : String(v).replace(/;/g, ',')))
      .join(';'),
  )
  .join('\n');
writeFileSync(join(outDir, 'coa-audit-report.csv'), csvHeader + csvBody, 'utf8');

console.log('=== AUDIT COMPLET ===');
console.log('Balanță:', balantaPath);
console.log('Conturi TB cu sold:', tbAccounts.length);
console.log('Incluse în raport:', summary.tb_included.length);
console.log('Nemapate:', summary.tb_unmapped.length);
console.log('Fără linie leaf:', summary.tb_not_in_report.length);
console.log('Bifuncționale cu probleme:', summary.tb_bifunctional_issues.length);
console.log('P&L sold final nenul:', summary.tb_pnl_closing_balance.length);
console.log('CoA postable fără leaf:', summary.coa_postable_bs_without_leaf.length);
if (summary.tb_unmapped.length) console.log('  unmapped:', summary.tb_unmapped.join(', '));
if (summary.tb_not_in_report.length) console.log('  not_in_report:', summary.tb_not_in_report.join(', '));
if (summary.tb_bifunctional_issues.length)
  console.log('  bifunctional:', JSON.stringify(summary.tb_bifunctional_issues));
console.log('\nRapoarte:', join(outDir, 'coa-audit-report.json'), join(outDir, 'coa-audit-report.csv'));
