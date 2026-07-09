import type { BalanceAccount } from './useBalante';
import { useOfficialFinancialCalculations } from './useOfficialFinancialCalculations';

export type {
  BilantData,
  ProfitPierdereData,
  CashFlowData,
} from './useFinancialCalculations.types';

export interface UseFinancialCalculationsOptions {
  /** ID import balanță — necesar pentru pipeline-ul SQL oficial. */
  importId?: string | null;
  /** ID companie — necesar pentru pipeline-ul SQL oficial. */
  companyId?: string | null;
}

/**
 * Hook unificat pentru calcule financiare — delegă exclusiv pipeline-ul SQL oficial.
 * Nu mai calculează pe prefixe de cont; necesită importId + companyId.
 *
 * @param _accounts - Păstrat pentru compatibilitate API; nu mai este folosit la calcul.
 * @param options - importId și companyId pentru citirea rapoartelor generate.
 */
export const useFinancialCalculations = (
  _accounts: BalanceAccount[],
  options?: UseFinancialCalculationsOptions,
) => {
  const official = useOfficialFinancialCalculations(options?.importId, options?.companyId);

  return {
    bilantData: official.bilantData,
    profitPierdereData: official.profitPierdereData,
    cashFlowData: official.cashFlowData,
    kpiData: official.kpiData,
    loading: official.loading,
    hasOfficialData: official.hasOfficialData,
    error: official.error,
  };
};
