import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseExcelFile } from '@/lib/excel-parser';
import {
  calculateBalancePeriodFromDate,
  validateBalancePeriod,
} from '@/lib/balancePeriod';
import {
  formatBlockingValidationErrors,
  getImportsReadSource,
  processImport,
} from '@/lib/importPipeline';
import {
  BALANCE_STORAGE_BUCKET,
  TRIAL_BALANCE_IMPORTS_SELECT_COLUMNS,
  TRIAL_BALANCE_IMPORTS_TABLE,
} from '@/lib/storage/constants';
import { emitBalancesChanged } from '@/lib/balanceEvents';

/**
 * Reprezintă un import de balanță de verificare.
 */
export interface TrialBalanceImport {
  id: string;
  company_id: string;
  source_file_name: string;
  source_file_url: string | null;
  balance_month: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'processing' | 'validated' | 'completed' | 'error';
  error_message: string | null;
  file_size_bytes: number | null;
  created_at: string;
  processed_at: string | null;
}

/**
 * Reprezintă un import cu totalurile calculate server-side.
 */
export interface TrialBalanceImportWithTotals extends TrialBalanceImport {
  total_closing_debit: number;
  total_closing_credit: number;
  accounts_count: number;
}

/**
 * Reprezintă un cont din balanța de verificare.
 */
export interface TrialBalanceAccount {
  id: string;
  import_id: string;
  account_code: string;
  account_name: string;
  opening_debit: number;
  opening_credit: number;
  debit_turnover: number;
  credit_turnover: number;
  total_sume_debitoare: number;
  total_sume_creditoare: number;
  closing_debit: number;
  closing_credit: number;
}

/**
 * Totaluri calculate pentru un import.
 */
export interface ImportTotals {
  opening_debit: number;
  opening_credit: number;
  debit_turnover: number;
  credit_turnover: number;
  closing_debit: number;
  closing_credit: number;
  accounts_count: number;
}

/**
 * Opțiuni de paginare.
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface UploadProgressCallbacks {
  onProgress?: (percent: number) => void;
  onPhase?: (phase: 'validating' | 'uploading' | 'processing' | 'completed') => void;
}

/**
 * Hook pentru gestionarea balanțelor de verificare (upload, listare, retry).
 *
 * Flux upload: validare client → Storage → INSERT import → parse-balanta (Edge Fn) → polling status.
 *
 * @param companyId - ID-ul companiei pentru care se încarcă datele
 */
