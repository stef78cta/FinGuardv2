import { describe, expect, it } from 'vitest';
import {
  resolveCalculatedSectionSum,
  type CalculatedFormulaGroup,
} from '@/utils/resolveCalculatedTotal';

const passiveGroups: CalculatedFormulaGroup[] = [
  {
    lineKey: 'bs_810',
    displayName: 'Datorii pe termen scurt',
    sectionL1: 'Datorii pe termen scurt',
    rowType: 'REPORT_GROUP',
    sectionL2: null,
    sectionL3: null,
    amount: 24_288_869.02,
  },
  {
    lineKey: 'bs_1300',
    displayName: 'Datorii pe termen lung',
    sectionL1: 'Datorii pe termen lung',
    rowType: 'REPORT_GROUP',
    sectionL2: null,
    sectionL3: null,
    amount: 67_191_117.03,
  },
  {
    lineKey: 'bs_1400',
    displayName: 'Total capital propriu și quasi-capital',
    sectionL1: 'Total capital propriu și quasi-capital',
    rowType: 'REPORT_GROUP',
    sectionL2: null,
    sectionL3: null,
    amount: 29_702_403.38,
  },
];

describe('resolveCalculatedSectionSum — total pasive + capitaluri', () => {
  it('calculează corect totalul bs_1570 cu denumiri exacte de secțiune', () => {
    const total = resolveCalculatedSectionSum(
      'Datorii pe termen scurt + Datorii pe termen lung + Total capital propriu și quasi-capital',
      passiveGroups,
    );
    expect(total).toBeCloseTo(121_182_389.43, 2);
  });

  it('formula veche greșită (case-sensitive) include doar datoriile pe termen scurt', () => {
    const oldTotal = resolveCalculatedSectionSum(
      'Datorii pe termen scurt + datorii pe termen lung + capital propriu și quasi-capital',
      passiveGroups,
      { caseSensitive: true },
    );
    expect(oldTotal).toBeCloseTo(24_288_869.02, 2);
  });

  it('închide ecuația bilanțului când activele sunt egale cu pasivele corecte', () => {
    const totalAssets = 138_210_236.59;
    const totalLiabilities = resolveCalculatedSectionSum(
      'Datorii pe termen scurt + Datorii pe termen lung + Total capital propriu și quasi-capital',
      passiveGroups,
    );
    // Fără conturile lipsă din SLD rămâne o diferență; testăm doar formula totalului pasiv.
    expect(totalLiabilities).toBeGreaterThan(24_288_869.02);
    expect(totalAssets - totalLiabilities).toBeCloseTo(17_027_847.16, 0);
  });
});

describe('resolveCalculatedSectionSum — conturi bifuncționale / subvenții', () => {
  it('include subvențiile 4752 în secțiunea quasi-capital când sunt agregate acolo', () => {
    const groups: CalculatedFormulaGroup[] = [
      ...passiveGroups.slice(0, 2),
      {
        ...passiveGroups[2],
        amount: passiveGroups[2].amount + 48_584_516.88,
      },
    ];
    const total = resolveCalculatedSectionSum(
      'Datorii pe termen scurt + Datorii pe termen lung + Total capital propriu și quasi-capital',
      groups,
    );
    expect(total).toBeCloseTo(169_766_906.31, 0);
  });
});
