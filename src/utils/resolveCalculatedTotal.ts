/**
 * Rezolvă suma unei formule CALCULATED de tip „Secțiune A + Secțiune B + …”
 * după aceeași regulă ca pipeline-ul SQL (potrivire case-insensitive pe
 * section_l1 sau display_name pentru rânduri REPORT_GROUP de nivel L1).
 */
export interface CalculatedFormulaGroup {
  lineKey: string;
  displayName: string;
  sectionL1: string | null;
  rowType: string;
  sectionL2: string | null;
  sectionL3: string | null;
  amount: number;
}

function splitFormulaParts(formula: string): string[] {
  return formula
    .split(/\s*\+\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function partMatchesGroup(
  part: string,
  group: CalculatedFormulaGroup,
  caseSensitive: boolean,
): boolean {
  if (caseSensitive) {
    const section = group.sectionL1 ?? '';
    const display = group.displayName;
    return part === section || part === display;
  }
  const normalized = part.toLowerCase();
  const section = (group.sectionL1 ?? '').toLowerCase();
  const display = group.displayName.toLowerCase();
  return normalized === section || normalized === display;
}

/**
 * Calculează totalul unei formule CALCULATED cu adunare de secțiuni L1.
 */
export function resolveCalculatedSectionSum(
  formula: string,
  groups: CalculatedFormulaGroup[],
  options?: { caseSensitive?: boolean },
): number {
  const caseSensitive = options?.caseSensitive ?? false;
  if (!formula.includes('+')) {
    return 0;
  }

  const parts = splitFormulaParts(formula);
  const topLevelGroups = groups.filter(
    (g) =>
      g.rowType === 'REPORT_GROUP' &&
      g.sectionL2 == null &&
      g.sectionL3 == null,
  );

  return parts.reduce((sum, part) => {
    const match = topLevelGroups.find((g) => partMatchesGroup(part, g, caseSensitive));
    return sum + (match?.amount ?? 0);
  }, 0);
}
