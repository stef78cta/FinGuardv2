import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { BalanceImport } from '@/hooks/useBalante';
import {
  findBalanceForMonth,
  getBalanceMonthAsDate,
} from '@/lib/balanceMonthSelection';

const NO_BALANCE_TOAST = 'Nu există o balanță încărcată pentru luna selectată.';

export interface UseBalanceMonthSelectionOptions {
  /** Lista balanțelor disponibile (de obicei ordonată descrescător după lună). */
  balances: BalanceImport[];
  /** Selectează automat cea mai recentă balanță la încărcarea datelor. */
  autoSelectLatest?: boolean;
  /** Afișează toast când luna selectată nu are balanță. */
  warnOnMissingBalance?: boolean;
}

export interface UseBalanceMonthSelectionResult {
  selectedMonth: Date | undefined;
  selectedBalanceId: string;
  selectedBalance: BalanceImport | undefined;
  handleMonthChange: (month: Date | undefined) => void;
}

/**
 * Gestionează selecția uniformă a lunii balanței și maparea către importul activ.
 */
export function useBalanceMonthSelection({
  balances,
  autoSelectLatest = true,
  warnOnMissingBalance = true,
}: UseBalanceMonthSelectionOptions): UseBalanceMonthSelectionResult {
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>();
  const [selectedBalanceId, setSelectedBalanceId] = useState<string>('');

  useEffect(() => {
    if (balances.length === 0) {
      setSelectedMonth(undefined);
      setSelectedBalanceId('');
      return;
    }

    setSelectedBalanceId((currentId) => {
      if (currentId && balances.some((balance) => balance.id === currentId)) {
        return currentId;
      }

      return autoSelectLatest ? balances[0].id : '';
    });
  }, [balances, autoSelectLatest]);

  useEffect(() => {
    if (!selectedBalanceId) {
      return;
    }

    const balance = balances.find((item) => item.id === selectedBalanceId);
    if (balance) {
      setSelectedMonth(getBalanceMonthAsDate(balance));
    }
  }, [selectedBalanceId, balances]);

  const handleMonthChange = useCallback(
    (month: Date | undefined) => {
      if (!month) {
        setSelectedMonth(undefined);
        setSelectedBalanceId('');
        return;
      }

      const balance = findBalanceForMonth(balances, month);
      if (!balance) {
        if (warnOnMissingBalance) {
          toast.error(NO_BALANCE_TOAST);
        }
        return;
      }

      setSelectedMonth(month);
      setSelectedBalanceId(balance.id);
    },
    [balances, warnOnMissingBalance],
  );

  const selectedBalance = balances.find((balance) => balance.id === selectedBalanceId);

  return {
    selectedMonth,
    selectedBalanceId,
    selectedBalance,
    handleMonthChange,
  };
}
