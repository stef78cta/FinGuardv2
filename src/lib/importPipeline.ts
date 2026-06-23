import { supabase } from '@/integrations/supabase/client';
import type { BlockingError, ParseResult, ParsedAccount } from '@/lib/excel-parser';
import {
  TRIAL_BALANCE_IMPORTS_FALLBACK,
  TRIAL_BALANCE_IMPORTS_TABLE,
  TRIAL_BALANCE_IMPORTS_VIEW,
  extractSupabaseErrorMessage,
  isMissingRelationError,
} from '@/lib/storage/constants';
import { aggregateDuplicateAccounts } from '@/utils/balanceValidation';

export type ImportStatus = 'draft' | 'processing' | 'validated' | 'completed' | 'error';

export interface ImportStatusSnapshot {
  status: ImportStatus;
  error_message: string | null;
}

type ImportsReadSource = typeof TRIAL_BALANCE_IMPORTS_VIEW | typeof TRIAL_BALANCE_IMPORTS_FALLBACK;

let cachedImportsReadSource: ImportsReadSource | null = null;

/**
 * Rezolvă sursa de citire pentru imports: view public dacă există, altfel tabel.
 */
async function getImportsReadSource(): Promise<ImportsReadSource> {
  if (cachedImportsReadSource) {
    return cachedImportsReadSource;
  }

  const { error } = await supabase.from(TRIAL_BALANCE_IMPORTS_VIEW).select('id').limit(1);

  if (!error || !isMissingRelationError(error)) {
    cachedImportsReadSource = TRIAL_BALANCE_IMPORTS_VIEW;
    return cachedImportsReadSource;
  }

  cachedImportsReadSource = TRIAL_BALANCE_IMPORTS_FALLBACK;
  return cachedImportsReadSource;
}

const CONTROL_MISMATCH_UI: Record<
  string,
  { debitLabel: string; creditLabel: string; debitKey: string; creditKey: string }
> = {
  BALANCE_CONTROL_OPENING_MISMATCH: {
    debitLabel: 'Sold inițial Debit',
    creditLabel: 'Sold inițial Credit',
    debitKey: 'opening_debit',
    creditKey: 'opening_credit',
  },
  BALANCE_CONTROL_TURNOVER_MISMATCH: {
    debitLabel: 'Rulaj curent Debit',
    creditLabel: 'Rulaj curent Credit',
    debitKey: 'debit_turnover',
    creditKey: 'credit_turnover',
  },
  BALANCE_CONTROL_TOTAL_MISMATCH: {
    debitLabel: 'Sold final Debit',
    creditLabel: 'Sold final Credit',
    debitKey: 'closing_debit',
    creditKey: 'closing_credit',
  },
};

/**
 * Formatează erorile blocking din parser pentru afișare în UI.
 */
