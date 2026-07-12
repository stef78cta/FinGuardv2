/**
 * Excel Parser - Procesare balanțe contabile client-side
 *
 * v3.0: Suport DUAL pentru două formate standard de balanță de verificare:
 *   - 8 coloane (A–H): Cont, Denumire, SI D, SI C, Rulaj D, Rulaj C, SF D, SF C
 *   - 10 coloane (A–J): + Total sume debitoare/creditoare în G/H, SF în I/J
 *
 * Formatul este detectat automat per fișier (`detectBalanceFormat`) sau poate fi
 * forțat manual în cazuri ambigue. După parsare, restul aplicației lucrează exclusiv
 * cu modelul canonic (`ParsedAccount`) — nicio poziție de coloană nu iese din parser.
 *
 * REGULĂ CRITICĂ: la 10 coloane, G/H = total_sume (cumulate) și NU rulaj/sold final;
 * la 8 coloane, G/H = sold final, iar total_sume sunt calculate intern din SI + rulaj.
 */
import * as XLSX from 'xlsx';
import {
  getAccountCodeErrorMessage,
  validateAccountCode,
} from '@/utils/accountCodeValidation';

/** Maximum accounts în fișier */
const MAX_ACCOUNTS = 10_000;

/** Maximum string length pentru celule */
const MAX_CELL_LENGTH = 500;

/** Maximum numeric value */
const MAX_NUMERIC_VALUE = 999_999_999_999.99;

/** Minimum numeric value */
const MIN_NUMERIC_VALUE = -999_999_999_999.99;

/** Prag control total: diferență > 1 ban blochează upload-ul */
const CONTROL_THRESHOLD = 0.01;

/** Index ultima coloană (0-based) pentru fiecare format */
const LAST_COLUMN_INDEX_8 = 7; // H
const LAST_COLUMN_INDEX_10 = 9; // J

const COLUMN_STRUCTURE_LABEL_8 =
  'Cont, Denumire, SI Debit, SI Credit, Rulaj D, Rulaj C, SF Debit, SF Credit';
const COLUMN_STRUCTURE_LABEL_10 =
  'Cont, Denumire, SI Debit, SI Credit, Rulaj D, Rulaj C, Total sume debitoare, Total sume creditoare, SF Debit, SF Credit';

/**
 * Formatul de balanță acceptat de aplicație.
 */
export type BalanceExcelFormat = '8_COLUMNS' | '10_COLUMNS';

/**
 * Rezultatul detecției de format (include stările non-finale).
 */
export type BalanceFormatDetection = BalanceExcelFormat | 'AMBIGUOUS' | 'INVALID';

/**
 * Numărul de coloane efective pentru un format dat.
 */
const FORMAT_COLUMN_COUNT: Record<BalanceExcelFormat, number> = {
  '8_COLUMNS': 8,
  '10_COLUMNS': 10,
};

/**
 * Reprezentarea canonică a unui cont parsat din Excel.
 *
 * Indiferent de formatul fișierului (8 sau 10 coloane), câmpurile au aceeași semnificație:
 * - `debit_turnover` / `credit_turnover` = rulaj LUNAR (coloanele E/F);
 * - `closing_debit` / `closing_credit` = sold final (G/H la 8 coloane, I/J la 10 coloane);
 * - `total_sume_*` = total sume (citite din G/H la 10 coloane, calculate din SI + rulaj la 8 coloane).
 */
export interface ParsedAccount {
  account_code: string;
  account_name: string;
  opening_debit: number;
  opening_credit: number;
  debit_turnover: number;
  credit_turnover: number;
  total_sume_debitoare: number;
  total_sume_creditoare: number;
  closing_debit: number;
  closing_credit: number;
}

/**
 * Eroare de nivel blocking (respinge întregul upload)
 */
export interface BlockingError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Detalii opționale pentru erori la nivel de rând (ex. neconcordanță total_sume)
 */
export interface RowErrorDetails {
  account_code?: string;
  field?: string;
  expectedValue?: number;
  actualValue?: number;
  difference?: number;
  formula?: string;
}

/**
 * Eroare la nivel de rând
 */
