import { format, startOfMonth } from 'date-fns';

import type { BalanceImport } from '@/hooks/useBalante';
import { parseLocalDate } from '@/lib/balancePeriod';

/**
 * Cheie stabilă YYYY-MM pentru compararea lunilor fără probleme de timezone.
 */
export function toBalanceMonthKey(date: Date): string {
  return format(startOfMonth(date), 'yyyy-MM');
}

/**
 * Extrage cheia lunii din câmpurile unui import de balanță.
 */
export function getBalanceMonthKey(balance: BalanceImport): string {
  if (balance.balance_month) {
    return balance.balance_month.slice(0, 7);
  }

  return toBalanceMonthKey(parseLocalDate(balance.period_end));
}

/**
 * Convertește câmpul `balance_month` al unui import într-o dată normalizată
 * (prima zi a lunii, local), folosind `period_end` ca fallback.
 */
export function getBalanceMonthAsDate(balance: BalanceImport): Date {
  if (balance.balance_month) {
    return startOfMonth(parseLocalDate(balance.balance_month));
  }

  return startOfMonth(parseLocalDate(balance.period_end));
}

/**
 * Găsește balanța activă pentru luna selectată.
 * Dacă există mai multe importuri pentru aceeași lună, returnează cel mai recent
 * (după `created_at`), păstrând regula existentă a aplicației.
 */
export function findBalanceForMonth(
  balances: BalanceImport[],
  month: Date,
): BalanceImport | undefined {
  const targetKey = toBalanceMonthKey(month);

  const matches = balances.filter(
    (balance) => getBalanceMonthKey(balance) === targetKey,
  );

  if (matches.length === 0) {
    return undefined;
  }

  return matches.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
}

/**
 * Returnează balanța imediat anterioară celei curente, ordonată descrescător după lună.
 */
export function findPreviousBalance(
  balances: BalanceImport[],
  currentBalance: BalanceImport,
): BalanceImport | undefined {
  const sortedByMonth = [...balances].sort(
    (a, b) => getBalanceMonthAsDate(b).getTime() - getBalanceMonthAsDate(a).getTime(),
  );

  const currentIndex = sortedByMonth.findIndex((balance) => balance.id === currentBalance.id);

  if (currentIndex === -1 || currentIndex === sortedByMonth.length - 1) {
    return undefined;
  }

  return sortedByMonth[currentIndex + 1];
}
