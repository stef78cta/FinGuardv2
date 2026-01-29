import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyContext } from '@/contexts/CompanyContext';

/**
 * Reprezintă un import de balanță de verificare.
 */
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

/**
 * Reprezintă un cont din balanța de verificare.
 */
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

/**
 * Reprezintă o balanță cu conturile asociate.
 */
export interface BalanceWithAccounts extends BalanceImport {
  accounts: BalanceAccount[];
}

/**
 * Opțiuni de paginare pentru query-uri.
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Rezultat paginat cu metadate.
 */
export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Hook pentru gestionarea balanțelor contabile.
 * Optimizat pentru performanță cu batch queries și paginare server-side.
 * 
 * @returns Obiect cu stări și funcții pentru gestionarea balanțelor
 */
export const useBalante = () => {
  const { activeCompany, loading: companyLoading } = useCompanyContext();
  const [balances, setBalances] = useState<BalanceImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Încarcă lista de balanțe pentru compania activă.
   * Folosește query filtrat pe status 'completed' și deleted_at IS NULL.
   */
  /**
   * Încarcă balanțele pentru compania activă.
   * ⚠️ FIX: Mutat în useEffect pentru a elimina callback-ul volatile din dependențe.
   */
  useEffect(() => {
    const fetchBalances = async () => {
      if (!activeCompany?.id) {
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
          .eq('company_id', activeCompany.id)
          .eq('status', 'completed')
          .is('deleted_at', null)
          .order('period_end', { ascending: false });

        if (fetchError) throw fetchError;

        console.log('[useBalante] Fetched balances:', data?.length || 0, 'for company:', activeCompany.id);
        setBalances(data as BalanceImport[]);
      } catch (err) {
        console.error('[useBalante] Error fetching balances:', err);
        setError(err instanceof Error ? err.message : 'Eroare la încărcarea balanțelor');
      } finally {
        setLoading(false);
      }
    };

    if (!companyLoading) {
      fetchBalances();
    }
  }, [activeCompany?.id, companyLoading]); // ← Doar primitive în dependențe, nu callback-ul

  /**
   * Obține conturile pentru un import specific cu paginare opțională.
   * Folosește funcția SQL get_accounts_paginated pentru performanță.
   * 
   * @param importId - ID-ul importului
   * @param options - Opțiuni de paginare
   * @returns Promise cu array de conturi sau rezultat paginat
   */
  const getBalanceAccounts = useCallback(async (
    importId: string,
    options?: PaginationOptions
  ): Promise<BalanceAccount[]> => {
    const limit = options?.limit ?? 1000;
    const offset = options?.offset ?? 0;

    // Folosim funcția SQL optimizată pentru paginare
    const { data, error } = await supabase.rpc('get_accounts_paginated', {
      _import_id: importId,
      _limit: limit,
      _offset: offset
    });

    if (error) {
      console.error('[useBalante] Error fetching accounts for import:', importId, error);
      // Fallback la query direct dacă funcția RPC nu există încă
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('trial_balance_accounts')
        .select('*')
        .eq('import_id', importId)
        .order('account_code')
        .range(offset, offset + limit - 1);
      
      if (fallbackError) throw fallbackError;
      return fallbackData as BalanceAccount[];
    }

    const dataArray = data as unknown as Array<Record<string, unknown>> | null;
    console.log('[useBalante] Fetched accounts:', dataArray?.length || 0, 'for import:', importId);
    return (dataArray || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      import_id: row.import_id as string,
      account_code: row.account_code as string,
      account_name: row.account_name as string,
      opening_debit: Number(row.opening_debit) || 0,
      opening_credit: Number(row.opening_credit) || 0,
      debit_turnover: Number(row.debit_turnover) || 0,
      credit_turnover: Number(row.credit_turnover) || 0,
      closing_debit: Number(row.closing_debit) || 0,
      closing_credit: Number(row.closing_credit) || 0,
    })) as BalanceAccount[];
  }, []);

  /**
   * Obține cea mai recentă balanță cu toate conturile.
   * OPTIMIZAT: Folosește funcția SQL get_balances_with_accounts pentru un singur query.
   * 
   * @returns Promise cu balanța și conturile sau null dacă nu există
   */
  const getLatestBalance = useCallback(async (): Promise<BalanceWithAccounts | null> => {
    if (!activeCompany?.id) {
      console.log('[useBalante] getLatestBalance: No company');
      return null;
    }

    try {
      // Folosim funcția SQL optimizată care face JOIN în loc de N+1 queries
      const { data, error: fetchError } = await supabase.rpc('get_balances_with_accounts', {
        _company_id: activeCompany.id,
        _limit: 1,
        _offset: 0
      });

      if (fetchError) {
        console.warn('[useBalante] RPC not available, falling back to sequential queries:', fetchError.message);
        // Fallback pentru compatibilitate înapoi
        return await getLatestBalanceFallback();
      }

      const balancesData = data as unknown as BalanceWithAccounts[];
      if (!balancesData || balancesData.length === 0) {
        console.log('[useBalante] getLatestBalance: No completed balances found');
        return null;
      }

      const latestBalance = balancesData[0];
      console.log('[useBalante] getLatestBalance: Found balance with', latestBalance.accounts?.length || 0, 'accounts');
      return latestBalance;
    } catch (err) {
      console.error('[useBalante] Error in getLatestBalance:', err);
      // Fallback la metoda veche
      return await getLatestBalanceFallback();
    }
  }, [activeCompany?.id]);

  /**
   * Fallback pentru getLatestBalance când funcția RPC nu este disponibilă.
   * @private
   */
  const getLatestBalanceFallback = useCallback(async (): Promise<BalanceWithAccounts | null> => {
    if (!activeCompany?.id) return null;

    const { data: latestBalances, error: fetchError } = await supabase
      .from('trial_balance_imports')
      .select('*')
      .eq('company_id', activeCompany.id)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('period_end', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    if (!latestBalances || latestBalances.length === 0) {
      return null;
    }

    const latestBalance = latestBalances[0] as BalanceImport;
    const accounts = await getBalanceAccounts(latestBalance.id);

    return {
      ...latestBalance,
      accounts,
    };
  }, [activeCompany?.id, getBalanceAccounts]);

  /**
   * Obține toate balanțele cu conturile lor.
   * OPTIMIZAT: Folosește funcția SQL get_balances_with_accounts pentru batch query.
   * Rezolvă problema N+1 queries.
   * 
   * @param options - Opțiuni de paginare
   * @returns Promise cu array de balanțe cu conturi
   */
  const getAllBalancesWithAccounts = useCallback(async (
    options?: PaginationOptions
  ): Promise<BalanceWithAccounts[]> => {
    if (!activeCompany?.id) {
      console.log('[useBalante] getAllBalancesWithAccounts: No company');
      return [];
    }

    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    try {
      // Folosim funcția SQL optimizată care face JOIN în loc de N+1 queries
      const { data, error: fetchError } = await supabase.rpc('get_balances_with_accounts', {
        _company_id: activeCompany.id,
        _limit: limit,
        _offset: offset
      });

      if (fetchError) {
        console.warn('[useBalante] RPC not available, falling back to sequential queries:', fetchError.message);
        // Fallback pentru compatibilitate înapoi
        return await getAllBalancesWithAccountsFallback(limit, offset);
      }

      const balancesData = data as unknown as BalanceWithAccounts[];
      console.log('[useBalante] getAllBalancesWithAccounts: Loaded', balancesData?.length || 0, 'balances via batch query');
      return balancesData || [];
    } catch (err) {
      console.error('[useBalante] Error in getAllBalancesWithAccounts:', err);
      // Fallback la metoda veche
      return await getAllBalancesWithAccountsFallback(limit, offset);
    }
  }, [activeCompany?.id]);

  /**
   * Fallback pentru getAllBalancesWithAccounts când funcția RPC nu este disponibilă.
   * NOTĂ: Această metodă face N+1 queries și ar trebui evitată când funcția RPC e disponibilă.
   * @private
   */
  const getAllBalancesWithAccountsFallback = useCallback(async (
    limit: number,
    offset: number
  ): Promise<BalanceWithAccounts[]> => {
    if (!activeCompany?.id) return [];

    const { data: allBalances, error: fetchError } = await supabase
      .from('trial_balance_imports')
      .select('*')
      .eq('company_id', activeCompany.id)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .order('period_end', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) throw fetchError;

    if (!allBalances || allBalances.length === 0) {
      return [];
    }

    // NOTĂ: Acest cod face N+1 queries - folosit doar ca fallback
    // Folosim Promise.all pentru a paraleliza query-urile când funcția RPC nu e disponibilă
    const results = await Promise.all(
      allBalances.map(async (balance) => {
        const accounts = await getBalanceAccounts(balance.id);
        return { ...(balance as BalanceImport), accounts };
      })
    );

    console.log('[useBalante] getAllBalancesWithAccounts (fallback): Loaded', results.length, 'balances');
    return results;
  }, [activeCompany?.id, getBalanceAccounts]);

  /**
   * Obține conturile unui import cu paginare și total count.
   * Util pentru implementarea infinite scroll sau paginare tradițională.
   * 
   * @param importId - ID-ul importului
   * @param options - Opțiuni de paginare
   * @returns Promise cu rezultat paginat
   */
  const getAccountsPaginated = useCallback(async (
    importId: string,
    options: PaginationOptions = { limit: 50, offset: 0 }
  ): Promise<PaginatedResult<BalanceAccount>> => {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const { data, error } = await supabase.rpc('get_accounts_paginated', {
      _import_id: importId,
      _limit: limit,
      _offset: offset
    });

    if (error) {
      console.error('[useBalante] Error fetching paginated accounts:', error);
      // Fallback fără totalCount
      const accounts = await getBalanceAccounts(importId, options);
      return {
        data: accounts,
        totalCount: accounts.length,
        hasMore: accounts.length === limit
      };
    }

    const dataArray = data as unknown as Array<Record<string, unknown>> | null;
    const accounts = (dataArray || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      import_id: row.import_id as string,
      account_code: row.account_code as string,
      account_name: row.account_name as string,
      opening_debit: Number(row.opening_debit) || 0,
      opening_credit: Number(row.opening_credit) || 0,
      debit_turnover: Number(row.debit_turnover) || 0,
      credit_turnover: Number(row.credit_turnover) || 0,
      closing_debit: Number(row.closing_debit) || 0,
      closing_credit: Number(row.closing_credit) || 0,
    })) as BalanceAccount[];

    const totalCount = dataArray?.[0]?.total_count || 0;

    return {
      data: accounts,
      totalCount: Number(totalCount),
      hasMore: offset + accounts.length < Number(totalCount)
    };
  }, [getBalanceAccounts]);

  return {
    balances,
    loading: loading || companyLoading,
    error,
    getLatestBalance,
    getBalanceAccounts,
    getAllBalancesWithAccounts,
    getAccountsPaginated,
    refetch: fetchBalances,
    hasData: balances.length > 0,
    companyId: activeCompany?.id || null,
  };
};