export interface RowError {
  rowIndex: number;
  code: string;
  message: string;
  field?: string;
  details?: RowErrorDetails;
}

/**
 * Warning (nu blochează upload-ul)
 */
export interface ValidationWarning {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Metrici de procesare
 */
export interface ProcessingMetrics {
  rowsRead: number;
  rowsAccepted: number;
  rowsRejected: number;
  totals: {
    finDebit: number;
    finCredit: number;
    diff: number;
  };
}

/**
 * Rezultatul parsării Excel - CONTRACT API v3.0
 */
export interface ParseResult {
  /** true = toate validările au trecut, false = există erori blocking */
  ok: boolean;
  /**
   * Formatul rezolvat pentru fișier. `null` când parsarea a fost blocată înainte de
   * a rezolva formatul (ex. structură ambiguă, date peste coloana J).
   */
  format: BalanceExcelFormat | null;
  blockingErrors: BlockingError[];
  rowErrors: RowError[];
  warnings: ValidationWarning[];
  metrics: ProcessingMetrics;
  accounts: ParsedAccount[];
  totals: {
    opening_debit: number;
    opening_credit: number;
    debit_turnover: number;
    credit_turnover: number;
    closing_debit: number;
    closing_credit: number;
  };
  accountsCount: number;
  error?: string;
  success: boolean;
}

/**
 * Opțiuni pentru parsare.
 */
export interface ParseOptions {
  /**
   * Forțează un format anume (pentru cazuri ambigue rezolvate manual de utilizator).
   * Dacă structura fișierului contrazice formatul ales, parsarea este blocată.
   */
  forcedFormat?: BalanceExcelFormat;
}

/**
 * Sanitizează o valoare string din Excel.
 */
function sanitizeString(value: unknown): string {
  if (value === null || value === undefined) return "";

  let strValue = String(value);

  if (strValue.length > MAX_CELL_LENGTH) {
    strValue = strValue.substring(0, MAX_CELL_LENGTH);
  }

  strValue = strValue.replace(/^[=+\-@\t\r]+/, "");
  strValue = strValue.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return strValue.trim();
}

/**
 * Parsează și validează o valoare numerică din Excel.
 */
function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    if (value > MAX_NUMERIC_VALUE || value < MIN_NUMERIC_VALUE) return 0;
    return Math.round(value * 100) / 100;
  }

  const strValue = String(value).trim();

  if (strValue.length > 50) return 0;

  if (!/^-?[\d\s.,]+$/.test(strValue)) return 0;

  const lastDotIndex = strValue.lastIndexOf('.');
  const lastCommaIndex = strValue.lastIndexOf(',');

  let normalized: string;

  if (lastDotIndex > -1 && lastCommaIndex > -1) {
    if (lastCommaIndex > lastDotIndex) {
      normalized = strValue
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    } else {
      normalized = strValue
        .replace(/\s/g, '')
        .replace(/,/g, '');
    }
  } else if (lastCommaIndex > -1) {
    normalized = strValue
      .replace(/\s/g, '')
      .replace(',', '.');
  } else {
    normalized = strValue.replace(/\s/g, '');
  }

  const num = parseFloat(normalized);

  if (!Number.isFinite(num)) return 0;
  if (num > MAX_NUMERIC_VALUE || num < MIN_NUMERIC_VALUE) return 0;

  return Math.round(num * 100) / 100;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatRon(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
  }).format(value);
}

interface BalanceControlSpec {
  debit: number;
  credit: number;
  mismatchCode: string;
  mismatchMessage: string;
  roundingWarningCode: string;
  roundingWarningMessage: string;
  detailDebitKey: string;
  detailCreditKey: string;
}

function applyBalanceControlCheck(
  spec: BalanceControlSpec,
  blockingErrors: BlockingError[],
  warnings: ValidationWarning[],
): number {
  const diff = Math.abs(spec.debit - spec.credit);

  if (diff > CONTROL_THRESHOLD) {
    blockingErrors.push({
      code: spec.mismatchCode,
      message: `${spec.mismatchMessage} (diferență: ${diff.toFixed(2)} RON)`,
      details: {
        [spec.detailDebitKey]: spec.debit,
        [spec.detailCreditKey]: spec.credit,
        difference: diff,
        threshold: CONTROL_THRESHOLD,
      },
    });
  } else if (diff > 0 && diff <= CONTROL_THRESHOLD) {
    warnings.push({
      code: spec.roundingWarningCode,
      message: `${spec.roundingWarningMessage} (${diff.toFixed(2)} RON) - acceptată`,
      details: { difference: diff },
    });
  }

  return diff;
}

