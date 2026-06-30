import { endOfMonth, format, startOfMonth } from 'date-fns';

export interface BalancePeriodResult {
  balance_month: string;
  period_start: string;
  period_end: string;
}

export interface BalancePeriodInput {
  year: number;
  /** Luna calendaristică 1–12 */
  month: number;
  /**
   * Luna de început a anului fiscal al companiei (1–12).
   * Default 1 (ianuarie). Extensibil când UI-ul companiei expune fiscal_year_start_month.
   */
  fiscalYearStartMonth?: number;
}

const DATE_FORMAT = 'yyyy-MM-dd';

/**
 * Formatează o dată locală ca YYYY-MM-DD (fără shift UTC).
 */
export function formatLocalDate(date: Date): string {
  return format(date, DATE_FORMAT);
}

/**
 * Calculează balance_month, period_start și period_end pentru un import de balanță.
 *
 * Reguli:
 * - balance_month = prima zi din luna selectată
 * - period_end = ultima zi calendaristică din luna selectată
 * - period_start = prima zi a lunii de început a anului fiscal care conține balance_month
 */
export function calculateBalancePeriod(input: BalancePeriodInput): BalancePeriodResult {
  const { year, month, fiscalYearStartMonth = 1 } = input;

  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error('An invalid pentru luna balanței');
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Lună invalidă (trebuie să fie între 1 și 12)');
  }

  const fiscalStart = fiscalYearStartMonth;
  if (!Number.isInteger(fiscalStart) || fiscalStart < 1 || fiscalStart > 12) {
    throw new Error('Luna de început a anului fiscal invalidă');
  }

  const balanceMonthDate = startOfMonth(new Date(year, month - 1, 1));
  const periodEndDate = endOfMonth(balanceMonthDate);

  const balanceYear = balanceMonthDate.getFullYear();
  const balanceMonthIndex = balanceMonthDate.getMonth() + 1;

  const fiscalYearStartYear =
    balanceMonthIndex >= fiscalStart ? balanceYear : balanceYear - 1;

  const periodStartDate = startOfMonth(new Date(fiscalYearStartYear, fiscalStart - 1, 1));

  if (periodStartDate > periodEndDate) {
    throw new Error('Perioada calculată este invalidă (period_start > period_end)');
  }

  return {
    balance_month: formatLocalDate(balanceMonthDate),
    period_start: formatLocalDate(periodStartDate),
    period_end: formatLocalDate(periodEndDate),
  };
}

/**
 * Convertește o dată (prima zi a lunii) în parametri pentru calculateBalancePeriod.
 */
export function calculateBalancePeriodFromDate(
  balanceMonth: Date,
  fiscalYearStartMonth?: number,
): BalancePeriodResult {
  return calculateBalancePeriod({
    year: balanceMonth.getFullYear(),
    month: balanceMonth.getMonth() + 1,
    fiscalYearStartMonth,
  });
}

/**
 * Validează un rezultat de perioadă înainte de insert.
 */
export function validateBalancePeriod(result: BalancePeriodResult): void {
  const { balance_month, period_start, period_end } = result;

  const balanceDate = parseLocalDate(balance_month);
  const startDate = parseLocalDate(period_start);
  const endDate = parseLocalDate(period_end);

  if (balanceDate.getDate() !== 1) {
    throw new Error('balance_month trebuie să fie prima zi din lună');
  }

  if (startDate > endDate) {
    throw new Error('period_start trebuie să fie <= period_end');
  }

  const expectedEnd = endOfMonth(balanceDate);
  if (formatLocalDate(expectedEnd) !== period_end) {
    throw new Error('period_end trebuie să fie ultima zi din luna balanței');
  }
}

function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) {
    throw new Error('Dată invalidă');
  }
  return new Date(y, m - 1, d);
}
