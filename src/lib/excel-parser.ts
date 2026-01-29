/**
 * Excel Parser - Procesare balanțe contabile client-side
 * v1.9.2: Alternativă la Edge Function pentru procesare directă în browser
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
 * Eroare la nivel de rând
 */
export interface RowError {
  rowIndex: number;
  code: string;
  message: string;
  field?: string;
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
 * v2.0: Adaugă validări blocking pentru control totals și conturi invalide
 */
export interface ParseResult {
  /** true = toate validările au trecut, false = există erori blocking */
  ok: boolean;
  /** Erori care blochează upload-ul (respinge complet procesarea) */
  blockingErrors: BlockingError[];
  /** Erori la nivel de rând (cont gol, invalid, etc.) */
  rowErrors: RowError[];
  /** Warnings (nu blochează) */
  warnings: ValidationWarning[];
  /** Metrici de procesare */
  metrics: ProcessingMetrics;
  /** Conturi parsate cu succes (doar dacă ok === true) */
  accounts: ParsedAccount[];
  /** Totaluri calculate (pentru backward compatibility) */
  totals: {
    opening_debit: number;
    opening_credit: number;
    debit_turnover: number;
    credit_turnover: number;
    closing_debit: number;
    closing_credit: number;
  };
  /** Număr conturi acceptate */
  accountsCount: number;
  /** Mesaj eroare general (deprecated - folosește blockingErrors) */
  error?: string;
  /** Flag legacy pentru backward compatibility (deprecated) */
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
  
  // Remove formula injection (=, +, -, @, tab, CR)
  strValue = strValue.replace(/^[=+\-@\t\r]+/, "");
  
  // Remove control characters except common whitespace
  strValue = strValue.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  
  return strValue.trim();
}

/**
 * Parsează și validează o valoare numerică din Excel.
 * Suportă format RO (1.234,56) și US (1,234.56).
 */
function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  
  // Direct number - validate range
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    if (value > MAX_NUMERIC_VALUE || value < MIN_NUMERIC_VALUE) return 0;
    return Math.round(value * 100) / 100;
  }
  
  // Handle string values
  const strValue = String(value).trim();
  
  // Length check to prevent issues
  if (strValue.length > 50) return 0;
  
  // Only allow digits, spaces, dots, commas, and minus
  if (!/^-?[\d\s.,]+$/.test(strValue)) return 0;
  
  // Detect format based on positions of dot and comma
  const lastDotIndex = strValue.lastIndexOf('.');
  const lastCommaIndex = strValue.lastIndexOf(',');
  
  let normalized: string;
  
  if (lastDotIndex > -1 && lastCommaIndex > -1) {
    if (lastCommaIndex > lastDotIndex) {
      // Format RO: punct = mii, virgulă = zecimale
      normalized = strValue
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    } else {
      // Format US: virgulă = mii, punct = zecimale
      normalized = strValue
        .replace(/\s/g, '')
        .replace(/,/g, '');
    }
  } else if (lastCommaIndex > -1) {
    // DOAR virgulă → presupune RO (zecimale)
    normalized = strValue
      .replace(/\s/g, '')
      .replace(',', '.');
  } else {
    // DOAR punct SAU niciun separator → presupune US (zecimale)
    normalized = strValue.replace(/\s/g, '');
  }
  
  const num = parseFloat(normalized);
  
  if (!Number.isFinite(num)) return 0;
  if (num > MAX_NUMERIC_VALUE || num < MIN_NUMERIC_VALUE) return 0;
  
  return Math.round(num * 100) / 100;
}

