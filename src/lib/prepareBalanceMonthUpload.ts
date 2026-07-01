import { supabase } from '@/integrations/supabase/client';
import {
  ACTIVE_BALANCE_EXISTS_CODE,
  ActiveBalanceExistsError,
} from '@/lib/balanceUploadErrors';

export interface PrepareBalanceMonthUploadResult {
  replacedImportId: string | null;
}

interface PrepareBalanceMonthUploadRpcResult {
  success: boolean;
  code?: string;
  existing_import_id?: string;
  replaced_import_id?: string | null;
}

/**
 * Verifică disponibilitatea lunii pentru upload sau înlocuiește balanța activă existentă.
 *
 * @param companyId - Compania pentru care se încarcă balanța
 * @param balanceMonth - Prima zi a lunii balanței (YYYY-MM-DD)
 * @param replaceExisting - Dacă true, soft-delete pe importul activ existent
 * @returns ID-ul importului înlocuit, sau null dacă nu exista conflict
 */
export async function prepareBalanceMonthUpload(
  companyId: string,
  balanceMonth: string,
  replaceExisting: boolean,
): Promise<PrepareBalanceMonthUploadResult> {
  const { data, error } = await supabase.rpc('prepare_balance_month_upload', {
    _company_id: companyId,
    _balance_month: balanceMonth,
    _replace_existing: replaceExisting,
  });

  if (error) {
    throw error;
  }

  const result = data as PrepareBalanceMonthUploadRpcResult | null;

  if (!result?.success) {
    if (result?.code === ACTIVE_BALANCE_EXISTS_CODE) {
      throw new ActiveBalanceExistsError(result.existing_import_id);
    }

    if (result?.code === 'FORBIDDEN') {
      throw new Error('Nu aveți permisiunea de a încărca balanțe pentru această companie.');
    }

    throw new Error('Nu s-a putut pregăti upload-ul balanței pentru luna selectată.');
  }

  return {
    replacedImportId: result.replaced_import_id ?? null,
  };
}
