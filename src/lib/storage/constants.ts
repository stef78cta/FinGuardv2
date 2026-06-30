/**
 * Bucket Supabase Storage pentru fișierele de balanță de verificare.
 */
export const BALANCE_STORAGE_BUCKET = 'balante' as const;

/** Tabel pentru scrieri (INSERT/UPDATE/DELETE) — RLS pe tabel. */
export const TRIAL_BALANCE_IMPORTS_TABLE = 'trial_balance_imports' as const;

/**
 * View preferat pentru citiri (post-migrare v2.0).
 * Fallback automat la tabel dacă view-ul nu există încă în Supabase.
 */
export const TRIAL_BALANCE_IMPORTS_VIEW = 'trial_balance_imports_public' as const;

/** Fallback garantat existent în producție. */
export const TRIAL_BALANCE_IMPORTS_FALLBACK = 'trial_balance_imports' as const;

/** View activ (non-șterse) — alternativă dacă e disponibil. */
export const ACTIVE_TRIAL_BALANCE_IMPORTS_VIEW = 'active_trial_balance_imports' as const;

/** Coloane safe pentru SELECT / INSERT RETURNING pe tabel. */
export const TRIAL_BALANCE_IMPORTS_SELECT_COLUMNS =
  'id, company_id, balance_month, source_file_name, source_file_url, period_start, period_end, status, error_message, file_size_bytes, created_at, processed_at, uploaded_by, validation_errors, deleted_at' as const;

/**
 * Extrage mesajul util din erori Supabase / Edge Functions.
 */
export function extractSupabaseErrorMessage(error: unknown): string {
  if (!error) return 'Eroare necunoscută';

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const parts = [err.message, err.details, err.hint, err.code]
      .filter((part) => typeof part === 'string' && part.length > 0)
      .map(String);

    if (parts.length > 0) {
      return parts.join(' — ');
    }
  }

  return String(error);
}

/**
 * Verifică dacă eroarea PostgREST indică un relation/view inexistent.
 */
export function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string };
  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    (typeof err.message === 'string' &&
      (err.message.includes('Could not find the table') ||
        err.message.includes('does not exist')))
  );
}
