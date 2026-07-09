import type { BalanceAccount } from '@/hooks/useBalante';

/**
 * Partea soldului contului AȘA CUM VINE DIN BALANȚĂ (date brute).
 * NU descrie funcțiunea contabilă a contului.
 */
export type RawBalanceSide = 'debit' | 'credit' | 'zero' | 'both';

/**
 * Funcțiunea contabilă a contului, definită în chart_of_accounts.functional_type.
 * NU se deduce din soldul din balanță și NU se deduce din prima cifră a codului.
 */
export type FunctionalType = 'activ' | 'pasiv' | 'bifunctional';

export type DiagnosticIssueType =
  | 'unmapped'
  | 'missing_functional_type'
  | 'technical_both_sides'
  | 'wrong_sign_activ'
  | 'wrong_sign_pasiv'
  | 'contra_adjustment_note'
  | 'duplicate_mapping'
  | 'not_in_report'
  | 'bifunctional_incomplete_routes'
  | 'bifunctional_missing_route';

/** Tipuri de problemă care invalidează raportul oficial. */
export const BLOCKING_DIAGNOSTIC_TYPES: ReadonlySet<DiagnosticIssueType> = new Set([
  'unmapped',
  'not_in_report',
  'missing_functional_type',
  'technical_both_sides',
  'bifunctional_incomplete_routes',
  'bifunctional_missing_route',
]);

export interface BalanceSheetReportLeaf {
  lineKey: string;
  accountCode: string;
  reportArea: string | null;
}

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface BalanceSheetDiagnosticIssue {
  type: DiagnosticIssueType;
  severity: DiagnosticSeverity;
  accountCode: string;
  accountName: string;
  closingDebit: number;
  closingCredit: number;
  /** Sold net (debit - credit) doar pentru afișare; nu determină funcțiunea. */
  netBalance: number;
  rawBalanceSide: RawBalanceSide;
  functionalType: FunctionalType | null;
  mappedTo?: string;
  message: string;
}

export interface BalanceSheetDiagnosticSummary {
  issues: BalanceSheetDiagnosticIssue[];
  unmappedCount: number;
  wrongSignCount: number;
  missingFunctionalCount: number;
  technicalErrorCount: number;
  notInReportCount: number;
  bifunctionalRouteIssueCount: number;
  /** Conturi cu sold ≠ 0 incluse complet în raport (fără issue blocant). */
  includedAccountCount: number;
  /** Raportul oficial poate fi considerat valid. */
  isReportValid: boolean;
  blockingIssueCount: number;
  tbAccountsWithBalance: number;
  totalMappedNet: number;
  possibleCauses: string[];
}

/**
 * Găsește linia de bilanț (leaf) care corespunde unui cod din planul de conturi,
 * folosind aceeași regulă ca pipeline-ul SQL: cel mai lung prefix potrivit.
 */
export function findBalanceSheetLineKey(
  coaCode: string,
  leaves: BalanceSheetReportLeaf[],
): BalanceSheetReportLeaf | null {
  const matches = leaves
    .filter(
      (leaf) => coaCode === leaf.accountCode || coaCode.startsWith(`${leaf.accountCode}`),
    )
    .sort((a, b) => b.accountCode.length - a.accountCode.length);
  return matches[0] ?? null;
}

/** Frunze SLD care corespund unui cod din plan (cel mai lung prefix). */
export function findBalanceSheetLeavesForCode(
  coaCode: string,
  leaves: BalanceSheetReportLeaf[],
): BalanceSheetReportLeaf[] {
  const matches = leaves.filter(
    (leaf) => coaCode === leaf.accountCode || coaCode.startsWith(`${leaf.accountCode}`),
  );
  const longestLen = Math.max(0, ...matches.map((m) => m.accountCode.length));
  return matches.filter((m) => m.accountCode.length === longestLen);
}

/**
 * Pentru conturi bifuncționale, verifică dacă există ruta SLD potrivită soldului curent
 * (debit → Active, credit → Pasiv), replicând logica din pipeline-ul SQL.
 */
