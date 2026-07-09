import { describe, expect, it } from 'vitest';
import {
  analyzeBalanceSheetMapping,
  getEconomicBalanceSide,
  type MappedAccountInfo,
} from '@/utils/balanceSheetDiagnostic';
import type { BalanceAccount } from '@/hooks/useBalante';

/**
 * Construiește un cont de balanță cu sold final pe partea indicată.
 * Soldul este date brute din balanță (closing_debit / closing_credit).
 */
function acc(
  id: string,
  code: string,
  name: string,
  side: 'debit' | 'credit' | 'both' | 'zero',
  amount = 1000,
): BalanceAccount {
  return {
    id,
    import_id: 'imp-1',
    account_code: code,
    account_name: name,
    opening_debit: 0,
    opening_credit: 0,
    debit_turnover: 0,
    credit_turnover: 0,
    total_sume_debitoare: 0,
    total_sume_creditoare: 0,
    closing_debit: side === 'debit' || side === 'both' ? amount : 0,
    closing_credit: side === 'credit' || side === 'both' ? amount : 0,
  };
}

/** Mapare 1:1 cu o funcțiune contabilă dată. */
function map(
  tbAccountId: string,
  code: string,
  functionalType: 'activ' | 'pasiv' | 'bifunctional' | null,
  accountType: string | null = null,
): MappedAccountInfo {
  return {
    tbAccountId,
    accountCode: code,
    accountName: code,
    chartAccountCode: code,
    chartAccountType: accountType,
    functionalType,
  };
}

const codeOf = (issues: ReturnType<typeof analyzeBalanceSheetMapping>['issues'], code: string) =>
  issues.filter((i) => i.accountCode === code);

const errorsOf = (issues: ReturnType<typeof analyzeBalanceSheetMapping>['issues'], code: string) =>
  codeOf(issues, code).filter((i) => i.severity === 'error');

