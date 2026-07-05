import { describe, expect, it } from 'vitest';
import { buildFinancialTreeRows } from '@/utils/buildFinancialTree';
import type { StatementLineDefinitionRow } from '@/types/financialTree';

function def(partial: Partial<StatementLineDefinitionRow> & Pick<StatementLineDefinitionRow, 'line_key' | 'display_order' | 'display_name' | 'row_type'>): StatementLineDefinitionRow {
  return {
    id: partial.line_key,
    company_id: null,
    statement_type: 'balance_sheet',
    parent_line_key: null,
    sort_order: partial.display_order,
    section_l1: null,
    section_l2: null,
    section_l3: null,
    section_l4: null,
    account_code: null,
    chart_account_id: null,
    report_area: 'Active',
    line_type: 'group',
    normal_balance: null,
    report_sign: '+',
    is_leaf_for_calculation: false,
    formula_or_rule: null,
    notes: null,
    is_active: true,
    created_at: '',
    updated_at: '',
    ...partial,
  };
}

describe('buildFinancialTreeRows', () => {
  it('construiește path ierarhic pe secțiuni', () => {
    const definitions = [
      def({ line_key: 'bs_a', display_order: 10, display_name: 'Grup A', row_type: 'REPORT_GROUP', section_l1: 'Grup A' }),
      def({
        line_key: 'bs_b',
        display_order: 20,
        display_name: 'Sub B',
        row_type: 'ACCOUNT_LEAF',
        section_l1: 'Grup A',
        section_l2: 'Sub B',
        account_code: '301',
        is_leaf_for_calculation: true,
      }),
    ];

    const rows = buildFinancialTreeRows({
      definitions,
      currentLines: [
        { line_key: 'bs_a', amount: 100 } as never,
        { line_key: 'bs_b', amount: 40 } as never,
      ],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].path).toEqual(['bs_a']);
    expect(rows[1].path).toEqual(['bs_a', 'bs_b']);
    expect(rows[1].current).toBe(40);
    expect(rows[0].accountsLabel).toBeDefined();
    expect(rows[0].status).toBeDefined();
  });

  it('resetează stack-ul la schimbarea report_area', () => {
    const definitions = [
      def({
        line_key: 'bs_active',
        display_order: 10,
        display_name: 'Active totale',
        row_type: 'CALCULATED',
        report_area: 'Active',
        section_l1: 'Active totale',
      }),
      def({
        line_key: 'bs_pasive',
        display_order: 20,
        display_name: 'Datorii',
        row_type: 'REPORT_GROUP',
        report_area: 'Pasive',
        section_l1: 'Datorii pe termen scurt',
      }),
    ];

    const rows = buildFinancialTreeRows({
      definitions,
      currentLines: [
        { line_key: 'bs_active', amount: 500 } as never,
        { line_key: 'bs_pasive', amount: 200 } as never,
      ],
    });

    expect(rows[1].path).toEqual(['bs_pasive']);
    expect(rows[1].reportArea).toBe('Pasive');
  });
});
