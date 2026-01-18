import { useMemo } from 'react';
import { BalanceAccount } from './useBalante';

// Romanian Chart of Accounts mappings
const getAccountClass = (code: string): string => code.charAt(0);

// Class 1: Capital accounts
// Class 2: Fixed assets (Imobilizari)
// Class 3: Inventories (Stocuri)
// Class 4: Third parties (Terti) - includes receivables & payables
// Class 5: Treasury (Trezorerie) - cash & banks
// Class 6: Expenses (Cheltuieli)
// Class 7: Revenues (Venituri)

export interface BilantData {
  active: {
    imobilizate: {
      corporale: number; // 21x
      necorporale: number; // 20x
      financiare: number; // 26x-27x
      subtotal: number;
    };
    circulante: {
      stocuri: number; // 3xx
      creante: number; // 4xxx clients
      casaBanci: number; // 5xx
      subtotal: number;
    };
    total: number;
  };
  pasive: {
    capitaluri: {
      capitalSocial: number; // 101
      rezerve: number; // 106
      profitPierdere: number; // 121
      subtotal: number;
    };
    datorii: {
      termenLung: number; // 16x
      termenScurt: number; // 40x-46x
      subtotal: number;
    };
    total: number;
  };
}

export interface ProfitPierdereData {
  venituri: {
    vanzari: number; // 701-708
    altele: number; // 74x-78x
    total: number;
  };
  cheltuieli: {
    materiale: number; // 60x
    personal: number; // 64x
    altele: number; // 61x, 62x, 65x-68x
    total: number;
  };
  rezultatBrut: number;
  impozit: number; // 691
  rezultatNet: number;
}

export interface CashFlowData {
  operational: {
    incasariClienti: number;
    platiFurnizori: number;
    platiSalarii: number;
    flux: number;
  };
  investitii: {
    achizitiiImobilizari: number;
    vanzariImobilizari: number;
    flux: number;
  };
  finantare: {
    imprumuturiPrimite: number;
    rambursari: number;
    flux: number;
  };
  variatieNeta: number;
  numerarInceput: number;
  numerarSfarsit: number;
}

// Helper functions for account classification
const isAccountInRange = (code: string, start: string, end: string): boolean => {
  const numCode = parseInt(code);
  const numStart = parseInt(start);
  const numEnd = parseInt(end);
  return numCode >= numStart && numCode <= numEnd;
};

const startsWith = (code: string, prefix: string): boolean => code.startsWith(prefix);

// Get closing balance (debit - credit or credit - debit based on account class)
const getClosingBalance = (acc: BalanceAccount): number => {
  const debit = acc.closing_debit || 0;
  const credit = acc.closing_credit || 0;
  const classNum = getAccountClass(acc.account_code);
  
  // Active accounts (classes 2, 3, 5, 6): balance is debit
  // Passive accounts (classes 1, 4-payables, 7): balance is credit
  if (['2', '3', '5', '6'].includes(classNum)) {
    return debit - credit;
  }
  return credit - debit;
};

const getOpeningBalance = (acc: BalanceAccount): number => {
  const debit = acc.opening_debit || 0;
  const credit = acc.opening_credit || 0;
  const classNum = getAccountClass(acc.account_code);
  
  if (['2', '3', '5', '6'].includes(classNum)) {
    return debit - credit;
  }
  return credit - debit;
};

