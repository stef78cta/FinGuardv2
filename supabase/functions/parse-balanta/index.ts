import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

// =============================================================================
// SECURITY: CORS Configuration
// =============================================================================
// Allowed origins - restrict to your application domains
const ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:3000",
  "https://finguard.ro",
  "https://www.finguard.ro",
  // Add production domains here
];

/**
 * Generates CORS headers with origin validation.
 * Only allows requests from whitelisted origins.
 * 
 * @param requestOrigin - The origin header from the incoming request
 * @returns CORS headers object with appropriate Access-Control-Allow-Origin
 */
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Check if the request origin is in our allowed list
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) 
    ? requestOrigin 
    : ALLOWED_ORIGINS[0]; // Default to first allowed origin

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
  };
}

// =============================================================================
// SECURITY: Rate Limiting
// =============================================================================
// Simple in-memory rate limiter (per IP/user)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

/**
 * Checks if a request should be rate limited.
 * Uses a sliding window approach with in-memory storage.
 * 
 * @param identifier - Unique identifier (user ID or IP address)
 * @returns Object with allowed status and remaining requests
 */
function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!record || now > record.resetTime) {
    // New window or expired
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count, resetIn: record.resetTime - now };
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
/** Maximum allowed string length for cell values to prevent memory attacks */
const MAX_CELL_LENGTH = 500;
/** Maximum allowed numeric value to prevent overflow */
const MAX_NUMERIC_VALUE = 999_999_999_999.99;
/** Minimum allowed numeric value */
const MIN_NUMERIC_VALUE = -999_999_999_999.99;
/** Maximum allowed accounts in a single file */
const MAX_ACCOUNTS = 10_000;

/**
 * Sanitizes a string value from Excel cells.
 * Removes potentially dangerous characters and limits length.
 * 
 * @param value - Raw cell value from Excel
 * @returns Sanitized string
 */
function sanitizeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  
  let strValue = String(value);
  
  // Limit length to prevent memory attacks
  if (strValue.length > MAX_CELL_LENGTH) {
    strValue = strValue.substring(0, MAX_CELL_LENGTH);
  }
  
  // Remove potentially dangerous characters (formula injection prevention)
  // Excel formulas start with =, +, -, @, or tab/carriage return
  strValue = strValue.replace(/^[=+\-@\t\r]+/, "");
  
  // Remove control characters except common whitespace
  // eslint-disable-next-line no-control-regex
  strValue = strValue.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  
  return strValue.trim();
}

/**
 * Parses and validates a numeric value from Excel cells.
 * Handles Romanian and international number formats with strict validation.
 * 
 * @param value - Raw cell value from Excel
 * @returns Validated numeric value, or 0 if invalid
 */
function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  
  // Direct number - validate range
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    if (value > MAX_NUMERIC_VALUE || value < MIN_NUMERIC_VALUE) return 0;
    return Math.round(value * 100) / 100; // Round to 2 decimal places
  }
  
  // Handle string values with Romanian or international format
  const strValue = String(value).trim();
  
  // Length check to prevent ReDoS attacks
  if (strValue.length > 50) return 0;
  
  // Only allow digits, spaces, dots, commas, and minus sign
  if (!/^-?[\d\s.,]+$/.test(strValue)) return 0;
  
  // Remove thousands separators and convert comma to period
  const normalized = strValue
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  
  const num = parseFloat(normalized);
  
  // Validate the result
  if (!Number.isFinite(num)) return 0;
  if (num > MAX_NUMERIC_VALUE || num < MIN_NUMERIC_VALUE) return 0;
  
  return Math.round(num * 100) / 100; // Round to 2 decimal places
}

/**
 * Parses an Excel file containing trial balance data.
 * Implements strict validation and sanitization to prevent injection attacks.
 * 
 * @param arrayBuffer - The Excel file as an ArrayBuffer
 * @returns ParseResult with accounts, totals, and any errors
 */
function parseExcelFile(arrayBuffer: ArrayBuffer): ParseResult {
  try {
    // Parse workbook with security options
    const workbook = XLSX.read(arrayBuffer, { 
      type: "array",
      cellDates: false, // Don't parse dates to avoid issues
      cellNF: false, // Don't parse number formats
      cellFormula: false, // SECURITY: Disable formula parsing
    });
    
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
    
    // Convert to JSON, skip header row
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
      
      // Skip empty rows
      if (!row || row.length === 0 || !row[0]) continue;
      
      // SECURITY: Sanitize account code and validate format
      const accountCode = sanitizeString(row[0]);
      
      // Validate account code (3-6 digits only)
      if (!/^\d{3,6}$/.test(accountCode)) continue;
      
      // SECURITY: Sanitize account name
      const accountName = sanitizeString(row[1]);
      
      // Skip if account name looks suspicious (potential injection)
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
      
      // SECURITY: Check max accounts limit to prevent DoS
      if (accounts.length >= MAX_ACCOUNTS) {
        console.warn(`Max accounts limit (${MAX_ACCOUNTS}) reached, truncating`);
        break;
      }
      
      // Accumulate totals
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

    // Round totals to 2 decimal places
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

const handler = async (req: Request): Promise<Response> => {
  // Get origin for CORS headers
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Only allow POST requests
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

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // SECURITY: Rate limiting check (per user)
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          } 
        }
      );
    }

    // Get request body
    const { import_id, file_path } = await req.json();

    if (!import_id || !file_path) {
      return new Response(
        JSON.stringify({ error: "Missing import_id or file_path" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("balante")
      .download(file_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      
      // Update import status to error
      await supabase
        .from("trial_balance_imports")
        .update({ 
          status: "error", 
          error_message: "Nu s-a putut descărca fișierul" 
        })
        .eq("id", import_id);

      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse Excel file
    const arrayBuffer = await fileData.arrayBuffer();
    const parseResult = parseExcelFile(arrayBuffer);

    if (!parseResult.success) {
      // Update import status to error
      await supabase
        .from("trial_balance_imports")
        .update({ 
          status: "error", 
          error_message: parseResult.error,
          processed_at: new Date().toISOString()
        })
        .eq("id", import_id);

      return new Response(
        JSON.stringify({ error: parseResult.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert accounts into database
    const accountsToInsert = parseResult.accounts.map(acc => ({
      import_id,
      ...acc,
    }));

    const { error: insertError } = await supabase
      .from("trial_balance_accounts")
      .insert(accountsToInsert);

    if (insertError) {
      console.error("Insert error:", insertError);
      
      await supabase
        .from("trial_balance_imports")
        .update({ 
          status: "error", 
          error_message: "Eroare la salvarea conturilor în baza de date" 
        })
        .eq("id", import_id);

      return new Response(
        JSON.stringify({ error: "Failed to save accounts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update import status to completed
    await supabase
      .from("trial_balance_imports")
      .update({ 
        status: "completed",
        processed_at: new Date().toISOString()
      })
      .eq("id", import_id);

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
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
