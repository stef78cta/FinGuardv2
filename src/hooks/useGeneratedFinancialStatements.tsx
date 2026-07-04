import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { subscribeBalancesChanged } from '@/lib/balanceEvents';
import {
  generateFinancialStatementsForImport,
  type GenerateStatementsRpcResult,
  type StatementsGenerationResult,
} from '@/lib/financialStatementsPipeline';
import { extractSupabaseErrorMessage } from '@/lib/storage/constants';

type FinancialStatementRow = Database['public']['Tables']['financial_statements']['Row'];
type BalanceSheetLineRow = Database['public']['Tables']['balance_sheet_lines']['Row'];
type IncomeStatementLineRow = Database['public']['Tables']['income_statement_lines']['Row'];
type CashFlowLineRow = Database['public']['Tables']['cash_flow_lines']['Row'];

export interface StatementWithLines<TLine> {
  statement: FinancialStatementRow;
  lines: TLine[];
}

export interface GeneratedFinancialStatementsData {
  balanceSheet: StatementWithLines<BalanceSheetLineRow> | null;
  incomeStatement: StatementWithLines<IncomeStatementLineRow> | null;
  cashFlow: StatementWithLines<CashFlowLineRow> | null;
  reportId: string | null;
}

export interface UseGeneratedFinancialStatementsReturn {
  loading: boolean;
  isGenerating: boolean;
  error: string | null;
  hasStatements: boolean;
  data: GeneratedFinancialStatementsData;
  refresh: () => Promise<void>;
  generateStatements: () => Promise<StatementsGenerationResult>;
}

const EMPTY_DATA: GeneratedFinancialStatementsData = {
  balanceSheet: null,
  incomeStatement: null,
  cashFlow: null,
  reportId: null,
};

/**
 * Citește situațiile financiare generate în DB pentru un import de balanță
 * și expune generarea/regenerarea via RPC Supabase.
 */
export const useGeneratedFinancialStatements = (
  importId: string | null,
  companyId: string | null,
): UseGeneratedFinancialStatementsReturn => {
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<GeneratedFinancialStatementsData>(EMPTY_DATA);

  const fetchStatements = useCallback(async () => {
    if (!importId || !companyId) {
      setData(EMPTY_DATA);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: statements, error: statementsError } = await supabase
        .from('financial_statements')
        .select('*')
        .eq('source_import_id', importId)
        .eq('company_id', companyId)
        .order('statement_type');

      if (statementsError) throw statementsError;

      if (!statements || statements.length === 0) {
        setData(EMPTY_DATA);
        return;
      }

      const bsStatement = statements.find((s) => s.statement_type === 'balance_sheet');
      const plStatement = statements.find((s) => s.statement_type === 'income_statement');
      const cfStatement = statements.find((s) => s.statement_type === 'cash_flow');

      const [bsLinesResult, plLinesResult, cfLinesResult, reportResult] = await Promise.all([
        bsStatement
          ? supabase
              .from('balance_sheet_lines')
              .select('*')
              .eq('statement_id', bsStatement.id)
              .order('display_order')
          : Promise.resolve({ data: [] as BalanceSheetLineRow[], error: null }),
        plStatement
          ? supabase
              .from('income_statement_lines')
              .select('*')
              .eq('statement_id', plStatement.id)
              .order('display_order')
          : Promise.resolve({ data: [] as IncomeStatementLineRow[], error: null }),
        cfStatement
          ? supabase
              .from('cash_flow_lines')
              .select('*')
              .eq('statement_id', cfStatement.id)
              .order('display_order')
          : Promise.resolve({ data: [] as CashFlowLineRow[], error: null }),
        supabase
          .from('reports')
          .select('id')
          .eq('company_id', companyId)
          .filter('metadata->>source_import_id', 'eq', importId)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (bsLinesResult.error) throw bsLinesResult.error;
      if (plLinesResult.error) throw plLinesResult.error;
      if (cfLinesResult.error) throw cfLinesResult.error;

      setData({
        balanceSheet: bsStatement
          ? { statement: bsStatement, lines: bsLinesResult.data ?? [] }
          : null,
        incomeStatement: plStatement
          ? { statement: plStatement, lines: plLinesResult.data ?? [] }
          : null,
        cashFlow: cfStatement
          ? { statement: cfStatement, lines: cfLinesResult.data ?? [] }
          : null,
        reportId: reportResult.data?.id ?? null,
      });
    } catch (err) {
      console.error('[useGeneratedFinancialStatements] Fetch error:', err);
      setError(extractSupabaseErrorMessage(err) || 'Eroare la încărcarea rapoartelor financiare');
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  }, [importId, companyId]);

  useEffect(() => {
    void fetchStatements();
  }, [fetchStatements]);

  useEffect(() => {
    if (!companyId) return;

    return subscribeBalancesChanged((changedCompanyId) => {
      if (changedCompanyId === null || changedCompanyId === companyId) {
        void fetchStatements();
      }
    });
  }, [companyId, fetchStatements]);

  const generateStatements = useCallback(async (): Promise<StatementsGenerationResult> => {
    if (!importId || !companyId) {
      return { success: false, error: 'Selectați o balanță validă' };
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateFinancialStatementsForImport(companyId, importId);

      if (result.success) {
        await fetchStatements();
      } else {
        setError(result.error ?? 'Generarea rapoartelor a eșuat');
      }

      return result;
    } finally {
      setIsGenerating(false);
    }
  }, [importId, companyId, fetchStatements]);

  const hasStatements =
    Boolean(data.balanceSheet?.lines.length) ||
    Boolean(data.incomeStatement?.lines.length) ||
    Boolean(data.cashFlow?.lines.length);

  return {
    loading,
    isGenerating,
    error,
    hasStatements,
    data,
    refresh: fetchStatements,
    generateStatements,
  };
};

export type { GenerateStatementsRpcResult, StatementsGenerationResult };
