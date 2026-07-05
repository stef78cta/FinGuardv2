import type { FinancialRowKind, FinancialTreeRow } from '@/types/financialTree';

/**
 * Semantic row category used purely for presentation (styling + optional
 * technical filtering). Independent of the calculation pipeline.
 */
export type FinancialViewRowType = 'section' | 'subtotal' | 'account' | 'technical';

/**
 * Presentation view-model consumed by the financial tree table.
 *
 * This is a projection of {@link FinancialTreeRow}; it never mutates or
 * recomputes the underlying values. `originalRow` keeps the full source row for
 * debugging and future features.
 */
export interface FinancialViewRow {
  id: string;
  label: string;
  code?: string;
  /** Label shown in the hierarchical column, e.g. `Alte imobilizări necorporale (208)`. */
  displayLabel: string;
  level: number;
  status?: string;
  rowType: FinancialViewRowType;
  /** Current-period value (unchanged from source). */
  value: number;
  previous: number | null;
  delta: number | null;
  deltaPct: number | null;
  path: string[];
  hasValidationIssue: boolean;
  originalRow: FinancialTreeRow;
}

function mapRowType(kind: FinancialRowKind): FinancialViewRowType {
  switch (kind) {
    case 'group':
      return 'section';
    case 'calculated':
    case 'grand_total':
      return 'subtotal';
    case 'account':
      return 'account';
    default:
      return 'technical';
  }
}

/**
 * Build the display label for a row.
 *
 * Accounting leaf accounts are shown as `Name (code)`; sections and subtotals
 * show only their financial name. Raw technical separators (`—`) are never
 * surfaced as labels.
 */
function buildDisplayLabel(row: FinancialTreeRow, rowType: FinancialViewRowType): string {
  const cleanLabel = row.label && row.label.trim() !== '—' ? row.label.trim() : '';
  if (rowType === 'account' && row.accountCode) {
    return cleanLabel ? `${cleanLabel} (${row.accountCode})` : `(${row.accountCode})`;
  }
  return cleanLabel;
}

/**
 * Project financial tree rows into presentation view-model rows.
 *
 * Drops purely technical separator rows so the report reads cleanly, while
 * preserving hierarchy integrity (internal rows are already excluded from the
 * path stack upstream, so no orphans are produced).
 *
 * @param rows - Source rows from the calculation/build pipeline.
 * @returns View-model rows in original (hierarchy) order.
 */
export function mapFinancialTreeRows(rows: FinancialTreeRow[]): FinancialViewRow[] {
  const result: FinancialViewRow[] = [];

  for (const row of rows) {
    const rowType = mapRowType(row.rowKind);
    if (rowType === 'technical') continue;

    const displayLabel = buildDisplayLabel(row, rowType);
    if (!displayLabel) continue;

    result.push({
      id: row.id,
      label: row.label,
      code: row.accountCode ?? undefined,
      displayLabel,
      level: row.level,
      status: row.status,
      rowType,
      value: row.current,
      previous: row.previous,
      delta: row.delta,
      deltaPct: row.deltaPct,
      path: row.path,
      hasValidationIssue: row.hasValidationIssue,
      originalRow: row,
    });
  }

  return result;
}
