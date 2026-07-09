import type { BalanceSheetEquationCheck } from '@/types/financialTree';
import type { BalanceSheetDiagnosticSummary } from '@/utils/balanceSheetDiagnostic';

export type ReportValidityStatus = 'valid' | 'unreconciled';

export interface ReconciliationCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface ReportReconciliationResult {
  status: ReportValidityStatus;
  isValid: boolean;
  checks: ReconciliationCheck[];
  blockingReasons: string[];
}

/**
 * Evaluează reconcilierea obligatorie a bilanțului după generare.
 * Raportul este valid doar dacă toate verificările trec.
 */
export function evaluateReportReconciliation(
  diagnostic: BalanceSheetDiagnosticSummary | null,
  equation: BalanceSheetEquationCheck | null,
): ReportReconciliationResult {
  const checks: ReconciliationCheck[] = [];
  const blockingReasons: string[] = [];

  const equationBalanced = equation?.isBalanced ?? false;
  checks.push({
    id: 'equation',
    label: 'Total active = total datorii + capitaluri',
    passed: equationBalanced,
    detail: equation
      ? `Diferență: ${equation.difference.toFixed(2)}`
      : 'Ecuația bilanțului nu a putut fi evaluată',
  });
  if (!equationBalanced) {
    blockingReasons.push('Bilanțul nu se închide (active ≠ datorii + capitaluri).');
  }

  const unmapped = diagnostic?.unmappedCount ?? 0;
  checks.push({
    id: 'unmapped_accounts',
    label: 'Conturi nemapate cu sold ≠ 0',
    passed: unmapped === 0,
    detail: unmapped > 0 ? `${unmapped} cont(uri) nemapate` : undefined,
  });
  if (unmapped > 0) {
    blockingReasons.push(`${unmapped} cont(uri) cu sold nu sunt mapate în planul de conturi.`);
  }

  const notInReport = diagnostic?.notInReportCount ?? 0;
  checks.push({
    id: 'coverage',
    label: 'Toate conturile relevante contribuie la raport',
    passed: notInReport === 0,
    detail: notInReport > 0 ? `${notInReport} cont(uri) mapate fără linie în raport` : undefined,
  });
  if (notInReport > 0) {
    blockingReasons.push(`${notInReport} cont(uri) mapate nu au linie leaf în șablonul bilanțului.`);
  }

  const missingFunctional = diagnostic?.missingFunctionalCount ?? 0;
  checks.push({
    id: 'functional_type',
    label: 'Funcțiune contabilă definită pentru conturile mapate',
    passed: missingFunctional === 0,
    detail:
      missingFunctional > 0
        ? `${missingFunctional} cont(uri) fără functional_type`
        : undefined,
  });
  if (missingFunctional > 0) {
    blockingReasons.push(`${missingFunctional} cont(uri) nu au funcțiunea (activ/pasiv/bifuncțional) definită.`);
  }

  const bifunctionalIssues = diagnostic?.bifunctionalRouteIssueCount ?? 0;
  checks.push({
    id: 'bifunctional_routes',
    label: 'Conturi bifuncționale cu rute complete (după tipul contului)',
    passed: bifunctionalIssues === 0,
    detail:
      bifunctionalIssues > 0
        ? `${bifunctionalIssues} cont(uri) bifuncționale cu rută incompletă`
        : undefined,
  });
  if (bifunctionalIssues > 0) {
    blockingReasons.push(
      `${bifunctionalIssues} cont(uri) bifuncționale nu au rute SLD complete pentru soldul curent.`,
    );
  }

  const technicalErrors = diagnostic?.technicalErrorCount ?? 0;
  checks.push({
    id: 'technical',
    label: 'Fără anomalii tehnice de import (sold simultan D/C)',
    passed: technicalErrors === 0,
    detail: technicalErrors > 0 ? `${technicalErrors} cont(uri) cu sold pe ambele părți` : undefined,
  });
  if (technicalErrors > 0) {
    blockingReasons.push(`${technicalErrors} cont(uri) au sold simultan pe debit și credit.`);
  }

  const tbWithBalance = diagnostic?.tbAccountsWithBalance ?? 0;
  const includedCount = diagnostic?.includedAccountCount ?? 0;
  checks.push({
    id: 'account_inclusion',
    label: 'Conturi incluse = conturi relevante din balanță',
    passed: tbWithBalance === 0 || includedCount === tbWithBalance,
    detail:
      tbWithBalance > 0
        ? `${includedCount} / ${tbWithBalance} conturi cu sold incluse`
        : undefined,
  });
  if (tbWithBalance > 0 && includedCount !== tbWithBalance) {
    blockingReasons.push(
      `Doar ${includedCount} din ${tbWithBalance} conturi cu sold sunt incluse complet în raport.`,
    );
  }

  const isValid = checks.every((check) => check.passed);

  return {
    status: isValid ? 'valid' : 'unreconciled',
    isValid,
    checks,
    blockingReasons,
  };
}
