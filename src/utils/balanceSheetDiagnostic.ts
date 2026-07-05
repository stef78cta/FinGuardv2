import type { BalanceAccount } from '@/hooks/useBalante';

export type DiagnosticIssueType =
  | 'unmapped'
  | 'wrong_sign_asset'
  | 'wrong_sign_liability'
  | 'zero_balance'
  | 'duplicate_mapping';

export interface BalanceSheetDiagnosticIssue {
  type: DiagnosticIssueType;
  accountCode: string;
  accountName: string;
  closingDebit: number;
  closingCredit: number;
  netBalance: number;
  mappedTo?: string;
  message: string;
}

export interface BalanceSheetDiagnosticSummary {
  issues: BalanceSheetDiagnosticIssue[];
  unmappedCount: number;
  wrongSignCount: number;
  tbAccountsWithBalance: number;
  totalMappedNet: number;
  possibleCauses: string[];
}

const ASSET_CLASS_PREFIXES = ['2', '3'];
const LIABILITY_EQUITY_PREFIXES = ['1', '4', '5'];

function netClosingBalance(acc: BalanceAccount): number {
  return (acc.closing_debit || 0) - (acc.closing_credit || 0);
}

function isAssetClass(code: string): boolean {
  const cls = code.charAt(0);
  return ASSET_CLASS_PREFIXES.includes(cls);
}

function isLiabilityEquityClass(code: string): boolean {
  const cls = code.charAt(0);
  return LIABILITY_EQUITY_PREFIXES.includes(cls);
}

/** Contra-active / ajustări — sold creditor normal. */
function isContraAsset(code: string): boolean {
  return code.startsWith('28') || code.startsWith('29') || code.startsWith('39') || code.startsWith('49');
}

export interface MappedAccountInfo {
  tbAccountId: string;
  accountCode: string;
  accountName: string;
  chartAccountCode: string;
  chartAccountType: string | null;
}

/**
 * Analizează conturile din balanță față de mapări pentru diagnostic bilanț.
 */
export function analyzeBalanceSheetMapping(
  accounts: BalanceAccount[],
  mappings: MappedAccountInfo[],
): BalanceSheetDiagnosticSummary {
  const mappedByTbId = new Map<string, MappedAccountInfo[]>();
  for (const m of mappings) {
    const list = mappedByTbId.get(m.tbAccountId) ?? [];
    list.push(m);
    mappedByTbId.set(m.tbAccountId, list);
  }

  const issues: BalanceSheetDiagnosticIssue[] = [];
  let totalMappedNet = 0;

  for (const acc of accounts) {
    const net = netClosingBalance(acc);
    const hasMovement =
      Math.abs(net) > 0.01 ||
      (acc.closing_debit || 0) > 0.01 ||
      (acc.closing_credit || 0) > 0.01;

    if (!hasMovement) continue;

    const mapped = mappedByTbId.get(acc.id) ?? [];

    if (mapped.length === 0) {
      issues.push({
        type: 'unmapped',
        accountCode: acc.account_code,
        accountName: acc.account_name,
        closingDebit: acc.closing_debit || 0,
        closingCredit: acc.closing_credit || 0,
        netBalance: net,
        message: 'Cont cu sold, fără mapare în planul de conturi / linii raport',
      });
      continue;
    }

    if (mapped.length > 1) {
      issues.push({
        type: 'duplicate_mapping',
        accountCode: acc.account_code,
        accountName: acc.account_name,
        closingDebit: acc.closing_debit || 0,
        closingCredit: acc.closing_credit || 0,
        netBalance: net,
        mappedTo: mapped.map((m) => m.chartAccountCode).join(', '),
        message: 'Cont mapat în mai multe linii chart_of_accounts',
      });
    }

    totalMappedNet += net;

    const chartType = mapped[0]?.chartAccountType ?? '';
    const code = acc.account_code;

    if (isContraAsset(code) && net > 0.01) {
      issues.push({
        type: 'wrong_sign_asset',
        accountCode: code,
        accountName: acc.account_name,
        closingDebit: acc.closing_debit || 0,
        closingCredit: acc.closing_credit || 0,
        netBalance: net,
        mappedTo: mapped[0]?.chartAccountCode,
        message: 'Cont contra-activ / ajustare cu sold debitor — verificați semnul în raport',
      });
    } else if (isAssetClass(code) && !isContraAsset(code) && net < -0.01 && chartType === 'asset') {
      issues.push({
        type: 'wrong_sign_asset',
        accountCode: code,
        accountName: acc.account_name,
        closingDebit: acc.closing_debit || 0,
        closingCredit: acc.closing_credit || 0,
        netBalance: net,
        mappedTo: mapped[0]?.chartAccountCode,
        message: 'Cont activ cu sold creditor net — posibil 512 descoperit sau clasificare greșită',
      });
    } else if (isLiabilityEquityClass(code) && net > 0.01 && !code.startsWith('4424')) {
      if (chartType === 'liability' || chartType === 'equity' || code.startsWith('4')) {
        issues.push({
          type: 'wrong_sign_liability',
          accountCode: code,
          accountName: acc.account_name,
          closingDebit: acc.closing_debit || 0,
          closingCredit: acc.closing_credit || 0,
          netBalance: net,
          mappedTo: mapped[0]?.chartAccountCode,
          message: 'Cont pasiv/capital cu sold debitor net — verificați includerea în pasive',
        });
      }
    }
  }

  const unmappedCount = issues.filter((i) => i.type === 'unmapped').length;
  const wrongSignCount = issues.filter(
    (i) => i.type === 'wrong_sign_asset' || i.type === 'wrong_sign_liability',
  ).length;

  const possibleCauses: string[] = [];
  if (unmappedCount > 0) {
    possibleCauses.push(`${unmappedCount} cont(uri) cu sold nu sunt mapate în raport.`);
  }
  if (wrongSignCount > 0) {
    possibleCauses.push(`${wrongSignCount} cont(uri) au semn de sold suspect pentru tipul de cont.`);
  }
  if (!possibleCauses.length) {
    possibleCauses.push('Rezultatul exercițiului (121) poate să nu fie inclus complet în capitaluri.');
    possibleCauses.push('Datoriile din clasele 4/5 pot fi incomplete sau agregate greșit.');
    possibleCauses.push('Conturile mixte (TVA 442, 121) necesită verificarea regulilor de semn.');
  }

  return {
    issues,
    unmappedCount,
    wrongSignCount,
    tbAccountsWithBalance: accounts.filter(
      (a) => Math.abs(netClosingBalance(a)) > 0.01 || (a.closing_debit || 0) > 0 || (a.closing_credit || 0) > 0,
    ).length,
    totalMappedNet,
    possibleCauses,
  };
}

export function getRowStatusLabel(
  rowKind: string,
  hasValidationIssue: boolean,
  isEquationBalanced: boolean,
  lineKey: string,
): string {
  if (lineKey === 'bs_805' || lineKey === 'bs_1570') {
    return isEquationBalanced ? 'OK' : 'Nu se închide';
  }
  if (hasValidationIssue) return 'Verifică';
  if (rowKind === 'calculated' || rowKind === 'grand_total') return 'Calculat';
  if (rowKind === 'account') return 'Cont';
  return 'OK';
}
