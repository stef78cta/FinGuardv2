import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { isValidAccountCode } from "../_shared/accountCodeValidation.ts";

/**
 * Edge Function: parse-balanta
 *
 * Procesează fișiere Excel cu balanțe de verificare în DOUĂ formate standard:
 *   - 8 coloane (A–H): Cont, Denumire, SI D, SI C, Rulaj D, Rulaj C, SF D, SF C
 *   - 10 coloane (A–J): + Total sume debitoare/creditoare în G/H, SF în I/J
 *
 * Logica de detectare/normalizare este IDENTICĂ cu parserul client (src/lib/excel-parser.ts).
 * Formatul este preluat din `trial_balance_imports.balance_format` (setat de client la insert)
 * și folosit ca format forțat; dacă lipsește, se detectează automat.
 *
 * SECURITY PATCHES (v1.5-v1.8) — păstrate:
 * - v1.8: verify_jwt = true (config.toml)
 * - v1.7: CORS whitelist, file size check înainte de download
 * - v1.6: XLSX resource limits
 * - v1.5: Rate limiting DB-based + process_import_accounts RPC (idempotență)
 */

// =============================================================================
// CONFIGURATION & CONSTANTS
// =============================================================================

/** Maximum file size: 10MB (verificat ÎNAINTE de download) - v1.7 */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum sheets în workbook - v1.6 */
const MAX_SHEETS = 10;

/** Maximum rows per sheet - v1.6 */
const MAX_ROWS_PER_SHEET = 20_000;

/** Maximum columns per sheet - v1.6 */
const MAX_COLUMNS = 30;

/** Timeout pentru parsare XLSX (milliseconds) - v1.6 */
const PARSE_TIMEOUT_MS = 30_000;

/** Maximum allowed string length for cell values */
const MAX_CELL_LENGTH = 500;

/** Maximum allowed numeric value */
const MAX_NUMERIC_VALUE = 999_999_999_999.99;

/** Minimum allowed numeric value */
const MIN_NUMERIC_VALUE = -999_999_999_999.99;

/** Index ultima coloană (0-based) pentru fiecare format */
const LAST_COLUMN_INDEX_8 = 7; // H
const LAST_COLUMN_INDEX_10 = 9; // J
const CONTROL_THRESHOLD = 0.01;

const COLUMN_STRUCTURE_LABEL_8 =
  "Cont, Denumire, SI Debit, SI Credit, Rulaj D, Rulaj C, SF Debit, SF Credit";
const COLUMN_STRUCTURE_LABEL_10 =
  "Cont, Denumire, SI Debit, SI Credit, Rulaj D, Rulaj C, Total sume debitoare, Total sume creditoare, SF Debit, SF Credit";

/** Maximum allowed accounts in a single file */
const MAX_ACCOUNTS = 10_000;

/** Bucket Storage canonical pentru balanțe */
const BALANCE_STORAGE_BUCKET = "balante";

type BalanceExcelFormat = "8_COLUMNS" | "10_COLUMNS";
type BalanceFormatDetection = BalanceExcelFormat | "AMBIGUOUS" | "INVALID";

const FORMAT_COLUMN_COUNT: Record<BalanceExcelFormat, number> = {
  "8_COLUMNS": 8,
  "10_COLUMNS": 10,
};

// =============================================================================
// SECURITY: CORS Configuration (v1.7 - aligned with config.toml)
// =============================================================================

const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:3000",
  "http://localhost:5173",
  "https://finguard.ro",
  "https://www.finguard.ro",
];

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

// =============================================================================
// Data Types
// =============================================================================