export const useTrialBalances = (companyId: string | null) => {
  const { session } = useAuth();
  const [imports, setImports] = useState<TrialBalanceImport[]>([]);
  const [importsWithTotals, setImportsWithTotals] = useState<TrialBalanceImportWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImports = useCallback(async () => {
    if (!companyId) {
      setImports([]);
      setImportsWithTotals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: dataWithTotals, error: rpcError } = await supabase.rpc(
        'get_company_imports_with_totals',
        { _company_id: companyId }
      );

      const dataArray = dataWithTotals as unknown as Array<Record<string, unknown>> | null;
      if (!rpcError && dataArray) {
        const mappedData = dataArray.map((row: Record<string, unknown>) => ({
          id: row.import_id as string,
          company_id: companyId,
          source_file_name: row.source_file_name as string,
          source_file_url: row.source_file_url as string | null,
          balance_month: (row.balance_month as string) ?? (row.period_start as string),
          period_start: row.period_start as string,
          period_end: row.period_end as string,
          status: row.status as TrialBalanceImport['status'],
          error_message: row.error_message as string | null,
          file_size_bytes: null,
          created_at: row.created_at as string,
          processed_at: row.processed_at as string | null,
          total_closing_debit: Number(row.total_closing_debit) || 0,
          total_closing_credit: Number(row.total_closing_credit) || 0,
          accounts_count: Number(row.accounts_count) || 0,
        })) as TrialBalanceImportWithTotals[];

        setImportsWithTotals(mappedData);
        setImports(mappedData);
      } else {
        const readSource = await getImportsReadSource();
        const { data, error: fetchError } = await supabase
          .from(readSource)
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        const filtered = (data as TrialBalanceImport[]).filter(
          (row) => !(row as TrialBalanceImport & { deleted_at?: string | null }).deleted_at
        );

        setImports(filtered);
        setImportsWithTotals([]);
      }
    } catch (err) {
      console.error('[useTrialBalances] Error fetching imports:', err);
      setError(err instanceof Error ? err.message : 'Error loading imports');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  /**
   * Încarcă o balanță: validare client → Storage → DB → procesare (Edge Fn + fallback client).
   */
  const uploadBalance = async (
    file: File,
    balanceMonth: Date,
    userId: string,
    options?: {
      fiscalYearStartMonth?: number;
      callbacks?: UploadProgressCallbacks;
    }
  ): Promise<TrialBalanceImport> => {
    if (!companyId) throw new Error('No company selected');

    const callbacks = options?.callbacks;
    const period = calculateBalancePeriodFromDate(
      balanceMonth,
      options?.fiscalYearStartMonth ?? 1,
    );
    validateBalancePeriod(period);

    callbacks?.onPhase?.('validating');
    callbacks?.onProgress?.(10);

    const parseResult = await parseExcelFile(file);

    if (!parseResult.ok) {
      const errorMessage = formatBlockingValidationErrors(parseResult);
      throw new Error(errorMessage);
    }

    callbacks?.onPhase?.('uploading');
    callbacks?.onProgress?.(25);

    const timestamp = Date.now();
    const filePath = `${companyId}/${timestamp}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(BALANCE_STORAGE_BUCKET)
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    callbacks?.onProgress?.(40);

    const { data: importData, error: insertError } = await supabase
      .from(TRIAL_BALANCE_IMPORTS_TABLE)
      .insert({
        company_id: companyId,
        source_file_name: file.name,
        source_file_url: filePath,
        balance_month: period.balance_month,
        period_start: period.period_start,
        period_end: period.period_end,
        file_size_bytes: file.size,
        uploaded_by: userId,
        status: 'processing',
      })
      .select(TRIAL_BALANCE_IMPORTS_SELECT_COLUMNS)
      .single();

    if (insertError) {
      await supabase.storage.from(BALANCE_STORAGE_BUCKET).remove([filePath]);

      if (insertError.code === '23505') {
        throw new Error(
          'Există deja o balanță activă pentru luna selectată. Ștergeți importul anterior sau alegeți altă lună.',
        );
      }

      throw insertError;
    }

    callbacks?.onProgress?.(50);
    callbacks?.onPhase?.('processing');

    await processImport(importData.id, parseResult.accounts, {
      onProgress: callbacks?.onProgress,
      onStatusChange: (status) => {
        if (status === 'processing') {
          callbacks?.onProgress?.(85);
        }
      },
    });

    callbacks?.onPhase?.('completed');

    await fetchImports();
    emitBalancesChanged(companyId);

    const readSource = await getImportsReadSource();
    const { data: completedImport } = await supabase
      .from(readSource)
      .select('*')
      .eq('id', importData.id)
      .single();

    return (completedImport ?? importData) as TrialBalanceImport;
  };

  /**
   * Șterge (soft delete) un import via RPC `soft_delete_import`.
   *
   * Nu mai facem optimistic update „orb": dacă RPC eșuează sau returnează FALSE
   * (lipsă permisiune / deja șters), aruncăm eroare. La succes refacem lista din
   * baza de date pentru ca UI-ul să reflecte starea reală.
   */
  const deleteImport = async (importId: string) => {
    const { data: softDeleteResult, error: rpcError } = await supabase.rpc('soft_delete_import', {
      _import_id: importId,
    });

    if (rpcError) {
      console.error('[useTrialBalances] Error deleting import:', rpcError);
      throw new Error(rpcError.message || 'Ștergerea balanței a eșuat.');
    }

    if (!softDeleteResult) {
      throw new Error(
        'Balanța nu a putut fi ștearsă: nu aveți permisiunea necesară sau a fost deja ștearsă.',
      );
    }

    await fetchImports();
    emitBalancesChanged(companyId);
  };

  const getAccounts = async (
    importId: string,
    options?: PaginationOptions
  ): Promise<TrialBalanceAccount[]> => {
    const limit = options?.limit ?? 1000;
    const offset = options?.offset ?? 0;

    const { data, error: fetchError } = await supabase
      .from('trial_balance_accounts')
      .select('*')
      .eq('import_id', importId)
      .order('account_code')
      .range(offset, offset + limit - 1);

    if (fetchError) throw fetchError;

    return data as TrialBalanceAccount[];
  };

  const getAccountsTotals = async (importId: string): Promise<ImportTotals> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_import_totals', {
        _import_id: importId,
      });

      const dataArray = data as unknown as Array<Record<string, unknown>> | null;
      if (!rpcError && dataArray && dataArray.length > 0) {
        const rowData = dataArray[0];
        return {
          opening_debit: Number(rowData.total_opening_debit) || 0,
          opening_credit: Number(rowData.total_opening_credit) || 0,
          debit_turnover: Number(rowData.total_debit_turnover) || 0,
          credit_turnover: Number(rowData.total_credit_turnover) || 0,
          closing_debit: Number(rowData.total_closing_debit) || 0,
          closing_credit: Number(rowData.total_closing_credit) || 0,
          accounts_count: Number(rowData.accounts_count) || 0,
        };
      }
    } catch {
      console.warn('[useTrialBalances] RPC get_import_totals not available, using fallback');
    }

    const accounts = await getAccounts(importId);

    return accounts.reduce(
      (acc, account) => ({
        opening_debit: acc.opening_debit + (account.opening_debit || 0),
        opening_credit: acc.opening_credit + (account.opening_credit || 0),
        debit_turnover: acc.debit_turnover + (account.debit_turnover || 0),
        credit_turnover: acc.credit_turnover + (account.credit_turnover || 0),
        closing_debit: acc.closing_debit + (account.closing_debit || 0),
        closing_credit: acc.closing_credit + (account.closing_credit || 0),
        accounts_count: acc.accounts_count + 1,
      }),
      {
        opening_debit: 0,
        opening_credit: 0,
        debit_turnover: 0,
        credit_turnover: 0,
        closing_debit: 0,
        closing_credit: 0,
        accounts_count: 0,
      }
    );
  };

  const getAllImportsTotals = useCallback(async (): Promise<Map<string, ImportTotals>> => {
    const totalsMap = new Map<string, ImportTotals>();

    if (importsWithTotals.length > 0) {
      importsWithTotals.forEach((imp) => {
        totalsMap.set(imp.id, {
          opening_debit: 0,
          opening_credit: 0,
          debit_turnover: 0,
          credit_turnover: 0,
          closing_debit: imp.total_closing_debit,
          closing_credit: imp.total_closing_credit,
          accounts_count: imp.accounts_count,
        });
      });
      return totalsMap;
    }

    const completedImports = imports.filter((i) => i.status === 'completed');

    await Promise.all(
      completedImports.map(async (imp) => {
        try {
          const totals = await getAccountsTotals(imp.id);
          totalsMap.set(imp.id, totals);
        } catch (err) {
          console.error('[useTrialBalances] Error getting totals for import:', imp.id, err);
        }
      })
    );

    return totalsMap;
  }, [imports, importsWithTotals]);

  /**
   * Reîncearcă procesarea unui import eșuat via RPC retry + Edge Function.
   */
  const retryFailedImport = async (importId: string, userId: string) => {
    const importToRetry = imports.find((i) => i.id === importId);

    const { error: retryError } = await supabase.rpc('retry_failed_import', {
      p_import_id: importId,
      p_user_id: userId,
    });

    if (retryError) {
      // RPC poate lipsi — reset manual la processing
      const { error: resetError } = await supabase
        .from(TRIAL_BALANCE_IMPORTS_TABLE)
        .update({
          status: 'processing',
          error_message: null,
          processed_at: null,
        })
        .eq('id', importId);

      if (resetError) {
        throw retryError;
      }
    }

    if (!importToRetry?.source_file_url) {
      throw new Error('Fișierul sursă nu este disponibil');
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BALANCE_STORAGE_BUCKET)
      .download(importToRetry.source_file_url);

    if (downloadError || !fileData) {
      throw new Error('Nu s-a putut descărca fișierul: ' + downloadError?.message);
    }

    const file = new File([fileData], importToRetry.source_file_name, { type: fileData.type });
    const parseResult = await parseExcelFile(file);

    if (!parseResult.ok) {
      throw new Error(formatBlockingValidationErrors(parseResult));
    }

    await processImport(importId, parseResult.accounts);
    await fetchImports();
    emitBalancesChanged(companyId);
    return true;
  };

  const cleanupStaleImports = async (): Promise<number> => {
    const { data, error: rpcError } = await supabase.rpc('cleanup_stale_imports' as 'soft_delete_import');

    if (rpcError) {
      throw rpcError;
    }

    await fetchImports();
    emitBalancesChanged(companyId);

    const dataArray = data as unknown as Array<Record<string, unknown>> | null;
    return (dataArray?.[0]?.cleaned_count as number) || 0;
  };

  return {
    imports,
    importsWithTotals,
    loading,
    error,
    uploadBalance,
    deleteImport,
    getAccounts,
    getAccountsTotals,
    getAllImportsTotals,
    retryFailedImport,
    cleanupStaleImports,
    refetch: fetchImports,
    fetchImports,
    session,
  };
};