function validateBifunctionalRoutes(
  coaCode: string,
  side: RawBalanceSide,
  leaves: BalanceSheetReportLeaf[],
): DiagnosticIssueType | null {
  const matchingLeaves = findBalanceSheetLeavesForCode(coaCode, leaves);
  if (matchingLeaves.length === 0) return 'not_in_report';

  const hasActive = matchingLeaves.some((l) => l.reportArea === 'Active');
  const hasPassive = matchingLeaves.some((l) => l.reportArea === 'Pasive');

  if (!hasActive || !hasPassive) {
    return 'bifunctional_incomplete_routes';
  }

  if (side === 'debit' && !hasActive) return 'bifunctional_missing_route';
  if (side === 'credit' && !hasPassive) return 'bifunctional_missing_route';

  return null;
}

/**
 * Conturi rectificative / de ajustare (contra-active): amortizări, ajustări,
 * provizioane. Au în mod normal sold pe partea opusă funcțiunii contului de
 * bază, deci un sold „inversat” nu este automat o eroare de semn.
 */
function isContraOrAdjustment(code: string): boolean {
  return (
    code.startsWith('28') ||
    code.startsWith('29') ||
    code.startsWith('39') ||
    code.startsWith('49') ||
    code.startsWith('19')
  );
}

/**
 * Determină partea soldului STRICT din datele brute ale balanței.
 * Nu aplică nicio regulă de funcțiune contabilă.
 */
function getRawBalanceSide(acc: BalanceAccount): RawBalanceSide {
  const debit = acc.closing_debit || 0;
  const credit = acc.closing_credit || 0;
  const hasDebit = Math.abs(debit) > 0.01;
  const hasCredit = Math.abs(credit) > 0.01;
  if (hasDebit && hasCredit) return 'both';
  if (hasDebit) return 'debit';
  if (hasCredit) return 'credit';
  return 'zero';
}

function netClosingBalance(acc: BalanceAccount): number {
  return (acc.closing_debit || 0) - (acc.closing_credit || 0);
}

/** Normalizează funcțiunea contului la valorile canonice. */
function normalizeFunctionalType(value: string | null | undefined): FunctionalType | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'activ' || v === 'pasiv' || v === 'bifunctional') return v;
  return null;
}

export interface MappedAccountInfo {
  tbAccountId: string;
  accountCode: string;
  accountName: string;
  chartAccountCode: string;
  /** Tip contabil pentru raportare (asset/liability/equity/revenue/expense). */
  chartAccountType: string | null;
  /** Funcțiunea contabilă (activ/pasiv/bifunctional) — sursa deciziei de semn. */
  functionalType: string | null;
}

/**
 * Analizează conturile din balanță față de mapările din chart_of_accounts pentru
 * diagnosticul bilanțului.
 *
 * Principii:
 * - Soldul (debit/credit) este citit brut din balanță și NU determină funcțiunea.
 * - Funcțiunea contului vine EXCLUSIV din chart_of_accounts.functional_type.
 * - Conturile bifuncționale pot avea sold pe oricare parte fără a fi eroare.
 * - Nu se marchează conturi ca „pasiv cu sold debitor” doar pentru că sunt în
 *   clasa 4 sau pentru că au un sold pe debit.
 */
