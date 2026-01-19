import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from './useCompany';

export interface BalanceImport {
  id: string;
  company_id: string;
  source_file_name: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'processing' | 'validated' | 'completed' | 'error';
  created_at: string;
  processed_at: string | null;
}

export interface BalanceAccount {
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

export interface BalanceWithAccounts extends BalanceImport {
  accounts: BalanceAccount[];
}

export const useBalante = () => {
  const { company: currentCompany, loading: companyLoading } = useCompany();
  const [balances, setBalances] = useState<BalanceImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!currentCompany?.id) {
      setBalances([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('trial_balance_imports')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('status', 'completed')
        .order('period_end', { ascending: false });

      if (fetchError) throw fetchError;

      console.log('[useBalante] Fetched balances:', data?.length || 0, 'for company:', currentCompany.id);
      setBalances(data as BalanceImport[]);
    } catch (err) {
      console.error('[useBalante] Error fetching balances:', err);
      setError(err instanceof Error ? err.message : 'Eroare la încărcarea balanțelor');
    } finally {
      setLoading(false);
    }
  }, [currentCompany?.id]);

  useEffect(() => {
    if (!companyLoading) {
      fetchBalances();
    }
  }, [fetchBalances, companyLoading]);

  const getBalanceAccounts = useCallback(async (importId: string): Promise<BalanceAccount[]> => {
    const { data, error } = await supabase
      .from('trial_balance_accounts')
      .select('*')
      .eq('import_id', importId)
      .order('account_code');

    if (error) {
      console.error('[useBalante] Error fetching accounts for import:', importId, error);
      throw error;
    }

    console.log('[useBalante] Fetched accounts:', data?.length || 0, 'for import:', importId);
    return data as BalanceAccount[];
  }, []);

  const getLatestBalance = useCallback(async (): Promise<BalanceWithAccounts | null> => {
    // Fetch directly from DB to avoid stale closure issues
    if (!currentCompany?.id) {
      console.log('[useBalante] getLatestBalance: No company');
      return null;
    }

    const { data: latestBalances, error: fetchError } = await supabase
      .from('trial_balance_imports')
      .select('*')
      .eq('company_id', currentCompany.id)
      .eq('status', 'completed')
      .order('period_end', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('[useBalante] Error fetching latest balance:', fetchError);
      throw fetchError;
    }

    if (!latestBalances || latestBalances.length === 0) {
      console.log('[useBalante] getLatestBalance: No completed balances found');
      return null;
    }

    const latestBalance = latestBalances[0] as BalanceImport;
    const accounts = await getBalanceAccounts(latestBalance.id);

    console.log('[useBalante] getLatestBalance: Found balance with', accounts.length, 'accounts');
    return {
      ...latestBalance,
      accounts,
    };
  }, [currentCompany?.id, getBalanceAccounts]);

  const getAllBalancesWithAccounts = useCallback(async (): Promise<BalanceWithAccounts[]> => {
    // Fetch directly from DB to avoid stale closure issues
    if (!currentCompany?.id) {
      console.log('[useBalante] getAllBalancesWithAccounts: No company');
      return [];
    }

    const { data: allBalances, error: fetchError } = await supabase
      .from('trial_balance_imports')
      .select('*')
      .eq('company_id', currentCompany.id)
      .eq('status', 'completed')
      .order('period_end', { ascending: false });

    if (fetchError) {
      console.error('[useBalante] Error fetching all balances:', fetchError);
      throw fetchError;
    }

    if (!allBalances || allBalances.length === 0) {
      console.log('[useBalante] getAllBalancesWithAccounts: No balances found');
      return [];
    }

    const results: BalanceWithAccounts[] = [];
    for (const balance of allBalances) {
      const accounts = await getBalanceAccounts(balance.id);
      results.push({ ...(balance as BalanceImport), accounts });
    }

    console.log('[useBalante] getAllBalancesWithAccounts: Loaded', results.length, 'balances');
    return results;
  }, [currentCompany?.id, getBalanceAccounts]);

  return {
    balances,
    loading: loading || companyLoading,
    error,
    getLatestBalance,
    getBalanceAccounts,
    getAllBalancesWithAccounts,
    refetch: fetchBalances,
    hasData: balances.length > 0,
    companyId: currentCompany?.id || null,
  };
};
