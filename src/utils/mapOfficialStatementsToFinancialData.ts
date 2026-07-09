import type { Database } from '@/integrations/supabase/types';
import type {
  BilantData,
  CashFlowData,
  ProfitPierdereData,
} from '@/hooks/useFinancialCalculations.types';

type BalanceSheetLineRow = Database['public']['Tables']['balance_sheet_lines']['Row'];
type IncomeStatementLineRow = Database['public']['Tables']['income_statement_lines']['Row'];
type CashFlowLineRow = Database['public']['Tables']['cash_flow_lines']['Row'];

const EMPTY_BILANT: BilantData = {
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

const EMPTY_PL: ProfitPierdereData = {
  venituri: { vanzari: 0, altele: 0, total: 0 },
  cheltuieli: { materiale: 0, personal: 0, altele: 0, total: 0 },
  rezultatBrut: 0,
  impozit: 0,
  rezultatNet: 0,
};

const EMPTY_CF: CashFlowData = {
  operational: { incasariClienti: 0, platiFurnizori: 0, platiSalarii: 0, flux: 0 },
  investitii: { achizitiiImobilizari: 0, vanzariImobilizari: 0, flux: 0 },
  finantare: { imprumuturiPrimite: 0, rambursari: 0, flux: 0 },
  variatieNeta: 0,
  numerarInceput: 0,
  numerarSfarsit: 0,
};

function amountByLineKey<T extends { line_key: string; amount: number }>(
  lines: T[],
  lineKey: string,
): number {
  return lines.find((line) => line.line_key === lineKey)?.amount ?? 0;
}

/**
 * Mapează liniile generate de pipeline-ul SQL oficial în structurile folosite de
 * Dashboard, KPI și analize comparative — o singură sursă de adevăr.
 */
export function mapOfficialStatementsToFinancialData(input: {
  balanceSheetLines: BalanceSheetLineRow[];
  incomeStatementLines: IncomeStatementLineRow[];
  cashFlowLines: CashFlowLineRow[];
}): {
  bilantData: BilantData;
  profitPierdereData: ProfitPierdereData;
  cashFlowData: CashFlowData;
} {
  const { balanceSheetLines: bs, incomeStatementLines: pl, cashFlowLines: cf } = input;

  if (bs.length === 0 && pl.length === 0) {
    return {
      bilantData: EMPTY_BILANT,
      profitPierdereData: EMPTY_PL,
      cashFlowData: EMPTY_CF,
    };
  }

  const corporale = amountByLineKey(bs, 'bs_110');
  const necorporale = amountByLineKey(bs, 'bs_20');
  const financiare = amountByLineKey(bs, 'bs_80');
  const imobilizateSubtotal = amountByLineKey(bs, 'bs_10') || corporale + necorporale + financiare;

  const stocuri = amountByLineKey(bs, 'bs_310');
  const creante = amountByLineKey(bs, 'bs_490');
  const casaBanci = amountByLineKey(bs, 'bs_670');
  const circulanteSubtotal = amountByLineKey(bs, 'bs_300') || stocuri + creante + casaBanci;

  const totalActive = amountByLineKey(bs, 'bs_805');

  const capitalSocial = amountByLineKey(bs, 'bs_1560') || amountByLineKey(bs, 'bs_1550');
  const rezerve = amountByLineKey(bs, 'bs_1460');
  const profitPierdere = amountByLineKey(bs, 'bs_1450');
  const capitaluriSubtotal = amountByLineKey(bs, 'bs_1400') || capitalSocial + rezerve + profitPierdere;

  const termenLung = amountByLineKey(bs, 'bs_1300');
  const termenScurt = amountByLineKey(bs, 'bs_810');
  const datoriiSubtotal = termenLung + termenScurt;
  const totalPasive = amountByLineKey(bs, 'bs_1570') || capitaluriSubtotal + datoriiSubtotal;

  const bilantData: BilantData = {
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
      total: totalActive,
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
      total: totalPasive,
    },
  };

  const venituriTotale = amountByLineKey(pl, 'pl_1580');
  const vanzari = amountByLineKey(pl, 'pl_1590') || venituriTotale;
  const alteVenituri = Math.max(0, venituriTotale - vanzari);

  const cheltuieliTotale = amountByLineKey(pl, 'pl_1710');
  const materiale = amountByLineKey(pl, 'pl_1720');
  const personal = amountByLineKey(pl, 'pl_1990');
  const alteCheltuieli = Math.max(0, cheltuieliTotale - materiale - personal);

  const rezultatBrut = amountByLineKey(pl, 'pl_2440') || venituriTotale - cheltuieliTotale;
  const impozit =
    amountByLineKey(pl, 'pl_2460') +
    amountByLineKey(pl, 'pl_2470');
  const rezultatNet = amountByLineKey(pl, 'pl_2480') || rezultatBrut - impozit;

  const profitPierdereData: ProfitPierdereData = {
    venituri: {
      vanzari,
      altele: alteVenituri,
      total: venituriTotale,
    },
    cheltuieli: {
      materiale,
      personal,
      altele: alteCheltuieli,
      total: cheltuieliTotale,
    },
    rezultatBrut,
    impozit,
    rezultatNet,
  };

  const incasariClienti = cf
    .filter((line) => line.cash_flow_area === 'operating' && line.amount > 0)
    .reduce((sum, line) => sum + line.amount, 0);
  const platiOperational = cf
    .filter((line) => line.cash_flow_area === 'operating' && line.amount < 0)
    .reduce((sum, line) => sum + Math.abs(line.amount), 0);

  const fluxOperational = cf
    .filter((line) => line.section === 'operating' || line.cash_flow_area === 'operating')
    .reduce((sum, line) => sum + line.amount, 0);

  const fluxInvestitii = cf
    .filter((line) => line.cash_flow_area === 'investing' || line.section === 'investing')
    .reduce((sum, line) => sum + line.amount, 0);

  const fluxFinantare = cf
    .filter((line) => line.cash_flow_area === 'financing' || line.section === 'financing')
    .reduce((sum, line) => sum + line.amount, 0);

  const numerarInceput = amountByLineKey(
    cf.filter((l) => l.line_key.includes('opening') || l.description?.toLowerCase().includes('inițial')),
    cf.find((l) => l.description?.toLowerCase().includes('sold inițial'))?.line_key ?? '',
  );
  const numerarSfarsit = amountByLineKey(
    cf,
    cf.find((l) => l.description?.toLowerCase().includes('sold final'))?.line_key ?? '',
  );

  const cashFlowData: CashFlowData = {
    operational: {
      incasariClienti,
      platiFurnizori: -platiOperational * 0.4,
      platiSalarii: -platiOperational * 0.3,
      flux: fluxOperational || incasariClienti - platiOperational,
    },
    investitii: {
      achizitiiImobilizari: fluxInvestitii < 0 ? fluxInvestitii : 0,
      vanzariImobilizari: fluxInvestitii > 0 ? fluxInvestitii : 0,
      flux: fluxInvestitii,
    },
    finantare: {
      imprumuturiPrimite: fluxFinantare > 0 ? fluxFinantare : 0,
      rambursari: fluxFinantare < 0 ? fluxFinantare : 0,
      flux: fluxFinantare,
    },
    variatieNeta: fluxOperational + fluxInvestitii + fluxFinantare,
    numerarInceput,
    numerarSfarsit,
  };

  return { bilantData, profitPierdereData, cashFlowData };
}

export function computeKpiFromFinancialData(
  bilantData: BilantData,
  profitPierdereData: ProfitPierdereData,
) {
  const { active, pasive } = bilantData;
  const { venituri, rezultatNet } = profitPierdereData;

  const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);

  return {
    liquidity: {
      rataCurenta: safeDiv(active.circulante.subtotal, pasive.datorii.termenScurt),
      rataRapida: safeDiv(
        active.circulante.subtotal - active.circulante.stocuri,
        pasive.datorii.termenScurt,
      ),
      cashRatio: safeDiv(active.circulante.casaBanci, pasive.datorii.termenScurt),
    },
    profitability: {
      marjaProfitului: safeDiv(rezultatNet, venituri.total) * 100,
      roa: safeDiv(rezultatNet, active.total) * 100,
      roe: safeDiv(rezultatNet, pasive.capitaluri.subtotal) * 100,
    },
    leverage: {
      debtToEquity: safeDiv(pasive.datorii.subtotal, pasive.capitaluri.subtotal),
      gradIndatorare: safeDiv(pasive.datorii.subtotal, active.total) * 100,
    },
    efficiency: {
      rotatiaActivelor: safeDiv(venituri.total, active.total),
    },
  };
}
