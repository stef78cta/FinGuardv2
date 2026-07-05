import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FinancialStatementType, StatementLineDefinitionRow } from '@/types/financialTree';
import { extractSupabaseErrorMessage } from '@/lib/storage/constants';

/**
 * Încarcă definițiile de linii pentru un tip de raport (template global + override companie).
 */
export function useStatementLineDefinitions(
  companyId: string | null,
  statementType: FinancialStatementType,
) {
  const [definitions, setDefinitions] = useState<StatementLineDefinitionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDefinitions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('statement_line_definitions')
        .select('*')
        .eq('statement_type', statementType)
        .eq('is_active', true)
        .order('display_order');

      if (companyId) {
        query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
      } else {
        query = query.is('company_id', null);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const merged = mergeDefinitionOverrides(data ?? []);
      setDefinitions(merged);
    } catch (err) {
      console.error('[useStatementLineDefinitions]', err);
      setError(extractSupabaseErrorMessage(err) || 'Eroare la încărcarea structurii raportului');
      setDefinitions([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, statementType]);

  useEffect(() => {
    void fetchDefinitions();
  }, [fetchDefinitions]);

  return { definitions, loading, error, refresh: fetchDefinitions };
}

/** Preferă definițiile companiei peste template-ul global pentru același line_key. */
function mergeDefinitionOverrides(
  rows: StatementLineDefinitionRow[],
): StatementLineDefinitionRow[] {
  const byKey = new Map<string, StatementLineDefinitionRow>();

  for (const row of rows) {
    const existing = byKey.get(row.line_key);
    if (!existing) {
      byKey.set(row.line_key, row);
      continue;
    }
    if (row.company_id && !existing.company_id) {
      byKey.set(row.line_key, row);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => a.display_order - b.display_order);
}
