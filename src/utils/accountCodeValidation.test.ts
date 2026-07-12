import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_CODE_FORMAT_MESSAGE,
  ACCOUNT_CODE_TOO_SHORT_MESSAGE,
  getAccountCodeErrorMessage,
  isValidAccountCode,
  validateAccountCode,
} from '@/utils/accountCodeValidation';

describe('validateAccountCode — conturi numerice', () => {
  it('acceptă cont numeric valid (3–6 cifre, clasa 1–8)', () => {
    expect(isValidAccountCode('101')).toBe(true);
    expect(isValidAccountCode('5121')).toBe(true);
    expect(isValidAccountCode('4111')).toBe(true);
  });

  it('respinge cont numeric prea scurt', () => {
    const result = validateAccountCode('12');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toBe('too_short');
      expect(getAccountCodeErrorMessage('12', result.reason)).toBe(ACCOUNT_CODE_TOO_SHORT_MESSAGE);
    }
  });

  it('respinge cont numeric prea lung', () => {
    expect(isValidAccountCode('10123456')).toBe(false);
    expect(validateAccountCode('10123456')).toMatchObject({ valid: false, reason: 'too_long' });
  });

  it('respinge cont din clasa 9', () => {
    expect(isValidAccountCode('9111')).toBe(false);
    expect(validateAccountCode('9111')).toMatchObject({ valid: false, reason: 'class_9' });
  });

  it('acceptă sufix analitic pentru cont numeric', () => {
    expect(isValidAccountCode('401.01')).toBe(true);
    expect(isValidAccountCode('5121.001')).toBe(true);
  });
});

describe('validateAccountCode — conturi alfanumerice', () => {
  it('acceptă cont alfanumeric valid', () => {
    expect(isValidAccountCode('ABC123')).toBe(true);
    expect(isValidAccountCode('AB12')).toBe(true);
    expect(isValidAccountCode('401A')).toBe(true);
    expect(isValidAccountCode('A401')).toBe(true);
    expect(isValidAccountCode('4111CL')).toBe(true);
  });

  it('acceptă cont alfanumeric cu litere mici', () => {
    expect(isValidAccountCode('abc123')).toBe(true);
  });

  it('acceptă cont alfanumeric cu sufix analitic', () => {
    expect(isValidAccountCode('401A.01')).toBe(true);
  });

  it('respinge cont format numai din litere', () => {
    expect(isValidAccountCode('ABC')).toBe(false);
    expect(isValidAccountCode('ABCDEFG')).toBe(false);
    expect(validateAccountCode('ABC')).toMatchObject({ valid: false, reason: 'no_digit' });
  });

  it('respinge cont prea scurt alfanumeric', () => {
    expect(isValidAccountCode('A1')).toBe(false);
    expect(validateAccountCode('A1')).toMatchObject({ valid: false, reason: 'too_short' });
  });

  it('respinge cont cu spații', () => {
    expect(isValidAccountCode('40 1A')).toBe(false);
    expect(validateAccountCode('40 1A')).toMatchObject({ valid: false, reason: 'invalid_chars' });
  });

  it('respinge cont cu caractere speciale', () => {
    expect(isValidAccountCode('40-1A')).toBe(false);
    expect(validateAccountCode('40-1A')).toMatchObject({ valid: false, reason: 'invalid_chars' });
  });
});

describe('getAccountCodeErrorMessage', () => {
  it('returnează mesajul generic pentru format invalid', () => {
    expect(getAccountCodeErrorMessage('ABC')).toBe(ACCOUNT_CODE_FORMAT_MESSAGE);
    expect(getAccountCodeErrorMessage('10123456')).toBe(ACCOUNT_CODE_FORMAT_MESSAGE);
  });
});
