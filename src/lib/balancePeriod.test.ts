import { describe, expect, it } from 'vitest';
import {
  calculateBalancePeriod,
  calculateBalancePeriodFromDate,
  validateBalancePeriod,
} from './balancePeriod';

describe('calculateBalancePeriod', () => {
  it('calculează corect pentru mai 2026 (an fiscal ianuarie)', () => {
    const result = calculateBalancePeriod({ year: 2026, month: 5 });

    expect(result).toEqual({
      balance_month: '2026-05-01',
      period_start: '2026-01-01',
      period_end: '2026-05-31',
    });
  });

  it('calculează corect pentru decembrie', () => {
    const result = calculateBalancePeriod({ year: 2026, month: 12 });

    expect(result).toEqual({
      balance_month: '2026-12-01',
      period_start: '2026-01-01',
      period_end: '2026-12-31',
    });
  });

  it('calculează corect februarie în an bisect', () => {
    const result = calculateBalancePeriod({ year: 2024, month: 2 });

    expect(result).toEqual({
      balance_month: '2024-02-01',
      period_start: '2024-01-01',
      period_end: '2024-02-29',
    });
  });

  it('respectă fiscal_year_start_month = 4 (aprilie)', () => {
    const mayResult = calculateBalancePeriod({
      year: 2026,
      month: 5,
      fiscalYearStartMonth: 4,
    });
    expect(mayResult.period_start).toBe('2026-04-01');

    const febResult = calculateBalancePeriod({
      year: 2026,
      month: 2,
      fiscalYearStartMonth: 4,
    });
    expect(febResult.period_start).toBe('2025-04-01');
  });

  it('respinge lună invalidă', () => {
    expect(() => calculateBalancePeriod({ year: 2026, month: 0 })).toThrow(
      'Lună invalidă',
    );
    expect(() => calculateBalancePeriod({ year: 2026, month: 13 })).toThrow(
      'Lună invalidă',
    );
  });

  it('respinge an invalid', () => {
    expect(() => calculateBalancePeriod({ year: 1800, month: 1 })).toThrow(
      'An invalid',
    );
  });
});

describe('calculateBalancePeriodFromDate', () => {
  it('normalizează data la prima zi a lunii', () => {
    const result = calculateBalancePeriodFromDate(new Date(2026, 4, 15));
    expect(result.balance_month).toBe('2026-05-01');
    expect(result.period_end).toBe('2026-05-31');
  });
});

describe('validateBalancePeriod', () => {
  it('acceptă perioada validă', () => {
    expect(() =>
      validateBalancePeriod({
        balance_month: '2026-05-01',
        period_start: '2026-01-01',
        period_end: '2026-05-31',
      }),
    ).not.toThrow();
  });

  it('respinge balance_month care nu e prima zi', () => {
    expect(() =>
      validateBalancePeriod({
        balance_month: '2026-05-15',
        period_start: '2026-01-01',
        period_end: '2026-05-31',
      }),
    ).toThrow('balance_month trebuie să fie prima zi din lună');
  });

  it('respinge period_end incorect', () => {
    expect(() =>
      validateBalancePeriod({
        balance_month: '2026-05-01',
        period_start: '2026-01-01',
        period_end: '2026-05-15',
      }),
    ).toThrow('period_end trebuie să fie ultima zi din luna balanței');
  });
});
