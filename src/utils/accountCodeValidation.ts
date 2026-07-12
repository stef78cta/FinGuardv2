/**
 * Re-export al validatorului central de simbol cont.
 *
 * Implementarea canonică se află în `supabase/functions/_shared/accountCodeValidation.ts`
 * pentru a fi partajată și cu Edge Functions.
 */
export {
  ACCOUNT_CODE_FORMAT_MESSAGE,
  ACCOUNT_CODE_TOO_SHORT_MESSAGE,
  getAccountCodeErrorMessage,
  isValidAccountCode,
  validateAccountCode,
  type AccountCodeValidationReason,
  type AccountCodeValidationResult,
} from '../../supabase/functions/_shared/accountCodeValidation.ts';