export const useFinancialCalculations = (accounts: BalanceAccount[]) => {
  const bilantData = useMemo((): BilantData => {
    if (!accounts || accounts.length === 0) {
      return {
        active: {
          imobilizate: { corporale: 0, necorporale: 0, financiare: 0, subtotal: 0 },
          circulante: { stocuri: 0, creante: 0, casaBanci: 0, subtotal: 0 },
          total: 0,
        },
        pasive: {
          capitaluri: { capitalSocial: 0, rezerve: 0, profitPierdere: 0, subtotal: 0 },
          datorii: { termenLung: 0, termenScurt: 0, subtotal: 0 },
          total: 0,
        },
      };
    }

    // Active imobilizate
    const corporale = accounts
      .filter(a => startsWith(a.account_code, '21'))
      .reduce((sum, a) => sum + Math.abs(getClosingBalance(a)), 0);
    
    const necorporale = accounts
      .filter(a => startsWith(a.account_code, '20'))
      .reduce((sum, a) => sum + Math.abs(getClosingBalance(a)), 0);
    
    const financiare = accounts
      .filter(a => startsWith(a.account_code, '26') || startsWith(a.account_code, '27'))
      .reduce((sum, a) => sum + Math.abs(getClosingBalance(a)), 0);

    // Active circulante
    const stocuri = accounts
      .filter(a => getAccountClass(a.account_code) === '3')
      .reduce((sum, a) => sum + Math.abs(getClosingBalance(a)), 0);
    
    const creante = accounts
      .filter(a => startsWith(a.account_code, '41') || startsWith(a.account_code, '46'))
      .reduce((sum, a) => sum + Math.abs(getClosingBalance(a)), 0);
    
    const casaBanci = accounts
      .filter(a => getAccountClass(a.account_code) === '5')
      .reduce((sum, a) => sum + Math.abs(getClosingBalance(a)), 0);

    // Capitaluri proprii
    const capitalSocial = accounts
      .filter(a => startsWith(a.account_code, '101'))
      .reduce((sum, a) => sum + Math.abs(getClosingBalance(a)), 0);
    
    const rezerve = accounts
      .filter(a => startsWith(a.account_code, '106') || startsWith(a.account_code, '107'))
      .reduce((sum, a) => sum + Math.abs(getClosingBalance(a)), 0);
    
    const profitPierdere = accounts
      .filter(a => startsWith(a.account_code, '121'))
      .reduce((sum, a) => sum + getClosingBalance(a), 0);

    // Datorii
    const termenLung = accounts
      .filter(a => startsWith(a.account_code, '16'))
      .reduce((sum, a) => sum + Math.abs(getClosingBalance(a)), 0);
    
    const termenScurt = accounts
      .filter(a => 
        startsWith(a.account_code, '40') || 
        startsWith(a.account_code, '42') || 
        startsWith(a.account_code, '44') ||
        startsWith(a.account_code, '45')
      )
      .reduce((sum, a) => sum + Math.abs(getClosingBalance(a)), 0);

    const imobilizateSubtotal = corporale + necorporale + financiare;
    const circulanteSubtotal = stocuri + creante + casaBanci;
    const capitaluriSubtotal = capitalSocial + rezerve + profitPierdere;
    const datoriiSubtotal = termenLung + termenScurt;

    return {
      active: {
        imobilizate: {
          corporale,
          necorporale,
          financiare,
          subtotal: imobilizateSubtotal,
        },
        circulante: {
          stocuri,
          creante,
          casaBanci,
          subtotal: circulanteSubtotal,
        },
        total: imobilizateSubtotal + circulanteSubtotal,
      },
      pasive: {
        capitaluri: {
          capitalSocial,
          rezerve,
          profitPierdere,
          subtotal: capitaluriSubtotal,
        },
        datorii: {
          termenLung,
          termenScurt,
          subtotal: datoriiSubtotal,
        },
        total: capitaluriSubtotal + datoriiSubtotal,
      },
    };
  }, [accounts]);

  const profitPierdereData = useMemo((): ProfitPierdereData => {
    if (!accounts || accounts.length === 0) {
      return {
        venituri: { vanzari: 0, altele: 0, total: 0 },
        cheltuieli: { materiale: 0, personal: 0, altele: 0, total: 0 },
        rezultatBrut: 0,
        impozit: 0,
        rezultatNet: 0,
      };
    }

    // Venituri
    const vanzari = accounts
      .filter(a => isAccountInRange(a.account_code, '701', '708'))
      .reduce((sum, a) => sum + (a.credit_turnover || 0), 0);
    
    const alteVenituri = accounts
      .filter(a => 
        isAccountInRange(a.account_code, '741', '789') ||
        isAccountInRange(a.account_code, '711', '722')
      )
      .reduce((sum, a) => sum + (a.credit_turnover || 0), 0);

    // Cheltuieli
    const materiale = accounts
      .filter(a => startsWith(a.account_code, '60'))
      .reduce((sum, a) => sum + (a.debit_turnover || 0), 0);
    
    const personal = accounts
      .filter(a => startsWith(a.account_code, '64'))
      .reduce((sum, a) => sum + (a.debit_turnover || 0), 0);
    
    const alteCheltuieli = accounts
      .filter(a => 
        startsWith(a.account_code, '61') ||
        startsWith(a.account_code, '62') ||
        startsWith(a.account_code, '63') ||
        startsWith(a.account_code, '65') ||
        startsWith(a.account_code, '66') ||
        startsWith(a.account_code, '67') ||
        startsWith(a.account_code, '68')
      )
      .reduce((sum, a) => sum + (a.debit_turnover || 0), 0);

    const impozit = accounts
      .filter(a => startsWith(a.account_code, '691'))
      .reduce((sum, a) => sum + (a.debit_turnover || 0), 0);

    const totalVenituri = vanzari + alteVenituri;
    const totalCheltuieli = materiale + personal + alteCheltuieli;
    const rezultatBrut = totalVenituri - totalCheltuieli;
    const rezultatNet = rezultatBrut - impozit;

    return {
      venituri: {
        vanzari,
        altele: alteVenituri,
        total: totalVenituri,
      },
      cheltuieli: {
        materiale,
        personal,
        altele: alteCheltuieli,
        total: totalCheltuieli,
      },
      rezultatBrut,
      impozit,
      rezultatNet,
    };
  }, [accounts]);

  const cashFlowData = useMemo((): CashFlowData => {
    if (!accounts || accounts.length === 0) {
      return {
        operational: { incasariClienti: 0, platiFurnizori: 0, platiSalarii: 0, flux: 0 },
        investitii: { achizitiiImobilizari: 0, vanzariImobilizari: 0, flux: 0 },
        finantare: { imprumuturiPrimite: 0, rambursari: 0, flux: 0 },
        variatieNeta: 0,
        numerarInceput: 0,
        numerarSfarsit: 0,
      };
    }

    // Cash accounts (5xx)
    const cashAccounts = accounts.filter(a => getAccountClass(a.account_code) === '5');
    const numerarInceput = cashAccounts.reduce((sum, a) => sum + getOpeningBalance(a), 0);
    const numerarSfarsit = cashAccounts.reduce((sum, a) => sum + getClosingBalance(a), 0);

    // Operational - estimated from turnovers
    const incasariClienti = accounts
      .filter(a => startsWith(a.account_code, '41'))
      .reduce((sum, a) => sum + (a.credit_turnover || 0), 0);
    
    const platiFurnizori = accounts
      .filter(a => startsWith(a.account_code, '40'))
      .reduce((sum, a) => sum + (a.debit_turnover || 0), 0);
    
    const platiSalarii = accounts
      .filter(a => startsWith(a.account_code, '42'))
      .reduce((sum, a) => sum + (a.debit_turnover || 0), 0);

    const fluxOperational = incasariClienti - platiFurnizori - platiSalarii;

    // Investitii - fixed assets changes
    const achizitiiImobilizari = accounts
      .filter(a => getAccountClass(a.account_code) === '2')
      .reduce((sum, a) => sum + (a.debit_turnover || 0), 0);
    
    const vanzariImobilizari = accounts
      .filter(a => getAccountClass(a.account_code) === '2')
      .reduce((sum, a) => sum + (a.credit_turnover || 0), 0);

    const fluxInvestitii = vanzariImobilizari - achizitiiImobilizari;

    // Finantare - loans
    const imprumuturiPrimite = accounts
      .filter(a => startsWith(a.account_code, '16'))
      .reduce((sum, a) => sum + (a.credit_turnover || 0), 0);
    
    const rambursari = accounts
      .filter(a => startsWith(a.account_code, '16'))
      .reduce((sum, a) => sum + (a.debit_turnover || 0), 0);

    const fluxFinantare = imprumuturiPrimite - rambursari;

    const variatieNeta = fluxOperational + fluxInvestitii + fluxFinantare;

    return {
      operational: {
        incasariClienti,
        platiFurnizori: -platiFurnizori,
        platiSalarii: -platiSalarii,
        flux: fluxOperational,
      },
      investitii: {
        achizitiiImobilizari: -achizitiiImobilizari,
        vanzariImobilizari,
        flux: fluxInvestitii,
      },
      finantare: {
        imprumuturiPrimite,
        rambursari: -rambursari,
        flux: fluxFinantare,
      },
      variatieNeta,
      numerarInceput,
      numerarSfarsit,
    };
  }, [accounts]);

  // KPI calculations
  const kpiData = useMemo(() => {
    const { active, pasive } = bilantData;
    const { venituri, cheltuieli, rezultatNet } = profitPierdereData;

    // Avoid division by zero
    const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);

    // Liquidity ratios
    const rataCurenta = safeDiv(active.circulante.subtotal, pasive.datorii.termenScurt);
    const rataRapida = safeDiv(
      active.circulante.subtotal - active.circulante.stocuri,
      pasive.datorii.termenScurt
    );
    const cashRatio = safeDiv(active.circulante.casaBanci, pasive.datorii.termenScurt);

    // Profitability ratios
    const marjaProfitului = safeDiv(rezultatNet, venituri.total) * 100;
    const roa = safeDiv(rezultatNet, active.total) * 100;
    const roe = safeDiv(rezultatNet, pasive.capitaluri.subtotal) * 100;

    // Leverage ratios
    const debtToEquity = safeDiv(pasive.datorii.subtotal, pasive.capitaluri.subtotal);
    const gradIndatorare = safeDiv(pasive.datorii.subtotal, active.total) * 100;

    // Efficiency ratios
    const rotatiaActivelor = safeDiv(venituri.total, active.total);

    return {
      liquidity: { rataCurenta, rataRapida, cashRatio },
      profitability: { marjaProfitului, roa, roe },
      leverage: { debtToEquity, gradIndatorare },
      efficiency: { rotatiaActivelor },
    };
  }, [bilantData, profitPierdereData]);

  return {
    bilantData,
    profitPierdereData,
    cashFlowData,
    kpiData,
  };
};
