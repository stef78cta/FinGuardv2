export interface BilantData {
  active: {
    imobilizate: {
      corporale: number;
      necorporale: number;
      financiare: number;
      subtotal: number;
    };
    circulante: {
      stocuri: number;
      creante: number;
      casaBanci: number;
      subtotal: number;
    };
    total: number;
  };
  pasive: {
    capitaluri: {
      capitalSocial: number;
      rezerve: number;
      profitPierdere: number;
      subtotal: number;
    };
    datorii: {
      termenLung: number;
      termenScurt: number;
      subtotal: number;
    };
    total: number;
  };
}

export interface ProfitPierdereData {
  venituri: {
    vanzari: number;
    altele: number;
    total: number;
  };
  cheltuieli: {
    materiale: number;
    personal: number;
    altele: number;
    total: number;
  };
  rezultatBrut: number;
  impozit: number;
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
