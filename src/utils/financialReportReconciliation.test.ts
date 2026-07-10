import { describe, expect, it } from 'vitest';
import { evaluateReportReconciliation } from '@/utils/financialReportReconciliation';
import type { BalanceSheetDiagnosticSummary } from '@/utils/balanceSheetDiagnostic';

const baseSummary = (overrides: Partial<BalanceSheetDiagnosticSummary>): BalanceSheetDiagnosticSummary => ({
  issues: [],
  unmappedCount: 0,
  wrongSignCount: 0,
  missingFunctionalCount: 0,
  technicalErrorCount: 0,
  notInReportCount: 0,
  bifunctionalRouteIssueCount: 0,
  includedAccountCount: 5,
  isReportValid: true,
  blockingIssueCount: 0,
  tbAccountsWithBalance: 5,
  totalMappedNet: 0,
  pnlClosingBalanceCount: 0,
  possibleCauses: [],
  ...overrides,
});

describe('evaluateReportReconciliation', () => {
  it('marchează raportul valid când toate verificările trec', () => {
    const result = evaluateReportReconciliation(baseSummary({}), {
      totalAssets: 100,
      totalLiabilitiesAndEquity: 100,
      difference: 0,
      isBalanced: true,
    });
    expect(result.isValid).toBe(true);
    expect(result.status).toBe('valid');
    expect(result.blockingReasons).toHaveLength(0);
  });

  it('marchează raportul nereconciliat când există conturi neincluse', () => {
    const result = evaluateReportReconciliation(
      baseSummary({
        notInReportCount: 2,
        isReportValid: false,
        blockingIssueCount: 2,
        includedAccountCount: 3,
      }),
      {
        totalAssets: 100,
        totalLiabilitiesAndEquity: 100,
        difference: 0,
        isBalanced: true,
      },
    );
    expect(result.isValid).toBe(false);
    expect(result.status).toBe('unreconciled');
    expect(result.blockingReasons.some((r) => r.includes('linie leaf'))).toBe(true);
  });

  it('marchează raportul nereconciliat când ecuația nu se închide', () => {
    const result = evaluateReportReconciliation(baseSummary({}), {
      totalAssets: 100,
      totalLiabilitiesAndEquity: 90,
      difference: 10,
      isBalanced: false,
    });
    expect(result.isValid).toBe(false);
    expect(result.checks.find((c) => c.id === 'equation')?.passed).toBe(false);
  });
});
