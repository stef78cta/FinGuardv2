import { describe, expect, it } from 'vitest';
import {
  ACTIVE_BALANCE_EXISTS_CODE,
  ActiveBalanceExistsError,
  isActiveBalanceExistsError,
} from '@/lib/balanceUploadErrors';

describe('balanceUploadErrors', () => {
  it('ActiveBalanceExistsError expune codul și ID-ul importului existent', () => {
    const error = new ActiveBalanceExistsError('import-123');

    expect(error.code).toBe(ACTIVE_BALANCE_EXISTS_CODE);
    expect(error.existingImportId).toBe('import-123');
    expect(error.name).toBe('ActiveBalanceExistsError');
    expect(error.message).toContain('Există deja o balanță activă');
  });

  it('isActiveBalanceExistsError identifică instanța corectă', () => {
    const error = new ActiveBalanceExistsError();
    const other = new Error('altă eroare');

    expect(isActiveBalanceExistsError(error)).toBe(true);
    expect(isActiveBalanceExistsError(other)).toBe(false);
    expect(isActiveBalanceExistsError('string')).toBe(false);
  });
});
