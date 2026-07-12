import { describe, expect, it } from 'vitest';
import { detectBalanceFormat, parseExcelRows } from '@/lib/excel-parser';

// ---------------------------------------------------------------------------
// Format 10 coloane (A–J)
// ---------------------------------------------------------------------------

const HEADER_10 = [
  'Cont',
  'Denumire',
  'SI Debit',
  'SI Credit',
  'Rulaj D',
  'Rulaj C',
  'total_sume_debitoare',
  'total_sume_creditoare',
  'SF Debit',
  'SF Credit',
];

/** Balanță echilibrată minimă (2 conturi) — format 10 coloane */
const VALID_ROWS_10 = [
  HEADER_10,
  ['101', 'Capital', 0, 1000, 0, 500, 0, 1500, 0, 1500],
  ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0],
];

describe('parseExcelRows — format 10 coloane', () => {
  it('acceptă balanță validă cu 10 coloane și detectează formatul automat', () => {
    const result = parseExcelRows(VALID_ROWS_10);

    expect(result.ok).toBe(true);
    expect(result.format).toBe('10_COLUMNS');
    expect(result.accounts).toHaveLength(2);
    expect(result.accounts[0]).toMatchObject({
      account_code: '101',
      total_sume_debitoare: 0,
      total_sume_creditoare: 1500,
      closing_debit: 0,
      closing_credit: 1500,
    });
    expect(result.accounts[1]).toMatchObject({
      account_code: '5121',
      total_sume_debitoare: 1500,
      total_sume_creditoare: 0,
      closing_debit: 1500,
      closing_credit: 0,
    });
  });

  it('respinge fișier cu date peste coloana J', () => {
    const rowsWithExtra = [
      ...VALID_ROWS_10.slice(0, 1),
      ['101', 'Capital', 0, 1000, 0, 500, 0, 1500, 0, 1500, 'extra'],
      ...VALID_ROWS_10.slice(2),
    ];

    const result = parseExcelRows(rowsWithExtra);

    expect(result.ok).toBe(false);
    expect(result.blockingErrors.some((e) => e.code === 'EXCEL_INVALID_COLUMN_COUNT')).toBe(true);
  });

  it('acceptă balanță cu rulaj lunar și total sume cumulate (nu mai respinge rândurile)', () => {
    const rows = [
      HEADER_10,
      ['121', 'Profit și pierdere', 0, 7000, 3600, 5000, 34000, 37000, 0, 3000],
      ['5121', 'Bancă', 7000, 0, 5000, 3600, 37000, 34000, 3000, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(true);
    expect(result.format).toBe('10_COLUMNS');
    expect(result.totals.opening_debit).toBe(7000);
    expect(result.totals.opening_credit).toBe(7000);
  });

  it('nu folosește total_sume (G/H) ca rulaj lunar la 10 coloane', () => {
    const rows = [
      HEADER_10,
      ['121', 'Profit și pierdere', 0, 7000, 3600, 5000, 34000, 37000, 0, 3000],
      ['5121', 'Bancă', 7000, 0, 5000, 3600, 37000, 34000, 3000, 0],
    ];

    const result = parseExcelRows(rows);

    const banca = result.accounts.find((a) => a.account_code === '5121')!;
    // Rulajul provine din E/F, NU din G/H (total sume).
    expect(banca.debit_turnover).toBe(5000);
    expect(banca.credit_turnover).toBe(3600);
    expect(banca.total_sume_debitoare).toBe(37000);
    expect(banca.total_sume_creditoare).toBe(34000);
    // Soldul final provine din I/J, NU din G/H.
    expect(banca.closing_debit).toBe(3000);
    expect(banca.closing_credit).toBe(0);
  });

  it('respinge rând unde SF net != Total Sume Debit − Total Sume Credit', () => {
    const rows = [
      HEADER_10,
      ['101', 'Capital', 0, 1000, 0, 500, 0, 1500, 0, 1500],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1400, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(false);
    expect(
      result.blockingErrors.some((e) => e.code === 'BALANCE_CLOSING_MISMATCH_DETECTED'),
    ).toBe(true);
    expect(result.rowErrors.some((e) => e.code === 'BALANCE_ROW_CLOSING_MISMATCH')).toBe(true);
  });

  it('acceptă diferență de maximum 0.01 RON la identitatea soldului final', () => {
    const rows = [
      HEADER_10,
      ['101', 'Capital', 0, 1000, 0, 500, 0, 1500, 0, 1500],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500.005, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(true);
  });

  it('respinge dezechilibru SI Debit vs SI Credit', () => {
    const rows = [
      HEADER_10,
      ['101', 'Capital', 0, 2000, 0, 500, 0, 2500, 0, 2500],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(false);
    expect(result.blockingErrors.some((e) => e.code === 'BALANCE_CONTROL_OPENING_MISMATCH')).toBe(true);
  });

  it('respinge dezechilibru Rulaj D vs Rulaj C', () => {
    const rows = [
      HEADER_10,
      ['101', 'Capital', 0, 1000, 0, 600, 0, 1600, 0, 1600],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(false);
    expect(result.blockingErrors.some((e) => e.code === 'BALANCE_CONTROL_TURNOVER_MISMATCH')).toBe(true);
  });

  it('respinge dezechilibru SF Debit vs SF Credit', () => {
    const rows = [
      HEADER_10,
      ['101', 'Capital', 0, 1000, 0, 500, 0, 1500, 0, 1600],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(false);
    expect(result.blockingErrors.some((e) => e.code === 'BALANCE_CONTROL_TOTAL_MISMATCH')).toBe(true);
  });

  it('respinge cont invalid și cont lipsă', () => {
    const rowsMissing = [
      HEADER_10,
      ['', 'Fără cont', 0, 0, 0, 0, 0, 0, 0, 0],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0],
    ];
    const resultMissing = parseExcelRows(rowsMissing);
    expect(resultMissing.ok).toBe(false);
    expect(resultMissing.rowErrors.some((e) => e.code === 'BALANCE_ROW_ACCOUNT_MISSING')).toBe(true);

    const rowsInvalid = [
      HEADER_10,
      ['12', 'Cont scurt', 0, 0, 0, 0, 0, 0, 0, 0],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0],
    ];
    const resultInvalid = parseExcelRows(rowsInvalid);
    expect(resultInvalid.rowErrors.some((e) => e.code === 'BALANCE_ROW_ACCOUNT_INVALID')).toBe(true);
    expect(resultInvalid.rowErrors.some((e) => e.message.includes('Cont prea scurt — minimum 3 cifre'))).toBe(true);
  });

  it('acceptă cont alfanumeric valid (ex: ABC123)', () => {
    const rows = [
      HEADER_10,
      ['101', 'Capital', 0, 1000, 0, 500, 0, 1500, 0, 1500],
      ['ABC123', 'Cont alfanumeric', 1000, 0, 500, 0, 1500, 0, 1500, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(true);
    expect(result.accounts.some((a) => a.account_code === 'ABC123')).toBe(true);
  });

  it('respinge cont prea lung, clasa 9 și acceptă mix numeric + alfanumeric', () => {
    const rowsRejected = [
      HEADER_10,
      ['10123456', 'Prea lung', 0, 0, 0, 0, 0, 0, 0, 0],
      ['9111', 'Clasa 9', 0, 0, 0, 0, 0, 0, 0, 0],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0],
    ];
    const rejected = parseExcelRows(rowsRejected);
    expect(rejected.rowErrors.filter((e) => e.code === 'BALANCE_ROW_ACCOUNT_INVALID')).toHaveLength(2);

    const rowsMixed = [
      HEADER_10,
      ['401', 'Numeric', 0, 1000, 0, 500, 0, 1500, 0, 1500],
      ['401A', 'Alfanumeric', 1000, 0, 500, 0, 1500, 0, 1500, 0],
    ];
    const mixed = parseExcelRows(rowsMixed);
    expect(mixed.ok).toBe(true);
    expect(mixed.accounts.map((a) => a.account_code)).toEqual(['401', '401A']);
  });

  it('ignoră rânduri complet goale', () => {
    const rows = [
      HEADER_10,
      [],
      ['101', 'Capital', 0, 1000, 0, 500, 0, 1500, 0, 1500],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(true);
    expect(result.accounts).toHaveLength(2);
  });

  it('tratează celule numerice goale ca 0 în structura corectă', () => {
    const rows = [
      HEADER_10,
      ['101', 'Capital', '', 1000, '', 500, '', 1500, '', 1500],
      ['5121', 'Bancă', 1000, '', 500, '', 1500, '', 1500, ''],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(true);
    expect(result.accounts[0].opening_debit).toBe(0);
    expect(result.accounts[0].opening_credit).toBe(1000);
    expect(result.accounts[1].total_sume_debitoare).toBe(1500);
  });

  it('nu returnează conturi când parseResult.ok === false', () => {
    const rows = [
      HEADER_10,
      ['5121', 'Bancă', 1000, 0, 500, 0, 1400, 0, 1500, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(false);
    expect(result.accounts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Format 8 coloane (A–H)
// ---------------------------------------------------------------------------

const HEADER_8 = [
  'Cont',
  'Denumire',
  'SI Debit',
  'SI Credit',
  'Rulaj D',
  'Rulaj C',
  'SF Debit',
  'SF Credit',
];

/** Balanță echilibrată minimă (2 conturi) — format 8 coloane */
const VALID_ROWS_8 = [
  HEADER_8,
  ['101', 'Capital', 0, 1000, 0, 500, 0, 1500],
  ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0],
];

describe('parseExcelRows — format 8 coloane', () => {
  it('acceptă balanță validă cu 8 coloane și detectează formatul automat', () => {
    const result = parseExcelRows(VALID_ROWS_8);

    expect(result.ok).toBe(true);
    expect(result.format).toBe('8_COLUMNS');
    expect(result.accounts).toHaveLength(2);
  });

  it('nu mai returnează EXCEL_LEGACY_8_COLUMN_FORMAT', () => {
    const result = parseExcelRows(VALID_ROWS_8);
    expect(result.blockingErrors.some((e) => e.code === 'EXCEL_LEGACY_8_COLUMN_FORMAT')).toBe(false);
  });

  it('mapează corect A–H (G/H = sold final, NU total sume)', () => {
    const result = parseExcelRows(VALID_ROWS_8);

    const banca = result.accounts.find((a) => a.account_code === '5121')!;
    expect(banca.opening_debit).toBe(1000);
    expect(banca.opening_credit).toBe(0);
    expect(banca.debit_turnover).toBe(500);
    expect(banca.credit_turnover).toBe(0);
    // Coloanele G/H sunt sold final la 8 coloane.
    expect(banca.closing_debit).toBe(1500);
    expect(banca.closing_credit).toBe(0);
  });

  it('calculează total_sume intern: total_sume_debitoare = SI debit + rulaj debit', () => {
    const result = parseExcelRows(VALID_ROWS_8);

    const banca = result.accounts.find((a) => a.account_code === '5121')!;
    expect(banca.total_sume_debitoare).toBe(1000 + 500);
    expect(banca.total_sume_creditoare).toBe(0);

    const capital = result.accounts.find((a) => a.account_code === '101')!;
    expect(capital.total_sume_debitoare).toBe(0);
    expect(capital.total_sume_creditoare).toBe(1000 + 500);
  });

  it('semnalează prin warning că total_sume sunt calculate din formatul 8 coloane', () => {
    const result = parseExcelRows(VALID_ROWS_8);
    expect(
      result.warnings.some((w) => w.code === 'TOTAL_SUME_COMPUTED_FROM_8_COLUMN_FORMAT'),
    ).toBe(true);
  });

  it('nu aplică validarea per-rând total_sume la 8 coloane (SI+Rulaj≠SF nu blochează pe total_sume)', () => {
    // La 8 coloane nu există coloana total_sume în Excel; verificarea SF↔total_sume nu se aplică.
    const result = parseExcelRows(VALID_ROWS_8);
    expect(result.rowErrors.some((e) => e.code === 'BALANCE_ROW_CLOSING_MISMATCH')).toBe(false);
    expect(
      result.blockingErrors.some((e) => e.code === 'BALANCE_CLOSING_MISMATCH_DETECTED'),
    ).toBe(false);
  });

  it('păstrează controalele globale SI/Rulaj/SF echilibrate la 8 coloane', () => {
    const unbalanced = [
      HEADER_8,
      ['101', 'Capital', 0, 2000, 0, 500, 0, 2500],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0],
    ];
    const result = parseExcelRows(unbalanced);
    expect(result.ok).toBe(false);
    expect(result.blockingErrors.some((e) => e.code === 'BALANCE_CONTROL_OPENING_MISMATCH')).toBe(true);
  });

  it('păstrează validările pentru cont invalid/lipsă la 8 coloane', () => {
    const rows = [
      HEADER_8,
      ['', 'Fără cont', 0, 0, 0, 0, 0, 0],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0],
    ];
    const result = parseExcelRows(rows);
    expect(result.ok).toBe(false);
    expect(result.rowErrors.some((e) => e.code === 'BALANCE_ROW_ACCOUNT_MISSING')).toBe(true);
  });

  it('respinge fișier cu date peste H dacă este forțat format 8', () => {
    // Fișier cu 10 coloane, dar utilizatorul forțează 8 → contradicție structurală.
    const result = parseExcelRows(VALID_ROWS_10, { forcedFormat: '8_COLUMNS' });
    expect(result.ok).toBe(false);
    expect(result.blockingErrors.some((e) => e.code === 'EXCEL_FORCED_FORMAT_MISMATCH')).toBe(true);
  });

  it('parseResult.ok === false ⇒ accounts = [] și la 8 coloane', () => {
    const unbalanced = [
      HEADER_8,
      ['101', 'Capital', 0, 2000, 0, 500, 0, 2500],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0],
    ];
    const result = parseExcelRows(unbalanced);
    expect(result.ok).toBe(false);
    expect(result.accounts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Detectare format & ambiguitate
// ---------------------------------------------------------------------------

describe('detectBalanceFormat', () => {
  it('index ≤ 7 (până la H) → 8_COLUMNS', () => {
    expect(detectBalanceFormat(7)).toBe('8_COLUMNS');
    expect(detectBalanceFormat(5)).toBe('8_COLUMNS');
  });

  it('index 9 (până la J) → 10_COLUMNS', () => {
    expect(detectBalanceFormat(9)).toBe('10_COLUMNS');
  });

  it('index 8 (exact 9 coloane, până la I) → AMBIGUOUS', () => {
    expect(detectBalanceFormat(8)).toBe('AMBIGUOUS');
  });

  it('index > 9 (date peste J) → INVALID', () => {
    expect(detectBalanceFormat(10)).toBe('INVALID');
  });
});

describe('parseExcelRows — ambiguitate & alegere manuală', () => {
  it('fișier cu 9 coloane (până la I) → EXCEL_AMBIGUOUS_FORMAT', () => {
    const rows = [
      ['Cont', 'Denumire', 'SI D', 'SI C', 'Rulaj D', 'Rulaj C', 'X', 'Y', 'Z'],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500],
    ];
    const result = parseExcelRows(rows);
    expect(result.ok).toBe(false);
    expect(result.blockingErrors.some((e) => e.code === 'EXCEL_AMBIGUOUS_FORMAT')).toBe(true);
    expect(result.format).toBeNull();
  });

  it('forțarea 10 coloane pe fișier cu 8 coloane → EXCEL_FORCED_FORMAT_MISMATCH', () => {
    const result = parseExcelRows(VALID_ROWS_8, { forcedFormat: '10_COLUMNS' });
    expect(result.ok).toBe(false);
    expect(result.blockingErrors.some((e) => e.code === 'EXCEL_FORCED_FORMAT_MISMATCH')).toBe(true);
  });

  it('date peste coloana J rămân invalide indiferent de formatul forțat', () => {
    const rows = [
      ['Cont', 'Denumire', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0, 999],
    ];
    const result = parseExcelRows(rows, { forcedFormat: '10_COLUMNS' });
    expect(result.ok).toBe(false);
    expect(result.blockingErrors.some((e) => e.code === 'EXCEL_INVALID_COLUMN_COUNT')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Importuri lunare cu formate diferite (model canonic unic)
// ---------------------------------------------------------------------------

describe('importuri lunare cu formate diferite', () => {
  it('ianuarie 8 coloane + februarie 10 coloane → aceleași câmpuri canonice pentru rulaje', () => {
    const ianuarie = parseExcelRows(VALID_ROWS_8);
    const februarie = parseExcelRows(VALID_ROWS_10);

    expect(ianuarie.format).toBe('8_COLUMNS');
    expect(februarie.format).toBe('10_COLUMNS');

    const ianBanca = ianuarie.accounts.find((a) => a.account_code === '5121')!;
    const febBanca = februarie.accounts.find((a) => a.account_code === '5121')!;

    // Rulajele lunare provin din E/F în ambele formate.
    expect(ianBanca.debit_turnover).toBe(500);
    expect(febBanca.debit_turnover).toBe(500);

    // Soldul final: G/H la 8 coloane, I/J la 10 coloane — dar câmpul canonic e identic.
    expect(ianBanca.closing_debit).toBe(1500);
    expect(febBanca.closing_debit).toBe(1500);
  });
});
