import type { Database } from '@/integrations/supabase/types';

type BalanceSheetLineRow = Database['public']['Tables']['balance_sheet_lines']['Row'];
type IncomeStatementLineRow = Database['public']['Tables']['income_statement_lines']['Row'];
type CashFlowLineRow = Database['public']['Tables']['cash_flow_lines']['Row'];

export const CF_SECTION_LABELS: Record<string, string> = {
  opening_cash: 'Sold numerar la început',
  operating: 'Activități operaționale',
  investing: 'Activități de investiții',
  financing: 'Activități de finanțare',
  internal_transfers: 'Transferuri interne',
  unusual: 'Fluxuri neobișnuite',
  closing_cash: 'Sold numerar la sfârșit',
  calculated: 'Totaluri calculate',
};

export const PL_CATEGORY_LABELS: Record<string, string> = {
  venituri: 'Venituri',
  cheltuieli: 'Cheltuieli',
  rezultat: 'Rezultat',
  marja: 'Marje și indicatori',
  calculated: 'Linii calculate',
};

export function getCashFlowSectionLabel(section: string): string {
  return CF_SECTION_LABELS[section] ?? section;
}

export function getIncomeCategoryLabel(category: string): string {
  return PL_CATEGORY_LABELS[category] ?? category;
}

export function isEmphasizedLineType(lineType: string | null | undefined): boolean {
  if (!lineType) return false;
  return ['calculated', 'group', 'kpi'].includes(lineType);
}

export function isBalanceSheetEmphasized(line: BalanceSheetLineRow): boolean {
  const label = (line.description ?? line.line_key).toUpperCase();
  return label.includes('TOTAL') || label.includes('SUBTOTAL');
}

export interface GroupedLines<T> {
  groupKey: string;
  groupLabel: string;
  subgroups: Array<{
    subKey: string;
    subLabel: string | null;
    lines: T[];
  }>;
}

/**
 * Grupează liniile de bilanț după category → subcategory, păstrând display_order.
 */
export function groupBalanceSheetLines(lines: BalanceSheetLineRow[]): GroupedLines<BalanceSheetLineRow>[] {
  const categoryMap = new Map<string, Map<string | null, BalanceSheetLineRow[]>>();

  for (const line of lines) {
    const category = line.category || 'Altele';
    const subcategory = line.subcategory ?? null;

    if (!categoryMap.has(category)) {
      categoryMap.set(category, new Map());
    }
    const subMap = categoryMap.get(category)!;
    if (!subMap.has(subcategory)) {
      subMap.set(subcategory, []);
    }
    subMap.get(subcategory)!.push(line);
  }

  return Array.from(categoryMap.entries()).map(([groupKey, subMap]) => ({
    groupKey,
    groupLabel: groupKey,
    subgroups: Array.from(subMap.entries()).map(([subKey, subLines]) => ({
      subKey: subKey ?? '',
      subLabel: subKey,
      lines: subLines,
    })),
  }));
}

/**
 * Grupează liniile P&L după category.
 */
export function groupIncomeStatementLines(
  lines: IncomeStatementLineRow[],
): GroupedLines<IncomeStatementLineRow>[] {
  const categoryMap = new Map<string, IncomeStatementLineRow[]>();

  for (const line of lines) {
    const category = line.category || 'Altele';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(line);
  }

  const order = ['venituri', 'cheltuieli', 'rezultat', 'marja', 'calculated'];

  return Array.from(categoryMap.entries())
    .sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    })
    .map(([groupKey, groupLines]) => ({
      groupKey,
      groupLabel: getIncomeCategoryLabel(groupKey),
      subgroups: [{ subKey: '', subLabel: null, lines: groupLines }],
    }));
}

/**
 * Grupează liniile cash flow după section.
 */
export function groupCashFlowLines(lines: CashFlowLineRow[]): GroupedLines<CashFlowLineRow>[] {
  const sectionOrder = Object.keys(CF_SECTION_LABELS);
  const sectionMap = new Map<string, CashFlowLineRow[]>();

  for (const line of lines) {
    const section = line.section || 'operating';
    if (!sectionMap.has(section)) {
      sectionMap.set(section, []);
    }
    sectionMap.get(section)!.push(line);
  }

  return Array.from(sectionMap.entries())
    .sort(([a], [b]) => {
      const ia = sectionOrder.indexOf(a);
      const ib = sectionOrder.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    })
    .map(([groupKey, groupLines]) => ({
      groupKey,
      groupLabel: getCashFlowSectionLabel(groupKey),
      subgroups: [{ subKey: '', subLabel: null, lines: groupLines }],
    }));
}

export function formatStatementCurrency(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatStatementAmount(value: number): string {
  const isNegative = value < 0;
  const formatted = formatStatementCurrency(Math.abs(value));
  return isNegative ? `(${formatted})` : formatted;
}
