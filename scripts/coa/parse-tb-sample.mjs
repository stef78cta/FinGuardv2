import { readXlsxSheet } from './lib/xlsx-lite.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const path = process.argv[2] || join(repoRoot, 'tmp/files_ex/WPE august 2025.xlsx');

const { rows } = readXlsxSheet(path);
const accounts = [];
for (const r of rows) {
  const code = String(r.account_code ?? r['Cod cont'] ?? r['Cont'] ?? '').trim();
  if (!/^\d/.test(code)) continue;
  const cd = Number(String(r.closing_debit ?? r['Sold final debit'] ?? 0).replace(/\s/g, '').replace(',', '.')) || 0;
  const cc = Number(String(r.closing_credit ?? r['Sold final credit'] ?? 0).replace(/\s/g, '').replace(',', '.')) || 0;
  if (Math.abs(cd) < 0.01 && Math.abs(cc) < 0.01) continue;
  accounts.push({ account_code: code, account_name: r.account_name || r['Denumire'] || '', closing_debit: cd, closing_credit: cc });
}

const out = join(repoRoot, 'tmp/audit/sample-tb-accounts.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ source: path, count: accounts.length, accounts }, null, 2));
console.log('Parsed', accounts.length, 'accounts from', path);
console.log('Written', out);