export function formatBlockingValidationErrors(parseResult: ParseResult): string {
  const errorMessages: string[] = [];

  parseResult.blockingErrors.forEach((err: BlockingError) => {
    errorMessages.push(`❌ ${err.message}`);

    const controlUi = CONTROL_MISMATCH_UI[err.code];
    if (controlUi && err.details) {
      const details = err.details as Record<string, number>;
      errorMessages.push(
        `  • ${controlUi.debitLabel}: ${details[controlUi.debitKey].toFixed(2)} RON`,
      );
      errorMessages.push(
        `  • ${controlUi.creditLabel}: ${details[controlUi.creditKey].toFixed(2)} RON`,
      );
      errorMessages.push(`  • Diferență: ${details.difference.toFixed(2)} RON`);
    }

    if (err.code === 'BALANCE_INVALID_ROWS_DETECTED' && err.details) {
      const details = err.details as {
        invalidRowsCount: number;
        firstErrors: Array<{ rowIndex: number; message: string }>;
      };
      errorMessages.push(`  • Total rânduri invalide: ${details.invalidRowsCount}`);
      errorMessages.push('  • Exemple erori:');
      details.firstErrors.forEach((rowErr) => {
        errorMessages.push(`    - ${rowErr.message}`);
      });
    }

    if (
      (err.code === 'BALANCE_CONTROL_CLASS6_CLOSING_NOT_ZERO' ||
        err.code === 'BALANCE_CONTROL_CLASS7_CLOSING_NOT_ZERO') &&
      err.details
    ) {
      const details = err.details as {
        violationsCount: number;
        firstErrors: Array<{ rowIndex: number; message: string }>;
      };
      errorMessages.push(`  • Conturi afectate: ${details.violationsCount}`);
      errorMessages.push('  • Exemple:');
      details.firstErrors.forEach((rowErr) => {
        errorMessages.push(`    - ${rowErr.message}`);
      });
    }

    if (
      (err.code === 'EXCEL_INVALID_COLUMN_COUNT' ||
        err.code === 'EXCEL_LEGACY_8_COLUMN_FORMAT' ||
        err.code === 'EXCEL_MISSING_REQUIRED_COLUMNS') &&
      err.details
    ) {
      const details = err.details as {
        expected?: number;
        detected?: number;
        invalidRowsCount?: number;
        firstErrors?: Array<{ rowIndex: number; message: string }>;
      };
      if (details.expected !== undefined && details.detected !== undefined) {
        errorMessages.push(`  • Așteptat: ${details.expected} coloane, detectat: ${details.detected}`);
      }
      if (details.invalidRowsCount !== undefined && details.firstErrors?.length) {
        errorMessages.push(`  • Rânduri afectate: ${details.invalidRowsCount}`);
        errorMessages.push('  • Exemple:');
        details.firstErrors.forEach((rowErr) => {
          errorMessages.push(`    - ${rowErr.message}`);
        });
      }
    }

    if (err.code === 'BALANCE_CLOSING_MISMATCH_DETECTED' && err.details) {
      const details = err.details as {
        violationsCount: number;
        firstErrors: Array<{
          rowIndex: number;
          message: string;
          details?: {
            account_code?: string;
            field?: string;
            expectedValue?: number;
            actualValue?: number;
            difference?: number;
            formula?: string;
          };
        }>;
      };
      errorMessages.push(`  • Total rânduri afectate: ${details.violationsCount}`);
      errorMessages.push('  • Exemple:');
      details.firstErrors.forEach((rowErr) => {
        const d = rowErr.details;
        if (d?.account_code && d.field) {
          errorMessages.push(
            `    - Rândul ${rowErr.rowIndex}, cont ${d.account_code}: ${d.field} trebuie să fie ${d.formula}`,
          );
          if (d.actualValue !== undefined) {
            errorMessages.push(`      Valoare fișier: ${d.actualValue.toFixed(2)} RON`);
          }
          if (d.expectedValue !== undefined) {
            errorMessages.push(`      Valoare calculată: ${d.expectedValue.toFixed(2)} RON`);
          }
          if (d.difference !== undefined) {
            errorMessages.push(`      Diferență: ${d.difference.toFixed(2)} RON`);
          }
        } else {
          errorMessages.push(`    - ${rowErr.message}`);
        }
      });
    }
  });

  return errorMessages.join('\n');
}

/**
 * Invocă Edge Function parse-balanta. Returnează payload-ul la succes.
 */
export async function invokeParseBalanta(importId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase.functions.invoke('parse-balanta', {
    body: { import_id: importId },
  });

  if (error) {
    throw new Error(extractSupabaseErrorMessage(error));
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }

  return (data as Record<string, unknown>) ?? null;
}

/**
 * Citește statusul unui import (view → fallback tabel).
 */
export async function fetchImportStatus(importId: string): Promise<ImportStatusSnapshot> {
  const source = await getImportsReadSource();

  const { data, error } = await supabase
    .from(source)
    .select('status, error_message')
    .eq('id', importId)
    .single();

  if (error) {
    throw error;
  }

  return {
    status: data.status as ImportStatus,
    error_message: data.error_message,
  };
}

/**
 * Așteaptă finalizarea procesării (polling).
 */
export async function pollImportStatus(
  importId: string,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    onStatusChange?: (status: ImportStatus) => void;
  }
): Promise<ImportStatusSnapshot> {
  const intervalMs = options?.intervalMs ?? 2000;
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const snapshot = await fetchImportStatus(importId);
    options?.onStatusChange?.(snapshot.status);

    if (snapshot.status === 'completed') {
      return snapshot;
    }

    if (snapshot.status === 'error') {
      return snapshot;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    'Timeout: procesarea balanței a durat prea mult. Verificați lista de importuri sau reîncercați.'
  );
}

