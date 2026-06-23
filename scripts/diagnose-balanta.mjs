/**
 * Diagnostic standalone pentru o balanță Excel.
 * Rulează: node scripts/diagnose-balanta.mjs "tmp/WPE august 2025.xlsx"
 *
 * Replică logica din src/lib/excel-parser.ts (fără excludere de rânduri),
 * pentru a izola unde apare dezechilibrul Sold inițial Debit vs Credit.
 */
import * as XLSX from 'xlsx';

const MAX_NUMERIC_VALUE = 999_999_999_999.99;
const MIN_NUMERIC_VALUE = -999_999_999_999.99;
const CONTROL_THRESHOLD = 0.01;

const filePath = process.argv[2] || 'tmp/WPE august 2025.xlsx';

function isBlankCell(value) {
  if (value === null || value === undefined) return true;
  return String(value).trim() === '';
}

/** Replica fidelă a parseNumber din excel-parser.ts */
function parseNumber(value) {
  if (value === null || value === undefined || value === '') return 0;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    if (value > MAX_NUMERIC_VALUE || value < MIN_NUMERIC_VALUE) return 0;
    return Math.round(value * 100) / 100;
  }

  const strValue = String(value).trim();
  if (strValue.length > 50) return 0;
  if (!/^-?[\d\s.,]+$/.test(strValue)) return 0;

  const lastDotIndex = strValue.lastIndexOf('.');
  const lastCommaIndex = strValue.lastIndexOf(',');

  let normalized;
  if (lastDotIndex > -1 && lastCommaIndex > -1) {
    if (lastCommaIndex > lastDotIndex) {
      normalized = strValue.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    } else {
      normalized = strValue.replace(/\s/g, '').replace(/,/g, '');
    }
  } else if (lastCommaIndex > -1) {
    normalized = strValue.replace(/\s/g, '').replace(',', '.');
  } else {
    normalized = strValue.replace(/\s/g, '');
  }

  const num = parseFloat(normalized);
  if (!Number.isFinite(num)) return 0;
  if (num > MAX_NUMERIC_VALUE || num < MIN_NUMERIC_VALUE) return 0;
  return Math.round(num * 100) / 100;
}

function sanitizeString(value) {
  if (value === null || value === undefined) return '';
  let s = String(value);
  s = s.replace(/^[=+\-@\t\r]+/, '');
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return s.trim();
}

const wb = XLSX.read(await import('node:fs').then(fs => fs.readFileSync(filePath)), {
  type: 'buffer',
  cellDates: false,
  cellNF: false,
  cellFormula: false,
});

console.log('='.repeat(70));
console.log('FIȘIER:', filePath);
console.log('FOI:', wb.SheetNames.join(', '));
console.log('='.repeat(70));

const sheet = wb.Sheets[wb.SheetNames[0]];
const range = XLSX.utils.decode_range(sheet['!ref']);
console.log('Range:', sheet['!ref'], '| coloane:', range.e.c + 1, '| rânduri:', range.e.r + 1);

const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log('Rânduri citite (sheet_to_json):', rows.length);
console.log('\n--- HEADER (rândul 1) ---');
console.log(JSON.stringify(rows[0]));
console.log('\n--- Primele 5 rânduri de date ---');
for (let i = 1; i <= 5 && i < rows.length; i++) {
  console.log(i + 1, JSON.stringify(rows[i]));
}

// Totaluri brute pe TOATE coloanele numerice (C..J = index 2..9), fără nicio regulă de excludere
const colTotals = Array(10).fill(0);
let dataRows = 0;
let blankRows = 0;
let noCodeRows = 0;
let invalidCodeRows = 0;
const invalidCodes = [];
let gMismatch = 0;
let hMismatch = 0;
const gMismatchExamples = [];
const hMismatchExamples = [];
const class67closing = [];
const negatives = [];
const dualOpening = [];

// contribuții SI
let siDebit = 0;
let siCredit = 0;
const siDebitTop = [];
const siCreditTop = [];

