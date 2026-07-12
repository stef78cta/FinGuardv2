/**
 * Validator central pentru simbolul contului la upload balanță.
 *
 * Sursă unică de adevăr — re-exportată din `src/utils/accountCodeValidation.ts`.
 * Păstrează regulile OMFP pentru conturi numerice și extinde suportul la simboluri alfanumerice.
 */

export type AccountCodeValidationReason =
  | 'too_short'
  | 'too_long'
  | 'no_digit'
  | 'invalid_chars'
  | 'class_9'
  | 'invalid_suffix'
  | 'invalid_numeric_class';

export type AccountCodeValidationResult =
  | { valid: true }
  | { valid: false; reason: AccountCodeValidationReason };

/** Mesaj generic pentru format invalid (non-scurt). */
export const ACCOUNT_CODE_FORMAT_MESSAGE =
  'Contul trebuie să conțină între 3 și 6 caractere alfanumerice, să includă cel puțin o cifră și să respecte formatul analitic permis.';

/** Mesaj specific pentru cont prea scurt. */
export const ACCOUNT_CODE_TOO_SHORT_MESSAGE = 'Cont prea scurt — minimum 3 cifre.';

/**
 * Validează simbolul contului (simbol principal + sufix analitic opțional).
 *
 * Reguli simbol principal:
 * - 3–6 caractere `[A-Za-z0-9]`
 * - cel puțin o cifră
 * - conturile care încep cu `9` sunt respinse (clasa 9)
 * - conturile exclusiv numerice trebuie să înceapă cu cifra 1–8 (clase OMFP 1–8)
 *
 * Sufix analitic (opțional): `.` urmat de 2 sau 3 cifre (ex: `.01`, `.001`).
 */
export function validateAccountCode(accountCode: string): AccountCodeValidationResult {
  const code = accountCode.trim();

  if (code.length === 0) {
    return { valid: false, reason: 'too_short' };
  }

  if (/[^A-Za-z0-9.]/.test(code)) {
    return { valid: false, reason: 'invalid_chars' };
  }

  const dotIndex = code.indexOf('.');
  let main: string;
  let suffix: string | undefined;

  if (dotIndex === -1) {
    main = code;
  } else {
    if (code.lastIndexOf('.') !== dotIndex) {
      return { valid: false, reason: 'invalid_suffix' };
    }

    main = code.slice(0, dotIndex);
    suffix = code.slice(dotIndex + 1);

    if (!/^\d{2,3}$/.test(suffix)) {
      return { valid: false, reason: 'invalid_suffix' };
    }
  }

  if (main.length < 3) {
    return { valid: false, reason: 'too_short' };
  }

  if (main.length > 6) {
    return { valid: false, reason: 'too_long' };
  }

  if (!/^[A-Za-z0-9]+$/.test(main)) {
    return { valid: false, reason: 'invalid_chars' };
  }

  if (!/\d/.test(main)) {
    return { valid: false, reason: 'no_digit' };
  }

  if (main[0] === '9') {
    return { valid: false, reason: 'class_9' };
  }

  // Conturi exclusiv numerice: păstrează restricția clasei 1–8 (OMFP).
  if (/^\d+$/.test(main) && !/^[1-8]/.test(main)) {
    return { valid: false, reason: 'invalid_numeric_class' };
  }

  return { valid: true };
}

/** Returnează `true` dacă simbolul contului respectă toate regulile de format. */
export function isValidAccountCode(accountCode: string): boolean {
  return validateAccountCode(accountCode).valid;
}

/**
 * Mesaj de eroare localizat pentru un cod de cont invalid.
 *
 * @param reason - Motivul returnat de `validateAccountCode`; dacă lipsește, este derivat din cod.
 */
export function getAccountCodeErrorMessage(
  accountCode: string,
  reason?: AccountCodeValidationReason,
): string {
  const resolvedReason = reason ?? (() => {
    const result = validateAccountCode(accountCode);
    return result.valid ? undefined : result.reason;
  })();

  if (!resolvedReason) {
    return ACCOUNT_CODE_FORMAT_MESSAGE;
  }

  if (resolvedReason === 'too_short') {
    return ACCOUNT_CODE_TOO_SHORT_MESSAGE;
  }

  return ACCOUNT_CODE_FORMAT_MESSAGE;
}
