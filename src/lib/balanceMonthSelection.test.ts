import { describe, expect, it } from 'vitest';

import type { BalanceImport } from '@/hooks/useBalante';
import {
  findBalanceForMonth,
  findPreviousBalance,
  getBalanceMonthAsDate,
  getBalanceMonthKey,
  toBalanceMonthKey,
} from '@/lib/balanceMonthSelection';

const createBalance = (
  overrides: Partial<BalanceImport> & Pick<BalanceImport, 'id'>,
): BalanceImport => ({
  company_id: 'company-1',
  source_file_name: 'balanta.xlsx',
  balance_month: '2026-06-01',
  period_start: '2026-01-01',
  period_end: '2026-06-30',
  status: 'completed',
  created_at: '2026-06-10T10:00:00.000Z',
  processed_at: '2026-06-10T10:05:00.000Z',
  ...overrides,
});

describe('balanceMonthSelection', () => {
  it('normalizează balance_month la prima zi a lunii', () => {
    const date = getBalanceMonthAsDate(
      createBalance({ id: '1', balance_month: '2026-07-01' }),
    );

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(1);
  });

  it('returnează cel mai recent import pentru aceeași lună', () => {
    const balances = [
      createBalance({
        id: 'older',
        balance_month: '2026-07-01',
        created_at: '2026-07-01T08:00:00.000Z',
      }),
      createBalance({
        id: 'newer',
        balance_month: '2026-07-01',
        created_at: '2026-07-15T08:00:00.000Z',
      }),
    ];

    const selected = findBalanceForMonth(balances, new Date(2026, 6, 1));

    expect(selected?.id).toBe('newer');
  });

  it('potrivește luna prin cheie YYYY-MM (aceeași lună calendaristică)', () => {
    const balances = [
      createBalance({ id: 'jul', balance_month: '2026-07-01' }),
    ];

    const selected = findBalanceForMonth(balances, new Date(2026, 6, 1));

    expect(getBalanceMonthKey(balances[0])).toBe('2026-07');
    expect(toBalanceMonthKey(new Date(2026, 6, 1))).toBe('2026-07');
    expect(selected?.id).toBe('jul');
  });

  it('găsește balanța anterioară după lună', () => {
    const balances = [
      createBalance({ id: 'jul', balance_month: '2026-07-01' }),
      createBalance({ id: 'jun', balance_month: '2026-06-01' }),
      createBalance({ id: 'mai', balance_month: '2026-05-01' }),
    ];

    const current = balances[0];
    const previous = findPreviousBalance(balances, current);

    expect(previous?.id).toBe('jun');
  });
});
