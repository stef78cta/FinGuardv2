import { useMemo } from 'react';
import { BalanceAccount, BalanceWithAccounts } from './useBalante';

export interface KPIData {
  venituri: number;
  cheltuieli: number;
  profitNet: number;
  cashFlow: number;
  venituriTrend: number;
  cheltuieliTrend: number;
  profitTrend: number;
  cashFlowTrend: number;
}

export interface TopAccount {
  code: string;
  name: string;
  value: number;
  change: number;
}

export interface ChartDataPoint {
  month: string;
  venituri: number;
  cheltuieli: number;
  profit: number;
  period: string;
}

// Romanian account class mappings based on Romanian Chart of Accounts
const getAccountClass = (code: string): string => {
  const firstDigit = code.charAt(0);
  return firstDigit;
};

// Calculate revenues from class 7 accounts
const calculateRevenues = (accounts: BalanceAccount[]): number => {
  return accounts
    .filter(acc => getAccountClass(acc.account_code) === '7')
    .reduce((sum, acc) => sum + (acc.credit_turnover || 0), 0);
};

// Calculate expenses from class 6 accounts
const calculateExpenses = (accounts: BalanceAccount[]): number => {
  return accounts
    .filter(acc => getAccountClass(acc.account_code) === '6')
    .reduce((sum, acc) => sum + (acc.debit_turnover || 0), 0);
};

// Calculate cash flow from class 5 accounts (treasury)
const calculateCashFlow = (accounts: BalanceAccount[]): number => {
  return accounts
    .filter(acc => getAccountClass(acc.account_code) === '5')
    .reduce((sum, acc) => (acc.closing_debit || 0) - (acc.closing_credit || 0), 0);
};

// Calculate trend percentage between two values
const calculateTrend = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

export const useKPIs = (
  latestBalance: BalanceWithAccounts | null,
  allBalances: BalanceWithAccounts[]
) => {
  const kpis = useMemo((): KPIData => {
    if (!latestBalance || !latestBalance.accounts) {
      return {
        venituri: 0,
        cheltuieli: 0,
        profitNet: 0,
        cashFlow: 0,
        venituriTrend: 0,
        cheltuieliTrend: 0,
        profitTrend: 0,
        cashFlowTrend: 0,
      };
    }

    const currentAccounts = latestBalance.accounts;
    const currentVenituri = calculateRevenues(currentAccounts);
    const currentCheltuieli = calculateExpenses(currentAccounts);
    const currentProfit = currentVenituri - currentCheltuieli;
    const currentCashFlow = calculateCashFlow(currentAccounts);

    // Find previous balance for trend calculation
    let previousVenituri = 0;
    let previousCheltuieli = 0;
    let previousProfit = 0;
    let previousCashFlow = 0;

    if (allBalances.length > 1) {
      const previousBalance = allBalances[1];
      if (previousBalance.accounts) {
        previousVenituri = calculateRevenues(previousBalance.accounts);
        previousCheltuieli = calculateExpenses(previousBalance.accounts);
        previousProfit = previousVenituri - previousCheltuieli;
        previousCashFlow = calculateCashFlow(previousBalance.accounts);
      }
    }

    return {
      venituri: currentVenituri,
      cheltuieli: currentCheltuieli,
      profitNet: currentProfit,
      cashFlow: currentCashFlow,
      venituriTrend: calculateTrend(currentVenituri, previousVenituri),
      cheltuieliTrend: calculateTrend(currentCheltuieli, previousCheltuieli),
      profitTrend: calculateTrend(currentProfit, previousProfit),
      cashFlowTrend: calculateTrend(currentCashFlow, previousCashFlow),
    };
  }, [latestBalance, allBalances]);

  const topAccounts = useMemo((): TopAccount[] => {
    if (!latestBalance || !latestBalance.accounts) return [];

    const accounts = latestBalance.accounts;
    
    // Get accounts with highest closing balances (absolute value)
    const sortedAccounts = [...accounts]
      .map(acc => ({
        code: acc.account_code,
        name: acc.account_name,
        value: Math.abs((acc.closing_debit || 0) - (acc.closing_credit || 0)),
        closingDebit: acc.closing_debit || 0,
        closingCredit: acc.closing_credit || 0,
        openingDebit: acc.opening_debit || 0,
        openingCredit: acc.opening_credit || 0,
      }))
      .filter(acc => acc.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Calculate change based on opening vs closing
    return sortedAccounts.map(acc => {
      const openingValue = Math.abs(acc.openingDebit - acc.openingCredit);
      const closingValue = acc.value;
      const change = openingValue > 0 
        ? ((closingValue - openingValue) / openingValue) * 100 
        : (closingValue > 0 ? 100 : 0);

      return {
        code: acc.code,
        name: acc.name,
        value: closingValue,
        change: Math.round(change * 10) / 10,
      };
    });
  }, [latestBalance]);

  const chartData = useMemo((): ChartDataPoint[] => {
    if (allBalances.length === 0) return [];

    const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return allBalances
      .slice(0, 6) // Last 6 periods
      .reverse() // Oldest first for chart
      .map(balance => {
        const accounts = balance.accounts || [];
        const venituri = calculateRevenues(accounts);
        const cheltuieli = calculateExpenses(accounts);
        const profit = venituri - cheltuieli;

        const periodEnd = new Date(balance.period_end);
        const monthIndex = periodEnd.getMonth();
        const year = periodEnd.getFullYear();

        return {
          month: monthNames[monthIndex],
          venituri,
          cheltuieli,
          profit,
          period: `${monthNames[monthIndex]} ${year}`,
        };
      });
  }, [allBalances]);

  return {
    kpis,
    topAccounts,
    chartData,
    hasData: latestBalance !== null && latestBalance.accounts.length > 0,
  };
};
