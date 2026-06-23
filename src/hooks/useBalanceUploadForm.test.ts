import { describe, expect, it } from 'vitest';
import type { ParseResult } from '@/lib/excel-parser';
import { balanceUploadFormUtils } from '@/hooks/useBalanceUploadForm';

const { extractDuplicateAccounts, buildValidationErrors } = balanceUploadFormUtils;

describe('balanceUploadFormUtils', () => {
  it('extrage codurile de cont duplicate din rezultatul parserului', () => {
    const parseResult = {
      ok: false,
      blockingErrors: [
        {
          code: 'DUPLICATE_ACCOUNTS',
          message: 'Duplicate',
          details: { duplicateCodes: ['1012', '4011'] },
        },
      ],
      rowErrors: [],
      warnings: [],
    } as unknown as ParseResult;

    expect(extractDuplicateAccounts(parseResult)).toEqual(['1012', '4011']);
    expect(extractDuplicateAccounts(null)).toEqual([]);
  });

  it('construiește mesajele de eroare din parser și rowErrors', () => {
    const parseResult = {
      ok: false,
      blockingErrors: [{ code: 'EMPTY_BALANCE', message: 'Lista goală' }],
      rowErrors: [{ rowIndex: 5, code: 'INVALID', message: 'Cont invalid' }],
      warnings: [],
    } as unknown as ParseResult;

    const errors = buildValidationErrors(parseResult);
    expect(errors.length).toBe(2);
    expect(errors[0]).toContain('Lista goală');
    expect(errors[1]).toBe('Rândul 5: Cont invalid');
    expect(buildValidationErrors(null)).toEqual([]);
  });
});