/**
 * Normalizează soldurile debit/credit (evită constraint-uri XOR).
 */
function normalizeAccountBalances(account: ParsedAccount): ParsedAccount {
  let openingDebit = account.opening_debit;
  let openingCredit = account.opening_credit;
  if (openingDebit > 0 && openingCredit > 0) {
    if (openingDebit > openingCredit) {
      openingDebit -= openingCredit;
      openingCredit = 0;
    } else {
      openingCredit -= openingDebit;
      openingDebit = 0;
    }
  }

  let closingDebit = account.closing_debit;
  let closingCredit = account.closing_credit;
  if (closingDebit > 0 && closingCredit > 0) {
    if (closingDebit > closingCredit) {
      closingDebit -= closingCredit;
      closingCredit = 0;
    } else {
      closingCredit -= closingDebit;
      closingDebit = 0;
    }
  }

  return {
    ...account,
    opening_debit: openingDebit,
    opening_credit: openingCredit,
    closing_debit: closingDebit,
    closing_credit: closingCredit,
  };
}

/**
 * Fallback client-side: inserează conturile și marchează importul completed.
 * Folosit când Edge Function nu e disponibilă sau eșuează.
 */
export async function processAccountsClientSide(
  importId: string,
  accounts: ParsedAccount[]
): Promise<void> {
  const deduplicatedAccounts = aggregateDuplicateAccounts(accounts).map(normalizeAccountBalances);

  const accountsToInsert = deduplicatedAccounts.map((acc) => ({
    import_id: importId,
    account_code: acc.account_code,
    account_name: acc.account_name,
    opening_debit: acc.opening_debit,
    opening_credit: acc.opening_credit,
    debit_turnover: acc.debit_turnover,
    credit_turnover: acc.credit_turnover,
    total_sume_debitoare: acc.total_sume_debitoare,
    total_sume_creditoare: acc.total_sume_creditoare,
    closing_debit: acc.closing_debit,
    closing_credit: acc.closing_credit,
  }));

  await supabase.from('trial_balance_accounts').delete().eq('import_id', importId);

  const BATCH_SIZE = 100;
  for (let i = 0; i < accountsToInsert.length; i += BATCH_SIZE) {
    const batch = accountsToInsert.slice(i, i + BATCH_SIZE);
    const { error: insertAccountsError } = await supabase
      .from('trial_balance_accounts')
      .insert(batch);

    if (insertAccountsError) {
      await supabase
        .from(TRIAL_BALANCE_IMPORTS_TABLE)
        .update({
          status: 'error',
          error_message: `Eroare la salvarea conturilor: ${insertAccountsError.message}`,
        })
        .eq('id', importId);

      throw insertAccountsError;
    }
  }

  const { error: updateError } = await supabase
    .from(TRIAL_BALANCE_IMPORTS_TABLE)
    .update({
      status: 'completed',
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', importId);

  if (updateError) {
    throw updateError;
  }
}

/**
 * Procesează import: Edge Function → la eșec fallback client-side.
 */
export async function processImport(
  importId: string,
  parsedAccounts: ParsedAccount[],
  callbacks?: {
    onProgress?: (percent: number) => void;
    onStatusChange?: (status: ImportStatus) => void;
  }
): Promise<void> {
  callbacks?.onProgress?.(60);

  try {
    await invokeParseBalanta(importId);
    callbacks?.onProgress?.(90);

    const snapshot = await fetchImportStatus(importId);

    if (snapshot.status === 'completed') {
      callbacks?.onProgress?.(100);
      return;
    }

    if (snapshot.status === 'error') {
      throw new Error(snapshot.error_message || 'Procesarea pe server a eșuat');
    }

    const polled = await pollImportStatus(importId, {
      onStatusChange: callbacks?.onStatusChange,
    });

    if (polled.status === 'error') {
      throw new Error(polled.error_message || 'Procesarea balanței a eșuat');
    }

    callbacks?.onProgress?.(100);
  } catch (edgeError) {
    console.warn('[processImport] Edge Function failed, using client-side fallback:', edgeError);

    await processAccountsClientSide(importId, parsedAccounts);
    callbacks?.onProgress?.(100);
  }
}

/** Re-export pentru fetch-uri din hooks. */
export { getImportsReadSource };
