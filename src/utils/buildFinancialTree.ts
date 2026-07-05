import type {
  FinancialRowKind,
  FinancialTreeBuildInput,
  FinancialTreeRow,
  StatementLineDefinitionRow,
} from '@/types/financialTree';
import { computeDelta, computeDeltaPct } from '@/utils/formatFinancialValue';

const GRAND_TOTAL_LINE_KEYS = new Set(['bs_805', 'bs_1570']);

function getHierarchyDepth(def: StatementLineDefinitionRow): number {
  if (def.section_l4) return 4;
  if (def.section_l3) return 3;
  if (def.section_l2) return 2;
  if (def.section_l1) return 1;
  return 0;
}

function mapRowKind(def: StatementLineDefinitionRow): FinancialRowKind {
  if (GRAND_TOTAL_LINE_KEYS.has(def.line_key)) return 'grand_total';
  if (def.row_type === 'ACCOUNT_LEAF') return 'account';
  if (def.row_type === 'CALCULATED') return 'calculated';
  if (def.row_type.startsWith('INTERNAL')) return 'internal';
  return 'group';
}

function buildAccountsLabel(def: StatementLineDefinitionRow): string {
  if (def.account_code) return def.account_code;
  if (def.formula_or_rule) return def.formula_or_rule.slice(0, 80);
  return '—';
}

function buildLabel(def: StatementLineDefinitionRow): string {
  return def.display_name;
}

interface StackEntry {
  lineKey: string;
  depth: number;
  reportArea: string;
}

/**
 * Construiește rânduri flat pentru AG Grid tree din definiții + sume generate.
 * Ierarhia urmează display_order și adâncimea secțiunilor l1–l4 (ca în pipeline SQL).
 */
export function buildFinancialTreeRows(input: FinancialTreeBuildInput): FinancialTreeRow[] {
  const {
    definitions,
    currentLines,
    previousLines = [],
    hideInternalRows = true,
    hideZeroLeafRows = false,
  } = input;

  const currentByKey = new Map(currentLines.map((line) => [line.line_key, line.amount]));
  const previousByKey = new Map(previousLines.map((line) => [line.line_key, line.amount]));

  const sorted = [...definitions]
    .filter((def) => def.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  const stack: StackEntry[] = [];
  const rows: FinancialTreeRow[] = [];

  for (const def of sorted) {
    const rowKind = mapRowKind(def);
    if (hideInternalRows && rowKind === 'internal') continue;

    const depth = getHierarchyDepth(def);
    const reportArea = def.report_area ?? 'Altele';

    while (
      stack.length > 0 &&
      (stack[stack.length - 1].depth >= depth ||
        stack[stack.length - 1].reportArea !== reportArea)
    ) {
      stack.pop();
    }

    const path = [...stack.map((entry) => entry.lineKey), def.line_key];
    stack.push({ lineKey: def.line_key, depth, reportArea });

    const current = currentByKey.get(def.line_key) ?? 0;
    const previous = previousByKey.has(def.line_key) ? (previousByKey.get(def.line_key) ?? 0) : null;

    if (hideZeroLeafRows && rowKind === 'account' && current === 0 && (previous ?? 0) === 0) {
      continue;
    }

    rows.push({
      id: def.line_key,
      lineKey: def.line_key,
      label: buildLabel(def),
      path,
      level: path.length - 1,
      rowKind,
      reportArea,
      accountCode: def.account_code,
      current,
      previous,
      delta: computeDelta(current, previous),
      deltaPct: computeDeltaPct(current, previous),
      rowType: def.row_type,
      lineType: def.line_type,
      isLeafForCalculation: def.is_leaf_for_calculation,
      formulaOrRule: def.formula_or_rule,
      hasValidationIssue: false,
      validationDiff: null,
      accountsLabel: buildAccountsLabel(def),
      status: 'OK',
    });
  }

  return rows;
}
