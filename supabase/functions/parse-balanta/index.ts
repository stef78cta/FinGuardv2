import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

/**
 * Edge Function: parse-balanta
 * 
 * Procesează fișiere Excel cu balanțe de verificare
 * 
 * SECURITY PATCHES (v1.5-v1.8):
 * - v1.8: verify_jwt = true (config.toml)
 * - v1.7: CORS whitelist (nu wildcard)
 * - v1.7: File size check ÎNAINTE de download
 * - v1.6: XLSX resource limits (sheets, rows, columns, timeout)
 * - v1.5: Rate limiting DB-based (nu in-memory)
 * - v1.5: process_import_accounts RPC (idempotență)
 * - v1.4: Handler explicit OPTIONS
 * - v1.3: Retry-After header la 429
 * - v1.1: parseNumber fix + comentarii corecte
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

/** Maximum allowed accounts in a single file */
const MAX_ACCOUNTS = 10_000;

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

/**
 * Generates CORS headers with origin validation.
 * Only allows requests from whitelisted origins.
 * 
 * @param requestOrigin - The origin header from the incoming request
 * @returns CORS headers object
 */
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
  closing_debit: number;
  closing_credit: number;
}

interface ParseResult {
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

// =============================================================================
// SECURITY: Input Validation & Sanitization
// =============================================================================

/**
 * Sanitizes a string value from Excel cells.
 * Removes potentially dangerous characters and limits length.
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
  // eslint-disable-next-line no-control-regex
  strValue = strValue.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  
  return strValue.trim();
}

/**
 * Parses and validates a numeric value from Excel cells.
 * 
 * v1.1: CORECTARE parseNumber - suportă AMBELE formate:
 * - Format RO: 1.234,56 (punct = mii, virgulă = zecimale)
 * - Format US: 1,234.56 (virgulă = mii, punct = zecimale)
 * 
 * STRATEGIE:
 * - Dacă string conține AMBELE (punct ȘI virgulă):
 *   → Ultimul caracter determină formatul
 *   → Exemplu: "1.234,56" → RO (virgulă e ultima)
 *   → Exemplu: "1,234.56" → US (punct e ultimul)
 * - Dacă string conține DOAR virgulă: presupune RO (zecimale)
 * - Dacă string conține DOAR punct: presupune US (zecimale)
 * 
 * v1.3: LOGGING pentru cazuri ambigue (detectare erori formatare)
 * 
 * @param value - Raw cell value from Excel
 * @param rowContext - Optional context for logging (row number)
 * @returns Validated numeric value, or 0 if invalid
 */
function parseNumber(value: unknown, rowContext?: number): number {
  if (value === null || value === undefined || value === "") return 0;
  
  // Direct number - validate range
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    if (value > MAX_NUMERIC_VALUE || value < MIN_NUMERIC_VALUE) return 0;
    return Math.round(value * 100) / 100;
  }
  
  // Handle string values
  const strValue = String(value).trim();
  
  // Length check to prevent ReDoS
  if (strValue.length > 50) return 0;
  
  // Only allow digits, spaces, dots, commas, and minus
  if (!/^-?[\d\s.,]+$/.test(strValue)) return 0;
  
  // Detect format based on positions of dot and comma
  const lastDotIndex = strValue.lastIndexOf('.');
  const lastCommaIndex = strValue.lastIndexOf(',');
  
  let normalized: string;
  
