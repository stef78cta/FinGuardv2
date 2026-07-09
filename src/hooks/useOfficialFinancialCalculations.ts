import { useMemo } from 'react';
import { useGeneratedFinancialStatements } from '@/hooks/useGeneratedFinancialStatements';
import {
  computeKpiFromFinancialData,
  mapOfficialStatementsToFinancialData,
} from '@/utils/mapOfficialStatementsToFinancialData';
import type {
  BilantData,
  CashFlowData,
  ProfitPierdereData,
} from '@/hooks/useFinancialCalculations.types';

export interface OfficialFinancialCalculationsResult {
  bilantData: BilantData;
  profitPierdereData: ProfitPierdereData;
  cashFlowData: CashFlowData;
  kpiData: ReturnType<typeof computeKpiFromFinancialData>;
  loading: boolean;
  hasOfficialData: boolean;
  error: string | null;
}

const EMPTY_MAPPED = mapOfficialStatementsToFinancialData({
  balanceSheetLines: [],
  incomeStatementLines: [],
  cashFlowLines: [],
});

const EMPTY_KPI = computeKpiFromFinancialData(EMPTY_MAPPED.bilantData, EMPTY_MAPPED.profitPierdereData);

/**
 * Citește calculele financiare exclusiv din pipeline-ul SQL oficial
 * (balance_sheet_lines, income_statement_lines, cash_flow_lines).
 */
export function useOfficialFinancialCalculations(
  importId: string | null | undefined,
  companyId: string | null | undefined,
): OfficialFinancialCalculationsResult {
  const {
    loading,
    error,
    hasStatements,
    data,
  } = useGeneratedFinancialStatements(importId ?? null, companyId ?? null);

  const mapped = useMemo(() => {
    if (!hasStatements) {
      return mapOfficialStatementsToFinancialData({
        balanceSheetLines: [],
        incomeStatementLines: [],
        cashFlowLines: [],
      });
    }

    return mapOfficialStatementsToFinancialData({
      balanceSheetLines: data.balanceSheet?.lines ?? [],
      incomeStatementLines: data.incomeStatement?.lines ?? [],
      cashFlowLines: data.cashFlow?.lines ?? [],
    });
  }, [hasStatements, data]);

  const kpiData = useMemo(
    () =>
      hasStatements
        ? computeKpiFromFinancialData(mapped.bilantData, mapped.profitPierdereData)
        : EMPTY_KPI,
    [hasStatements, mapped],
  );

  return {
    ...mapped,
    kpiData,
    loading,
    hasOfficialData: hasStatements,
    error,
  };
}