function isBlankCell(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  return String(value).trim() === '';
}

/**
 * Extinde rândul la exact numărul de coloane al formatului; celulele lipsă rămân
 * goale → `parseNumber` = 0.
 */
function normalizeRowToFormat(row: unknown[] | undefined, format: BalanceExcelFormat): unknown[] {
  const count = FORMAT_COLUMN_COUNT[format];
  const normalized = [...(row ?? [])].slice(0, count);
  while (normalized.length < count) {
    normalized.push(undefined);
  }
  return normalized;
}

/**
 * Cel mai mare index de coloană (0-based) care conține date reale, pe toate rândurile
 * (inclusiv header). Robust față de coloane „fantomă" din `!ref`.
 */
function getDataMaxColumnIndex(jsonData: unknown[][]): number {
  let max = -1;
  for (const row of jsonData) {
    if (!row) continue;
    for (let i = row.length - 1; i >= 0; i--) {
      if (!isBlankCell(row[i])) {
        if (i > max) max = i;
        break;
      }
    }
  }
  return max;
}

/**
 * Detectează formatul balanței pe baza numărului de coloane populate.
 *
 * Reguli:
 * - date doar până la coloana H (index ≤ 7) → 8 coloane;
 * - date până la coloana J (index 9) → 10 coloane;
 * - date exact până la coloana I (index 8, adică 9 coloane) → structură ambiguă;
 * - date dincolo de coloana J (index > 9) → invalid.
 *
 * @param maxColIndex - cel mai mare index de coloană cu date (vezi `getDataMaxColumnIndex`)
 */
export function detectBalanceFormat(maxColIndex: number): BalanceFormatDetection {
  if (maxColIndex < 0) return 'INVALID';
  if (maxColIndex > LAST_COLUMN_INDEX_10) return 'INVALID';
  if (maxColIndex <= LAST_COLUMN_INDEX_8) return '8_COLUMNS';
  if (maxColIndex === LAST_COLUMN_INDEX_10) return '10_COLUMNS';
  // maxColIndex === 8 → exact 9 coloane (până la I): ambiguu
  return 'AMBIGUOUS';
}

function hasNonZeroClosingBalance(account: ParsedAccount): boolean {
  return (
    Math.abs(account.closing_debit) > CONTROL_THRESHOLD ||
    Math.abs(account.closing_credit) > CONTROL_THRESHOLD
  );
}

/**
 * Construiește un cont canonic dintr-un rând normalizat, în funcție de format.
 *
 * - 10 coloane: G/H → total_sume (citite ca atare), I/J → sold final.
 * - 8 coloane: G/H → sold final; total_sume calculate intern (SI + rulaj).
 */
function buildAccount(row: unknown[], format: BalanceExcelFormat): ParsedAccount {
  const account_code = sanitizeString(row[0]);
  const account_name = sanitizeString(row[1]);
  const opening_debit = parseNumber(row[2]);
  const opening_credit = parseNumber(row[3]);
  const debit_turnover = parseNumber(row[4]);
  const credit_turnover = parseNumber(row[5]);

  if (format === '10_COLUMNS') {
    return {
      account_code,
      account_name,
      opening_debit,
      opening_credit,
      debit_turnover,
      credit_turnover,
      total_sume_debitoare: parseNumber(row[6]),
      total_sume_creditoare: parseNumber(row[7]),
      closing_debit: parseNumber(row[8]),
      closing_credit: parseNumber(row[9]),
    };
  }

  // 8 coloane: G/H sunt sold final; total_sume se calculează intern.
  const closing_debit = parseNumber(row[6]);
  const closing_credit = parseNumber(row[7]);

  return {
    account_code,
    account_name,
    opening_debit,
    opening_credit,
    debit_turnover,
    credit_turnover,
    total_sume_debitoare: round2(opening_debit + debit_turnover),
    total_sume_creditoare: round2(opening_credit + credit_turnover),
    closing_debit,
    closing_credit,
  };
}