  if (lastDotIndex > -1 && lastCommaIndex > -1) {
    // AMBELE prezente → ultimul determină formatul
    if (lastCommaIndex > lastDotIndex) {
      // Format RO: punct = mii, virgulă = zecimale
      // Exemplu: "1.234,56" → 1234.56
      normalized = strValue
        .replace(/\s/g, '')  // Remove spaces
        .replace(/\./g, '')  // Remove dots (thousands)
        .replace(',', '.');  // Comma to dot (decimals)
      
      // v1.3: Log pentru detectare pattern suspect
      if (strValue.match(/\d{1,3},\d{3}/) && rowContext) {
        console.warn(`[Row ${rowContext}] Possible US format treated as RO: "${strValue}" → ${normalized}`);
      }
    } else {
      // Format US: virgulă = mii, punct = zecimale
      // Exemplu: "1,234.56" → 1234.56
      normalized = strValue
        .replace(/\s/g, '')  // Remove spaces
        .replace(/,/g, '');  // Remove commas (thousands)
    }
  } else if (lastCommaIndex > -1) {
    // DOAR virgulă → presupune RO (zecimale)
    // Exemplu: "1234,56" → 1234.56
    normalized = strValue
      .replace(/\s/g, '')
      .replace(',', '.');
  } else {
    // DOAR punct SAU niciun separator → presupune US (zecimale)
    // Exemplu: "1234.56" → 1234.56
    normalized = strValue.replace(/\s/g, '');
  }
  
  const num = parseFloat(normalized);
  
  // Validate the result
  if (!Number.isFinite(num)) return 0;
  if (num > MAX_NUMERIC_VALUE || num < MIN_NUMERIC_VALUE) return 0;
  
  return Math.round(num * 100) / 100;
}

/**
 * Parses an Excel file with strict resource limits and validation.
 * 
 * v1.6: RESOURCE EXHAUSTION PROTECTION
 * - MAX_SHEETS: 10 foi
 * - MAX_ROWS_PER_SHEET: 20,000 rânduri
 * - MAX_COLUMNS: 30 coloane
 * - PARSE_TIMEOUT_MS: 30 secunde (incomplet, Date.now() check în buclă)
 * 
 * v1.1: parseNumber cu logging pentru debugging
 * 
 * @param arrayBuffer - The Excel file as an ArrayBuffer
 * @returns ParseResult with accounts, totals, and any errors
 */
