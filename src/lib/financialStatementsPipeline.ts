import { supabase } from '@/integrations/supabase/client';
import { extractSupabaseErrorMessage } from '@/lib/storage/constants';

export interface GenerateStatementsRpcResult {
  report_id: string;
  balance_sheet_id: string;
  income_statement_id: string;
  cash_flow_id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  report_status?: 'completed' | 'unreconciled';
  reconciliation?: Record<string, unknown>;
}

export interface StatementsGenerationResult {
  success: boolean;
  data?: GenerateStatementsRpcResult;
  error?: string;
  isReconciled?: boolean;
}

/**
 * Pipeline post-import: seed CoA → auto-map conturi → generare situații financiare.
 * Eșecul generării nu aruncă eroare — returnează `{ success: false, error }`.
 */
export async function generateFinancialStatementsForImport(
  companyId: string,
  importId: string,
): Promise<StatementsGenerationResult> {
  try {
    const { error: seedError } = await supabase.rpc('seed_standard_chart_of_accounts', {
      _company_id: companyId,
    });

    if (seedError) {
      console.warn('[financialStatementsPipeline] seed_standard_chart_of_accounts:', seedError.message);
    }

    const { error: mapError } = await supabase.rpc('auto_map_import_from_chart', {
      _import_id: importId,
    });

    if (mapError) {
      return {
        success: false,
        error: extractSupabaseErrorMessage(mapError) || mapError.message,
      };
    }

    const { data, error: generateError } = await supabase.rpc(
      'generate_financial_statements_from_import',
      { _import_id: importId },
    );

    if (generateError) {
      return {
        success: false,
        error: extractSupabaseErrorMessage(generateError) || generateError.message,
      };
    }

    const rpcResult = data as unknown as GenerateStatementsRpcResult;

    const { data: coverage, error: coverageError } = await supabase.rpc(
      'validate_balance_sheet_coverage',
      { _import_id: importId },
    );

    if (coverageError) {
      console.warn('[financialStatementsPipeline] validate_balance_sheet_coverage:', coverageError.message);
    }

    const reconciliation = coverage as {
      is_valid?: boolean;
      unmapped_count?: number;
      not_in_report_count?: number;
      bifunctional_route_issue_count?: number;
    } | null;

    const isReconciled = reconciliation?.is_valid !== false;
    const reportStatus = isReconciled ? 'completed' : 'unreconciled';

    if (rpcResult?.report_id) {
      const { error: statusError } = await supabase
        .from('reports')
        .update({
          status: reportStatus,
          metadata: {
            source_import_id: importId,
            reconciliation: coverage ?? null,
          },
        })
        .eq('id', rpcResult.report_id);

      if (statusError) {
        console.warn('[financialStatementsPipeline] report status update:', statusError.message);
      }
    }

    return {
      success: true,
      isReconciled,
      data: {
        ...rpcResult,
        report_status: reportStatus,
        reconciliation: (coverage as Record<string, unknown>) ?? undefined,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Eroare necunoscută la generarea rapoartelor';
    console.error('[financialStatementsPipeline] Unexpected error:', err);
    return { success: false, error: message };
  }
}
