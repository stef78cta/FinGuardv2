/**
 * Excel Parser - Procesare balanțe contabile client-side
 * v2.0: Format obligatoriu 10 coloane (A–J) cu total_sume_debitoare/creditoare
 */
import * as XLSX from 'xlsx';

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

/** Număr coloane obligatorii A–J */
const EXPECTED_COLUMN_COUNT = 10;

/** Index coloana J (0-based) */
const LAST_COLUMN_INDEX = EXPECTED_COLUMN_COUNT - 1;

const COLUMN_STRUCTURE_LABEL =
  'Cont, Denumire, SI Debit, SI Credit, Rulaj D, Rulaj C, Total sume debitoare, Total sume creditoare, SF Debit, SF Credit';

/**
 * Reprezentarea unui cont parsat din Excel
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
 * Rezultatul parsării Excel - CONTRACT API v2.0
 */
export interface ParseResult {
  /** true = toate validările au trecut, false = există erori blocking */
  ok: boolean;
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
 * Extinde rândul la exact 10 coloane (A–J); celulele lipsă rămân goale → parseNumber = 0.
 */
function normalizeRowToTenColumns(row: unknown[] | undefined): unknown[] {
  const normalized = [...(row ?? [])].slice(0, EXPECTED_COLUMN_COUNT);
  while (normalized.length < EXPECTED_COLUMN_COUNT) {
    normalized.push(undefined);
  }
  return normalized;
}

function hasExtraColumnsBeyondJ(row: unknown[]): boolean {
  for (let i = EXPECTED_COLUMN_COUNT; i < row.length; i++) {
    if (!isBlankCell(row[i])) {
      return true;
    }
  }
  return false;
}

function countExtraColumnsBeyondJ(row: unknown[]): number {
  let count = 0;
  for (let i = EXPECTED_COLUMN_COUNT; i < row.length; i++) {
    if (!isBlankCell(row[i])) {
      count++;
    }
  }
  return count;
}

function getWorksheetMaxColumnIndex(worksheet: XLSX.WorkSheet): number {
  const ref = worksheet['!ref'];
  if (!ref) return -1;
  const range = XLSX.utils.decode_range(ref);
  return range.e.c;
}

function hasNonZeroClosingBalance(account: ParsedAccount): boolean {
  return (
    Math.abs(account.closing_debit) > CONTROL_THRESHOLD ||
    Math.abs(account.closing_credit) > CONTROL_THRESHOLD
  );
}

/**
 * Validează structura obligatorie de 10 coloane (A–J).
 * Respinge formatul vechi cu 8 coloane și date dincolo de coloana J.
 */
function validateColumnStructure(
  jsonData: unknown[][],
  worksheet: XLSX.WorkSheet,
  blockingErrors: BlockingError[],
): boolean {
  const maxColIndex = getWorksheetMaxColumnIndex(worksheet);

  if (maxColIndex <= 7) {
    blockingErrors.push({
      code: 'EXCEL_LEGACY_8_COLUMN_FORMAT',
      message:
        `Structura veche cu 8 coloane (A–H) nu mai este acceptată. Aplicația acceptă exclusiv balanțe cu 10 coloane (A–J): ${COLUMN_STRUCTURE_LABEL}.`,
      details: {
        expected: EXPECTED_COLUMN_COUNT,
        detected: maxColIndex + 1,
        note: 'Adăugați coloanele G (total_sume_debitoare), H (total_sume_creditoare) și mutați SF Debit/SF Credit în coloanele I și J.',
      },
    });
    return false;
  }

  if (maxColIndex < LAST_COLUMN_INDEX) {
    blockingErrors.push({
      code: 'EXCEL_MISSING_REQUIRED_COLUMNS',
      message:
        `Fișierul nu conține toate coloanele obligatorii A–J (${COLUMN_STRUCTURE_LABEL}). Lipsesc coloanele de la index ${maxColIndex + 2} până la J.`,
      details: {
        expected: EXPECTED_COLUMN_COUNT,
        detected: maxColIndex + 1,
        missingFromColumn: String.fromCharCode(65 + maxColIndex + 1),
      },
    });
    return false;
  }

  const columnStructureErrors: RowError[] = [];

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (!row || row.length === 0) continue;

    const hasAccountCell = !isBlankCell(row[0]);
    if (i !== 0 && !hasAccountCell) continue;

    if (hasExtraColumnsBeyondJ(row)) {
      const extraCells = countExtraColumnsBeyondJ(row);
      columnStructureErrors.push({
        rowIndex: i + 1,
        code: 'BALANCE_ROW_INVALID_COLUMN_COUNT',
        message: `Rândul ${i + 1}: structura permite exact ${EXPECTED_COLUMN_COUNT} coloane (${COLUMN_STRUCTURE_LABEL}); detectate date suplimentare dincolo de coloana J (${extraCells} celulă/celule)`,
        field: 'columns',
      });
    }
  }