function parseExcelFile(arrayBuffer: ArrayBuffer): ParseResult {
  const startTime = Date.now();
  
  try {
    // v1.6: Verificare timeout (pre-parse)
    if (Date.now() - startTime > PARSE_TIMEOUT_MS) {
      throw new Error('Parse timeout exceeded (pre-parse check)');
    }
    
    // Parse workbook with security options
    const workbook = XLSX.read(arrayBuffer, { 
      type: "array",
      cellDates: false,
      cellNF: false,
      cellFormula: false, // SECURITY: Disable formula parsing
    });
    
    // v1.6: Verificare număr foi
    if (workbook.SheetNames.length > MAX_SHEETS) {
      throw new Error(`Prea multe foi în fișier (max ${MAX_SHEETS})`);
    }
    
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
    
    // v1.6: Verificare dimensiuni foi (post-parse guard)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    if (range.e.r > MAX_ROWS_PER_SHEET) {
      throw new Error(`Prea multe rânduri în foi (max ${MAX_ROWS_PER_SHEET})`);
    }
    
    if (range.e.c > MAX_COLUMNS) {
      throw new Error(`Prea multe coloane în foi (max ${MAX_COLUMNS})`);
    }
    
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
      // v1.6: Verificare timeout în buclă (incomplet, dar util)
      if (i % 1000 === 0 && Date.now() - startTime > PARSE_TIMEOUT_MS) {
        console.warn(`Parse timeout exceeded at row ${i}, truncating`);
        break;
      }
      
      const row = jsonData[i];
      
      if (!row || row.length === 0 || !row[0]) continue;
      
      const accountCode = sanitizeString(row[0]);
      
      // Validate account code (3-6 digits)
      if (!/^\d{3,6}$/.test(accountCode)) continue;
      
      const accountName = sanitizeString(row[1]);
      
      if (accountName.length > 200) continue;
      
      // v1.1: parseNumber cu rowContext pentru logging
      const account: ParsedAccount = {
        account_code: accountCode,
        account_name: accountName,
        opening_debit: parseNumber(row[2], i),
        opening_credit: parseNumber(row[3], i),
        debit_turnover: parseNumber(row[4], i),
        credit_turnover: parseNumber(row[5], i),
        closing_debit: parseNumber(row[6], i),
        closing_credit: parseNumber(row[7], i),
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

// =============================================================================
// MAIN HANDLER
// =============================================================================

const handler = async (req: Request): Promise<Response> => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);
  
  // v1.4: Handler explicit OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
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

    // Create Supabase client with SERVICE_ROLE (pentru RPC privilegiate)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user token (folosim getUser pentru validare JWT)
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // v1.5: SECURITY - Rate limiting DB-based (nu in-memory)
    const { data: rateLimitAllowed, error: rateLimitError } = await supabaseAdmin.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_resource_type: 'import',
      p_max_requests: 10,
      p_window_seconds: 3600, // 1 hour window
    });
    
    // v1.4: Fail-closed strategy (eroare DB → refuz)
    if (rateLimitError || !rateLimitAllowed) {
      // v1.3: Retry-After header (seconds until reset)
      return new Response(
        JSON.stringify({ 
          error: "Too many requests. Please try again later.",
          retryAfter: 3600 // v1.3: seconds
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": "3600", // v1.3: Header standard
          } 
        }
      );
    }

    // Get request body
    const { import_id } = await req.json();

    if (!import_id) {
      return new Response(
        JSON.stringify({ error: "Missing import_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // v1.7: Verifică file_size_bytes ÎNAINTE de download
    const { data: importRecord, error: importError } = await supabaseAdmin
      .from("trial_balance_imports")
      .select("file_name, file_size_bytes, company_id")
      .eq("id", import_id)
      .single();

    if (importError || !importRecord) {
      return new Response(
        JSON.stringify({ error: "Import not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // v1.7: CRITICĂ - Verificare size ÎNAINTE de download
    if (importRecord.file_size_bytes > MAX_FILE_SIZE_BYTES) {
      // Update import cu eroare
      await supabaseAdmin
        .from("trial_balance_imports")
        .update({ 
          status: "failed", 
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

    // Acum e safe să download (size e validat)
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("trial-balances")
      .download(importRecord.file_name);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      
      await supabaseAdmin
        .from("trial_balance_imports")
        .update({ 
          status: "failed", 
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

    // v1.6: Verificare secundară post-download (defense-in-depth)
    if (fileData.size > MAX_FILE_SIZE_BYTES) {
      console.warn(`File size mismatch: DB=${importRecord.file_size_bytes}, actual=${fileData.size}`);
      
      await supabaseAdmin
        .from("trial_balance_imports")
        .update({ 
          status: "failed", 
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

    // Parse Excel file (cu resource limits v1.6)
    const arrayBuffer = await fileData.arrayBuffer();
    const parseResult = parseExcelFile(arrayBuffer);

    if (!parseResult.success) {
      await supabaseAdmin
        .from("trial_balance_imports")
        .update({ 
          status: "failed", 
          error_message: parseResult.error,
          internal_error_detail: parseResult.error,
          internal_error_code: "PARSE_FAILED"
        })
        .eq("id", import_id);

      return new Response(
        JSON.stringify({ error: parseResult.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // v1.5: SECURITY - process_import_accounts RPC (idempotență + ownership)
    // v1.9: FIX MAPPING - Trimite TOATE coloanele (nu doar opening)
    const accountsJSON = JSON.stringify(parseResult.accounts.map(acc => ({
      code: acc.account_code,
      name: acc.account_name,
      opening_debit: acc.opening_debit,
      opening_credit: acc.opening_credit,
      debit_turnover: acc.debit_turnover,
      credit_turnover: acc.credit_turnover,
      closing_debit: acc.closing_debit,
      closing_credit: acc.closing_credit
    })));

    const { data: processSuccess, error: processError } = await supabaseAdmin.rpc('process_import_accounts', {
      p_import_id: import_id,
      p_accounts: accountsJSON,
      p_requester_user_id: user.id // v1.5: defense-in-depth ownership
    });

    if (processError || !processSuccess) {
      // Error deja salvat în DB de funcție
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
