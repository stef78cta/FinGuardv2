import type { Database } from '@/integrations/supabase/types';

export type StatementLineDefinitionRow =
  Database['public']['Tables']['statement_line_definitions']['Row'];

export type BalanceSheetLineRow = Database['public']['Tables']['balance_sheet_lines']['Row'];

export type FinancialStatementType = 'balance_sheet' | 'income_statement' | 'cash_flow';

/** Semantic row kind for UI styling and filters. */
export type FinancialRowKind = 'group' | 'account' | 'calculated' | 'internal' | 'grand_total';

/** Flat row consumed by AG Grid tree data mode. */
export interface FinancialTreeRow {
  id: string;
  lineKey: string;
  label: string;
  path: string[];
  level: number;
  rowKind: FinancialRowKind;
  reportArea: string;
  accountCode: string | null;
  current: number;
  previous: number | null;
  delta: number | null;
  deltaPct: number | null;
  rowType: string;
  lineType: string | null;
  isLeafForCalculation: boolean;
  formulaOrRule: string | null;
  hasValidationIssue: boolean;
  validationDiff: number | null;
  /** Cod cont sau indiciu conturi incluse. */
  accountsLabel: string;
  /** Status validare afișat în coloana dedicată. */
  status: string;
}

export interface FinancialTreeBuildInput {
  definitions: StatementLineDefinitionRow[];
  currentLines: BalanceSheetLineRow[];
  previousLines?: BalanceSheetLineRow[];
  hideInternalRows?: boolean;
  hideZeroLeafRows?: boolean;
}

export interface BalanceSheetEquationCheck {
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  difference: number;
  isBalanced: boolean;
}

/** Layout persisted in localStorage; structured for future DB sync per user. */
export interface FinancialTableLayout {
  version: 1;
  reportType: FinancialStatementType;
  columnState: unknown;
  columnGroupState?: unknown;
  filterModel?: unknown;
  sortModel?: unknown;
  expandedNodeIds?: string[];
}
