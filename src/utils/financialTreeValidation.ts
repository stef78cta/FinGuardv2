import type {
  BalanceSheetEquationCheck,
  FinancialTreeRow,
  StatementLineDefinitionRow,
} from '@/types/financialTree';

const BALANCE_TOLERANCE = 0.01;

/**
 * Verifică ecuația fundamentală a bilanțului: Active totale = Total datorii și capitaluri.
 */
export function checkBalanceSheetEquation(rows: FinancialTreeRow[]): BalanceSheetEquationCheck {
  const totalAssets = rows.find((r) => r.lineKey === 'bs_805')?.current ?? 0;
  const totalLiabilitiesAndEquity = rows.find((r) => r.lineKey === 'bs_1570')?.current ?? 0;
  const difference = totalAssets - totalLiabilitiesAndEquity;

  return {
    totalAssets,
    totalLiabilitiesAndEquity,
    difference,
    isBalanced: Math.abs(difference) <= BALANCE_TOLERANCE,
  };
}

function isSectionChild(
  child: StatementLineDefinitionRow,
  parent: StatementLineDefinitionRow,
): boolean {
  return (
    (parent.section_l1 == null || child.section_l1 === parent.section_l1) &&
    (parent.section_l2 == null || child.section_l2 === parent.section_l2) &&
    (parent.section_l3 == null || child.section_l3 === parent.section_l3) &&
    (parent.section_l4 == null || child.section_l4 === parent.section_l4)
  );
}

/**
 * Marchează nodurile REPORT_GROUP unde suma leaf-urilor de calcul nu coincide cu valoarea afișată.
 * Nu recalculează — doar validează față de regulile pipeline-ului (is_leaf_for_calculation).
 */
export function applyParentChildValidation(
  rows: FinancialTreeRow[],
  definitions: StatementLineDefinitionRow[],
): FinancialTreeRow[] {
  const defByKey = new Map(definitions.map((def) => [def.line_key, def]));
  const rowByKey = new Map(rows.map((row) => [row.lineKey, row]));

  const validated = rows.map((row) => ({ ...row }));

  for (const row of validated) {
    const def = defByKey.get(row.lineKey);
    if (!def || def.row_type !== 'REPORT_GROUP') continue;

    const leafSum = definitions
      .filter(
        (child) =>
          child.is_leaf_for_calculation &&
          child.display_order > def.display_order &&
          isSectionChild(child, def) &&
          rowByKey.has(child.line_key),
      )
      .reduce((sum, child) => sum + (rowByKey.get(child.line_key)?.current ?? 0), 0);

    const diff = row.current - leafSum;
    if (Math.abs(diff) > BALANCE_TOLERANCE) {
      row.hasValidationIssue = true;
      row.validationDiff = diff;

      if (import.meta.env.DEV) {
        console.warn(
          `[financialTreeValidation] ${row.label} (${row.lineKey}): afișat=${row.current}, sumă leaf=${leafSum}, diff=${diff}`,
        );
      }
    }
  }

  return validated;
}