describe('analyzeBalanceSheetMapping — funcțiunea contului vs soldul din balanță', () => {
  it('4091 activ cu sold debitor NU este eroare', () => {
    const accounts = [acc('t1', '4091', 'Furnizori-debitori stocuri', 'debit')];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '4091', 'activ')]);
    expect(codeOf(res.issues, '4091')).toHaveLength(0);
  });

  it('4111 activ cu sold debitor NU este eroare', () => {
    const accounts = [acc('t1', '4111', 'Clienți', 'debit')];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '4111', 'activ')]);
    expect(codeOf(res.issues, '4111')).toHaveLength(0);
    expect(res.wrongSignCount).toBe(0);
  });

  it('4452 activ cu sold debitor NU este eroare', () => {
    const accounts = [acc('t1', '4452', 'Împrumuturi nerambursabile subvenții', 'debit')];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '4452', 'activ')]);
    expect(codeOf(res.issues, '4452')).toHaveLength(0);
  });

  it('4511 bifuncțional cu sold debitor NU este eroare de semn', () => {
    const accounts = [acc('t1', '4511', 'Decontări entități afiliate', 'debit')];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '4511', 'bifunctional')]);
    expect(codeOf(res.issues, '4511')).toHaveLength(0);
    expect(res.wrongSignCount).toBe(0);
  });

  it('473 bifuncțional cu sold debitor semnalează rute incomplete fără leaf activ', () => {
    const accounts = [acc('t1', '473', 'Decontări în curs de clarificare', 'debit')];
    const leaves = [{ lineKey: 'bs_1290', accountCode: '473', reportArea: 'Pasive' }];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '473', 'bifunctional')], leaves);
    const issues = codeOf(res.issues, '473');
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('bifunctional_incomplete_routes');
    expect(issues[0].severity).toBe('error');
    expect(res.isReportValid).toBe(false);
  });

  it('473 bifuncțional cu sold debitor NU este eroare când există ambele rute', () => {
    const accounts = [acc('t1', '473', 'Decontări în curs de clarificare', 'debit')];
    const leaves = [
      { lineKey: 'bs_615', accountCode: '473', reportArea: 'Active' },
      { lineKey: 'bs_1290', accountCode: '473', reportArea: 'Pasive' },
    ];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '473', 'bifunctional')], leaves);
    expect(errorsOf(res.issues, '473')).toHaveLength(0);
    expect(res.isReportValid).toBe(true);
  });

  it('473 bifuncțional cu sold debitor NU este eroare de semn (legacy — acoperit de rute)', () => {
    const accounts = [acc('t1', '473', 'Decontări în curs de clarificare', 'debit')];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '473', 'bifunctional')], [
      { lineKey: 'bs_615', accountCode: '473', reportArea: 'Active' },
      { lineKey: 'bs_1290', accountCode: '473', reportArea: 'Pasive' },
    ]);
    expect(errorsOf(res.issues, '473')).toHaveLength(0);
  });

  it('1174 bifuncțional cu sold debitor NU este eroare de pasiv', () => {
    const accounts = [acc('t1', '1174', 'Rezultat reportat corectare erori', 'debit')];
    const leaves = [{ lineKey: 'bs_1520', accountCode: '1174', reportArea: 'Pasive' }];
    const res = analyzeBalanceSheetMapping(
      accounts,
      [map('t1', '1174', 'bifunctional', 'equity')],
      leaves,
    );
    expect(errorsOf(res.issues, '1174')).toHaveLength(0);
    expect(res.isReportValid).toBe(true);
  });

  it('1174 bifuncțional fără linie Pasive este eroare blocantă', () => {
    const accounts = [acc('t1', '1174', 'Rezultat reportat corectare erori', 'debit')];
    const leaves = [{ lineKey: 'bs_x', accountCode: '1174', reportArea: 'Active' }];
    const res = analyzeBalanceSheetMapping(
      accounts,
      [map('t1', '1174', 'bifunctional', 'equity')],
      leaves,
    );
    expect(codeOf(res.issues, '1174')[0]?.type).toBe('bifunctional_incomplete_routes');
    expect(res.isReportValid).toBe(false);
  });

  it('4411 cu closing_credit negativ are sold economic debitor', () => {
    const account: BalanceAccount = {
      id: 't1',
      import_id: 'imp-1',
      account_code: '4411',
      account_name: 'Impozit pe profit',
      opening_debit: 0,
      opening_credit: 0,
      debit_turnover: 0,
      credit_turnover: 0,
      total_sume_debitoare: 0,
      total_sume_creditoare: 0,
      closing_debit: 0,
      closing_credit: -185_461,
    };
    expect(getEconomicBalanceSide(account)).toBe('debit');
  });

  it('4411 bifuncțional cu sold economic debitor necesită rută Active', () => {
    const account: BalanceAccount = {
      id: 't1',
      import_id: 'imp-1',
      account_code: '4411',
      account_name: 'Impozit pe profit',
      opening_debit: 0,
      opening_credit: 0,
      debit_turnover: 0,
      credit_turnover: 0,
      total_sume_debitoare: 0,
      total_sume_creditoare: 0,
      closing_debit: 0,
      closing_credit: -185_461,
    };
    const leaves = [{ lineKey: 'bs_1090', accountCode: '4411', reportArea: 'Pasive' }];
    const res = analyzeBalanceSheetMapping(
      [account],
      [map('t1', '4411', 'bifunctional', 'liability')],
      leaves,
    );
    expect(codeOf(res.issues, '4411')[0]?.type).toBe('bifunctional_incomplete_routes');
  });

  it('4411 bifuncțional cu ambele rute NU este eroare', () => {
    const account: BalanceAccount = {
      id: 't1',
      import_id: 'imp-1',
      account_code: '4411',
      account_name: 'Impozit pe profit',
      opening_debit: 0,
      opening_credit: 0,
      debit_turnover: 0,
      credit_turnover: 0,
      total_sume_debitoare: 0,
      total_sume_creditoare: 0,
      closing_debit: 0,
      closing_credit: -185_461,
    };
    const leaves = [
      { lineKey: 'bs_1085', accountCode: '4411', reportArea: 'Active' },
      { lineKey: 'bs_1090', accountCode: '4411', reportArea: 'Pasive' },
    ];
    const res = analyzeBalanceSheetMapping(
      [account],
      [map('t1', '4411', 'bifunctional', 'liability')],
      leaves,
    );
    expect(errorsOf(res.issues, '4411')).toHaveLength(0);
  });

  it('2805 cu sold creditor (contra-activ pasiv) NU este eroare de semn', () => {
    const accounts = [acc('t1', '2805', 'Amortizare concesiuni', 'credit', 21_203.9)];
    const leaves = [{ lineKey: 'bs_55', accountCode: '2805', reportArea: 'Active' }];
    const res = analyzeBalanceSheetMapping(
      accounts,
      [map('t1', '2805', 'pasiv')],
      leaves,
    );
    expect(codeOf(res.issues, '2805').filter((i) => i.severity === 'error')).toHaveLength(0);
    expect(res.wrongSignCount).toBe(0);
  });

  it('121 bifuncțional cu sold debitor (pierdere) NU este eroare de pasiv', () => {
    const accounts = [acc('t1', '121', 'Profit sau pierdere', 'debit')];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '121', 'bifunctional')]);
    expect(codeOf(res.issues, '121')).toHaveLength(0);
  });

  it('378 bifuncțional cu sold creditor NU este eroare critică automată', () => {
    const accounts = [acc('t1', '378', 'Diferențe de preț la mărfuri', 'credit')];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '378', 'bifunctional')]);
    const critical = res.issues.filter(
      (i) => i.accountCode === '378' && i.severity === 'error',
    );
    expect(critical).toHaveLength(0);
  });

  it('401 pasiv cu sold creditor NU este eroare', () => {
    const accounts = [acc('t1', '401', 'Furnizori', 'credit')];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '401', 'pasiv')]);
    expect(codeOf(res.issues, '401')).toHaveLength(0);
  });

  it('semnalează un cont pasiv REAL cu sold debitor (ex. 401 cu sold debitor)', () => {
    const accounts = [acc('t1', '401', 'Furnizori', 'debit')];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '401', 'pasiv')]);
    const issues = codeOf(res.issues, '401');
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('wrong_sign_pasiv');
    expect(issues[0].severity).toBe('warning');
  });

  it('semnalează un cont activ cu sold creditor (ex. 4111 cu sold creditor)', () => {
    const accounts = [acc('t1', '4111', 'Clienți', 'credit')];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '4111', 'activ')]);
    const issues = codeOf(res.issues, '4111');
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('wrong_sign_activ');
  });

  it('conturile din clasa 4 NU mai sunt tratate ca pasive doar pentru că încep cu 4', () => {
    const accounts = [
      acc('t1', '4091', 'Furnizori-debitori', 'debit'),
      acc('t2', '461', 'Debitori diverși', 'debit'),
      acc('t3', '471', 'Cheltuieli în avans', 'debit'),
    ];
    const mappings = [
      map('t1', '4091', 'activ'),
      map('t2', '461', 'activ'),
      map('t3', '471', 'activ'),
    ];
    const res = analyzeBalanceSheetMapping(accounts, mappings);
    expect(res.wrongSignCount).toBe(0);
    expect(res.issues).toHaveLength(0);
  });

  it('sold simultan pe debit și credit este semnalat ca anomalie tehnică de import', () => {
    const accounts = [acc('t1', '5121', 'Conturi la bănci', 'both')];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '5121', 'activ')]);
    const issues = codeOf(res.issues, '5121');
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('technical_both_sides');
    expect(issues[0].severity).toBe('error');
  });

  it('cont fără funcțiune definită produce avertisment de mapare lipsă, nu eroare de semn', () => {
    const accounts = [acc('t1', '9999', 'Cont necunoscut', 'debit')];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '9999', null)]);
    const issues = codeOf(res.issues, '9999');
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('missing_functional_type');
    expect(res.wrongSignCount).toBe(0);
  });

  it('semnalează cont mapat fără linie leaf în șablonul bilanțului (ex. 4752)', () => {
    const accounts = [acc('t1', '4752', 'Subvenții investiții', 'credit', 48_584_516.88)];
    const mappings = [map('t1', '4752', 'pasiv')];
    const leaves = [
      { lineKey: 'bs_1430', accountCode: '4751', reportArea: 'Pasive' },
    ];
    const res = analyzeBalanceSheetMapping(accounts, mappings, leaves);
    const issues = codeOf(res.issues, '4752');
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('not_in_report');
    expect(issues[0].severity).toBe('error');
    expect(res.notInReportCount).toBe(1);
    expect(res.isReportValid).toBe(false);
  });

  it('4452 activ cu sold debitor nu produce eroare de semn', () => {
    const accounts = [acc('t1', '4452', 'Împrumuturi subvenții', 'debit', 21_222_767.85)];
    const leaves = [{ lineKey: 'bs_296', accountCode: '4452', reportArea: 'Active' }];
    const res = analyzeBalanceSheetMapping(
      accounts,
      [map('t1', '4452', 'activ')],
      leaves,
    );
    expect(codeOf(res.issues, '4452')).toHaveLength(0);
  });

  it('4511 bifuncțional cu sold debitor nu produce eroare când există leaf activ', () => {
    const accounts = [acc('t1', '4511', 'Decontări afiliate', 'debit', 8_090_605.52)];
    const leaves = [
      { lineKey: 'bs_606', accountCode: '4511', reportArea: 'Active' },
      { lineKey: 'bs_1295', accountCode: '4511', reportArea: 'Pasive' },
    ];
    const res = analyzeBalanceSheetMapping(
      accounts,
      [map('t1', '4511', 'bifunctional')],
      leaves,
    );
    expect(errorsOf(res.issues, '4511')).toHaveLength(0);
  });
});