export function analyzeBalanceSheetMapping(
  accounts: BalanceAccount[],
  mappings: MappedAccountInfo[],
  reportLeaves: BalanceSheetReportLeaf[] = [],
): BalanceSheetDiagnosticSummary {
  const mappedByTbId = new Map<string, MappedAccountInfo[]>();
  for (const m of mappings) {
    const list = mappedByTbId.get(m.tbAccountId) ?? [];
    list.push(m);
    mappedByTbId.set(m.tbAccountId, list);
  }

  const issues: BalanceSheetDiagnosticIssue[] = [];
  let totalMappedNet = 0;
  let includedAccountCount = 0;

  for (const acc of accounts) {
    const side = getRawBalanceSide(acc);
    if (side === 'zero') continue;

    const net = netClosingBalance(acc);
    const closingDebit = acc.closing_debit || 0;
    const closingCredit = acc.closing_credit || 0;
    const code = acc.account_code;

    const base = {
      accountCode: code,
      accountName: acc.account_name,
      closingDebit,
      closingCredit,
      netBalance: net,
      rawBalanceSide: side,
    };

    // 1) Anomalie tehnică reală de import: sold simultan pe debit ȘI credit.
    if (side === 'both') {
      issues.push({
        ...base,
        type: 'technical_both_sides',
        severity: 'error',
        functionalType: null,
        message:
          'Sold final simultan pe debit și credit — anomalie tehnică de import, verificați balanța sursă',
      });
      continue;
    }

    const mapped = mappedByTbId.get(acc.id) ?? [];

    // 2) Cont fără mapare în planul de conturi.
    if (mapped.length === 0) {
      issues.push({
        ...base,
        type: 'unmapped',
        severity: 'error',
        functionalType: null,
        message: 'Cont cu sold, fără mapare în planul de conturi — raportul este invalid până la mapare',
      });
      continue;
    }

    // 3) Mapare duplicată.
    if (mapped.length > 1) {
      issues.push({
        ...base,
        type: 'duplicate_mapping',
        severity: 'warning',
        functionalType: null,
        mappedTo: mapped.map((m) => m.chartAccountCode).join(', '),
        message: 'Cont mapat în mai multe linii chart_of_accounts',
      });
    }

    totalMappedNet += net;

    const functionalType = normalizeFunctionalType(mapped[0]?.functionalType);
    const mappedTo = mapped[0]?.chartAccountCode;
    let accountBlocked = false;

    // 4) Acoperire în șablonul bilanțului.
    if (reportLeaves.length > 0) {
      if (functionalType === 'bifunctional') {
        const routeIssue = validateBifunctionalRoutes(mappedTo ?? code, side, reportLeaves);
        if (routeIssue) {
          accountBlocked = true;
          issues.push({
            ...base,
            type: routeIssue,
            severity: 'error',
            functionalType,
            mappedTo,
            message:
              routeIssue === 'bifunctional_incomplete_routes'
                ? 'Cont bifuncțional fără rute SLD complete (activ + pasiv) — raport invalid'
                : routeIssue === 'bifunctional_missing_route'
                  ? `Cont bifuncțional fără rută SLD pentru sold ${side === 'debit' ? 'debitor (Active)' : 'creditor (Pasive)'}`
                  : 'Cont mapat, dar fără linie leaf în șablonul bilanțului',
          });
        }
      } else {
        const reportLine = findBalanceSheetLineKey(mappedTo ?? code, reportLeaves);
        if (!reportLine) {
          accountBlocked = true;
          issues.push({
            ...base,
            type: 'not_in_report',
            severity: 'error',
            functionalType,
            mappedTo,
            message:
              'Cont mapat în planul de conturi, dar fără linie leaf în șablonul bilanțului — soldul nu intră în raport',
          });
        }
      }
    }

    // 5) Funcțiune lipsă în planul de conturi.
    if (!functionalType) {
      accountBlocked = true;
      issues.push({
        ...base,
        type: 'missing_functional_type',
        severity: 'error',
        functionalType: null,
        mappedTo,
        message:
          'Funcțiunea contului (activ/pasiv/bifuncțional) nu este definită — raport invalid până la completare',
      });
      continue;
    }

    if (!accountBlocked) {
      includedAccountCount += 1;
    }

    // 6) Cont bifuncțional: poate avea sold pe oricare parte. NICIODATĂ eroare de semn.
    if (functionalType === 'bifunctional') {
      continue;
    }

    // 7) Cont rectificativ / de ajustare: soldul „inversat” este normal.
    if (isContraOrAdjustment(code)) {
      const inverted =
        (functionalType === 'activ' && side === 'credit') ||
        (functionalType === 'pasiv' && side === 'debit');
      if (inverted) {
        issues.push({
          ...base,
          type: 'contra_adjustment_note',
          severity: 'info',
          functionalType,
          mappedTo,
          message:
            'Cont rectificativ / de ajustare — soldul pe partea opusă funcțiunii este normal, nu este eroare',
        });
      }
      continue;
    }

    // 8) Cont activ cu sold creditor.
    if (functionalType === 'activ' && side === 'credit') {
      issues.push({
        ...base,
        type: 'wrong_sign_activ',
        severity: 'warning',
        functionalType,
        mappedTo,
        message:
          'Cont activ cu sold final creditor — verificați (ex. 512 descoperit de cont) sau clasificarea funcțiunii',
      });
      continue;
    }

    // 9) Cont pasiv cu sold debitor.
    if (functionalType === 'pasiv' && side === 'debit') {
      issues.push({
        ...base,
        type: 'wrong_sign_pasiv',
        severity: 'warning',
        functionalType,
        mappedTo,
        message:
          'Cont pasiv cu sold final debitor — verificați soldul sau clasificarea funcțiunii',
      });
    }
  }

  const unmappedCount = issues.filter((i) => i.type === 'unmapped').length;
  const missingFunctionalCount = issues.filter((i) => i.type === 'missing_functional_type').length;
  const technicalErrorCount = issues.filter((i) => i.type === 'technical_both_sides').length;
  const wrongSignCount = issues.filter(
    (i) => i.type === 'wrong_sign_activ' || i.type === 'wrong_sign_pasiv',
  ).length;
  const notInReportCount = issues.filter((i) => i.type === 'not_in_report').length;
  const bifunctionalRouteIssueCount = issues.filter(
    (i) => i.type === 'bifunctional_incomplete_routes' || i.type === 'bifunctional_missing_route',
  ).length;
  const blockingIssueCount = issues.filter((i) => BLOCKING_DIAGNOSTIC_TYPES.has(i.type)).length;
  const isReportValid = blockingIssueCount === 0;

  const possibleCauses: string[] = [];
  if (!isReportValid) {
    possibleCauses.push('Raportul este marcat ca nereconciliat — există conturi relevante neincluse sau rutate incomplet.');
  }
  if (technicalErrorCount > 0) {
    possibleCauses.push(`${technicalErrorCount} cont(uri) au sold simultan pe debit și credit (anomalie de import).`);
  }
  if (unmappedCount > 0) {
    possibleCauses.push(`${unmappedCount} cont(uri) cu sold nu sunt mapate în raport.`);
  }
  if (missingFunctionalCount > 0) {
    possibleCauses.push(`${missingFunctionalCount} cont(uri) nu au funcțiunea (activ/pasiv/bifuncțional) definită.`);
  }
  if (wrongSignCount > 0) {
    possibleCauses.push(`${wrongSignCount} cont(uri) au sold pe partea opusă funcțiunii contabile.`);
  }
  if (notInReportCount > 0) {
    possibleCauses.push(
      `${notInReportCount} cont(uri) mapate nu au linie leaf în șablonul bilanțului și nu contribuie la raport.`,
    );
  }
  if (bifunctionalRouteIssueCount > 0) {
    possibleCauses.push(
      `${bifunctionalRouteIssueCount} cont(uri) bifuncționale au rute SLD incomplete (lipsește activ sau pasiv).`,
    );
  }
  if (!possibleCauses.length) {
    possibleCauses.push('Rezultatul exercițiului (121) poate să nu fie inclus complet în capitaluri.');
    possibleCauses.push('Diferența poate proveni din agregarea liniilor de raport (formule CALCULATED).');
    possibleCauses.push('Conturile bifuncționale (121, 4428, 473) sunt poziționate corect după soldul lor.');
  }

  return {
    issues,
    unmappedCount,
    wrongSignCount,
    missingFunctionalCount,
    technicalErrorCount,
    notInReportCount,
    bifunctionalRouteIssueCount,
    includedAccountCount,
    isReportValid,
    blockingIssueCount,
    tbAccountsWithBalance: accounts.filter((a) => getRawBalanceSide(a) !== 'zero').length,
    totalMappedNet,
    possibleCauses,
  };
}

export function getRowStatusLabel(
  rowKind: string,
  hasValidationIssue: boolean,
  isEquationBalanced: boolean,
  lineKey: string,
): string {
  if (lineKey === 'bs_805' || lineKey === 'bs_1570') {
    return isEquationBalanced ? 'OK' : 'Nu se închide';
  }
  if (hasValidationIssue) return 'Verifică';
  if (rowKind === 'calculated' || rowKind === 'grand_total') return 'Calculat';
  if (rowKind === 'account') return 'Cont';
  return 'OK';
}