  if (columnStructureErrors.length > 0) {
    blockingErrors.push({
      code: 'EXCEL_INVALID_COLUMN_COUNT',
      message: `Fișierul nu respectă structura de ${EXPECTED_COLUMN_COUNT} coloane (${COLUMN_STRUCTURE_LABEL}). ${columnStructureErrors.length} rând(uri) cu coloane suplimentare (date dincolo de coloana J).`,
      details: {
        expected: EXPECTED_COLUMN_COUNT,
        invalidRowsCount: columnStructureErrors.length,
        firstErrors: columnStructureErrors.slice(0, 5),
        note: 'Celulele goale din coloanele A–J sunt acceptate și tratate ca zero.',
      },
    });
    return false;
  }

  return true;
}

function validateRowTotalSums(
  account: ParsedAccount,
  rowIndex: number,
  rowErrors: RowError[],
): void {
  const expectedDebitTotal = Math.round((account.opening_debit + account.debit_turnover) * 100) / 100;
  const expectedCreditTotal = Math.round((account.opening_credit + account.credit_turnover) * 100) / 100;

  const debitDiff = Math.abs(account.total_sume_debitoare - expectedDebitTotal);
  if (debitDiff > CONTROL_THRESHOLD) {
    rowErrors.push({
      rowIndex,
      code: 'BALANCE_ROW_TOTAL_DEBIT_SUM_MISMATCH',
      message:
        `Rândul ${rowIndex}: total_sume_debitoare nu corespunde formulei SI_DEBIT + rulaj_d. Valoare fișier: ${formatRon(account.total_sume_debitoare)}; valoare calculată: ${formatRon(expectedDebitTotal)}; diferență: ${formatRon(debitDiff)}.`,
      field: 'total_sume_debitoare',
      details: {
        account_code: account.account_code,
        field: 'total_sume_debitoare',
        expectedValue: expectedDebitTotal,
        actualValue: account.total_sume_debitoare,
        difference: debitDiff,
        formula: 'SI_DEBIT + rulaj_d',
      },
    });
  }

  const creditDiff = Math.abs(account.total_sume_creditoare - expectedCreditTotal);
  if (creditDiff > CONTROL_THRESHOLD) {
    rowErrors.push({
      rowIndex,
      code: 'BALANCE_ROW_TOTAL_CREDIT_SUM_MISMATCH',
      message:
        `Rândul ${rowIndex}: total_sume_creditoare nu corespunde formulei SI_CREDIT + rulaj_c. Valoare fișier: ${formatRon(account.total_sume_creditoare)}; valoare calculată: ${formatRon(expectedCreditTotal)}; diferență: ${formatRon(creditDiff)}.`,
      field: 'total_sume_creditoare',
      details: {
        account_code: account.account_code,
        field: 'total_sume_creditoare',
        expectedValue: expectedCreditTotal,
        actualValue: account.total_sume_creditoare,
        difference: creditDiff,
        formula: 'SI_CREDIT + rulaj_c',
      },
    });
  }
}

