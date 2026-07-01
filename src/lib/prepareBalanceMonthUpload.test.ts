import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACTIVE_BALANCE_EXISTS_CODE,
  ActiveBalanceExistsError,
} from '@/lib/balanceUploadErrors';

const rpcMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import { prepareBalanceMonthUpload } from '@/lib/prepareBalanceMonthUpload';

describe('prepareBalanceMonthUpload', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('trimite parametrii RPC corecți pentru verificare fără înlocuire', async () => {
    rpcMock.mockResolvedValue({
      data: { success: true, replaced_import_id: null },
      error: null,
    });

    const result = await prepareBalanceMonthUpload('company-1', '2026-06-01', false);

    expect(rpcMock).toHaveBeenCalledWith('prepare_balance_month_upload', {
      _company_id: 'company-1',
      _balance_month: '2026-06-01',
      _replace_existing: false,
    });
    expect(result).toEqual({ replacedImportId: null });
  });

  it('trimite replaceExisting=true la RPC când utilizatorul confirmă înlocuirea', async () => {
    rpcMock.mockResolvedValue({
      data: { success: true, replaced_import_id: 'old-import-id' },
      error: null,
    });

    const result = await prepareBalanceMonthUpload('company-1', '2026-06-01', true);

    expect(rpcMock).toHaveBeenCalledWith('prepare_balance_month_upload', {
      _company_id: 'company-1',
      _balance_month: '2026-06-01',
      _replace_existing: true,
    });
    expect(result).toEqual({ replacedImportId: 'old-import-id' });
  });

  it('aruncă ActiveBalanceExistsError când RPC returnează ACTIVE_BALANCE_EXISTS', async () => {
    rpcMock.mockResolvedValue({
      data: {
        success: false,
        code: ACTIVE_BALANCE_EXISTS_CODE,
        existing_import_id: 'existing-99',
      },
      error: null,
    });

    await expect(
      prepareBalanceMonthUpload('company-1', '2026-06-01', false),
    ).rejects.toBeInstanceOf(ActiveBalanceExistsError);

    await expect(
      prepareBalanceMonthUpload('company-1', '2026-06-01', false),
    ).rejects.toMatchObject({
      existingImportId: 'existing-99',
    });
  });

  it('aruncă eroare de permisiune când RPC returnează FORBIDDEN', async () => {
    rpcMock.mockResolvedValue({
      data: { success: false, code: 'FORBIDDEN' },
      error: null,
    });

    await expect(
      prepareBalanceMonthUpload('company-1', '2026-06-01', false),
    ).rejects.toThrow('Nu aveți permisiunea de a încărca balanțe pentru această companie.');
  });

  it('propagă eroarea Supabase de la RPC', async () => {
    const supabaseError = { message: 'connection failed', code: 'PGRST000' };
    rpcMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(
      prepareBalanceMonthUpload('company-1', '2026-06-01', false),
    ).rejects.toEqual(supabaseError);
  });

  it('aruncă eroare generică pentru alte coduri RPC', async () => {
    rpcMock.mockResolvedValue({
      data: { success: false, code: 'CONFLICT' },
      error: null,
    });

    await expect(
      prepareBalanceMonthUpload('company-1', '2026-06-01', true),
    ).rejects.toThrow('Nu s-a putut pregăti upload-ul balanței pentru luna selectată.');
  });
});