/**
 * Validare specifică formatului 10 coloane: identitatea contabilă per rând
 * `(SF Debit − SF Credit) === (Total Sume Debitoare − Total Sume Creditoare)`.
 *
 * NU se aplică la 8 coloane, unde total_sume sunt derivate din SI + rulaj (regulă
 * transformată din instrucțiuni într-un calcul intern, nu într-o validare blocking).
 */
function validateRowClosingFromTotals(
  account: ParsedAccount,
  rowIndex: number,
  rowErrors: RowError[],
): void {
  const netFromTotals = round2(account.total_sume_debitoare - account.total_sume_creditoare);
  const netFromClosing = round2(account.closing_debit - account.closing_credit);
  const diff = Math.abs(netFromTotals - netFromClosing);

  if (diff > CONTROL_THRESHOLD) {
    rowErrors.push({
      rowIndex,
      code: 'BALANCE_ROW_CLOSING_MISMATCH',
      message:
        `Rândul ${rowIndex}: soldul final net (SF Debit − SF Credit = ${formatRon(netFromClosing)}) nu corespunde cu Total Sume Debitoare − Total Sume Creditoare (${formatRon(netFromTotals)}); diferență: ${formatRon(diff)}.`,
      field: 'closing_balance',
      details: {
        account_code: account.account_code,
        field: 'closing_balance',
        expectedValue: netFromTotals,
        actualValue: netFromClosing,
        difference: diff,
        formula: 'total_sume_debitoare - total_sume_creditoare',
      },
    });
  }
}

function appendClosingMismatchBlockingErrors(
  rowErrors: RowError[],
  blockingErrors: BlockingError[],
): void {
  const closingErrors = rowErrors.filter((e) => e.code === 'BALANCE_ROW_CLOSING_MISMATCH');

  if (closingErrors.length > 0) {
    blockingErrors.push({
      code: 'BALANCE_CLOSING_MISMATCH_DETECTED',
      message: `${closingErrors.length} rând(uri) unde soldul final nu corespunde cu (Total Sume Debitoare − Total Sume Creditoare). Upload-ul a fost blocat.`,
      details: {
        violationsCount: closingErrors.length,
        firstErrors: closingErrors.slice(0, 5),
      },
    });
  }
}

function appendAccountRowBlockingErrors(
  rowErrors: RowError[],
  blockingErrors: BlockingError[],
): void {
  appendClosingMismatchBlockingErrors(rowErrors, blockingErrors);

  const class6ClosingErrors = rowErrors.filter(
    (e) => e.code === 'BALANCE_ROW_CLASS6_CLOSING_NOT_ZERO',
  );
  if (class6ClosingErrors.length > 0) {
    blockingErrors.push({
      code: 'BALANCE_CONTROL_CLASS6_CLOSING_NOT_ZERO',
      message: `Conturile clasa 6 (6xx) trebuie să aibă sold final zero. ${class6ClosingErrors.length} cont(uri) cu sold final nenul detectate.`,
      details: {
        violationsCount: class6ClosingErrors.length,
        firstErrors: class6ClosingErrors.slice(0, 5),
      },
    });
  }

  const class7ClosingErrors = rowErrors.filter(
    (e) => e.code === 'BALANCE_ROW_CLASS7_CLOSING_NOT_ZERO',
  );
  if (class7ClosingErrors.length > 0) {
    blockingErrors.push({
      code: 'BALANCE_CONTROL_CLASS7_CLOSING_NOT_ZERO',
      message: `Conturile clasa 7 (7xx) trebuie să aibă sold final zero. ${class7ClosingErrors.length} cont(uri) cu sold final nenul detectate.`,
      details: {
        violationsCount: class7ClosingErrors.length,
        firstErrors: class7ClosingErrors.slice(0, 5),
      },
    });
  }

  const structuralRowErrors = rowErrors.filter(
    (e) =>
      e.code !== 'BALANCE_ROW_CLASS6_CLOSING_NOT_ZERO' &&
      e.code !== 'BALANCE_ROW_CLASS7_CLOSING_NOT_ZERO' &&
      e.code !== 'BALANCE_ROW_CLOSING_MISMATCH',
  );
  if (structuralRowErrors.length > 0) {
    blockingErrors.push({
      code: 'BALANCE_INVALID_ROWS_DETECTED',
      message: `${structuralRowErrors.length} rând(uri) cu erori detectate: conturi lipsă sau invalide`,
      details: {
        invalidRowsCount: structuralRowErrors.length,
        firstErrors: structuralRowErrors.slice(0, 5),
      },
    });
  }
}

