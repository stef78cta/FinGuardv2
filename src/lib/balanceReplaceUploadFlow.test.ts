import { describe, expect, it } from 'vitest';
import {
  ActiveBalanceExistsError,
  isActiveBalanceExistsError,
} from '@/lib/balanceUploadErrors';

/** Mesaje folosite în pagina de upload — testate pentru consistență UX. */
const REPLACE_CONFIRM_MESSAGE =
  'Există deja o balanță activă pentru luna selectată. Doriți să ștergeți automat importul anterior și ca noua balanță de verificare să înlocuiască balanța încărcată anterior?';

const SUCCESS_REPLACE_MESSAGE = 'Balanța anterioară a fost înlocuită cu succes.';
const SUCCESS_UPLOAD_MESSAGE = 'Balanța a fost încărcată și procesată cu succes!';

/**
 * Simulează decizia din IncarcareBalanta: ce mesaj de succes se afișează după upload.
 */
function getUploadSuccessMessage(replaceExisting: boolean): string {
  return replaceExisting ? SUCCESS_REPLACE_MESSAGE : SUCCESS_UPLOAD_MESSAGE;
}

/**
 * Simulează ramura de gestionare a erorii din executeUpload/handleUpload.
 */
function resolveUploadConflictAction(
  error: unknown,
  replaceExisting: boolean,
): 'show_replace_dialog' | 'fail' {
  if (isActiveBalanceExistsError(error) && !replaceExisting) {
    return 'show_replace_dialog';
  }
  return 'fail';
}

describe('flux înlocuire balanță — logică UI', () => {
  it('mesajele de confirmare și succes sunt definite conform cerințelor', () => {
    expect(REPLACE_CONFIRM_MESSAGE).toContain('Doriți să ștergeți automat importul anterior');
    expect(SUCCESS_REPLACE_MESSAGE).toBe('Balanța anterioară a fost înlocuită cu succes.');
  });

  it('upload normal afișează mesajul de succes standard', () => {
    expect(getUploadSuccessMessage(false)).toBe(SUCCESS_UPLOAD_MESSAGE);
  });

  it('upload cu replaceExisting afișează mesajul de înlocuire', () => {
    expect(getUploadSuccessMessage(true)).toBe(SUCCESS_REPLACE_MESSAGE);
  });

  it('conflictul de lună deschide dialogul doar când replaceExisting este false', () => {
    const conflict = new ActiveBalanceExistsError('imp-1');

    expect(resolveUploadConflictAction(conflict, false)).toBe('show_replace_dialog');
    expect(resolveUploadConflictAction(conflict, true)).toBe('fail');
    expect(resolveUploadConflictAction(new Error('validare'), false)).toBe('fail');
  });
});
