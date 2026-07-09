import { describe, expect, it } from 'vitest';
import {
  analyzeBalanceSheetMapping,
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
): MappedAccountInfo {
  return {
    tbAccountId,
    accountCode: code,
    accountName: code,
    chartAccountCode: code,
    chartAccountType: null,
    functionalType,
  };
}

const codeOf = (issues: ReturnType<typeof analyzeBalanceSheetMapping>['issues'], code: string) =>
  issues.filter((i) => i.accountCode === code);

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

  it('473 bifuncțional cu sold debitor NU este eroare de semn', () => {
    const accounts = [acc('t1', '473', 'Decontări în curs de clarificare', 'debit')];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '473', 'bifunctional')]);
    expect(codeOf(res.issues, '473')).toHaveLength(0);
  });

  it('1174 bifuncțional cu sold debitor NU este eroare de pasiv', () => {
    const accounts = [acc('t1', '1174', 'Rezultat reportat corectare erori', 'debit')];
    const res = analyzeBalanceSheetMapping(accounts, [map('t1', '1174', 'bifunctional')]);
    expect(codeOf(res.issues, '1174')).toHaveLength(0);
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

  it('cont nemapat este semnalat ca unmapped', () => {
    const accounts = [acc('t1', '4111', 'Clienți', 'debit')];
    const res = analyzeBalanceSheetMapping(accounts, []);
    const issues = codeOf(res.issues, '4111');
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('unmapped');
  });
});
