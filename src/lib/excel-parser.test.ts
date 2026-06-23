import { describe, expect, it } from 'vitest';
import { parseExcelRows } from '@/lib/excel-parser';

const HEADER = [
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
const VALID_ROWS = [
  HEADER,
  ['101', 'Capital', 0, 1000, 0, 500, 0, 1500, 0, 1500],
  ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0],
];

describe('parseExcelRows — format 10 coloane', () => {
  it('acceptă balanță validă cu 10 coloane', () => {
    const result = parseExcelRows(VALID_ROWS);

    expect(result.ok).toBe(true);
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

  it('respinge balanță veche cu 8 coloane', () => {
    const legacyRows = [
      ['Cont', 'Denumire', 'SI Debit', 'SI Credit', 'Rulaj D', 'Rulaj C', 'SF Debit', 'SF Credit'],
      ['101', 'Capital', 0, 1000, 0, 500, 0, 1500],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0],
    ];

    const result = parseExcelRows(legacyRows);

    expect(result.ok).toBe(false);
    expect(result.blockingErrors.some((e) => e.code === 'EXCEL_LEGACY_8_COLUMN_FORMAT')).toBe(true);
    expect(result.accounts).toHaveLength(0);
  });

  it('respinge fișier cu date peste coloana J', () => {
    const rowsWithExtra = [
      ...VALID_ROWS.slice(0, 1),
      ['101', 'Capital', 0, 1000, 0, 500, 0, 1500, 0, 1500, 'extra'],
      ...VALID_ROWS.slice(2),
    ];

    const result = parseExcelRows(rowsWithExtra);

    expect(result.ok).toBe(false);
    expect(result.blockingErrors.some((e) => e.code === 'EXCEL_INVALID_COLUMN_COUNT')).toBe(true);
  });

  it('acceptă balanță cu rulaj lunar și total sume cumulate (nu mai respinge rândurile)', () => {
    // Regresie: rulajele sunt LUNARE, iar Total Sume sunt CUMULATE de la începutul anului.
    // total_sume ≠ SI + rulaj curent, dar identitatea SF = total_deb − total_cred ține.
    const rows = [
      HEADER,
      ['121', 'Profit și pierdere', 0, 7000, 3600, 5000, 34000, 37000, 0, 3000],
      ['5121', 'Bancă', 7000, 0, 5000, 3600, 37000, 34000, 3000, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(true);
    expect(result.accounts).toHaveLength(2);
    expect(result.totals.opening_debit).toBe(7000);
    expect(result.totals.opening_credit).toBe(7000);
  });

  it('respinge rând unde SF net != Total Sume Debit − Total Sume Credit', () => {
    const rows = [
      HEADER,
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
      HEADER,
      ['101', 'Capital', 0, 1000, 0, 500, 0, 1500, 0, 1500],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500.005, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(true);
  });

  it('respinge dezechilibru SI Debit vs SI Credit', () => {
    const rows = [
      HEADER,
      ['101', 'Capital', 0, 2000, 0, 500, 0, 2500, 0, 2500],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(false);
    expect(result.blockingErrors.some((e) => e.code === 'BALANCE_CONTROL_OPENING_MISMATCH')).toBe(true);
  });

  it('respinge dezechilibru Rulaj D vs Rulaj C', () => {
    const rows = [
      HEADER,
      ['101', 'Capital', 0, 1000, 0, 600, 0, 1600, 0, 1600],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(false);
    expect(result.blockingErrors.some((e) => e.code === 'BALANCE_CONTROL_TURNOVER_MISMATCH')).toBe(true);
  });

  it('respinge dezechilibru SF Debit vs SF Credit', () => {
    const rows = [
      HEADER,
      ['101', 'Capital', 0, 1000, 0, 500, 0, 1500, 0, 1600],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(false);
    expect(result.blockingErrors.some((e) => e.code === 'BALANCE_CONTROL_TOTAL_MISMATCH')).toBe(true);
  });

  it('respinge cont invalid și cont lipsă', () => {
    const rowsMissing = [
      HEADER,
      ['', 'Fără cont', 0, 0, 0, 0, 0, 0, 0, 0],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0],
    ];
    const resultMissing = parseExcelRows(rowsMissing);
    expect(resultMissing.ok).toBe(false);
    expect(resultMissing.rowErrors.some((e) => e.code === 'BALANCE_ROW_ACCOUNT_MISSING')).toBe(true);

    const rowsInvalid = [
      HEADER,
      ['12', 'Cont scurt', 0, 0, 0, 0, 0, 0, 0, 0],
      ['5121', 'Bancă', 1000, 0, 500, 0, 1500, 0, 1500, 0],
    ];
    const resultInvalid = parseExcelRows(rowsInvalid);
    expect(resultInvalid.rowErrors.some((e) => e.code === 'BALANCE_ROW_ACCOUNT_INVALID')).toBe(true);
  });

  it('ignoră rânduri complet goale', () => {
    const rows = [
      HEADER,
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
      HEADER,
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
      HEADER,
      ['5121', 'Bancă', 1000, 0, 500, 0, 1400, 0, 1500, 0],
    ];

    const result = parseExcelRows(rows);

    expect(result.ok).toBe(false);
    expect(result.accounts).toHaveLength(0);
  });
});
