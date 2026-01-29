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
 * Rezultatul parsării Excel
 */
export interface ParseResult {
  success: boolean;
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
 * 
 * @param file - Fișierul Excel de parsat
 * @returns Promise cu rezultatul parsării
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
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
      return {
        success: false,
        accounts: [],
        totals: { opening_debit: 0, opening_credit: 0, debit_turnover: 0, credit_turnover: 0, closing_debit: 0, closing_credit: 0 },
        accountsCount: 0,
        error: "Fișierul Excel nu conține foi de lucru",
      };
    }
    
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
    
    if (jsonData.length < 2) {
      return {
        success: false,
        accounts: [],
        totals: { opening_debit: 0, opening_credit: 0, debit_turnover: 0, credit_turnover: 0, closing_debit: 0, closing_credit: 0 },
        accountsCount: 0,
        error: "Fișierul nu conține date suficiente",
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

    // Skip header row (index 0)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      if (!row || row.length === 0 || !row[0]) continue;
      
      const accountCode = sanitizeString(row[0]);
      
      // Validate account code (3-6 digits)
      if (!/^\d{3,6}$/.test(accountCode)) continue;
      
      const accountName = sanitizeString(row[1]);
      
      if (accountName.length > 200) continue;
      
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
        console.warn(`Max accounts limit (${MAX_ACCOUNTS}) reached, truncating`);
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
      return {
        success: false,
        accounts: [],
        totals,
        accountsCount: 0,
        error: "Nu s-au găsit conturi valide în fișier",
      };
    }

    // Round totals
    totals.opening_debit = Math.round(totals.opening_debit * 100) / 100;
    totals.opening_credit = Math.round(totals.opening_credit * 100) / 100;
    totals.debit_turnover = Math.round(totals.debit_turnover * 100) / 100;
    totals.credit_turnover = Math.round(totals.credit_turnover * 100) / 100;
    totals.closing_debit = Math.round(totals.closing_debit * 100) / 100;
    totals.closing_credit = Math.round(totals.closing_credit * 100) / 100;

    return {
      success: true,
      accounts,
      totals,
      accountsCount: accounts.length,
    };
  } catch (error) {
    console.error("Error parsing Excel:", error);
    return {
      success: false,
      accounts: [],
      totals: { opening_debit: 0, opening_credit: 0, debit_turnover: 0, credit_turnover: 0, closing_debit: 0, closing_credit: 0 },
      accountsCount: 0,
      error: `Eroare la parsarea fișierului: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
