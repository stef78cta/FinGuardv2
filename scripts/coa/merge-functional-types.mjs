/**
 * Îmbogățește standard-coa-template.json cu functional_type din chart_of_accounts_cu_tip_cont.xlsx
 * Usage: node scripts/coa/merge-functional-types.mjs [tip_cont.xlsx]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tipPath = process.argv[2] || join(__dirname, '..', '..', 'tmp/files_ex/chart_of_accounts_cu_tip_cont.xlsx');
const jsonPath = join(__dirname, 'standard-coa-template.json');

const BALANCE_TO_FUNCTIONAL = { debit: 'activ', credit: 'pasiv', mixed: 'bifunctional' };
const OVERRIDES = {
  '378': 'bifunctional',
  '4093': 'activ',
  '4452': 'activ',
  '4511': 'bifunctional',
  '4551': 'bifunctional',
  '4752': 'pasiv',
  '205': 'activ',
  '2071': 'activ',
  '261': 'activ',
  '2805': 'pasiv',
  '2807': 'pasiv',
  '1171': 'bifunctional',
  '1174': 'bifunctional',
  '121': 'bifunctional',
  '4411': 'bifunctional',
};

function readZipEntries(buf) {
  const entries = new Map();
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Invalid xlsx');
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

function readSheet(path) {
  const buf = readFileSync(path);
  const entries = readZipEntries(buf);
  const sharedXml = entries.get('xl/sharedStrings.xml')?.toString('utf8') || '';
  const shared = [];
  const siRe = /<(?:x:)?si>([\s\S]*?)<\/(?:x:)?si>/g;
  let m;
  while ((m = siRe.exec(sharedXml)) !== null) {
    const tRe = /<(?:x:)?t[^>]*>([\s\S]*?)<\/(?:x:)?t>/g;
    let t;
    let s = '';
    while ((t = tRe.exec(m[1])) !== null) s += t[1];
    shared.push(s);
  }
  const xml = entries.get('xl/worksheets/sheet1.xml').toString('utf8');
  const colToNum = (col) => {
    let n = 0;
    for (let i = 0; i < col.length; i++) n = n * 26 + (col.charCodeAt(i) - 64);
    return n;
  };
  const rows = [];
  const rowRe = /<(?:x:)?row[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/(?:x:)?row>/g;
  let rm;
  while ((rm = rowRe.exec(xml)) !== null) {
    const cells = {};
    const cellRe = /<(?:x:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:x:)?c>)/g;
    let cm;
    while ((cm = cellRe.exec(rm[2])) !== null) {
      const attrs = cm[1];
      const rMatch = /\br="([A-Z]+)\d+"/.exec(attrs);
      if (!rMatch) continue;
      const col = colToNum(rMatch[1]);
      let val = '';
      const vMatch = /<(?:x:)?v>([\s\S]*?)<\/(?:x:)?v>/.exec(cm[2] || '');
      if (/t="s"/.test(attrs) && vMatch) val = shared[parseInt(vMatch[1], 10)] || '';
      else if (vMatch) val = vMatch[1];
      cells[col] = val;
    }
    rows.push(cells);
  }
  const maxCol = Math.max(...rows.flatMap((r) => Object.keys(r).map(Number)));
  const headers = rows[0];
  return rows.slice(1).map((r) => {
    const o = {};
    for (let c = 1; c <= maxCol; c++) o[headers[c]] = r[c] ?? '';
    return o;
  });
}

const ftMap = new Map();
for (const r of readSheet(tipPath)) {
  const code = (r.account_code || '').trim();
  const abt = (r.account_balance_type || '').trim().toLowerCase();
  const ft = BALANCE_TO_FUNCTIONAL[abt];
  if (code && ft) ftMap.set(code, ft);
}
for (const [code, ft] of Object.entries(OVERRIDES)) ftMap.set(code, ft);

const template = JSON.parse(readFileSync(jsonPath, 'utf8'));
let updated = 0;
let fallback = 0;
for (const acc of template.chart_of_accounts) {
  const ft = ftMap.get(acc.account_code);
  if (ft) {
    if (acc.functional_type !== ft) updated++;
    acc.functional_type = ft;
  } else if (!acc.functional_type && ['asset', 'liability', 'equity'].includes(acc.account_type)) {
    acc.functional_type =
      acc.account_type === 'asset' ? 'activ' : acc.account_type === 'equity' ? 'pasiv' : 'pasiv';
    fallback++;
  }
}
template.functional_types_merged_at = new Date().toISOString();
writeFileSync(jsonPath, JSON.stringify(template, null, 2), 'utf8');
console.log('Merged functional_type:', updated, 'updated,', fallback, 'fallback, map size:', ftMap.size);
