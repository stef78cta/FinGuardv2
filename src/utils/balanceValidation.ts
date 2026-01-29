/**
 * Balance Validation Utilities
 * 
 * v1.3: Implementare completă a celor 16 validări contabile
 * conform standardelor OMFP 1802/2014 și best practices contabilitate RO
 * 
 * CRITICE (8 - Blocante):
 * 1. Listă nu e goală
 * 2. Echilibru solduri inițiale
 * 3. Echilibru rulaje
 * 4. Echilibru solduri finale
 * 5. Clase cont obligatorii (1-7)
 * 6. Format conturi (OMFP 1802)
 * 7. Valori numerice finite
 * 8. Duplicate cod cont
 * 
 * WARNINGS (8 - Non-blocante):
 * 9. Solduri duale (D+C simultan)
 * 10. Ecuație contabilă per cont
 * 11. Conturi inactive (toate 0)
 * 12. Valori negative
 * 13. Outliers (IQR method)
 * 14. Denumiri duplicate
 * 15. Ierarhie conturi
 * 16. Completitudine date
 */

/**
 * Toleranță pentru comparații numerice (±1 RON).
 * Elimină false pozitive din rotunjiri Excel.
 */
const TOLERANCE = 1.0;

/**
 * Reprezintă un cont din balanța de verificare.
 */
