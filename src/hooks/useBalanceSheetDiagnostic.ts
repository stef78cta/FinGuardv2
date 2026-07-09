import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BalanceAccount } from '@/hooks/useBalante';
import {
  analyzeBalanceSheetMapping,
  type BalanceSheetDiagnosticSummary,
  type BalanceSheetReportLeaf,
  type MappedAccountInfo,
} from '@/utils/balanceSheetDiagnostic';
import { extractSupabaseErrorMessage } from '@/lib/storage/constants';

/**
 * Încarcă mapările conturilor din balanță pentru diagnostic bilanț.
 */
export function useBalanceSheetDiagnostic(
  importId: string | null,
  accounts: BalanceAccount[],
) {
  const [summary, setSummary] = useState<BalanceSheetDiagnosticSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!importId || accounts.length === 0) {
      setSummary(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tbIds = accounts.map((a) => a.id).filter(Boolean);
      if (tbIds.length === 0) {
        setSummary(analyzeBalanceSheetMapping(accounts, []));
        return;
      }

      const [mappingsResult, leavesResult] = await Promise.all([
        supabase
          .from('account_mappings')
          .select(
            `
          trial_balance_account_id,
          chart_of_accounts (
            account_code,
            account_type,
            functional_type
          )
        `,
          )
          .in('trial_balance_account_id', tbIds)
          .is('valid_to', null),
        supabase
          .from('statement_line_definitions')
          .select('line_key, account_code, report_area')
          .eq('statement_type', 'balance_sheet')
          .eq('is_leaf_for_calculation', true)
          .eq('is_active', true)
          .not('account_code', 'is', null),
      ]);

      if (mappingsResult.error) throw mappingsResult.error;
      if (leavesResult.error) throw leavesResult.error;

      const data = mappingsResult.data;

      const accountById = new Map(accounts.map((a) => [a.id, a]));
      const mappings: MappedAccountInfo[] = (data ?? []).flatMap((row) => {
        const acc = accountById.get(row.trial_balance_account_id);
        const coa = row.chart_of_accounts as {
          account_code: string;
          account_type: string | null;
          functional_type: string | null;
        } | null;
        if (!acc || !coa) return [];
        return [
          {
            tbAccountId: row.trial_balance_account_id,
            accountCode: acc.account_code,
            accountName: acc.account_name,
            chartAccountCode: coa.account_code,
            chartAccountType: coa.account_type,
            functionalType: coa.functional_type,
          },
        ];
      });

      const reportLeaves: BalanceSheetReportLeaf[] = (leavesResult.data ?? [])
        .filter((row) => row.account_code)
        .map((row) => ({
          lineKey: row.line_key,
          accountCode: row.account_code as string,
          reportArea: row.report_area,
        }));

      setSummary(analyzeBalanceSheetMapping(accounts, mappings, reportLeaves));
    } catch (err) {
      console.error('[useBalanceSheetDiagnostic]', err);
      setError(extractSupabaseErrorMessage(err) || 'Eroare la diagnosticul mapărilor');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [importId, accounts]);

  useEffect(() => {
    void analyze();
  }, [analyze]);

  return { summary, loading, error, refresh: analyze };
}
