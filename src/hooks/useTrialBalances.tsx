import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { parseExcelFile } from '@/lib/excel-parser';

/**
 * Reprezintă un import de balanță de verificare.
 * v1.9.2: Status conform ENUM DB: 'draft', 'processing', 'validated', 'completed', 'error'
 */
export interface TrialBalanceImport {
  id: string;
  company_id: string;
  source_file_name: string;
  source_file_url: string | null;
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

/**
 * Hook pentru gestionarea balanțelor de verificare.
 * Optimizat cu:
 * - Batch queries pentru totals (evită N+1)
 * - Soft delete în loc de hard delete
 * - Paginare server-side
 * 
 * @param companyId - ID-ul companiei pentru care se încarcă datele
 * @returns Obiect cu stări și funcții pentru gestionarea balanțelor
 */
export const useTrialBalances = (companyId: string | null) => {
  const { session } = useAuth();
  const [imports, setImports] = useState<TrialBalanceImport[]>([]);
  const [importsWithTotals, setImportsWithTotals] = useState<TrialBalanceImportWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Încarcă lista de importuri pentru companie.
   * Exclude automat înregistrările șterse (soft delete).
   */
  const fetchImports = useCallback(async () => {
    if (!companyId) {
      setImports([]);
      setImportsWithTotals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Încercăm să folosim funcția optimizată care include totalurile
      const { data: dataWithTotals, error: rpcError } = await supabase.rpc('get_company_imports_with_totals', {
        _company_id: companyId
      });

      const dataArray = dataWithTotals as unknown as Array<Record<string, unknown>> | null;
      if (!rpcError && dataArray) {
        // Funcția RPC disponibilă - folosim datele optimizate
        const mappedData = dataArray.map((row: Record<string, unknown>) => ({
          id: row.import_id as string,
          company_id: companyId,
          source_file_name: row.source_file_name as string,
          source_file_url: row.source_file_url as string | null,
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
        console.log('[useTrialBalances] Loaded', mappedData.length, 'imports with totals via RPC');
      } else {
        // Fallback la query simplu (fără totals optimize)
        console.warn('[useTrialBalances] RPC not available, using fallback query');
        const { data, error: fetchError } = await supabase
          .from('trial_balance_imports')
          .select('*')
          .eq('company_id', companyId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setImports(data as TrialBalanceImport[]);
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
   * Încarcă o balanță în sistem.
   * Procesul: Upload fișier → Creare import → Apel Edge Function pentru parsare.
   * 
   * @param file - Fișierul Excel de încărcat
   * @param periodStart - Data de început a perioadei
   * @param periodEnd - Data de sfârșit a perioadei
   * @param userId - ID-ul utilizatorului care încarcă
   * @returns Promise cu importul creat
   */
  const uploadBalance = async (
    file: File,
    periodStart: Date,
    periodEnd: Date,
    userId: string
  ): Promise<TrialBalanceImport> => {
    if (!companyId) throw new Error('No company selected');

    // Generate unique file path
    const timestamp = Date.now();
    const filePath = `${companyId}/${timestamp}_${file.name}`;

    // Upload file to storage
    // v1.9: QUICK FIX - Revert la 'balante' (bucket existent în Supabase)
    console.log('[uploadBalance] Uploading to bucket "balante", path:', filePath);
    const { error: uploadError } = await supabase.storage
      .from('balante')
      .upload(filePath, file);

    if (uploadError) {
      console.error('[uploadBalance] Upload error:', uploadError);
      throw uploadError;
    }
    console.log('[uploadBalance] Upload successful');

    // Create import record
    // v1.9.2: REVERT - Status inițial 'processing' (enum valid)
    // ENUM existent: 'draft', 'processing', 'validated', 'completed', 'error'
    console.log('[uploadBalance] Creating import record...');
    const { data: importData, error: insertError } = await supabase
      .from('trial_balance_imports')
      .insert({
        company_id: companyId,
        source_file_name: file.name,
        source_file_url: filePath,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        file_size_bytes: file.size,
        uploaded_by: userId,
        status: 'processing',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[uploadBalance] Insert error:', insertError);
      // Clean up uploaded file
      // v1.9: QUICK FIX - Revert la 'balante'
      await supabase.storage.from('balante').remove([filePath]);
      throw insertError;
    }
    console.log('[uploadBalance] Import record created:', importData.id);

    // v1.9.3: Procesare Excel direct în browser (fără Edge Function)
    console.log('[uploadBalance] Parsing Excel file client-side...');
    
    const parseResult = await parseExcelFile(file);
    
    if (!parseResult.success) {
      console.error('[uploadBalance] Parse error:', parseResult.error);
      
      // Update status to error
      await supabase
        .from('trial_balance_imports')
        .update({ 
          status: 'error', 
          error_message: parseResult.error 
        })
        .eq('id', importData.id);
      
      throw new Error(parseResult.error || 'Failed to parse file');
    }
    
    console.log('[uploadBalance] Parsed', parseResult.accountsCount, 'accounts');
    
    // Insert accounts into database
    console.log('[uploadBalance] Inserting accounts into database...');
    
    // v1.9.4: Normalizează valorile pentru a respecta constraints
    // Constraint: NOT (opening_debit > 0 AND opening_credit > 0)
    // Constraint: NOT (closing_debit > 0 AND closing_credit > 0)
    // Soluție: Calculăm NET-ul (diferența) pentru fiecare pereche
    const accountsToInsert = parseResult.accounts.map(acc => {
      // Calculăm NET pentru opening (sold inițial)
      let openingDebit = acc.opening_debit;
      let openingCredit = acc.opening_credit;
      if (openingDebit > 0 && openingCredit > 0) {
        // Ambele au valori - păstrăm doar diferența
        if (openingDebit > openingCredit) {
          openingDebit = openingDebit - openingCredit;
          openingCredit = 0;
        } else {
          openingCredit = openingCredit - openingDebit;
          openingDebit = 0;
        }
      }
      
      // Calculăm NET pentru closing (sold final)
      let closingDebit = acc.closing_debit;
      let closingCredit = acc.closing_credit;
      if (closingDebit > 0 && closingCredit > 0) {
        // Ambele au valori - păstrăm doar diferența
        if (closingDebit > closingCredit) {
          closingDebit = closingDebit - closingCredit;
          closingCredit = 0;
        } else {
          closingCredit = closingCredit - closingDebit;
          closingDebit = 0;
        }
      }
      
      return {
        import_id: importData.id,
        account_code: acc.account_code,
        account_name: acc.account_name,
        opening_debit: openingDebit,
        opening_credit: openingCredit,
        debit_turnover: acc.debit_turnover,
        credit_turnover: acc.credit_turnover,
        closing_debit: closingDebit,
        closing_credit: closingCredit,
      };
    });
    
    console.log('[uploadBalance] First account sample:', accountsToInsert[0]);
    
    // Insert in batches of 100 to avoid payload limits and get better error messages
    const BATCH_SIZE = 100;
    for (let i = 0; i < accountsToInsert.length; i += BATCH_SIZE) {
      const batch = accountsToInsert.slice(i, i + BATCH_SIZE);
      const { error: insertAccountsError } = await supabase
        .from('trial_balance_accounts')
        .insert(batch);
      
      if (insertAccountsError) {
        console.error('[uploadBalance] Insert accounts error at batch', i / BATCH_SIZE + 1, ':', insertAccountsError);
        console.error('[uploadBalance] Failed batch sample:', batch.slice(0, 3));
        
        // Update status to error with detailed message
        await supabase
          .from('trial_balance_imports')
          .update({ 
            status: 'error', 
            error_message: `Eroare la salvarea conturilor: ${insertAccountsError.message || 'Unknown error'}` 
          })
          .eq('id', importData.id);
        
        throw new Error(`Insert error: ${insertAccountsError.message}`);
      }
      
      console.log(`[uploadBalance] Inserted batch ${i / BATCH_SIZE + 1}/${Math.ceil(accountsToInsert.length / BATCH_SIZE)}`);
    }
    
    console.log('[uploadBalance] Accounts inserted successfully');
    
    // Update import status to completed
    const { error: updateError } = await supabase
      .from('trial_balance_imports')
      .update({ 
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', importData.id);
    
    if (updateError) {
      console.error('[uploadBalance] Update status error:', updateError);
      throw updateError;
    }
    
    console.log('[uploadBalance] Import completed successfully!');

    // Refresh imports list
    await fetchImports();

    return importData as TrialBalanceImport;
  };

  /**
   * Șterge un import folosind soft delete.
   * Marchează importul ca șters fără a elimina efectiv datele.
   * Permite restaurarea ulterioară și păstrează istoricul.
   * 
   * @param importId - ID-ul importului de șters
   */
  const deleteImport = async (importId: string) => {
    try {
      // Încercăm să folosim funcția de soft delete
      const { data: softDeleteResult, error: rpcError } = await supabase.rpc('soft_delete_import', {
        _import_id: importId
      });

      if (!rpcError && softDeleteResult) {
        console.log('[useTrialBalances] Soft delete successful for import:', importId);
        // Update local state
        setImports(imports.filter(i => i.id !== importId));
        setImportsWithTotals(importsWithTotals.filter(i => i.id !== importId));
        return;
      }

      // Fallback: hard delete
      console.warn('[useTrialBalances] RPC not available, using fallback delete');
      
      // Get import to find file path
      const importToDelete = imports.find(i => i.id === importId);
      
      if (importToDelete?.source_file_url) {
        // Delete file from storage
        // v1.9: QUICK FIX - Revert la 'balante'
        await supabase.storage
          .from('balante')
          .remove([importToDelete.source_file_url]);
      }

      // Delete accounts first (foreign key constraint)
      await supabase
        .from('trial_balance_accounts')
        .delete()
        .eq('import_id', importId);

      // Delete import record
      const { error: deleteError } = await supabase
        .from('trial_balance_imports')
        .delete()
        .eq('id', importId);

      if (deleteError) throw deleteError;

      // Update local state
      setImports(imports.filter(i => i.id !== importId));
      setImportsWithTotals(importsWithTotals.filter(i => i.id !== importId));
    } catch (err) {
      console.error('[useTrialBalances] Error deleting import:', err);
      throw err;
    }
  };

  /**
   * Obține conturile pentru un import specific cu paginare opțională.
   * 
   * @param importId - ID-ul importului
   * @param options - Opțiuni de paginare
   * @returns Promise cu array de conturi
   */
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

  /**
   * Obține totalurile pentru un import specific.
   * OPTIMIZAT: Folosește funcția SQL get_import_totals pentru calcul server-side.
   * Evită încărcarea tuturor conturilor în client.
   * 
   * @param importId - ID-ul importului
   * @returns Promise cu totalurile calculate
   */
  const getAccountsTotals = async (importId: string): Promise<ImportTotals> => {
    try {
      // Încercăm să folosim funcția SQL optimizată
      const { data, error: rpcError } = await supabase.rpc('get_import_totals', {
        _import_id: importId
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
    } catch (err) {
      console.warn('[useTrialBalances] RPC get_import_totals not available, using fallback');
    }

    // Fallback: calculează client-side (mai lent pentru liste mari)
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
      { opening_debit: 0, opening_credit: 0, debit_turnover: 0, credit_turnover: 0, closing_debit: 0, closing_credit: 0, accounts_count: 0 }
    );
  };

  /**
   * Obține totalurile pentru toate importurile dintr-o dată (batch).
   * OPTIMIZAT: Evită N+1 queries prin folosirea funcției RPC.
   * 
   * @returns Map cu import_id -> totals
   */
  const getAllImportsTotals = useCallback(async (): Promise<Map<string, ImportTotals>> => {
    const totalsMap = new Map<string, ImportTotals>();

    // Dacă avem deja datele cu totaluri din funcția RPC
    if (importsWithTotals.length > 0) {
      importsWithTotals.forEach(imp => {
        totalsMap.set(imp.id, {
          opening_debit: 0, // Nu avem aceste date în RPC-ul curent
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

    // Fallback: calculează pentru fiecare import
    // NOTĂ: Aceasta face N queries - evitați pe liste mari
    const completedImports = imports.filter(i => i.status === 'completed');
    
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
   * Reîncearcă procesarea unui import cu eroare.
   * v1.9.3: Descarcă fișierul din storage și reprocesează client-side.
   * 
   * @param importId - ID-ul importului de reîncercat
   */
  const retryFailedImport = async (importId: string) => {
    try {
      const importToRetry = imports.find(i => i.id === importId);
      if (!importToRetry) {
        throw new Error('Import not found');
      }

      if (!importToRetry.source_file_url) {
        throw new Error('Source file not available');
      }

      console.log('[retryFailedImport] Downloading file from storage...');
      
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('balante')
        .download(importToRetry.source_file_url);

      if (downloadError || !fileData) {
        throw new Error('Could not download file: ' + downloadError?.message);
      }

      // Convert Blob to File
      const file = new File([fileData], importToRetry.source_file_name, {
        type: fileData.type,
      });

      console.log('[retryFailedImport] Parsing file...');
      
      // Parse Excel file
      const parseResult = await parseExcelFile(file);
      
      if (!parseResult.success) {
        await supabase
          .from('trial_balance_imports')
          .update({ 
            status: 'error', 
            error_message: parseResult.error 
          })
          .eq('id', importId);
        
        throw new Error(parseResult.error || 'Failed to parse file');
      }

      console.log('[retryFailedImport] Deleting old accounts...');
      
      // Delete old accounts
      await supabase
        .from('trial_balance_accounts')
        .delete()
        .eq('import_id', importId);

      console.log('[retryFailedImport] Inserting new accounts...');
      
      // Insert new accounts in batches
      const accountsToInsert = parseResult.accounts.map(acc => ({
        import_id: importId,
        account_code: acc.account_code,
        account_name: acc.account_name,
        opening_debit: acc.opening_debit,
        opening_credit: acc.opening_credit,
        debit_turnover: acc.debit_turnover,
        credit_turnover: acc.credit_turnover,
        closing_debit: acc.closing_debit,
        closing_credit: acc.closing_credit,
      }));
      
      const BATCH_SIZE = 500;
      for (let i = 0; i < accountsToInsert.length; i += BATCH_SIZE) {
        const batch = accountsToInsert.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from('trial_balance_accounts')
          .insert(batch);
        
        if (insertError) {
          throw insertError;
        }
      }

      // Update status to completed
      await supabase
        .from('trial_balance_imports')
        .update({ 
          status: 'completed',
          error_message: null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', importId);

      console.log('[retryFailedImport] Success!');
      
      // Refresh imports list
      await fetchImports();

      return true;
    } catch (err) {
      console.error('[useTrialBalances] Error retrying import:', err);
      throw err;
    }
  };

  /**
   * Rulează cleanup pentru imports blocate (stale).
   * Marchează automat imports blocate > 10 min ca 'failed'.
   * v1.9: Funcție helper pentru maintenance
   * 
   * @returns Numărul de imports curățate
   */
  const cleanupStaleImports = async (): Promise<number> => {
    try {
      // Type assertion: funcția există în DB dar tipurile nu sunt sincronizate
      const { data, error: rpcError } = await supabase.rpc('cleanup_stale_imports' as 'soft_delete_import');

      if (rpcError) {
        throw rpcError;
      }

      // Refresh imports list
      await fetchImports();

      const dataArray = data as unknown as Array<Record<string, unknown>> | null;
      return dataArray?.[0]?.cleaned_count as number || 0;
    } catch (err) {
      console.error('[useTrialBalances] Error cleaning stale imports:', err);
      throw err;
    }
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
  };
};
