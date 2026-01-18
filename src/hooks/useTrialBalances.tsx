import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export const useTrialBalances = (companyId: string | null) => {
  const { session } = useAuth();
  const [imports, setImports] = useState<TrialBalanceImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImports = useCallback(async () => {
    if (!companyId) {
      setImports([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('trial_balance_imports')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setImports(data as TrialBalanceImport[]);
    } catch (err) {
      console.error('Error fetching imports:', err);
      setError(err instanceof Error ? err.message : 'Error loading imports');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

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
    const { error: uploadError } = await supabase.storage
      .from('balante')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('balante')
      .getPublicUrl(filePath);

    // Create import record
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
      // Clean up uploaded file
      await supabase.storage.from('balante').remove([filePath]);
      throw insertError;
    }

    // Call edge function to parse the file
    const response = await fetch(
      `https://gqxopxbzslwrjgukqbha.supabase.co/functions/v1/parse-balanta`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          import_id: importData.id,
          file_path: filePath,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process file');
    }

    // Refresh imports list
    await fetchImports();

    return importData as TrialBalanceImport;
  };

  const deleteImport = async (importId: string) => {
    // Get import to find file path
    const importToDelete = imports.find(i => i.id === importId);
    
    if (importToDelete?.source_file_url) {
      // Delete file from storage
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
  };

  const getAccounts = async (importId: string): Promise<TrialBalanceAccount[]> => {
    const { data, error: fetchError } = await supabase
      .from('trial_balance_accounts')
      .select('*')
      .eq('import_id', importId)
      .order('account_code');

    if (fetchError) throw fetchError;

    return data as TrialBalanceAccount[];
  };

  const getAccountsTotals = async (importId: string) => {
    const accounts = await getAccounts(importId);
    
    return accounts.reduce(
      (acc, account) => ({
        opening_debit: acc.opening_debit + (account.opening_debit || 0),
        opening_credit: acc.opening_credit + (account.opening_credit || 0),
        debit_turnover: acc.debit_turnover + (account.debit_turnover || 0),
        credit_turnover: acc.credit_turnover + (account.credit_turnover || 0),
        closing_debit: acc.closing_debit + (account.closing_debit || 0),
        closing_credit: acc.closing_credit + (account.closing_credit || 0),
      }),
      { opening_debit: 0, opening_credit: 0, debit_turnover: 0, credit_turnover: 0, closing_debit: 0, closing_credit: 0 }
    );
  };

  return {
    imports,
    loading,
    error,
    uploadBalance,
    deleteImport,
    getAccounts,
    getAccountsTotals,
    refetch: fetchImports,
  };
};