function appendTotalSumBlockingErrors(
  rowErrors: RowError[],
  blockingErrors: BlockingError[],
): void {
  const totalSumErrors = rowErrors.filter(
    (e) =>
      e.code === 'BALANCE_ROW_TOTAL_DEBIT_SUM_MISMATCH' ||
      e.code === 'BALANCE_ROW_TOTAL_CREDIT_SUM_MISMATCH',
  );

  if (totalSumErrors.length > 0) {
    blockingErrors.push({
      code: 'BALANCE_TOTAL_SUMS_MISMATCH_DETECTED',
      message: `${totalSumErrors.length} rând(uri) cu total_sume_debitoare / total_sume_creditoare calculate incorect. Upload-ul a fost blocat.`,
      details: {
        violationsCount: totalSumErrors.length,
        firstErrors: totalSumErrors.slice(0, 5),
      },
    });
  }
}

function appendAccountRowBlockingErrors(
  rowErrors: RowError[],
  blockingErrors: BlockingError[],
): void {
  appendTotalSumBlockingErrors(rowErrors, blockingErrors);

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
      e.code !== 'BALANCE_ROW_TOTAL_DEBIT_SUM_MISMATCH' &&
      e.code !== 'BALANCE_ROW_TOTAL_CREDIT_SUM_MISMATCH',
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

function buildFailureResult(
  blockingErrors: BlockingError[],
  rowErrors: RowError[],
  warnings: ValidationWarning[],
  rowsRead: number,
  rowsRejected: number,
  totals: ParseResult['totals'],
): ParseResult {
  return {
    ok: false,
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
 * Parsează un fișier Excel și extrage conturile.
 *
 * VALIDĂRI BLOCKING:
 * 1. Structură coloane: exact 10 coloane A–J; format vechi 8 coloane => REJECT; date în K+ => REJECT
 * 2. total_sume_debitoare = SI_DEBIT + rulaj_d (toleranță 0.01 RON)
 * 3. total_sume_creditoare = SI_CREDIT + rulaj_c (toleranță 0.01 RON)
 * 4. Control sold inițial / rulaje / sold final (Debit = Credit)
 * 5. Clasa 6/7: sold final zero
 * 6. Conturi invalide
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  const blockingErrors: BlockingError[] = [];
  const rowErrors: RowError[] = [];
  const warnings: ValidationWarning[] = [];

  const emptyTotals = {
    opening_debit: 0,
    opening_credit: 0,
    debit_turnover: 0,
    credit_turnover: 0,
    closing_debit: 0,
    closing_credit: 0,
  };

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

      return buildFailureResult(blockingErrors, rowErrors, warnings, 0, 0, emptyTotals);
    }

    const worksheet = workbook.Sheets[firstSheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    if (jsonData.length < 2) {
      blockingErrors.push({
        code: 'EXCEL_INSUFFICIENT_DATA',
        message: 'Fișierul nu conține date suficiente (minim 2 rânduri: header + date)',
      });

      return buildFailureResult(blockingErrors, rowErrors, warnings, jsonData.length, 0, emptyTotals);
    }

    if (!validateColumnStructure(jsonData, worksheet, blockingErrors)) {
      return buildFailureResult(blockingErrors, rowErrors, warnings, jsonData.length - 1, 0, emptyTotals);
    }

    const accounts: ParsedAccount[] = [];
    const totals = { ...emptyTotals };

    let rowsRead = 0;
    let rowsRejected = 0;

    for (let i = 1; i < jsonData.length; i++) {
      const row = normalizeRowToTenColumns(jsonData[i]);
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

      if (!/^\d{3,6}$/.test(accountCode)) {
        rowErrors.push({
          rowIndex: i + 1,
          code: 'BALANCE_ROW_ACCOUNT_INVALID',
          message: `Rândul ${i + 1}: Cont invalid "${accountCode}" (așteptat 3-6 cifre)`,
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

      const account: ParsedAccount = {
        account_code: accountCode,
        account_name: accountName,
        opening_debit: parseNumber(row[2]),
        opening_credit: parseNumber(row[3]),
        debit_turnover: parseNumber(row[4]),
        credit_turnover: parseNumber(row[5]),
        total_sume_debitoare: parseNumber(row[6]),
        total_sume_creditoare: parseNumber(row[7]),
        closing_debit: parseNumber(row[8]),
        closing_credit: parseNumber(row[9]),
      };

      validateRowTotalSums(account, i + 1, rowErrors);

      const hasTotalSumError = rowErrors.some(
        (e) =>
          e.rowIndex === i + 1 &&
          (e.code === 'BALANCE_ROW_TOTAL_DEBIT_SUM_MISMATCH' ||
            e.code === 'BALANCE_ROW_TOTAL_CREDIT_SUM_MISMATCH'),
      );
      if (hasTotalSumError) {
        rowsRejected++;
        continue;
      }

      if (accountCode.startsWith('6') && hasNonZeroClosingBalance(account)) {
        rowErrors.push({
          rowIndex: i + 1,
          code: 'BALANCE_ROW_CLASS6_CLOSING_NOT_ZERO',
          message: `Rândul ${i + 1}: Cont ${accountCode} (clasa 6): sold final trebuie să fie zero (SF Debit: ${account.closing_debit.toFixed(2)}, SF Credit: ${account.closing_credit.toFixed(2)})`,
          field: 'closing_balance',
        });
        rowsRejected++;
        continue;
      }

      if (accountCode.startsWith('7') && hasNonZeroClosingBalance(account)) {
        rowErrors.push({
          rowIndex: i + 1,
          code: 'BALANCE_ROW_CLASS7_CLOSING_NOT_ZERO',
          message: `Rândul ${i + 1}: Cont ${accountCode} (clasa 7): sold final trebuie să fie zero (SF Debit: ${account.closing_debit.toFixed(2)}, SF Credit: ${account.closing_credit.toFixed(2)})`,
          field: 'closing_balance',
        });
        rowsRejected++;
        continue;
      }

      accounts.push(account);

      if (accounts.length >= MAX_ACCOUNTS) {
        warnings.push({
          code: 'MAX_ACCOUNTS_LIMIT_REACHED',
          message: `Limita de ${MAX_ACCOUNTS} conturi atinsă, restul rândurilor au fost ignorate`,
        });
        break;
      }

      totals.opening_debit += account.opening_debit;
      totals.opening_credit += account.opening_credit;
      totals.debit_turnover += account.debit_turnover;
      totals.credit_turnover += account.credit_turnover;
      totals.closing_debit += account.closing_debit;
      totals.closing_credit += account.closing_credit;
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

      return buildFailureResult(blockingErrors, rowErrors, warnings, rowsRead, rowsRejected, totals);
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

    totals.opening_debit = Math.round(totals.opening_debit * 100) / 100;
    totals.opening_credit = Math.round(totals.opening_credit * 100) / 100;
    totals.debit_turnover = Math.round(totals.debit_turnover * 100) / 100;
    totals.credit_turnover = Math.round(totals.credit_turnover * 100) / 100;
    totals.closing_debit = Math.round(totals.closing_debit * 100) / 100;
    totals.closing_credit = Math.round(totals.closing_credit * 100) / 100;

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
  } catch (error) {
    console.error('[parseExcelFile] Unexpected error:', error);

    blockingErrors.push({
      code: 'EXCEL_PARSE_EXCEPTION',
      message: `Eroare la parsarea fișierului: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error },
    });

    return buildFailureResult(blockingErrors, rowErrors, warnings, 0, 0, emptyTotals);
  }
}

/**
 * Helper pentru teste: parsează date tabulare (header + rânduri) fără fișier File.
 */
export function parseExcelRows(rows: unknown[][]): ParseResult {
  const blockingErrors: BlockingError[] = [];
  const rowErrors: RowError[] = [];
  const warnings: ValidationWarning[] = [];
  const emptyTotals = {
    opening_debit: 0,
    opening_credit: 0,
    debit_turnover: 0,
    credit_turnover: 0,
    closing_debit: 0,
    closing_credit: 0,
  };

  if (rows.length < 2) {
    blockingErrors.push({
      code: 'EXCEL_INSUFFICIENT_DATA',
      message: 'Fișierul nu conține date suficiente',
    });
    return buildFailureResult(blockingErrors, rowErrors, warnings, rows.length, 0, emptyTotals);
  }

  const maxColIndex = rows.reduce((max, row) => {
    if (!row) return max;
    for (let i = row.length - 1; i >= 0; i--) {
      if (!isBlankCell(row[i])) return Math.max(max, i);
    }
    return max;
  }, -1);

  const fakeWorksheet: XLSX.WorkSheet = {
    '!ref': `A1:${XLSX.utils.encode_col(Math.max(maxColIndex, 0))}${rows.length}`,
  };

  if (!validateColumnStructure(rows, fakeWorksheet, blockingErrors)) {
    return buildFailureResult(blockingErrors, rowErrors, warnings, rows.length - 1, 0, emptyTotals);
  }

  const accounts: ParsedAccount[] = [];
  const totals = { ...emptyTotals };
  let rowsRead = 0;
  let rowsRejected = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = normalizeRowToTenColumns(rows[i]);
    rowsRead++;

    if (row.every(isBlankCell)) continue;

    if (isBlankCell(row[0])) {
      rowErrors.push({
        rowIndex: i + 1,
        code: 'BALANCE_ROW_ACCOUNT_MISSING',
        message: `Rândul ${i + 1}: Cont lipsă`,
        field: 'account_code',
      });
      rowsRejected++;
      continue;
    }

    const accountCode = sanitizeString(row[0]);
    if (!/^\d{3,6}$/.test(accountCode)) {
      rowErrors.push({
        rowIndex: i + 1,
        code: 'BALANCE_ROW_ACCOUNT_INVALID',
        message: `Rândul ${i + 1}: Cont invalid "${accountCode}"`,
        field: 'account_code',
      });
      rowsRejected++;
      continue;
    }

    const account: ParsedAccount = {
      account_code: accountCode,
      account_name: sanitizeString(row[1]),
      opening_debit: parseNumber(row[2]),
      opening_credit: parseNumber(row[3]),
      debit_turnover: parseNumber(row[4]),
      credit_turnover: parseNumber(row[5]),
      total_sume_debitoare: parseNumber(row[6]),
      total_sume_creditoare: parseNumber(row[7]),
      closing_debit: parseNumber(row[8]),
      closing_credit: parseNumber(row[9]),
    };

    validateRowTotalSums(account, i + 1, rowErrors);

    const hasTotalSumError = rowErrors.some(
      (e) =>
        e.rowIndex === i + 1 &&
        (e.code === 'BALANCE_ROW_TOTAL_DEBIT_SUM_MISMATCH' ||
          e.code === 'BALANCE_ROW_TOTAL_CREDIT_SUM_MISMATCH'),
    );
    if (hasTotalSumError) {
      rowsRejected++;
      continue;
    }

    accounts.push(account);
    totals.opening_debit += account.opening_debit;
    totals.opening_credit += account.opening_credit;
    totals.debit_turnover += account.debit_turnover;
    totals.credit_turnover += account.credit_turnover;
    totals.closing_debit += account.closing_debit;
    totals.closing_credit += account.closing_credit;
  }

  appendAccountRowBlockingErrors(rowErrors, blockingErrors);

  if (accounts.length === 0 && blockingErrors.length === 0) {
    blockingErrors.push({
      code: 'BALANCE_NO_VALID_ACCOUNTS',
      message: 'Nu s-au găsit conturi valide în fișier',
    });
  }

  totals.opening_debit = Math.round(totals.opening_debit * 100) / 100;
  totals.opening_credit = Math.round(totals.opening_credit * 100) / 100;
  totals.debit_turnover = Math.round(totals.debit_turnover * 100) / 100;
  totals.credit_turnover = Math.round(totals.credit_turnover * 100) / 100;
  totals.closing_debit = Math.round(totals.closing_debit * 100) / 100;
  totals.closing_credit = Math.round(totals.closing_credit * 100) / 100;

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

  applyBalanceControlCheck(
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

  const isValid = blockingErrors.length === 0;

  return {
    ok: isValid,
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
        diff: Math.abs(totals.closing_debit - totals.closing_credit),
      },
    },
    accounts: isValid ? accounts : [],
    totals,
    accountsCount: accounts.length,
    error: isValid ? undefined : blockingErrors.map((e) => e.message).join('; '),
    success: isValid,
  };
}