/**
 * Parsează un fișier Excel și extrage conturile.
 * v2.0: ADAUGĂ VALIDĂRI BLOCKING pentru control totals și conturi invalide
 * 
 * VALIDĂRI BLOCKING:
 * 1. Control totals: abs(closing_debit - closing_credit) > 0.01 => REJECT
 * 2. Conturi invalide: rânduri cu cont gol/invalid => REJECT cu detalii
 * 
 * @param file - Fișierul Excel de parsat
 * @returns Promise cu rezultatul parsării (noul contract API v2.0)
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  // Inițializare structuri pentru noul contract API
  const blockingErrors: BlockingError[] = [];
  const rowErrors: RowError[] = [];
  const warnings: ValidationWarning[] = [];
  
  const emptyTotals = { opening_debit: 0, opening_credit: 0, debit_turnover: 0, credit_turnover: 0, closing_debit: 0, closing_credit: 0 };
  
  try {
    // Citește fișierul ca ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Parse workbook
    const workbook = XLSX.read(arrayBuffer, { 
      type: "array",
      cellDates: false,
      cellNF: false,
      cellFormula: false, // SECURITY: Disable formula parsing
    });
    
    // Verifică că există foi
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      blockingErrors.push({
        code: 'EXCEL_NO_SHEETS',
        message: 'Fișierul Excel nu conține foi de lucru',
      });
      
      return {
        ok: false,
        blockingErrors,
        rowErrors,
        warnings,
        metrics: { rowsRead: 0, rowsAccepted: 0, rowsRejected: 0, totals: { finDebit: 0, finCredit: 0, diff: 0 } },
        accounts: [],
        totals: emptyTotals,
        accountsCount: 0,
        error: 'Fișierul Excel nu conține foi de lucru',
        success: false,
      };
    }
    
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
    
    if (jsonData.length < 2) {
      blockingErrors.push({
        code: 'EXCEL_INSUFFICIENT_DATA',
        message: 'Fișierul nu conține date suficiente (minim 2 rânduri: header + date)',
      });
      
      return {
        ok: false,
        blockingErrors,
        rowErrors,
        warnings,
        metrics: { rowsRead: jsonData.length, rowsAccepted: 0, rowsRejected: 0, totals: { finDebit: 0, finCredit: 0, diff: 0 } },
        accounts: [],
        totals: emptyTotals,
        accountsCount: 0,
        error: 'Fișierul nu conține date suficiente',
        success: false,
      };
    }

    const accounts: ParsedAccount[] = [];
    const totals = {
      opening_debit: 0,
      opening_credit: 0,
      debit_turnover: 0,
      credit_turnover: 0,
      closing_debit: 0,
      closing_credit: 0,
    };

    let rowsRead = 0;
    let rowsRejected = 0;

    // Skip header row (index 0), procesăm de la index 1
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      rowsRead++;
      
      // Verificare rând gol complet
      if (!row || row.length === 0) {
        continue; // Skip fără eroare (rânduri goale sunt acceptate)
      }
      
      // Verificare celula cont (coloana A) goală/invalidă
      if (!row[0]) {
        rowErrors.push({
          rowIndex: i + 1, // +1 pentru număr rând Excel (1-based)
          code: 'BALANCE_ROW_ACCOUNT_MISSING',
          message: `Rândul ${i + 1}: Cont lipsă (coloana A este goală)`,
          field: 'account_code',
        });
        rowsRejected++;
        continue;
      }
      
      const accountCode = sanitizeString(row[0]);
      
      // Validare format cont (3-6 cifre)
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
      
      // Validare lungime denumire
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
        closing_debit: parseNumber(row[6]),
        closing_credit: parseNumber(row[7]),
      };

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

    // Verificare conturi valide găsite
    if (accounts.length === 0) {
      blockingErrors.push({
        code: 'BALANCE_NO_VALID_ACCOUNTS',
        message: 'Nu s-au găsit conturi valide în fișier',
        details: { rowsRead, rowsRejected, rowErrorsCount: rowErrors.length },
      });
      
      return {
        ok: false,
        blockingErrors,
        rowErrors,
        warnings,
        metrics: { rowsRead, rowsAccepted: 0, rowsRejected, totals: { finDebit: 0, finCredit: 0, diff: 0 } },
        accounts: [],
        totals,
        accountsCount: 0,
        error: 'Nu s-au găsit conturi valide în fișier',
        success: false,
      };
    }

    // Round totals
    totals.opening_debit = Math.round(totals.opening_debit * 100) / 100;
    totals.opening_credit = Math.round(totals.opening_credit * 100) / 100;
    totals.debit_turnover = Math.round(totals.debit_turnover * 100) / 100;
    totals.credit_turnover = Math.round(totals.credit_turnover * 100) / 100;
    totals.closing_debit = Math.round(totals.closing_debit * 100) / 100;
    totals.closing_credit = Math.round(totals.closing_credit * 100) / 100;

    // === VALIDARE BLOCKING #1: CONTROL TOTALS (Sold Final Debit = Sold Final Credit) ===
    const controlDiff = Math.abs(totals.closing_debit - totals.closing_credit);
    const CONTROL_THRESHOLD = 0.01; // Prag: diferență > 1 ban (rotunjiri acceptate)
    
    if (controlDiff > CONTROL_THRESHOLD) {
      blockingErrors.push({
        code: 'BALANCE_CONTROL_TOTAL_MISMATCH',
        message: `Total Sold final Debit nu este egal cu Total Sold final Credit (diferență: ${controlDiff.toFixed(2)} RON)`,
        details: {
          closing_debit: totals.closing_debit,
          closing_credit: totals.closing_credit,
          difference: controlDiff,
          threshold: CONTROL_THRESHOLD,
        },
      });
    } else if (controlDiff > 0 && controlDiff <= CONTROL_THRESHOLD) {
      // Diferență mică (rotunjiri) - acceptată dar logată
      warnings.push({
        code: 'BALANCE_CONTROL_ROUNDING_DIFF',
        message: `Diferență minimă de rotunjire detectată (${controlDiff.toFixed(2)} RON) - acceptată`,
        details: { difference: controlDiff },
      });
    }

    // === VALIDARE BLOCKING #2: CONTURI INVALIDE (rowErrors) ===
    if (rowErrors.length > 0) {
      blockingErrors.push({
        code: 'BALANCE_INVALID_ROWS_DETECTED',
        message: `${rowErrors.length} rând(uri) cu erori detectate: conturi lipsă sau invalide`,
        details: {
          invalidRowsCount: rowErrors.length,
          firstErrors: rowErrors.slice(0, 5), // Primele 5 erori pentru feedback user
        },
      });
    }

    // === DECIZIE FINALĂ: ok = true DOAR dacă NU există blockingErrors ===
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
      accounts: isValid ? accounts : [], // Returnează conturi DOAR dacă valid
      totals,
      accountsCount: accounts.length,
      error: isValid ? undefined : blockingErrors.map(e => e.message).join('; '),
      success: isValid, // Legacy flag
    };
  } catch (error) {
    console.error('[parseExcelFile] Unexpected error:', error);
    
    blockingErrors.push({
      code: 'EXCEL_PARSE_EXCEPTION',
      message: `Eroare la parsarea fișierului: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error },
    });
    
    return {
      ok: false,
      blockingErrors,
      rowErrors,
      warnings,
      metrics: { rowsRead: 0, rowsAccepted: 0, rowsRejected: 0, totals: { finDebit: 0, finCredit: 0, diff: 0 } },
      accounts: [],
      totals: emptyTotals,
      accountsCount: 0,
      error: `Eroare la parsarea fișierului: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}
