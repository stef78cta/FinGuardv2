/** Cod returnat de RPC când există deja o balanță activă pentru luna selectată. */
export const ACTIVE_BALANCE_EXISTS_CODE = 'ACTIVE_BALANCE_EXISTS';

/**
 * Eroare aruncată când există o balanță activă pentru luna selectată
 * și utilizatorul nu a confirmat înlocuirea.
 */
export class ActiveBalanceExistsError extends Error {
  readonly code = ACTIVE_BALANCE_EXISTS_CODE;
  readonly existingImportId?: string;

  constructor(existingImportId?: string) {
    super(
      'Există deja o balanță activă pentru luna selectată. Ștergeți importul anterior sau alegeți altă lună.',
    );
    this.name = 'ActiveBalanceExistsError';
    this.existingImportId = existingImportId;
  }
}

export function isActiveBalanceExistsError(error: unknown): error is ActiveBalanceExistsError {
  return error instanceof ActiveBalanceExistsError;
}
