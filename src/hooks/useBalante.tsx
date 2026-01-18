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
      const { data, error: fetchError } = await supabase
        .from('trial_balance_imports')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('status', 'completed')
        .order('period_end', { ascending: false });

      if (fetchError) throw fetchError;

      setBalances(data as BalanceImport[]);
    } catch (err) {
      console.error('Error fetching balances:', err);
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

  const getLatestBalance = useCallback(async (): Promise<BalanceWithAccounts | null> => {
    if (balances.length === 0) return null;

    const latestBalance = balances[0];
    
    const { data: accounts, error } = await supabase
      .from('trial_balance_accounts')
      .select('*')
      .eq('import_id', latestBalance.id)
      .order('account_code');

    if (error) throw error;

    return {
      ...latestBalance,
      accounts: accounts as BalanceAccount[],
    };
  }, [balances]);

  const getBalanceAccounts = async (importId: string): Promise<BalanceAccount[]> => {
    const { data, error } = await supabase
      .from('trial_balance_accounts')
      .select('*')
      .eq('import_id', importId)
      .order('account_code');

    if (error) throw error;

    return data as BalanceAccount[];
  };

  const getAllBalancesWithAccounts = async (): Promise<BalanceWithAccounts[]> => {
    const results: BalanceWithAccounts[] = [];
    
    for (const balance of balances) {
      const accounts = await getBalanceAccounts(balance.id);
      results.push({ ...balance, accounts });
    }

    return results;
  };

  return {
    balances,
    loading: loading || companyLoading,
    error,
    getLatestBalance,
    getBalanceAccounts,
    getAllBalancesWithAccounts,
    refetch: fetchBalances,
    hasData: balances.length > 0,
  };
};