const EMPTY_TOTALS: ParseResult['totals'] = {
  opening_debit: 0,
  opening_credit: 0,
  debit_turnover: 0,
  credit_turnover: 0,
  closing_debit: 0,
  closing_credit: 0,
};

function buildFailureResult(
  format: BalanceExcelFormat | null,
  blockingErrors: BlockingError[],
  rowErrors: RowError[],
  warnings: ValidationWarning[],
  rowsRead: number,
  rowsRejected: number,
  totals: ParseResult['totals'],
): ParseResult {
  return {
    ok: false,
    format,
    blockingErrors,
    rowErrors,
    warnings,
    metrics: {
      rowsRead,
      rowsAccepted: 0,
      rowsRejected,
      totals: { finDebit: 0, finCredit: 0, diff: 0 },
    },
    accounts: [],
    totals,
    accountsCount: 0,
    error: blockingErrors.map((e) => e.message).join('; '),
    success: false,
  };
}

/**
 * Rezolvă formatul fișierului (detectare automată sau forțat manual) și validează
 * structura. Împinge erori blocking și returnează `null` dacă parsarea nu poate continua.
 */
function resolveFormat(
  jsonData: unknown[][],
  forcedFormat: BalanceExcelFormat | undefined,
  blockingErrors: BlockingError[],
): BalanceExcelFormat | null {
  const maxColIndex = getDataMaxColumnIndex(jsonData);
  const detection = detectBalanceFormat(maxColIndex);
  const detectedCount = maxColIndex + 1;

  // Date dincolo de coloana J → mereu invalid, indiferent de alegerea manuală.
  if (detection === 'INVALID' && maxColIndex > LAST_COLUMN_INDEX_10) {
    blockingErrors.push({
      code: 'EXCEL_INVALID_COLUMN_COUNT',
      message: `Fișierul conține date peste coloana J. Sunt acceptate doar formatele standard cu 8 coloane sau 10 coloane.`,
      details: {
        detected: detectedCount,
        maxAllowed: 10,
        note: 'Verificați ordinea coloanelor și eliminați datele din coloanele K+.',
      },
    });
    return null;
  }

  if (forcedFormat) {
    // Utilizatorul a ales manual formatul: validăm alegerea față de structura reală.
    const lastAllowedIndex =
      forcedFormat === '10_COLUMNS' ? LAST_COLUMN_INDEX_10 : LAST_COLUMN_INDEX_8;

    if (forcedFormat === '8_COLUMNS' && maxColIndex > LAST_COLUMN_INDEX_8) {
      blockingErrors.push({
        code: 'EXCEL_FORCED_FORMAT_MISMATCH',
        message:
          `Ați ales formatul de 8 coloane, dar fișierul conține date dincolo de coloana H (până la coloana ${String.fromCharCode(65 + maxColIndex)}). Structura fișierului nu corespunde formatului ales.`,
        details: { forcedFormat, detected: detectedCount, expectedMaxColumn: 'H' },
      });
      return null;
    }

    if (forcedFormat === '10_COLUMNS' && maxColIndex < LAST_COLUMN_INDEX_10) {
      blockingErrors.push({
        code: 'EXCEL_FORCED_FORMAT_MISMATCH',
        message:
          `Ați ales formatul de 10 coloane, dar fișierul conține date doar până la coloana ${maxColIndex >= 0 ? String.fromCharCode(65 + maxColIndex) : 'A'}. Structura fișierului nu corespunde formatului ales.`,
        details: { forcedFormat, detected: detectedCount, expectedMaxColumn: 'J' },
      });
      return null;
    }

    void lastAllowedIndex;
    return forcedFormat;
  }

  if (detection === 'AMBIGUOUS') {
    blockingErrors.push({
      code: 'EXCEL_AMBIGUOUS_FORMAT',
      message:
        'Nu am putut determina automat formatul balanței. Selectați formatul fișierului încărcat (8 sau 10 coloane) pentru a continua validarea.',
      details: { detected: detectedCount },
    });
    return null;
  }

  if (detection === 'INVALID') {
    blockingErrors.push({
      code: 'EXCEL_INVALID_COLUMN_COUNT',
      message:
        `Structura fișierului nu corespunde nici formatului de 8 coloane (${COLUMN_STRUCTURE_LABEL_8}), nici formatului de 10 coloane (${COLUMN_STRUCTURE_LABEL_10}). Verificați ordinea coloanelor și încercați din nou.`,
      details: { detected: detectedCount },
    });
    return null;
  }

  return detection;
}