for (let i = 1; i < rows.length; i++) {
  const raw = rows[i] || [];
  const row = [...raw.slice(0, 10)];
  while (row.length < 10) row.push(undefined);

  if (row.every(isBlankCell)) { blankRows++; continue; }
  dataRows++;

  if (isBlankCell(row[0])) { noCodeRows++; }

  const code = sanitizeString(row[0]);
  const validCode = /^\d{3,6}$/.test(code);
  if (!isBlankCell(row[0]) && !validCode) {
    invalidCodeRows++;
    if (invalidCodes.length < 30) invalidCodes.push({ row: i + 1, code, name: sanitizeString(row[1]) });
  }

  const nums = row.map(parseNumber);
  for (let c = 2; c <= 9; c++) colTotals[c] += nums[c];

  const [, , od, oc, rd, rc, td, tc] = nums;

  // per-row G/H check (ca în validateRowTotalSums)
  const expG = Math.round((od + rd) * 100) / 100;
  const expH = Math.round((oc + rc) * 100) / 100;
  if (Math.abs(td - expG) > CONTROL_THRESHOLD) {
    gMismatch++;
    if (gMismatchExamples.length < 15) gMismatchExamples.push({ row: i + 1, code, fileG: td, expected: expG, diff: +(td - expG).toFixed(2) });
  }
  if (Math.abs(tc - expH) > CONTROL_THRESHOLD) {
    hMismatch++;
    if (hMismatchExamples.length < 15) hMismatchExamples.push({ row: i + 1, code, fileH: tc, expected: expH, diff: +(tc - expH).toFixed(2) });
  }

  // class 6/7 closing nonzero
  if ((code.startsWith('6') || code.startsWith('7')) &&
      (Math.abs(nums[8]) > CONTROL_THRESHOLD || Math.abs(nums[9]) > CONTROL_THRESHOLD)) {
    if (class67closing.length < 15) class67closing.push({ row: i + 1, code, fin_d: nums[8], fin_c: nums[9] });
  }

  // negative
  for (let c = 2; c <= 9; c++) {
    if (nums[c] < 0) { negatives.push({ row: i + 1, code, col: 'CDEFGHIJ'[c - 2], val: nums[c] }); break; }
  }

  // dual opening
  if (od > 0 && oc > 0) dualOpening.push({ row: i + 1, code, od, oc });

  siDebit += od;
  siCredit += oc;
  if (od !== 0) siDebitTop.push({ code, name: sanitizeString(row[1]), od });
  if (oc !== 0) siCreditTop.push({ code, name: sanitizeString(row[1]), oc });
}

const r2 = (n) => Math.round(n * 100) / 100;

console.log('\n' + '='.repeat(70));
console.log('TOTALURI BRUTE (toate rândurile, parseNumber, FĂRĂ excluderi)');
console.log('='.repeat(70));
console.log('SI Debit (C):   ', r2(colTotals[2]));
console.log('SI Credit (D):  ', r2(colTotals[3]));
console.log('  => diferență SI:', r2(colTotals[2] - colTotals[3]));
console.log('Rulaj D (E):    ', r2(colTotals[4]));
console.log('Rulaj C (F):    ', r2(colTotals[5]));
console.log('  => diferență Rulaj:', r2(colTotals[4] - colTotals[5]));
console.log('Total D (G):    ', r2(colTotals[6]));
console.log('Total C (H):    ', r2(colTotals[7]));
console.log('  => diferență Total sume:', r2(colTotals[6] - colTotals[7]));
console.log('Fin D (I):      ', r2(colTotals[8]));
console.log('Fin C (J):      ', r2(colTotals[9]));
console.log('  => diferență Fin:', r2(colTotals[8] - colTotals[9]));

console.log('\n' + '='.repeat(70));
console.log('STATISTICI RÂNDURI');
console.log('='.repeat(70));
console.log('Rânduri de date (non-blank):', dataRows);
console.log('Rânduri goale:', blankRows);
console.log('Rânduri fără cod (col A goală):', noCodeRows);
console.log('Rânduri cu cod INVALID (nu 3-6 cifre):', invalidCodeRows);
if (invalidCodes.length) {
  console.log('  Exemple coduri invalide:');
  invalidCodes.forEach(c => console.log('   rând', c.row, '| cod="' + c.code + '" | ' + c.name));
}

console.log('\n--- Rânduri respinse de validarea G = SI_D + Rulaj_D (' + gMismatch + ') ---');
gMismatchExamples.forEach(e => console.log('   rând', e.row, 'cont', e.code, '| fișier G=', e.fileG, 'calculat=', e.expected, 'diff=', e.diff));
console.log('\n--- Rânduri respinse de validarea H = SI_C + Rulaj_C (' + hMismatch + ') ---');
hMismatchExamples.forEach(e => console.log('   rând', e.row, 'cont', e.code, '| fișier H=', e.fileH, 'calculat=', e.expected, 'diff=', e.diff));

console.log('\n--- Conturi 6/7 cu sold final nenul (respinse) ---');
class67closing.forEach(e => console.log('   rând', e.row, 'cont', e.code, '| fin_d=', e.fin_d, 'fin_c=', e.fin_c));

console.log('\n--- Valori negative (primele 20) ---');
negatives.slice(0, 20).forEach(e => console.log('   rând', e.row, 'cont', e.code, 'col', e.col, '=', e.val));
console.log('   total rânduri cu negative:', negatives.length);

console.log('\n--- Conturi cu SI Debit ȘI SI Credit simultan (dual) ---');
dualOpening.slice(0, 20).forEach(e => console.log('   rând', e.row, 'cont', e.code, 'od=', e.od, 'oc=', e.oc));
console.log('   total dual opening:', dualOpening.length);

siDebitTop.sort((a, b) => b.od - a.od);
siCreditTop.sort((a, b) => b.oc - a.oc);
console.log('\n--- TOP 8 SI Debit ---');
siDebitTop.slice(0, 8).forEach(e => console.log('   ', e.code, e.od, '|', e.name));
console.log('\n--- TOP 8 SI Credit ---');
siCreditTop.slice(0, 8).forEach(e => console.log('   ', e.code, e.oc, '|', e.name));

console.log('\n' + '='.repeat(70));
console.log('DIFERENȚA RAPORTATĂ ÎN APP: 42.880.947,06');
console.log('Diferența SI brută calculată aici:', r2(colTotals[2] - colTotals[3]));
console.log('='.repeat(70));
