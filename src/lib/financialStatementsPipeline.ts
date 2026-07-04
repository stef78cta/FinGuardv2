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
}

export interface StatementsGenerationResult {
  success: boolean;
  data?: GenerateStatementsRpcResult;
  error?: string;
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

    return {
      success: true,
      data: data as unknown as GenerateStatementsRpcResult,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Eroare necunoscută la generarea rapoartelor';
    console.error('[financialStatementsPipeline] Unexpected error:', err);
    return { success: false, error: message };
  }
}