/**
 * Motorul comun de parsare/validare, folosit atât de `parseExcelFile` (fișier real),
 * cât și de `parseExcelRows` (teste). Menține o singură sursă de adevăr pentru reguli.
 */
function runParse(
  jsonData: unknown[][],
  options: ParseOptions = {},
): ParseResult {
  const blockingErrors: BlockingError[] = [];
  const rowErrors: RowError[] = [];
  const warnings: ValidationWarning[] = [];

  if (jsonData.length < 2) {
    blockingErrors.push({
      code: 'EXCEL_INSUFFICIENT_DATA',
      message: 'Fișierul nu conține date suficiente (minim 2 rânduri: header + date)',
    });
    return buildFailureResult(null, blockingErrors, rowErrors, warnings, jsonData.length, 0, { ...EMPTY_TOTALS });
  }

  const format = resolveFormat(jsonData, options.forcedFormat, blockingErrors);
  if (!format) {
    return buildFailureResult(null, blockingErrors, rowErrors, warnings, jsonData.length - 1, 0, { ...EMPTY_TOTALS });
  }

  const accounts: ParsedAccount[] = [];
  const totals = { ...EMPTY_TOTALS };

  let rowsRead = 0;
  let rowsRejected = 0;

  for (let i = 1; i < jsonData.length; i++) {
    const row = normalizeRowToFormat(jsonData[i], format);
    rowsRead++;

    if (row.every(isBlankCell)) {
      continue;
    }

    if (isBlankCell(row[0])) {
      rowErrors.push({
        rowIndex: i + 1,
        code: 'BALANCE_ROW_ACCOUNT_MISSING',
        message: `Rândul ${i + 1}: Cont lipsă (coloana A este goală)`,
        field: 'account_code',
      });
      rowsRejected++;
      continue;
    }

    const accountCode = sanitizeString(row[0]);

    const accountCodeValidation = validateAccountCode(accountCode);
    if (accountCodeValidation.valid === false) {
      const formatMessage = getAccountCodeErrorMessage(
        accountCode,
        accountCodeValidation.reason,
      );
      rowErrors.push({
        rowIndex: i + 1,
        code: 'BALANCE_ROW_ACCOUNT_INVALID',
        message: `Rândul ${i + 1}: Cont invalid "${accountCode}" — ${formatMessage}`,
        field: 'account_code',
      });
      rowsRejected++;
      continue;
    }

    const accountName = sanitizeString(row[1]);

    if (accountName.length > 200) {
      rowErrors.push({
        rowIndex: i + 1,
        code: 'BALANCE_ROW_NAME_TOO_LONG',
        message: `Rândul ${i + 1}: Denumire prea lungă (max 200 caractere)`,
        field: 'account_name',
      });
      rowsRejected++;
      continue;
    }

    const account = buildAccount(row, format);

    // Validare specifică formatului 10 coloane (identitate SF ↔ total_sume).
    // La 8 coloane, total_sume sunt derivate din SI + rulaj → verificarea nu se aplică.
    if (format === '10_COLUMNS') {
      validateRowClosingFromTotals(account, i + 1, rowErrors);
    }

    if (accountCode.startsWith('6') && hasNonZeroClosingBalance(account)) {
      rowErrors.push({
        rowIndex: i + 1,
        code: 'BALANCE_ROW_CLASS6_CLOSING_NOT_ZERO',
        message: `Rândul ${i + 1}: Cont ${accountCode} (clasa 6): sold final trebuie să fie zero (SF Debit: ${account.closing_debit.toFixed(2)}, SF Credit: ${account.closing_credit.toFixed(2)})`,
        field: 'closing_balance',
      });
    }

    if (accountCode.startsWith('7') && hasNonZeroClosingBalance(account)) {
      rowErrors.push({
        rowIndex: i + 1,
        code: 'BALANCE_ROW_CLASS7_CLOSING_NOT_ZERO',
        message: `Rândul ${i + 1}: Cont ${accountCode} (clasa 7): sold final trebuie să fie zero (SF Debit: ${account.closing_debit.toFixed(2)}, SF Credit: ${account.closing_credit.toFixed(2)})`,
        field: 'closing_balance',
      });
    }

    accounts.push(account);

    totals.opening_debit += account.opening_debit;
    totals.opening_credit += account.opening_credit;
    totals.debit_turnover += account.debit_turnover;
    totals.credit_turnover += account.credit_turnover;
    totals.closing_debit += account.closing_debit;
    totals.closing_credit += account.closing_credit;

    if (accounts.length >= MAX_ACCOUNTS) {
      warnings.push({
        code: 'MAX_ACCOUNTS_LIMIT_REACHED',
        message: `Limita de ${MAX_ACCOUNTS} conturi atinsă, restul rândurilor au fost ignorate`,
      });
      break;
    }
  }

  if (accounts.length === 0) {
    appendAccountRowBlockingErrors(rowErrors, blockingErrors);

    if (blockingErrors.length === 0) {
      blockingErrors.push({
        code: 'BALANCE_NO_VALID_ACCOUNTS',
        message: 'Nu s-au găsit conturi valide în fișier',
        details: { rowsRead, rowsRejected, rowErrorsCount: rowErrors.length },
      });
    }

    return buildFailureResult(format, blockingErrors, rowErrors, warnings, rowsRead, rowsRejected, totals);
  }

  const codeCounts = new Map<string, number>();
  accounts.forEach((acc) => {
    codeCounts.set(acc.account_code, (codeCounts.get(acc.account_code) || 0) + 1);
  });
  const duplicateCodes = Array.from(codeCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([code]) => code);

  if (duplicateCodes.length > 0) {
    warnings.push({
      code: 'DUPLICATE_ACCOUNTS',
      message: `${duplicateCodes.length} cod(uri) duplicate detectate. Vor fi agregate automat la încărcare.`,
      details: { duplicateCodes: duplicateCodes.slice(0, 10) },
    });
  }

  // Semnalează utilizatorului că, la 8 coloane, total_sume sunt calculate, nu din Excel.
  if (format === '8_COLUMNS') {
    warnings.push({
      code: 'TOTAL_SUME_COMPUTED_FROM_8_COLUMN_FORMAT',
      message:
        'Format 8 coloane: coloanele Total sume nu există în fișier și au fost calculate automat din sold inițial + rulaj lunar.',
    });
  }

  totals.opening_debit = round2(totals.opening_debit);
  totals.opening_credit = round2(totals.opening_credit);
  totals.debit_turnover = round2(totals.debit_turnover);
  totals.credit_turnover = round2(totals.credit_turnover);
  totals.closing_debit = round2(totals.closing_debit);
  totals.closing_credit = round2(totals.closing_credit);

  applyBalanceControlCheck(
    {
      debit: totals.opening_debit,
      credit: totals.opening_credit,
      mismatchCode: 'BALANCE_CONTROL_OPENING_MISMATCH',
      mismatchMessage: 'Total Sold inițial Debit nu este egal cu Total Sold inițial Credit',
      roundingWarningCode: 'BALANCE_CONTROL_OPENING_ROUNDING_DIFF',
      roundingWarningMessage: 'Diferență minimă de rotunjire la sold inițial detectată',
      detailDebitKey: 'opening_debit',
      detailCreditKey: 'opening_credit',
    },
    blockingErrors,
    warnings,
  );

  applyBalanceControlCheck(
    {
      debit: totals.debit_turnover,
      credit: totals.credit_turnover,
      mismatchCode: 'BALANCE_CONTROL_TURNOVER_MISMATCH',
      mismatchMessage: 'Total Rulaj curent Debit nu este egal cu Total Rulaj curent Credit',
      roundingWarningCode: 'BALANCE_CONTROL_TURNOVER_ROUNDING_DIFF',
      roundingWarningMessage: 'Diferență minimă de rotunjire la rulaje detectată',
      detailDebitKey: 'debit_turnover',
      detailCreditKey: 'credit_turnover',
    },
    blockingErrors,
    warnings,
  );

  const controlDiff = applyBalanceControlCheck(
    {
      debit: totals.closing_debit,
      credit: totals.closing_credit,
      mismatchCode: 'BALANCE_CONTROL_TOTAL_MISMATCH',
      mismatchMessage: 'Total Sold final Debit nu este egal cu Total Sold final Credit',
      roundingWarningCode: 'BALANCE_CONTROL_ROUNDING_DIFF',
      roundingWarningMessage: 'Diferență minimă de rotunjire la sold final detectată',
      detailDebitKey: 'closing_debit',
      detailCreditKey: 'closing_credit',
    },
    blockingErrors,
    warnings,
  );

  appendAccountRowBlockingErrors(rowErrors, blockingErrors);

  const isValid = blockingErrors.length === 0;

  return {
    ok: isValid,
    format,
    blockingErrors,
    rowErrors,
    warnings,
    metrics: {
      rowsRead,
      rowsAccepted: accounts.length,
      rowsRejected,
      totals: {
        finDebit: totals.closing_debit,
        finCredit: totals.closing_credit,
        diff: controlDiff,
      },
    },
    accounts: isValid ? accounts : [],
    totals,
    accountsCount: accounts.length,
    error: isValid ? undefined : blockingErrors.map((e) => e.message).join('; '),
    success: isValid,
  };
}

