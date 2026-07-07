import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { BalanceAccount } from '@/hooks/useBalante';
import { useBalanceSheetDiagnostic } from '@/hooks/useBalanceSheetDiagnostic';
import { BalanceSheetDiagnosticDialog } from '@/components/financial-reports/BalanceSheetDiagnosticDialog';
import type {
  BalanceSheetEquationCheck,
  BalanceSheetLineRow,
  FinancialStatementType,
  StatementLineDefinitionRow,
} from '@/types/financialTree';
import { buildFinancialTreeRows } from '@/utils/buildFinancialTree';
import { getRowStatusLabel } from '@/utils/balanceSheetDiagnostic';
import {
  applyParentChildValidation,
  checkBalanceSheetEquation,
} from '@/utils/financialTreeValidation';
import { formatFinancialValue } from '@/utils/formatFinancialValue';
import { FinancialTreeReportTable } from '@/components/financial/FinancialTreeReportTable';

interface FinancialTreeTableProps {
  reportType: FinancialStatementType;
  companyId: string | null;
  importId?: string | null;
  trialBalanceAccounts?: BalanceAccount[];
  /** Kept for compatibility; not displayed in table values. */
  currency?: string;
  definitions: StatementLineDefinitionRow[];
  currentLines: BalanceSheetLineRow[];
  previousLines?: BalanceSheetLineRow[];
  selectedYear?: number | string;
  selectedPeriod?: string;
  debugMode?: boolean;
  /** Deprecated: export/print live in the page toolbar. Kept for compatibility. */
  onExport?: () => void;
  onPrint?: () => void;
}

/**
 * Orchestrator for the financial statement tree table.
 *
 * Builds the tree row data (without changing any calculation, formula, value,
 * data source or aggregation), runs balance-sheet validation/equation checks,
 * and delegates all presentation to {@link FinancialTreeReportTable}, which in
 * turn is built on the generic reusable AG Grid infrastructure.
 */
export function FinancialTreeTable({
  reportType,
  importId = null,
  trialBalanceAccounts = [],
  currency = 'RON',
  definitions,
  currentLines,
  previousLines,
  selectedYear,
  selectedPeriod,
  debugMode = false,
}: FinancialTreeTableProps) {
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);

  const { summary: diagnosticSummary, loading: diagnosticLoading } = useBalanceSheetDiagnostic(
    reportType === 'balance_sheet' ? importId : null,
    trialBalanceAccounts,
  );

  const rowData = useMemo(() => {
    const base = buildFinancialTreeRows({
      definitions,
      currentLines,
      previousLines,
      hideInternalRows: true,
      hideZeroLeafRows: false,
    });
    const validated = applyParentChildValidation(base, definitions);
    const equation = checkBalanceSheetEquation(validated);
    return validated.map((row) => ({
      ...row,
      status: getRowStatusLabel(row.rowKind, row.hasValidationIssue, equation.isBalanced, row.lineKey),
    }));
  }, [definitions, currentLines, previousLines]);

  const equationCheck: BalanceSheetEquationCheck | null = useMemo(() => {
    if (reportType !== 'balance_sheet') return null;
    return checkBalanceSheetEquation(rowData);
  }, [reportType, rowData]);

  if (definitions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Structura raportului nu este disponibilă. Verificați template-ul statement_line_definitions.
      </p>
    );
  }

  return (
    <div className="financial-tree-table">
      {equationCheck && !equationCheck.isBalanced && (
        <Alert className="mb-4 border-l-4 border-l-[var(--newa-semantic-warning)] bg-[var(--newa-alert-warning-bg)] text-[var(--newa-text-primary)]">
          <AlertTriangle className="h-4 w-4 text-[var(--newa-semantic-warning)]" />
          <AlertTitle>Bilanțul nu se închide</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Active totale ({formatFinancialValue(equationCheck.totalAssets, { currency })}) ≠ Total
              datorii și capitaluri (
              {formatFinancialValue(equationCheck.totalLiabilitiesAndEquity, { currency })}). Diferență:{' '}
              <strong>{formatFinancialValue(equationCheck.difference, { currency })}</strong>.
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              <li>Conturi nemapate în pasiv/capitaluri</li>
              <li>Rezultatul exercițiului (121) neinclus sau incomplet</li>
              <li>Datorii incomplete sau semn greșit (442, 512 credit, 121 mixt)</li>
            </ul>
            {reportType === 'balance_sheet' && (
              <Button variant="outline" size="sm" className="h-8 rounded-[40px]" onClick={() => setDiagnosticOpen(true)}>
                Vezi detalii diferență
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {equationCheck && reportType === 'balance_sheet' && (
        <BalanceSheetDiagnosticDialog
          open={diagnosticOpen}
          onOpenChange={setDiagnosticOpen}
          equation={equationCheck}
          diagnostic={diagnosticSummary}
          diagnosticLoading={diagnosticLoading}
          currency={currency}
        />
      )}

      <FinancialTreeReportTable
        rows={rowData}
        selectedYear={selectedYear}
        selectedPeriod={selectedPeriod}
        debugMode={debugMode}
        currency={currency}
        localStorageKey={`finguard.financialTreeReport.${reportType}.layout.v1`}
      />
    </div>
  );
}