interface ParsedAccount {
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

/** Agregă conturi duplicate sumând valorile numerice (UNIQUE import_id + account_code). */
function aggregateDuplicateAccounts(accounts: ParsedAccount[]): ParsedAccount[] {
  const map = new Map<string, ParsedAccount>();

  for (const account of accounts) {
    const existing = map.get(account.account_code);
    if (existing) {
      map.set(account.account_code, {
        ...existing,
        opening_debit: existing.opening_debit + account.opening_debit,
        opening_credit: existing.opening_credit + account.opening_credit,
        debit_turnover: existing.debit_turnover + account.debit_turnover,
        credit_turnover: existing.credit_turnover + account.credit_turnover,
        total_sume_debitoare: existing.total_sume_debitoare + account.total_sume_debitoare,
        total_sume_creditoare: existing.total_sume_creditoare + account.total_sume_creditoare,
        closing_debit: existing.closing_debit + account.closing_debit,
        closing_credit: existing.closing_credit + account.closing_credit,
      });
    } else {
      map.set(account.account_code, { ...account });
    }
  }

  return Array.from(map.values());
}

interface ParseResult {
  success: boolean;
  detectedFormat: BalanceExcelFormat | null;
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
  errorCode?: string;
}

function isBlankCell(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  return String(value).trim() === "";
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeRowToFormat(row: unknown[] | undefined, format: BalanceExcelFormat): unknown[] {
  const count = FORMAT_COLUMN_COUNT[format];
  const normalized = [...(row ?? [])].slice(0, count);
  while (normalized.length < count) normalized.push(undefined);
  return normalized;
}

/** Cel mai mare index de coloană cu date reale, pe toate rândurile (inclusiv header). */
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

/** Detectează formatul balanței pe baza numărului de coloane populate. */
function detectBalanceFormat(maxColIndex: number): BalanceFormatDetection {
  if (maxColIndex < 0) return "INVALID";
  if (maxColIndex > LAST_COLUMN_INDEX_10) return "INVALID";
  if (maxColIndex <= LAST_COLUMN_INDEX_8) return "8_COLUMNS";
  if (maxColIndex === LAST_COLUMN_INDEX_10) return "10_COLUMNS";
  return "AMBIGUOUS"; // exact 9 coloane (până la I)
}

function applyBalanceControlCheck(
  debit: number,
  credit: number,
  label: string,
): string | null {
  const diff = Math.abs(debit - credit);
  if (diff > CONTROL_THRESHOLD) {
    return `${label} (diferență: ${diff.toFixed(2)} RON)`;
  }
  return null;
}

// =============================================================================
// SECURITY: Input Validation & Sanitization
// =============================================================================

function sanitizeString(value: unknown): string {
  if (value === null || value === undefined) return "";

  let strValue = String(value);

  if (strValue.length > MAX_CELL_LENGTH) {
    strValue = strValue.substring(0, MAX_CELL_LENGTH);
  }

  strValue = strValue.replace(/^[=+\-@\t\r]+/, "");
  // eslint-disable-next-line no-control-regex
  strValue = strValue.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return strValue.trim();
}

/**
 * Parses and validates a numeric value from Excel cells (format RO și US).
 */
function parseNumber(value: unknown, rowContext?: number): number {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    if (value > MAX_NUMERIC_VALUE || value < MIN_NUMERIC_VALUE) return 0;
    return Math.round(value * 100) / 100;
  }

  const strValue = String(value).trim();

  if (strValue.length > 50) return 0;
  if (!/^-?[\d\s.,]+$/.test(strValue)) return 0;

  const lastDotIndex = strValue.lastIndexOf(".");
  const lastCommaIndex = strValue.lastIndexOf(",");

  let normalized: string;

  if (lastDotIndex > -1 && lastCommaIndex > -1) {
    if (lastCommaIndex > lastDotIndex) {
      normalized = strValue.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
      if (strValue.match(/\d{1,3},\d{3}/) && rowContext) {
        console.warn(`[Row ${rowContext}] Possible US format treated as RO: "${strValue}" → ${normalized}`);
      }
    } else {
      normalized = strValue.replace(/\s/g, "").replace(/,/g, "");
    }
  } else if (lastCommaIndex > -1) {
    normalized = strValue.replace(/\s/g, "").replace(",", ".");
  } else {
    normalized = strValue.replace(/\s/g, "");
  }

  const num = parseFloat(normalized);

  if (!Number.isFinite(num)) return 0;
  if (num > MAX_NUMERIC_VALUE || num < MIN_NUMERIC_VALUE) return 0;

  return Math.round(num * 100) / 100;
}

/**
 * Construiește un cont canonic dintr-un rând normalizat, în funcție de format.
 * - 10 coloane: G/H → total_sume, I/J → sold final.
 * - 8 coloane: G/H → sold final; total_sume calculate intern (SI + rulaj).
 */
function buildAccount(row: unknown[], format: BalanceExcelFormat, rowContext: number): ParsedAccount {
  const account_code = sanitizeString(row[0]);
  const account_name = sanitizeString(row[1]);
  const opening_debit = parseNumber(row[2], rowContext);
  const opening_credit = parseNumber(row[3], rowContext);
  const debit_turnover = parseNumber(row[4], rowContext);
  const credit_turnover = parseNumber(row[5], rowContext);

  if (format === "10_COLUMNS") {
    return {
      account_code,
      account_name,
      opening_debit,
      opening_credit,
      debit_turnover,
      credit_turnover,
      total_sume_debitoare: parseNumber(row[6], rowContext),
      total_sume_creditoare: parseNumber(row[7], rowContext),
      closing_debit: parseNumber(row[8], rowContext),
      closing_credit: parseNumber(row[9], rowContext),
    };
  }

  const closing_debit = parseNumber(row[6], rowContext);
  const closing_credit = parseNumber(row[7], rowContext);

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

function emptyTotals() {
  return {
    opening_debit: 0,
    opening_credit: 0,
    debit_turnover: 0,
    credit_turnover: 0,
    closing_debit: 0,
    closing_credit: 0,
  };
}

/**
 * Parses an Excel file with strict resource limits and validation (dual-format).
 *
 * @param arrayBuffer - fișierul Excel
 * @param forcedFormat - format preluat din DB (setat de client); dacă lipsește → auto-detect
 */
function parseExcelFile(arrayBuffer: ArrayBuffer, forcedFormat?: BalanceExcelFormat | null): ParseResult {
  const startTime = Date.now();

  try {
    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellDates: false,
      cellNF: false,
      cellFormula: false,
    });

    if (workbook.SheetNames.length > MAX_SHEETS) {
      throw new Error(`Prea multe foi în fișier (max ${MAX_SHEETS})`);
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        success: false,
        detectedFormat: null,
        accounts: [],
        totals: emptyTotals(),
        accountsCount: 0,
        error: "Fișierul Excel nu conține foi de lucru",
        errorCode: "EXCEL_NO_SHEETS",
      };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

    if (range.e.r > MAX_ROWS_PER_SHEET) {
      throw new Error(`Prea multe rânduri în foi (max ${MAX_ROWS_PER_SHEET})`);
    }
    if (range.e.c > MAX_COLUMNS) {
      throw new Error(`Prea multe coloane în foi (max ${MAX_COLUMNS})`);
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

    if (jsonData.length < 2) {
      return {
        success: false,
        detectedFormat: null,
        accounts: [],
        totals: emptyTotals(),
        accountsCount: 0,
        error: "Fișierul nu conține date suficiente",
        errorCode: "EXCEL_INSUFFICIENT_DATA",
      };
    }

    const maxColIndex = getDataMaxColumnIndex(jsonData);
    const detection = detectBalanceFormat(maxColIndex);

    // Rezolvă formatul: forțat (din DB) validat față de structură, altfel auto-detect.
    let format: BalanceExcelFormat;

    if (maxColIndex > LAST_COLUMN_INDEX_10) {
      return {
        success: false,
        detectedFormat: null,
        accounts: [],
        totals: emptyTotals(),
        accountsCount: 0,
        error: "Fișierul conține date peste coloana J. Sunt acceptate doar formatele standard cu 8 coloane sau 10 coloane.",
        errorCode: "EXCEL_INVALID_COLUMN_COUNT",
      };
    }

    if (forcedFormat) {
      if (forcedFormat === "8_COLUMNS" && maxColIndex > LAST_COLUMN_INDEX_8) {
        return {
          success: false,
          detectedFormat: null,
          accounts: [],
          totals: emptyTotals(),
          accountsCount: 0,
          error: "Format 8 coloane forțat, dar fișierul conține date dincolo de coloana H.",
          errorCode: "EXCEL_FORCED_FORMAT_MISMATCH",
        };
      }
      if (forcedFormat === "10_COLUMNS" && maxColIndex < LAST_COLUMN_INDEX_10) {
        return {
          success: false,
          detectedFormat: null,
          accounts: [],
          totals: emptyTotals(),
          accountsCount: 0,
          error: "Format 10 coloane forțat, dar fișierul nu conține coloanele I/J.",
          errorCode: "EXCEL_FORCED_FORMAT_MISMATCH",
        };
      }
      format = forcedFormat;
    } else if (detection === "AMBIGUOUS") {
      return {
        success: false,
        detectedFormat: null,
        accounts: [],
        totals: emptyTotals(),
        accountsCount: 0,
        error: "Nu am putut determina automat formatul balanței (structură ambiguă cu 9 coloane).",
        errorCode: "EXCEL_AMBIGUOUS_FORMAT",
      };
    } else if (detection === "INVALID") {
      return {
        success: false,
        detectedFormat: null,
        accounts: [],
        totals: emptyTotals(),
        accountsCount: 0,
        error: `Structura fișierului nu corespunde nici formatului de 8 coloane (${COLUMN_STRUCTURE_LABEL_8}), nici formatului de 10 coloane (${COLUMN_STRUCTURE_LABEL_10}).`,
        errorCode: "EXCEL_INVALID_COLUMN_COUNT",
      };
    } else {
      format = detection;
    }

    const accounts: ParsedAccount[] = [];
    const totals = emptyTotals();
    const rowMismatchErrors: string[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      if (i % 1000 === 0 && Date.now() - startTime > PARSE_TIMEOUT_MS) {
        console.warn(`Parse timeout exceeded at row ${i}, truncating`);
        break;
      }

      const row = normalizeRowToFormat(jsonData[i], format);

      if (row.every(isBlankCell)) continue;
      if (isBlankCell(row[0])) continue;

      const accountCode = sanitizeString(row[0]);
      if (!isValidAccountCode(accountCode)) continue;

      const accountName = sanitizeString(row[1]);
      if (accountName.length > 200) continue;

      const account = buildAccount(row, format, i);

      // Validare specifică 10 coloane: (SF D − SF C) = (Total Sume D − Total Sume C).
      // La 8 coloane, total_sume sunt derivate din SI + rulaj → verificarea nu se aplică.
      if (format === "10_COLUMNS") {
        const netFromTotals = round2(account.total_sume_debitoare - account.total_sume_creditoare);
        const netFromClosing = round2(account.closing_debit - account.closing_credit);
        if (Math.abs(netFromTotals - netFromClosing) > CONTROL_THRESHOLD) {
          rowMismatchErrors.push(
            `Rândul ${i + 1}, cont ${accountCode}: sold final net (${netFromClosing}) ≠ Total Sume Debit − Total Sume Credit (${netFromTotals})`,
          );
        }
      }

      if (accountCode.startsWith("6") &&
        (Math.abs(account.closing_debit) > CONTROL_THRESHOLD || Math.abs(account.closing_credit) > CONTROL_THRESHOLD)) {
        rowMismatchErrors.push(`Rândul ${i + 1}, cont ${accountCode}: clasa 6 cu sold final nenul`);
      }

      if (accountCode.startsWith("7") &&
        (Math.abs(account.closing_debit) > CONTROL_THRESHOLD || Math.abs(account.closing_credit) > CONTROL_THRESHOLD)) {
        rowMismatchErrors.push(`Rândul ${i + 1}, cont ${accountCode}: clasa 7 cu sold final nenul`);
      }

      accounts.push(account);

      totals.opening_debit += account.opening_debit;
      totals.opening_credit += account.opening_credit;
      totals.debit_turnover += account.debit_turnover;
      totals.credit_turnover += account.credit_turnover;
      totals.closing_debit += account.closing_debit;
      totals.closing_credit += account.closing_credit;

      if (accounts.length >= MAX_ACCOUNTS) {
        console.warn(`Max accounts limit (${MAX_ACCOUNTS}) reached, truncating`);
        break;
      }
    }

    if (rowMismatchErrors.length > 0) {
      return {
        success: false,
        detectedFormat: format,
        accounts: [],
        totals,
        accountsCount: 0,
        error: `${rowMismatchErrors.length} rând(uri) cu neconcordanțe contabile. ${rowMismatchErrors.slice(0, 3).join("; ")}`,
        errorCode: "BALANCE_CLOSING_MISMATCH_DETECTED",
      };
    }

    if (accounts.length === 0) {
      return {
        success: false,
        detectedFormat: format,
        accounts: [],
        totals,
        accountsCount: 0,
        error: "Nu s-au găsit conturi valide în fișier",
        errorCode: "BALANCE_NO_VALID_ACCOUNTS",
      };
    }

    totals.opening_debit = round2(totals.opening_debit);
    totals.opening_credit = round2(totals.opening_credit);
    totals.debit_turnover = round2(totals.debit_turnover);
    totals.credit_turnover = round2(totals.credit_turnover);
    totals.closing_debit = round2(totals.closing_debit);
    totals.closing_credit = round2(totals.closing_credit);

    const controlErrors = [
      applyBalanceControlCheck(totals.opening_debit, totals.opening_credit, "Total Sold inițial Debit ≠ Credit"),
      applyBalanceControlCheck(totals.debit_turnover, totals.credit_turnover, "Total Rulaj Debit ≠ Credit"),
      applyBalanceControlCheck(totals.closing_debit, totals.closing_credit, "Total Sold final Debit ≠ Credit"),
    ].filter(Boolean);

    if (controlErrors.length > 0) {
      return {
        success: false,
        detectedFormat: format,
        accounts: [],
        totals,
        accountsCount: 0,
        error: controlErrors.join("; "),
        errorCode: "BALANCE_CONTROL_MISMATCH",
      };
    }

    return {
      success: true,
      detectedFormat: format,
      accounts,
      totals,
      accountsCount: accounts.length,
    };
  } catch (error) {
    console.error("Error parsing Excel:", error);
    return {
      success: false,
      detectedFormat: null,
      accounts: [],
      totals: emptyTotals(),
      accountsCount: 0,
      error: `Eroare la parsarea fișierului: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

const handler = async (req: Request): Promise<Response> => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: rateLimitAllowed, error: rateLimitError } = await supabaseAdmin.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_resource_type: 'import',
      p_max_requests: 10,
      p_window_seconds: 3600,
    });

    if (rateLimitError || !rateLimitAllowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later.", retryAfter: 3600 }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" },
        }
      );
    }

    const { import_id } = await req.json();

    if (!import_id) {
      return new Response(
        JSON.stringify({ error: "Missing import_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // v3.0: preia balance_format (setat de client la insert) pentru aliniere client/server.
    const { data: importRecord, error: importError } = await supabaseAdmin
      .from("trial_balance_imports")
      .select("source_file_url, file_size_bytes, company_id, balance_format")
      .eq("id", import_id)
      .single();

    if (importError || !importRecord) {
      return new Response(
        JSON.stringify({ error: "Import not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (importRecord.file_size_bytes > MAX_FILE_SIZE_BYTES) {
      await supabaseAdmin
        .from("trial_balance_imports")
        .update({
          status: "error",
          error_message: `Fișier prea mare (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB)`,
          internal_error_detail: `file_size_bytes: ${importRecord.file_size_bytes}`,
          internal_error_code: "FILE_TOO_LARGE"
        })
        .eq("id", import_id);

      return new Response(
        JSON.stringify({ error: `File too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB)` }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(BALANCE_STORAGE_BUCKET)
      .download(importRecord.source_file_url);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);

      await supabaseAdmin
        .from("trial_balance_imports")
        .update({
          status: "error",
          error_message: "Nu s-a putut descărca fișierul",
          internal_error_detail: downloadError?.message,
          internal_error_code: "DOWNLOAD_FAILED"
        })
        .eq("id", import_id);

      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (fileData.size > MAX_FILE_SIZE_BYTES) {
      console.warn(`File size mismatch: DB=${importRecord.file_size_bytes}, actual=${fileData.size}`);

      await supabaseAdmin
        .from("trial_balance_imports")
        .update({
          status: "error",
          error_message: "Fișier prea mare după download",
          internal_error_detail: `actual_size: ${fileData.size}`,
          internal_error_code: "FILE_SIZE_MISMATCH"
        })
        .eq("id", import_id);

      return new Response(
        JSON.stringify({ error: "File size validation failed" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const forcedFormat = (importRecord.balance_format as BalanceExcelFormat | null) ?? undefined;
    const parseResult = parseExcelFile(arrayBuffer, forcedFormat);

    if (!parseResult.success) {
      await supabaseAdmin
        .from("trial_balance_imports")
        .update({
          status: "error",
          error_message: parseResult.error,
          internal_error_detail: parseResult.error,
          internal_error_code: parseResult.errorCode || "PARSE_FAILED"
        })
        .eq("id", import_id);

      return new Response(
        JSON.stringify({ error: parseResult.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: publicUser, error: publicUserError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (publicUserError || !publicUser) {
      await supabaseAdmin
        .from("trial_balance_imports")
        .update({
          status: "error",
          error_message: "Utilizator negăsit în baza de date",
          internal_error_detail: publicUserError?.message,
          internal_error_code: "USER_NOT_FOUND",
        })
        .eq("id", import_id);

      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accountsForInsert = aggregateDuplicateAccounts(parseResult.accounts);
    const accountsPayload = accountsForInsert.map((acc) => ({
      code: acc.account_code,
      name: acc.account_name,
      opening_debit: acc.opening_debit,
      opening_credit: acc.opening_credit,
      debit_turnover: acc.debit_turnover,
      credit_turnover: acc.credit_turnover,
      total_sume_debitoare: acc.total_sume_debitoare,
      total_sume_creditoare: acc.total_sume_creditoare,
      closing_debit: acc.closing_debit,
      closing_credit: acc.closing_credit,
    }));

    const { data: processSuccess, error: processError } = await supabaseAdmin.rpc(
      "process_import_accounts",
      {
        p_import_id: import_id,
        p_accounts: accountsPayload,
        p_requester_user_id: publicUser.id,
        p_balance_format: parseResult.detectedFormat,
      }
    );

    if (processError || !processSuccess) {
      console.error("Process error:", processError);

      return new Response(
        JSON.stringify({ error: "Failed to process accounts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        accountsCount: parseResult.accountsCount,
        detectedFormat: parseResult.detectedFormat,
        totals: parseResult.totals,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Handler error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