/**
 * Parsează un fișier Excel și extrage conturile.
 *
 * VALIDĂRI BLOCKING (comune ambelor formate):
 * 1. Structură coloane: detectare automată 8 sau 10 coloane; date în K+ => REJECT;
 *    structură ambiguă (9 coloane) => cere alegere manuală.
 * 2. Control sold inițial / rulaje / sold final (Debit = Credit)
 * 3. Clasa 6/7: sold final zero
 * 4. Conturi invalide / lipsă
 *
 * VALIDARE SPECIFICĂ 10 COLOANE:
 * 5. Identitate per rând: (SF Debit − SF Credit) = (Total Sume Debitoare − Total Sume Creditoare)
 *
 * FORMAT 8 COLOANE: total_sume_* sunt calculate intern (SI + rulaj), fără validare blocking.
 *
 * @param file - fișierul Excel selectat
 * @param options - opțiuni (ex. `forcedFormat` pentru cazuri ambigue rezolvate manual)
 */
export async function parseExcelFile(file: File, options: ParseOptions = {}): Promise<ParseResult> {
  const blockingErrors: BlockingError[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();

    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellDates: false,
      cellNF: false,
      cellFormula: false,
    });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      blockingErrors.push({
        code: 'EXCEL_NO_SHEETS',
        message: 'Fișierul Excel nu conține foi de lucru',
      });

      return buildFailureResult(null, blockingErrors, [], [], 0, 0, { ...EMPTY_TOTALS });
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    return runParse(jsonData, options);
  } catch (error) {
    console.error('[parseExcelFile] Unexpected error:', error);

    blockingErrors.push({
      code: 'EXCEL_PARSE_EXCEPTION',
      message: `Eroare la parsarea fișierului: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error },
    });

    return buildFailureResult(null, blockingErrors, [], [], 0, 0, { ...EMPTY_TOTALS });
  }
}

/**
 * Helper pentru teste: parsează date tabulare (header + rânduri) fără fișier File.
 *
 * @param rows - matrice header + rânduri de date
 * @param options - opțiuni (ex. `forcedFormat`)
 */
export function parseExcelRows(rows: unknown[][], options: ParseOptions = {}): ParseResult {
  return runParse(rows, options);
}