export interface BalanceAccount {
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
 * Nivel de severitate pentru validări.
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * Rezultat validare individuală.
 */
export interface ValidationResult {
  code: string;
  severity: ValidationSeverity;
  message: string;
  details?: Record<string, unknown>;
  affectedAccounts?: string[]; // Array de account_code
}

/**
 * Rezultat complet validare balanță.
 */
export interface BalanceValidationResult {
  isValid: boolean;
  errors: ValidationResult[];
  warnings: ValidationResult[];
  info: ValidationResult[];
  totals: {
    opening_debit: number;
    opening_credit: number;
    debit_turnover: number;
    credit_turnover: number;
    closing_debit: number;
    closing_credit: number;
    accounts_count: number;
  };
}

/**
 * Calculează totalurile pentru o balanță.
 */
function calculateTotals(accounts: BalanceAccount[]) {
  const totals = {
    opening_debit: 0,
    opening_credit: 0,
    debit_turnover: 0,
    credit_turnover: 0,
    closing_debit: 0,
    closing_credit: 0,
    accounts_count: accounts.length,
  };

  accounts.forEach(acc => {
    totals.opening_debit += acc.opening_debit;
    totals.opening_credit += acc.opening_credit;
    totals.debit_turnover += acc.debit_turnover;
    totals.credit_turnover += acc.credit_turnover;
    totals.closing_debit += acc.closing_debit;
    totals.closing_credit += acc.closing_credit;
  });

  // Round la 2 zecimale
  Object.keys(totals).forEach(key => {
    if (key !== 'accounts_count') {
      totals[key as keyof typeof totals] = Math.round((totals[key as keyof typeof totals] as number) * 100) / 100;
    }
  });

  return totals;
}

/**
 * Verifică dacă un număr este în interval de toleranță față de zero.
 */
function isWithinTolerance(value: number, tolerance: number = TOLERANCE): boolean {
  return Math.abs(value) <= tolerance;
}

/**
 * v1.3.1: Listă nu e goală (CRITICĂ)
 */
function validateNotEmpty(accounts: BalanceAccount[]): ValidationResult | null {
  if (accounts.length === 0) {
    return {
      code: 'EMPTY_BALANCE',
      severity: 'error',
      message: 'Balanța nu conține niciun cont. Verificați fișierul Excel.',
    };
  }
  return null;
}

/**
 * v1.3.2: Echilibru solduri inițiale (CRITICĂ)
 */
function validateOpeningBalance(totals: ReturnType<typeof calculateTotals>): ValidationResult | null {
  const difference = totals.opening_debit - totals.opening_credit;
  
  if (!isWithinTolerance(difference)) {
    return {
      code: 'OPENING_BALANCE_MISMATCH',
      severity: 'error',
      message: `Soldurile inițiale nu sunt echilibrate. Diferență: ${difference.toFixed(2)} RON`,
      details: {
        total_opening_debit: totals.opening_debit,
        total_opening_credit: totals.opening_credit,
        difference: difference,
      },
    };
  }
  return null;
}

/**
 * v1.3.3: Echilibru rulaje (CRITICĂ)
 */
function validateTurnoverBalance(totals: ReturnType<typeof calculateTotals>): ValidationResult | null {
  const difference = totals.debit_turnover - totals.credit_turnover;
  
  if (!isWithinTolerance(difference)) {
    return {
      code: 'TURNOVER_MISMATCH',
      severity: 'error',
      message: `Rulajele nu sunt echilibrate. Diferență: ${difference.toFixed(2)} RON`,
      details: {
        total_debit_turnover: totals.debit_turnover,
        total_credit_turnover: totals.credit_turnover,
        difference: difference,
      },
    };
  }
  return null;
}

/**
 * v1.3.4: Echilibru solduri finale (CRITICĂ)
 */
function validateClosingBalance(totals: ReturnType<typeof calculateTotals>): ValidationResult | null {
  const difference = totals.closing_debit - totals.closing_credit;
  
  if (!isWithinTolerance(difference)) {
    return {
      code: 'CLOSING_BALANCE_MISMATCH',
      severity: 'error',
      message: `Soldurile finale nu sunt echilibrate. Diferență: ${difference.toFixed(2)} RON`,
      details: {
        total_closing_debit: totals.closing_debit,
        total_closing_credit: totals.closing_credit,
        difference: difference,
      },
    };
  }
  return null;
}

/**
 * v1.3.5: Clase cont obligatorii 1-7 (CRITICĂ)
 */
function validateMandatoryClasses(accounts: BalanceAccount[]): ValidationResult | null {
  const accountClasses = new Set(accounts.map(acc => acc.account_code.charAt(0)));
  const mandatoryClasses = ['1', '2', '3', '4', '5', '6', '7'];
  const missingClasses = mandatoryClasses.filter(cls => !accountClasses.has(cls));
  
  if (missingClasses.length > 0) {
    return {
      code: 'MISSING_ACCOUNT_CLASSES',
      severity: 'warning', // Downgrade la warning (pot exista situații legitime)
      message: `Lipsesc clase de conturi: ${missingClasses.join(', ')}. Verificați completitudinea balanței.`,
      details: {
        missing_classes: missingClasses,
        found_classes: Array.from(accountClasses),
      },
    };
  }
  return null;
}

/**
 * v1.3.6: Format conturi OMFP 1802/2014 (CRITICĂ)
 * 
 * Pattern REALIST (v1.4.9 ajustare):
 * - Permite conturi de 3-6 cifre
 * - Permite subconturi cu punct (ex: 5121.01)
 * - Acceptă clase 1-8 (include clasa 8 pentru off-balance)
 */
function validateAccountFormat(accounts: BalanceAccount[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const invalidAccounts: string[] = [];
  
  accounts.forEach(acc => {
    // Pattern realist: 1-8 cifre inițial + opțional .XX sau .XXX
    if (!/^[1-8]\d{2,5}(\.\d{2,3})?$/.test(acc.account_code)) {
      invalidAccounts.push(acc.account_code);
    }
  });
  
  if (invalidAccounts.length > 0) {
    results.push({
      code: 'INVALID_ACCOUNT_FORMAT',
      severity: 'error',
      message: `${invalidAccounts.length} cont(uri) cu format invalid. Verificați codul conturilor.`,
      details: {
        count: invalidAccounts.length,
        examples: invalidAccounts.slice(0, 10), // Primele 10
      },
      affectedAccounts: invalidAccounts,
    });
  }
  
  return results;
}

/**
 * v1.3.7: Valori numerice finite (CRITICĂ)
 */
function validateNumericValues(accounts: BalanceAccount[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const invalidAccounts: string[] = [];
  
  accounts.forEach(acc => {
    const values = [
      acc.opening_debit,
      acc.opening_credit,
      acc.debit_turnover,
      acc.credit_turnover,
      acc.closing_debit,
      acc.closing_credit,
    ];
    
    if (values.some(v => !Number.isFinite(v))) {
      invalidAccounts.push(acc.account_code);
    }
  });
  
  if (invalidAccounts.length > 0) {
    results.push({
      code: 'INVALID_NUMERIC_VALUES',
      severity: 'error',
      message: `${invalidAccounts.length} cont(uri) cu valori numerice invalide (NaN, Infinity).`,
      affectedAccounts: invalidAccounts,
    });
  }
  
  return results;
}

/**
 * v1.3.8: Duplicate cod cont (CRITICĂ)
 * 
 * OPȚIUNE ENV-controlat (v1.4.7):
 * - AGGREGATE_DUPLICATES=true → warning + agregare automată
 * - AGGREGATE_DUPLICATES=false → error + blocare
 */
function validateDuplicates(
  accounts: BalanceAccount[],
  aggregateDuplicates: boolean = false
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const codeMap = new Map<string, number>();
  
  accounts.forEach(acc => {
    codeMap.set(acc.account_code, (codeMap.get(acc.account_code) || 0) + 1);
  });
  
  const duplicates = Array.from(codeMap.entries())
    .filter(([_, count]) => count > 1)
    .map(([code, count]) => ({ code, count }));
  
  if (duplicates.length > 0) {
    if (aggregateDuplicates) {
      results.push({
        code: 'DUPLICATE_ACCOUNTS',
        severity: 'warning',
        message: `${duplicates.length} cod(uri) duplicate detectate. Vor fi agregate automat.`,
        details: {
          count: duplicates.length,
          duplicates: duplicates.slice(0, 10),
        },
        affectedAccounts: duplicates.map(d => d.code),
      });
    } else {
      results.push({
        code: 'DUPLICATE_ACCOUNTS',
        severity: 'error',
        message: `${duplicates.length} cod(uri) duplicate detectate. Fiecare cont trebuie să fie unic.`,
        details: {
          count: duplicates.length,
          duplicates: duplicates.slice(0, 10),
        },
        affectedAccounts: duplicates.map(d => d.code),
      });
    }
  }
  
  return results;
}

/**
 * v1.3.9: Solduri duale D+C simultan (WARNING)
 */
function validateDualBalances(accounts: BalanceAccount[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const dualAccounts: string[] = [];
  
  accounts.forEach(acc => {
    // Verificare solduri inițiale
    if (acc.opening_debit > TOLERANCE && acc.opening_credit > TOLERANCE) {
      dualAccounts.push(`${acc.account_code} (SI)`);
    }
    
    // Verificare solduri finale
    if (acc.closing_debit > TOLERANCE && acc.closing_credit > TOLERANCE) {
      dualAccounts.push(`${acc.account_code} (SF)`);
    }
  });
  
  if (dualAccounts.length > 0) {
    results.push({
      code: 'DUAL_BALANCE',
      severity: 'warning',
      message: `${dualAccounts.length} sold(uri) dual(e) detectat(e). Un cont nu ar trebui să aibă simultan debit și credit.`,
      details: {
        count: dualAccounts.length,
        examples: dualAccounts.slice(0, 10),
      },
    });
  }
  
  return results;
}

/**
 * v1.3.10: Ecuație contabilă per cont (WARNING)
 * 
 * Verifică: SI + Rulaj = SF (pentru fiecare cont)
 * Formula: (opening_debit - opening_credit) + (debit_turnover - credit_turnover) = (closing_debit - closing_credit)
 */
function validateAccountEquation(accounts: BalanceAccount[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const mismatchAccounts: Array<{code: string; difference: number}> = [];
  
  accounts.forEach(acc => {
    const opening = acc.opening_debit - acc.opening_credit;
    const turnover = acc.debit_turnover - acc.credit_turnover;
    const closing = acc.closing_debit - acc.closing_credit;
    const calculated = opening + turnover;
    const difference = calculated - closing;
    
    if (!isWithinTolerance(difference)) {
      mismatchAccounts.push({
        code: acc.account_code,
        difference: Math.round(difference * 100) / 100,
      });
    }
  });
  
  if (mismatchAccounts.length > 0) {
    results.push({
      code: 'ACCOUNT_EQUATION_MISMATCH',
      severity: 'warning',
      message: `${mismatchAccounts.length} cont(uri) cu ecuație contabilă nerespectată (SI + Rulaj ≠ SF).`,
      details: {
        count: mismatchAccounts.length,
        examples: mismatchAccounts.slice(0, 10),
      },
      affectedAccounts: mismatchAccounts.map(a => a.code),
    });
  }
  
  return results;
}

/**
 * v1.3.11: Conturi inactive - toate valorile 0 (WARNING)
 */
function validateInactiveAccounts(accounts: BalanceAccount[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const inactiveAccounts: string[] = [];
  
  accounts.forEach(acc => {
    if (
      acc.opening_debit === 0 &&
      acc.opening_credit === 0 &&
      acc.debit_turnover === 0 &&
      acc.credit_turnover === 0 &&
      acc.closing_debit === 0 &&
      acc.closing_credit === 0
    ) {
      inactiveAccounts.push(acc.account_code);
    }
  });
  
  if (inactiveAccounts.length > 0) {
    results.push({
      code: 'INACTIVE_ACCOUNTS',
      severity: 'info',
      message: `${inactiveAccounts.length} cont(uri) inactive detectat(e) (toate valorile sunt 0).`,
      details: {
        count: inactiveAccounts.length,
      },
      affectedAccounts: inactiveAccounts,
    });
  }
  
  return results;
}

/**
 * v1.3.12: Valori negative (WARNING)
 */
function validateNegativeValues(accounts: BalanceAccount[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const negativeAccounts: string[] = [];
  
  accounts.forEach(acc => {
    const values = [
      acc.opening_debit,
      acc.opening_credit,
      acc.debit_turnover,
      acc.credit_turnover,
      acc.closing_debit,
      acc.closing_credit,
    ];
    
    if (values.some(v => v < 0)) {
      negativeAccounts.push(acc.account_code);
    }
  });
  
  if (negativeAccounts.length > 0) {
    results.push({
      code: 'NEGATIVE_VALUES',
      severity: 'warning',
      message: `${negativeAccounts.length} cont(uri) cu valori negative detectat(e).`,
      affectedAccounts: negativeAccounts,
    });
  }
  
  return results;
}

/**
 * v1.3.13: Outliers - valori anormale (WARNING)
 * 
 * Folosește metoda IQR (Interquartile Range) pentru detectare outliers.
 * Outlier: valoare < Q1 - 1.5*IQR SAU > Q3 + 1.5*IQR
 */
function validateOutliers(accounts: BalanceAccount[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Colectăm toate valorile non-zero pentru calcul IQR
  const allValues: number[] = [];
  accounts.forEach(acc => {
    [
      acc.opening_debit,
      acc.opening_credit,
      acc.debit_turnover,
      acc.credit_turnover,
      acc.closing_debit,
      acc.closing_credit,
    ].forEach(v => {
      if (v > 0) allValues.push(v);
    });
  });
  
  if (allValues.length < 10) {
    // Prea puține date pentru analiza outliers
    return results;
  }
  
  // Sortare
  allValues.sort((a, b) => a - b);
  
  // Calculare Q1, Q3, IQR
  const q1Index = Math.floor(allValues.length * 0.25);
  const q3Index = Math.floor(allValues.length * 0.75);
  const q1 = allValues[q1Index];
  const q3 = allValues[q3Index];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  const outlierAccounts: string[] = [];
  
  accounts.forEach(acc => {
    const values = [
      acc.opening_debit,
      acc.opening_credit,
      acc.debit_turnover,
      acc.credit_turnover,
      acc.closing_debit,
      acc.closing_credit,
    ];
    
    if (values.some(v => v > 0 && (v < lowerBound || v > upperBound))) {
      outlierAccounts.push(acc.account_code);
    }
  });
  
  if (outlierAccounts.length > 0) {
    results.push({
      code: 'ANOMALOUS_VALUES',
      severity: 'info',
      message: `${outlierAccounts.length} cont(uri) cu valori anormale detectat(e) (outliers statistici).`,
      details: {
        count: outlierAccounts.length,
        q1,
        q3,
        iqr,
        lower_bound: lowerBound,
        upper_bound: upperBound,
      },
      affectedAccounts: outlierAccounts,
    });
  }
  
  return results;
}

/**
 * v1.3.14: Denumiri duplicate (WARNING)
 */
function validateDuplicateNames(accounts: BalanceAccount[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const nameMap = new Map<string, string[]>();
  
  accounts.forEach(acc => {
    const normalized = acc.account_name.trim().toLowerCase();
    if (!nameMap.has(normalized)) {
      nameMap.set(normalized, []);
    }
    nameMap.get(normalized)!.push(acc.account_code);
  });
  
  const duplicates = Array.from(nameMap.entries())
    .filter(([_, codes]) => codes.length > 1)
    .map(([name, codes]) => ({ name, codes }));
  
  if (duplicates.length > 0) {
    results.push({
      code: 'DUPLICATE_NAMES',
      severity: 'info',
      message: `${duplicates.length} denumire(i) duplicate detectat(e).`,
      details: {
        count: duplicates.length,
        examples: duplicates.slice(0, 5).map(d => ({ name: d.name, codes: d.codes })),
      },
    });
  }
  
  return results;
}

/**
 * v1.3.15: Ierarhie conturi (WARNING)
 * 
 * Verifică dacă există conturi sintetice fără conturi analitice
 * și vice-versa.
 */
function validateHierarchy(accounts: BalanceAccount[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const codes = new Set(accounts.map(acc => acc.account_code));
  const orphanedAccounts: string[] = [];
  
  accounts.forEach(acc => {
    const code = acc.account_code;
    
    // Verifică dacă e cont analitic (ex: 5121)
    if (code.length >= 4 && !code.includes('.')) {
      // Verifică existența contului sintetic (ex: 512)
      const parentCode = code.substring(0, 3);
      if (!codes.has(parentCode)) {
        orphanedAccounts.push(code);
      }
    }
  });
  
  if (orphanedAccounts.length > 0) {
    results.push({
      code: 'HIERARCHY_ISSUES',
      severity: 'info',
      message: `${orphanedAccounts.length} cont(uri) analitic(e) fără cont sintetic detectat(e).`,
      details: {
        count: orphanedAccounts.length,
        examples: orphanedAccounts.slice(0, 10),
      },
      affectedAccounts: orphanedAccounts,
    });
  }
  
  return results;
}

/**
 * v1.3.16: Completitudine date (WARNING)
 * 
 * Verifică dacă există conturi cu denumiri goale sau prea scurte.
 */
function validateCompleteness(accounts: BalanceAccount[]): ValidationResult[] {
  const results: ValidationResult[] = [];
  const incompleteAccounts: string[] = [];
  
  accounts.forEach(acc => {
    if (!acc.account_name || acc.account_name.trim().length < 3) {
      incompleteAccounts.push(acc.account_code);
    }
  });
  
  if (incompleteAccounts.length > 0) {
    results.push({
      code: 'INCOMPLETE_DATA',
      severity: 'warning',
      message: `${incompleteAccounts.length} cont(uri) cu denumire lipsă sau incompletă.`,
      affectedAccounts: incompleteAccounts,
    });
  }
  
  return results;
}

/**
 * Funcția principală de validare - rulează toate cele 16 validări.
 * 
 * @param accounts - Array de conturi din balanță
 * @param options - Opțiuni de configurare
 * @returns Rezultat complet de validare
 */
export function validateBalance(
  accounts: BalanceAccount[],
  options: {
    aggregateDuplicates?: boolean;
  } = {}
): BalanceValidationResult {
  const errors: ValidationResult[] = [];
  const warnings: ValidationResult[] = [];
  const info: ValidationResult[] = [];
  
  // Calculare totaluri
  const totals = calculateTotals(accounts);
  
  // === CRITICE (8) - Blocante ===
  
  // 1. Listă nu e goală
  const emptyCheck = validateNotEmpty(accounts);
  if (emptyCheck) {
    errors.push(emptyCheck);
    // Returnăm imediat dacă lista e goală
    return {
      isValid: false,
      errors,
      warnings,
      info,
      totals,
    };
  }
  
  // 2-4. Echilibre
  const openingCheck = validateOpeningBalance(totals);
  if (openingCheck) errors.push(openingCheck);
  
  const turnoverCheck = validateTurnoverBalance(totals);
  if (turnoverCheck) errors.push(turnoverCheck);
  
  const closingCheck = validateClosingBalance(totals);
  if (closingCheck) errors.push(closingCheck);
  
  // 5. Clase obligatorii
  const classesCheck = validateMandatoryClasses(accounts);
  if (classesCheck) {
    if (classesCheck.severity === 'error') {
      errors.push(classesCheck);
    } else {
      warnings.push(classesCheck);
    }
  }
  
  // 6. Format conturi
  validateAccountFormat(accounts).forEach(result => {
    if (result.severity === 'error') {
      errors.push(result);
    } else if (result.severity === 'warning') {
      warnings.push(result);
    }
  });
  
  // 7. Valori numerice
  validateNumericValues(accounts).forEach(result => {
    errors.push(result);
  });
  
  // 8. Duplicate
  validateDuplicates(accounts, options.aggregateDuplicates).forEach(result => {
    if (result.severity === 'error') {
      errors.push(result);
    } else {
      warnings.push(result);
    }
  });
  
  // === WARNINGS (8) - Non-blocante ===
  
  // 9. Solduri duale
  validateDualBalances(accounts).forEach(result => warnings.push(result));
  
  // 10. Ecuație contabilă
  validateAccountEquation(accounts).forEach(result => warnings.push(result));
  
  // 11. Conturi inactive
  validateInactiveAccounts(accounts).forEach(result => info.push(result));
  
  // 12. Valori negative
  validateNegativeValues(accounts).forEach(result => warnings.push(result));
  
  // 13. Outliers
  validateOutliers(accounts).forEach(result => info.push(result));
  
  // 14. Denumiri duplicate
  validateDuplicateNames(accounts).forEach(result => info.push(result));
  
  // 15. Ierarhie
  validateHierarchy(accounts).forEach(result => info.push(result));
  
  // 16. Completitudine
  validateCompleteness(accounts).forEach(result => warnings.push(result));
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
    totals,
  };
}

/**
 * Helper pentru formatare mesaj eroare user-friendly.
 */
export function formatValidationMessage(result: ValidationResult): string {
  let message = `[${result.code}] ${result.message}`;
  
  if (result.affectedAccounts && result.affectedAccounts.length > 0) {
    const count = result.affectedAccounts.length;
    const examples = result.affectedAccounts.slice(0, 5).join(', ');
    message += `\nConturi afectate (${count}): ${examples}${count > 5 ? '...' : ''}`;
  }
  
  if (result.details) {
    const details = Object.entries(result.details)
      .filter(([key]) => !['count', 'examples'].includes(key))
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
    
    if (details) {
      message += `\nDetalii: ${details}`;
    }
  }
  
  return message;
}
