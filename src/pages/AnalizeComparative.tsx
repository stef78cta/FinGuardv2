import { useState } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Plus, 
  X, 
  Printer, 
  FileSpreadsheet, 
  FileText, 
  Mail,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  Target,
  DollarSign,
  Scale,
  Activity,
  Percent
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ============= INTERFACES & TYPES =============

interface PeriodSelection {
  month: string;
  year: string;
  label: string;
}

interface KPIValue {
  period: string;
  value: number;
  variation: number | null;
  variationPercent: number | null;
}

interface KPIData {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  values: KPIValue[];
}

interface ComparativeRow {
  label: string;
  indent: number;
  isSubtotal: boolean;
  isTotal: boolean;
  values: number[];
  variations: {
    absolute: number | null;
    percent: number | null;
  }[];
}

interface ComparativeSection {
  title: string;
  subsections: ComparativeRow[];
}

// ============= CONSTANTS =============

const monthOptions = [
  { value: "1", label: "Ianuarie" },
  { value: "2", label: "Februarie" },
  { value: "3", label: "Martie" },
  { value: "4", label: "Aprilie" },
  { value: "5", label: "Mai" },
  { value: "6", label: "Iunie" },
  { value: "7", label: "Iulie" },
  { value: "8", label: "August" },
  { value: "9", label: "Septembrie" },
  { value: "10", label: "Octombrie" },
  { value: "11", label: "Noiembrie" },
  { value: "12", label: "Decembrie" }
];

// ============= UTILITY FUNCTIONS =============

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatKPIValue = (value: number, kpiType: string): string => {
  if (kpiType.includes('ROA') || kpiType.includes('ROE') || kpiType.includes('Marja')) {
    return `${value.toFixed(2)}%`;
  }
  return value.toFixed(2);
};

const getMonthName = (monthNumber: string): string => {
  return monthOptions.find(m => m.value === monthNumber)?.label || '';
};

const calculateVariations = (values: number[]): { absolute: number | null; percent: number | null }[] => {
  return values.map((val, idx) => {
    if (idx === 0) return { absolute: null, percent: null };
    
    const prevVal = values[idx - 1];
    const absolute = val - prevVal;
    const percent = prevVal !== 0 ? (absolute / Math.abs(prevVal)) * 100 : 0;
    
    return { absolute, percent };
  });
};

// ============= MOCK DATA GENERATORS =============

const generateKPIData = (periods: PeriodSelection[]): KPIData[] => {
  return [
    {
      label: "Rata Curentă",
      description: "Active curente / Datorii curente",
      icon: TrendingUp,
      values: periods.map((p, idx) => {
        const baseValue = 2.85;
        const value = baseValue + (idx * 0.10);
        const prevValue = idx > 0 ? baseValue + ((idx - 1) * 0.10) : null;
        
        return {
          period: p.label,
          value: value,
          variation: prevValue ? value - prevValue : null,
          variationPercent: prevValue ? ((value - prevValue) / prevValue) * 100 : null
        };
      })
    },
    {
      label: "Marja Profitului",
      description: "Profit net / Cifra de afaceri",
      icon: Percent,
      values: periods.map((p, idx) => {
        const baseValue = 13.21;
        const value = baseValue + (idx * 0.54);
        const prevValue = idx > 0 ? baseValue + ((idx - 1) * 0.54) : null;
        
        return {
          period: p.label,
          value: value,
          variation: prevValue ? value - prevValue : null,
          variationPercent: prevValue ? ((value - prevValue) / prevValue) * 100 : null
        };
      })
    },
    {
      label: "Debt-to-Equity",
      description: "Datorii totale / Capital propriu",
      icon: Scale,
      values: periods.map((p, idx) => {
        const baseValue = 0.90;
        const value = baseValue + (idx * 0.03);
        const prevValue = idx > 0 ? baseValue + ((idx - 1) * 0.03) : null;
        
        return {
          period: p.label,
          value: value,
          variation: prevValue ? value - prevValue : null,
          variationPercent: prevValue ? ((value - prevValue) / prevValue) * 100 : null
        };
      })
    },
    {
      label: "ROA",
      description: "Return on Assets",
      icon: Target,
      values: periods.map((p, idx) => {
        const baseValue = 23.03;
        const value = baseValue + (idx * 1.26);
        const prevValue = idx > 0 ? baseValue + ((idx - 1) * 1.26) : null;
        
        return {
          period: p.label,
          value: value,
          variation: prevValue ? value - prevValue : null,
          variationPercent: prevValue ? ((value - prevValue) / prevValue) * 100 : null
        };
      })
    },
    {
      label: "ROE",
      description: "Return on Equity",
      icon: Activity,
      values: periods.map((p, idx) => {
        const baseValue = 43.75;
        const value = baseValue + (idx * 3.09);
        const prevValue = idx > 0 ? baseValue + ((idx - 1) * 3.09) : null;
        
        return {
          period: p.label,
          value: value,
          variation: prevValue ? value - prevValue : null,
          variationPercent: prevValue ? ((value - prevValue) / prevValue) * 100 : null
        };
      })
    }
  ];
};

const generateBilantData = (periods: PeriodSelection[]): ComparativeSection[] => {
  const baseData = {
    casa: 17200,
    banca: 272000,
    creante: 197400,
    stocuri: 51700,
    imobCorp: 908000,
    imobNecorp: 27500,
    investitii: 111000,
    furnizori: 111000,
    fiscale: 39140,
    salarii: 30200,
    credite: 425000,
    datoriiTL: 81700
  };

  const sections: ComparativeSection[] = [
    {
      title: "ACTIVE",
      subsections: []
    },
    {
      title: "DATORII",
      subsections: []
    }
  ];

  // ACTIVE circulante
  const activeCirculanteValues = periods.map((_, idx) => {
    const casa = baseData.casa * (1 + idx * 0.058);
    const banca = baseData.banca * (1 + idx * 0.040);
    const creante = baseData.creante * (1 + idx * 0.009);
    const stocuri = baseData.stocuri * (1 + idx * 0.056);
    return casa + banca + creante + stocuri;
  });

  sections[0].subsections.push(
    { label: "Active circulante", indent: 0, isSubtotal: false, isTotal: false, values: activeCirculanteValues, variations: calculateVariations(activeCirculanteValues) },
    { 
      label: "Casa și echivalente", 
      indent: 1, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.casa * (1 + idx * 0.058)),
      variations: calculateVariations(periods.map((_, idx) => baseData.casa * (1 + idx * 0.058)))
    },
    { 
      label: "Conturi de bancă", 
      indent: 1, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.banca * (1 + idx * 0.040)),
      variations: calculateVariations(periods.map((_, idx) => baseData.banca * (1 + idx * 0.040)))
    },
    { 
      label: "Clienți și alte creanțe", 
      indent: 1, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.creante * (1 + idx * 0.009)),
      variations: calculateVariations(periods.map((_, idx) => baseData.creante * (1 + idx * 0.009)))
    },
    { 
      label: "Stocuri", 
      indent: 1, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.stocuri * (1 + idx * 0.056)),
      variations: calculateVariations(periods.map((_, idx) => baseData.stocuri * (1 + idx * 0.056)))
    },
    { 
      label: "Total active circulante", 
      indent: 0, 
      isSubtotal: true, 
      isTotal: false, 
      values: activeCirculanteValues,
      variations: calculateVariations(activeCirculanteValues)
    }
  );

  // ACTIVE imobilizate
  const activeImobilizateValues = periods.map((_, idx) => {
    const corp = baseData.imobCorp * (1 + idx * 0.0075);
    const necorp = baseData.imobNecorp * (1 + idx * 0.025);
    const inv = baseData.investitii * (1 + idx * 0.016);
    return corp + necorp + inv;
  });

  sections[0].subsections.push(
    { label: "Active imobilizate", indent: 0, isSubtotal: false, isTotal: false, values: activeImobilizateValues, variations: calculateVariations(activeImobilizateValues) },
    { 
      label: "Imobilizări corporale", 
      indent: 1, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.imobCorp * (1 + idx * 0.0075)),
      variations: calculateVariations(periods.map((_, idx) => baseData.imobCorp * (1 + idx * 0.0075)))
    },
    { 
      label: "Imobilizări necorporale", 
      indent: 1, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.imobNecorp * (1 + idx * 0.025)),
      variations: calculateVariations(periods.map((_, idx) => baseData.imobNecorp * (1 + idx * 0.025)))
    },
    { 
      label: "Investiții financiare", 
      indent: 1, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.investitii * (1 + idx * 0.016)),
      variations: calculateVariations(periods.map((_, idx) => baseData.investitii * (1 + idx * 0.016)))
    },
    { 
      label: "Total active imobilizate", 
      indent: 0, 
      isSubtotal: true, 
      isTotal: false, 
      values: activeImobilizateValues,
      variations: calculateVariations(activeImobilizateValues)
    }
  );

  // TOTAL ACTIVE
  const totalActiveValues = periods.map((_, idx) => activeCirculanteValues[idx] + activeImobilizateValues[idx]);
  sections[0].subsections.push(
    { 
      label: "TOTAL ACTIVE", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: true, 
      values: totalActiveValues,
      variations: calculateVariations(totalActiveValues)
    }
  );

  // DATORII curente
  const datoriiCurenteValues = periods.map((_, idx) => {
    const furn = baseData.furnizori * (1 + idx * 0.016);
    const fisc = baseData.fiscale * (1 + idx * 0.025);
    const sal = baseData.salarii * (1 + idx * 0.033);
    return furn + fisc + sal;
  });

  sections[1].subsections.push(
    { label: "Datorii curente", indent: 0, isSubtotal: false, isTotal: false, values: datoriiCurenteValues, variations: calculateVariations(datoriiCurenteValues) },
    { 
      label: "Furnizori și alte datorii", 
      indent: 1, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.furnizori * (1 + idx * 0.016)),
      variations: calculateVariations(periods.map((_, idx) => baseData.furnizori * (1 + idx * 0.016)))
    },
    { 
      label: "Datorii fiscale", 
      indent: 1, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.fiscale * (1 + idx * 0.025)),
      variations: calculateVariations(periods.map((_, idx) => baseData.fiscale * (1 + idx * 0.025)))
    },
    { 
      label: "Salarii de plată", 
      indent: 1, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.salarii * (1 + idx * 0.033)),
      variations: calculateVariations(periods.map((_, idx) => baseData.salarii * (1 + idx * 0.033)))
    },
    { 
      label: "Total datorii curente", 
      indent: 0, 
      isSubtotal: true, 
      isTotal: false, 
      values: datoriiCurenteValues,
      variations: calculateVariations(datoriiCurenteValues)
    }
  );

  // DATORII pe termen lung
  const datoriiTLValues = periods.map((_, idx) => {
    const cred = baseData.credite * (1 - idx * 0.029);
    const alte = baseData.datoriiTL * (1 + idx * 0.036);
    return cred + alte;
  });

  sections[1].subsections.push(
    { label: "Datorii pe termen lung", indent: 0, isSubtotal: false, isTotal: false, values: datoriiTLValues, variations: calculateVariations(datoriiTLValues) },
    { 
      label: "Credite bancare", 
      indent: 1, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.credite * (1 - idx * 0.029)),
      variations: calculateVariations(periods.map((_, idx) => baseData.credite * (1 - idx * 0.029)))
    },
    { 
      label: "Alte datorii pe termen lung", 
      indent: 1, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.datoriiTL * (1 + idx * 0.036)),
      variations: calculateVariations(periods.map((_, idx) => baseData.datoriiTL * (1 + idx * 0.036)))
    },
    { 
      label: "Total datorii pe termen lung", 
      indent: 0, 
      isSubtotal: true, 
      isTotal: false, 
      values: datoriiTLValues,
      variations: calculateVariations(datoriiTLValues)
    }
  );

  // TOTAL DATORII
  const totalDatoriiValues = periods.map((_, idx) => datoriiCurenteValues[idx] + datoriiTLValues[idx]);
  sections[1].subsections.push(
    { 
      label: "TOTAL DATORII", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: true, 
      values: totalDatoriiValues,
      variations: calculateVariations(totalDatoriiValues)
    }
  );

  return sections;
};

const generatePLData = (periods: PeriodSelection[]): ComparativeSection[] => {
  const baseData = {
    vanzari: 2624000,
    alteVenituri: 93700,
    venFin: 13740,
    materiiPrime: 1049600,
    personal: 696400,
    amortizare: 105000,
    alteCheltuieli: 420000,
    cheltFin: 19600
  };

  const sections: ComparativeSection[] = [
    {
      title: "VENITURI",
      subsections: []
    },
    {
      title: "CHELTUIELI OPERAȚIONALE",
      subsections: []
    }
  ];

  // VENITURI
  const totalVenituriValues = periods.map((_, idx) => {
    const vanz = baseData.vanzari * (1 + idx * 0.0069);
    const alte = baseData.alteVenituri * (1 + idx * 0.0096);
    const fin = baseData.venFin * (1 + idx * 0.013);
    return vanz + alte + fin;
  });

  sections[0].subsections.push(
    { 
      label: "Venituri din vânzări", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.vanzari * (1 + idx * 0.0069)),
      variations: calculateVariations(periods.map((_, idx) => baseData.vanzari * (1 + idx * 0.0069)))
    },
    { 
      label: "Alte venituri operaționale", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.alteVenituri * (1 + idx * 0.0096)),
      variations: calculateVariations(periods.map((_, idx) => baseData.alteVenituri * (1 + idx * 0.0096)))
    },
    { 
      label: "Venituri financiare", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.venFin * (1 + idx * 0.013)),
      variations: calculateVariations(periods.map((_, idx) => baseData.venFin * (1 + idx * 0.013)))
    },
    { 
      label: "TOTAL VENITURI", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: true, 
      values: totalVenituriValues,
      variations: calculateVariations(totalVenituriValues)
    }
  );

  // CHELTUIELI
  const totalCheltuieliValues = periods.map((_, idx) => {
    const mat = baseData.materiiPrime * (1 + idx * 0.0069);
    const pers = baseData.personal * (1 + idx * 0.0069);
    const amort = baseData.amortizare * (1 + idx * 0.0095);
    const alte = baseData.alteCheltuieli * (1 + idx * 0.0071);
    const fin = baseData.cheltFin * (1 + idx * 0.0092);
    return mat + pers + amort + alte + fin;
  });

  sections[1].subsections.push(
    { 
      label: "Cheltuieli cu materiile prime", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.materiiPrime * (1 + idx * 0.0069)),
      variations: calculateVariations(periods.map((_, idx) => baseData.materiiPrime * (1 + idx * 0.0069)))
    },
    { 
      label: "Cheltuieli cu personalul", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.personal * (1 + idx * 0.0069)),
      variations: calculateVariations(periods.map((_, idx) => baseData.personal * (1 + idx * 0.0069)))
    },
    { 
      label: "Cheltuieli cu amortizarea", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.amortizare * (1 + idx * 0.0095)),
      variations: calculateVariations(periods.map((_, idx) => baseData.amortizare * (1 + idx * 0.0095)))
    },
    { 
      label: "Alte cheltuieli operaționale", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.alteCheltuieli * (1 + idx * 0.0071)),
      variations: calculateVariations(periods.map((_, idx) => baseData.alteCheltuieli * (1 + idx * 0.0071)))
    },
    { 
      label: "Cheltuieli financiare", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.cheltFin * (1 + idx * 0.0092)),
      variations: calculateVariations(periods.map((_, idx) => baseData.cheltFin * (1 + idx * 0.0092)))
    },
    { 
      label: "TOTAL CHELTUIELI", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: true, 
      values: totalCheltuieliValues,
      variations: calculateVariations(totalCheltuieliValues)
    }
  );

  // PROFIT NET
  const profitNetValues = periods.map((_, idx) => totalVenituriValues[idx] - totalCheltuieliValues[idx]);
  sections[1].subsections.push(
    { 
      label: "PROFIT/PIERDERE NET", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: true, 
      values: profitNetValues,
      variations: calculateVariations(profitNetValues)
    }
  );

  return sections;
};

const generateCashFlowData = (periods: PeriodSelection[]): ComparativeSection[] => {
  const baseData = {
    incasari: 2562400,
    platiCatreFurnizori: 1267000,
    platiSalarii: 725300,
    platiTaxe: 204500,
    achizitiiImob: 167400,
    vanzariImob: 27900,
    dividende: 115000,
    crediteIncasate: 0,
    rambursariCredite: 180000
  };

  const sections: ComparativeSection[] = [
    {
      title: "FLUXURI DIN ACTIVITATEA OPERAȚIONALĂ",
      subsections: []
    },
    {
      title: "FLUXURI DIN ACTIVITATEA DE INVESTIȚII",
      subsections: []
    },
    {
      title: "FLUXURI DIN ACTIVITATEA DE FINANȚARE",
      subsections: []
    }
  ];

  // OPERAȚIONALĂ
  const fluxOperationalValues = periods.map((_, idx) => {
    const inc = baseData.incasari * (1 + idx * 0.0065);
    const furn = baseData.platiCatreFurnizori * (1 + idx * 0.022);
    const sal = baseData.platiSalarii * (1 + idx * 0.013);
    const taxe = baseData.platiTaxe * (1 + idx * 0.007);
    return inc - furn - sal - taxe;
  });

  sections[0].subsections.push(
    { 
      label: "Încasări de la clienți", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.incasari * (1 + idx * 0.0065)),
      variations: calculateVariations(periods.map((_, idx) => baseData.incasari * (1 + idx * 0.0065)))
    },
    { 
      label: "Plăți către furnizori", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => -baseData.platiCatreFurnizori * (1 + idx * 0.022)),
      variations: calculateVariations(periods.map((_, idx) => -baseData.platiCatreFurnizori * (1 + idx * 0.022)))
    },
    { 
      label: "Plăți salarii și contribuții", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => -baseData.platiSalarii * (1 + idx * 0.013)),
      variations: calculateVariations(periods.map((_, idx) => -baseData.platiSalarii * (1 + idx * 0.013)))
    },
    { 
      label: "Plăți taxe și impozite", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => -baseData.platiTaxe * (1 + idx * 0.007)),
      variations: calculateVariations(periods.map((_, idx) => -baseData.platiTaxe * (1 + idx * 0.007)))
    },
    { 
      label: "Flux net din activități operaționale", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: true, 
      values: fluxOperationalValues,
      variations: calculateVariations(fluxOperationalValues)
    }
  );

  // INVESTIȚII
  const fluxInvestitiiValues = periods.map((_, idx) => {
    const achiz = baseData.achizitiiImob * (1 + idx * 0.011);
    const vanz = baseData.vanzariImob * (1 + idx * 0.011);
    return vanz - achiz;
  });

  sections[1].subsections.push(
    { 
      label: "Achiziții imobilizări", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => -baseData.achizitiiImob * (1 + idx * 0.011)),
      variations: calculateVariations(periods.map((_, idx) => -baseData.achizitiiImob * (1 + idx * 0.011)))
    },
    { 
      label: "Vânzări imobilizări", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => baseData.vanzariImob * (1 + idx * 0.011)),
      variations: calculateVariations(periods.map((_, idx) => baseData.vanzariImob * (1 + idx * 0.011)))
    },
    { 
      label: "Flux net din activități de investiții", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: true, 
      values: fluxInvestitiiValues,
      variations: calculateVariations(fluxInvestitiiValues)
    }
  );

  // FINANȚARE
  const fluxFinantareValues = periods.map((_, idx) => {
    const div = baseData.dividende * (1 + idx * 0.009);
    const ramb = baseData.rambursariCredite * (1 - idx * 0.015);
    return -div - ramb;
  });

  sections[2].subsections.push(
    { 
      label: "Plată dividende", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => -baseData.dividende * (1 + idx * 0.009)),
      variations: calculateVariations(periods.map((_, idx) => -baseData.dividende * (1 + idx * 0.009)))
    },
    { 
      label: "Rambursări credite", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: false, 
      values: periods.map((_, idx) => -baseData.rambursariCredite * (1 - idx * 0.015)),
      variations: calculateVariations(periods.map((_, idx) => -baseData.rambursariCredite * (1 - idx * 0.015)))
    },
    { 
      label: "Flux net din activități de finanțare", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: true, 
      values: fluxFinantareValues,
      variations: calculateVariations(fluxFinantareValues)
    }
  );

  // VARIAȚIA NETĂ
  const variatieNetaValues = periods.map((_, idx) => fluxOperationalValues[idx] + fluxInvestitiiValues[idx] + fluxFinantareValues[idx]);
  sections[2].subsections.push(
    { 
      label: "VARIAȚIA NETĂ A NUMERARULUI", 
      indent: 0, 
      isSubtotal: false, 
      isTotal: true, 
      values: variatieNetaValues,
      variations: calculateVariations(variatieNetaValues)
    }
  );

  return sections;
};

// ============= MAIN COMPONENT =============

const AnalizeComparative = () => {
  const [periods, setPeriods] = useState<PeriodSelection[]>([
    { month: "12", year: "2024", label: "Decembrie 2024" },
    { month: "9", year: "2024", label: "Septembrie 2024" }
  ]);
  const [showThirdPeriod, setShowThirdPeriod] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [currentReportType, setCurrentReportType] = useState('');

  const updatePeriod = (index: number, field: 'month' | 'year', value: string) => {
    const newPeriods = [...periods];
    newPeriods[index] = { ...newPeriods[index], [field]: value };
    
    const monthName = getMonthName(newPeriods[index].month);
    newPeriods[index].label = `${monthName} ${newPeriods[index].year}`;
    
    setPeriods(newPeriods);
  };

  const addThirdPeriod = () => {
    setPeriods([...periods, { month: "6", year: "2024", label: "Iunie 2024" }]);
    setShowThirdPeriod(true);
  };

  const removeThirdPeriod = () => {
    setPeriods(periods.slice(0, 2));
    setShowThirdPeriod(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = (reportType: string) => {
    const wb = XLSX.utils.book_new();
    
    let data: any[][] = [];
    
    if (reportType === 'bilant') {
      const bilantData = generateBilantData(periods);
      data = [
        ['Bilanț Comparativ', ...periods.map(p => p.label), 'Variații'],
        []
      ];
      
      bilantData.forEach(section => {
        data.push([section.title]);
        section.subsections.forEach(row => {
          data.push([
            row.label,
            ...row.values.map(v => v),
            ...row.variations.map(v => v.percent !== null ? `${v.percent.toFixed(2)}%` : '-')
          ]);
        });
        data.push([]);
      });
    } else if (reportType === 'pl') {
      const plData = generatePLData(periods);
      data = [
        ['Profit și Pierdere Comparativ', ...periods.map(p => p.label), 'Variații'],
        []
      ];
      
      plData.forEach(section => {
        data.push([section.title]);
        section.subsections.forEach(row => {
          data.push([
            row.label,
            ...row.values.map(v => v),
            ...row.variations.map(v => v.percent !== null ? `${v.percent.toFixed(2)}%` : '-')
          ]);
        });
        data.push([]);
      });
    } else if (reportType === 'cashflow') {
      const cfData = generateCashFlowData(periods);
      data = [
        ['Cash Flow Comparativ', ...periods.map(p => p.label), 'Variații'],
        []
      ];
      
      cfData.forEach(section => {
        data.push([section.title]);
        section.subsections.forEach(row => {
          data.push([
            row.label,
            ...row.values.map(v => v),
            ...row.variations.map(v => v.percent !== null ? `${v.percent.toFixed(2)}%` : '-')
          ]);
        });
        data.push([]);
      });
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, reportType);
    XLSX.writeFile(wb, `AnalizeComparative_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Export reușit",
      description: "Raportul a fost exportat în Excel",
    });
  };

  const handleExportPDF = async (reportType: string) => {
    const reportElement = document.getElementById(`report-${reportType}`);
    if (!reportElement) return;

    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`AnalizeComparative_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "Export reușit",
        description: "Raportul a fost exportat în PDF",
      });
    } catch (error) {
      toast({
        title: "Eroare",
        description: "Eroare la generarea PDF-ului",
        variant: "destructive"
      });
    }
  };

  const handleEmailPDF = (reportType: string) => {
    setCurrentReportType(reportType);
    setEmailDialogOpen(true);
  };

  const sendEmailWithPDF = () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast({
        title: "Eroare",
        description: "Adresa de email invalidă",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Email trimis",
      description: `Raportul a fost trimis cu succes la ${recipientEmail}`,
    });
    
    setEmailDialogOpen(false);
    setRecipientEmail('');
  };

  const kpiData = generateKPIData(periods);
  const bilantData = generateBilantData(periods);
  const plData = generatePLData(periods);
  const cashFlowData = generateCashFlowData(periods);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Analize Comparative
        </h1>
        <p className="text-muted-foreground">
          Compară performanța financiară între diferite perioade
        </p>
      </div>

      {/* Period Selector */}
      <Card className="mb-6 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Selectare Perioade
          </h2>
          <p className="text-sm text-muted-foreground">
            Alege până la 3 perioade pentru comparație
          </p>
        </div>

        <div className="flex flex-col md:flex-row flex-wrap items-start md:items-end gap-4">
          {periods.map((period, idx) => (
            <div key={idx} className="flex-1 min-w-[250px]">
              <Label className="text-sm font-medium mb-2 block">
                Perioada {idx + 1}
              </Label>
              <div className="flex gap-2">
                <Select
                  value={period.month}
                  onValueChange={(val) => updatePeriod(idx, 'month', val)}
                >
                  <SelectTrigger className="w-[140px]">
                    <Calendar className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Lună" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  min="2020"
                  max="2100"
                  value={period.year}
                  onChange={(e) => updatePeriod(idx, 'year', e.target.value)}
                  className="w-[100px]"
                  placeholder="An"
                />
              </div>
            </div>
          ))}

          {!showThirdPeriod && periods.length < 3 && (
            <Button
              variant="outline"
              onClick={addThirdPeriod}
              className="mb-0.5"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adaugă Perioadă
            </Button>
          )}

          {showThirdPeriod && (
            <Button
              variant="ghost"
              size="icon"
              onClick={removeThirdPeriod}
              className="mb-0.5"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="indicatori" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 bg-transparent p-0 mb-6 h-auto">
          <TabsTrigger 
            value="indicatori"
            className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 border-2 border-gray-200 data-[state=active]:border-indigo-500 py-3"
          >
            Indicatori
          </TabsTrigger>
          <TabsTrigger 
            value="bilant"
            className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 border-2 border-gray-200 data-[state=active]:border-indigo-500 py-3"
          >
            Bilanț
          </TabsTrigger>
          <TabsTrigger 
            value="pl"
            className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 border-2 border-gray-200 data-[state=active]:border-indigo-500 py-3"
          >
            P&L
          </TabsTrigger>
          <TabsTrigger 
            value="cashflow"
            className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 border-2 border-gray-200 data-[state=active]:border-indigo-500 py-3"
          >
            Cash Flow
          </TabsTrigger>
          <TabsTrigger 
            value="grafice"
            className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 border-2 border-gray-200 data-[state=active]:border-indigo-500 py-3"
          >
            Grafice
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Indicatori */}
        <TabsContent value="indicatori">
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-indigo-500 pb-4">
                <h2 className="text-2xl font-bold text-foreground">Indicatori Cheie de Performanță</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kpiData.map(kpi => (
                  <Card key={kpi.label} className="p-4 border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{kpi.label}</h3>
                        <p className="text-xs text-muted-foreground">{kpi.description}</p>
                      </div>
                      <kpi.icon className="w-8 h-8 text-indigo-500 shrink-0" />
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground border-b pb-1">
                        <span>Perioada</span>
                        <span className="text-right">Rezultat</span>
                        <span className="text-right">Variație</span>
                      </div>

                      {kpi.values.map((val, idx) => (
                        <div key={idx} className="grid grid-cols-3 gap-2 text-sm">
                          <span className="text-foreground text-xs">{val.period}</span>
                          <span className="text-right font-mono tabular-nums text-gray-700">
                            {formatKPIValue(val.value, kpi.label)}
                          </span>
                          <span className={cn(
                            "text-right font-mono tabular-nums text-xs",
                            val.variation === null ? "text-muted-foreground" :
                            val.variation < 0 ? "text-destructive" : "text-emerald-600"
                          )}>
                            {val.variation === null ? "-" : (
                              <>
                                {val.variation < 0 ? "↓" : "↑"} {Math.abs(val.variationPercent!).toFixed(2)}%
                              </>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                <Card className="p-6 h-64 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
                  <div className="text-center">
                    <BarChartIcon className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Grafic în dezvoltare - va afișa evoluția activelor între perioade
                    </p>
                  </div>
                </Card>

                <Card className="p-6 h-64 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white">
                  <div className="text-center">
                    <LineChartIcon className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Grafic în dezvoltare - va afișa evoluția profitului între perioade
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 2: Bilanț */}
        <TabsContent value="bilant">
          <Card className="p-6">
            <div className="space-y-6" id="report-bilant">
              <div className="flex items-center justify-between border-b border-indigo-500 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Bilanț Comparativ</h2>
                  <p className="text-sm text-muted-foreground">Comparație între perioadele selectate</p>
                </div>
                <div className="flex gap-2 no-print">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={handlePrint}>
                          <Printer className="w-4 h-4 mr-2" />
                          Printează
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Printează raportul</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button variant="outline" size="sm" onClick={() => handleExportExcel('bilant')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel
                  </Button>

                  <Button variant="outline" size="sm" onClick={() => handleExportPDF('bilant')}>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>

                  <Button variant="default" size="sm" onClick={() => handleEmailPDF('bilant')}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b-2 border-indigo-500">
                      <th className="text-left py-3 px-2 font-semibold text-foreground">
                        Denumire
                      </th>
                      {periods.map((p, idx) => (
                        <th key={idx} className="text-right py-3 px-4 font-semibold text-foreground min-w-[140px]">
                          {p.label}
                        </th>
                      ))}
                      {periods.length > 1 && periods.map((p, idx) => {
                        if (idx === 0) return null;
                        return (
                          <th key={`var-${idx}`} className="text-right py-3 px-4 font-semibold text-foreground min-w-[160px]">
                            {periods[idx - 1].label} vs {p.label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {bilantData.map((section, sIdx) => (
                      <>
                        <tr key={`section-${sIdx}`} className="border-t-2 border-indigo-500">
                          <td colSpan={periods.length + periods.length} className="py-3 px-2 font-bold text-base text-foreground">
                            {section.title}
                          </td>
                        </tr>

                        {section.subsections.map((row, rIdx) => (
                          <tr key={`row-${sIdx}-${rIdx}`} className={cn(
                            "border-b border-gray-200",
                            row.isTotal && "border-t-2 border-indigo-500 bg-gray-50"
                          )}>
                            <td className={cn(
                              "py-2 px-2",
                              row.indent === 1 && "pl-6",
                              row.indent === 2 && "pl-10",
                              (row.isSubtotal || row.isTotal) && "font-semibold text-gray-700"
                            )}>
                              {row.label}
                            </td>

                            {row.values.map((val, vIdx) => (
                              <td key={vIdx} className={cn(
                                "text-right py-2 px-4 font-mono tabular-nums",
                                (row.isSubtotal || row.isTotal) ? "text-gray-700 font-semibold" : "text-foreground"
                              )}>
                                {formatCurrency(val)} RON
                              </td>
                            ))}

                            {row.variations.map((variation, vIdx) => (
                              <td key={`var-${vIdx}`} className="text-right py-2 px-4">
                                {variation.percent === null ? (
                                  <span className="text-muted-foreground">-</span>
                                ) : (
                                  <div className="flex flex-col items-end">
                                    <span className={cn(
                                      "text-xs font-semibold",
                                      variation.percent < 0 ? "text-destructive" : "text-emerald-600"
                                    )}>
                                      {variation.percent < 0 ? "↓" : "↑"} {Math.abs(variation.percent).toFixed(2)}%
                                    </span>
                                    <span className={cn(
                                      "text-xs font-mono tabular-nums",
                                      variation.absolute! < 0 ? "text-destructive" : "text-emerald-600"
                                    )}>
                                      ({formatCurrency(Math.abs(variation.absolute!))} RON)
                                    </span>
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: P&L */}
        <TabsContent value="pl">
          <Card className="p-6">
            <div className="space-y-6" id="report-pl">
              <div className="flex items-center justify-between border-b border-indigo-500 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Profit și Pierdere Comparativ</h2>
                  <p className="text-sm text-muted-foreground">Comparație între perioadele selectate</p>
                </div>
                <div className="flex gap-2 no-print">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={handlePrint}>
                          <Printer className="w-4 h-4 mr-2" />
                          Printează
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Printează raportul</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button variant="outline" size="sm" onClick={() => handleExportExcel('pl')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel
                  </Button>

                  <Button variant="outline" size="sm" onClick={() => handleExportPDF('pl')}>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>

                  <Button variant="default" size="sm" onClick={() => handleEmailPDF('pl')}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b-2 border-indigo-500">
                      <th className="text-left py-3 px-2 font-semibold text-foreground">
                        Denumire
                      </th>
                      {periods.map((p, idx) => (
                        <th key={idx} className="text-right py-3 px-4 font-semibold text-foreground min-w-[140px]">
                          {p.label}
                        </th>
                      ))}
                      {periods.length > 1 && periods.map((p, idx) => {
                        if (idx === 0) return null;
                        return (
                          <th key={`var-${idx}`} className="text-right py-3 px-4 font-semibold text-foreground min-w-[160px]">
                            {periods[idx - 1].label} vs {p.label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {plData.map((section, sIdx) => (
                      <>
                        <tr key={`section-${sIdx}`} className="border-t-2 border-indigo-500">
                          <td colSpan={periods.length + periods.length} className="py-3 px-2 font-bold text-base text-foreground">
                            {section.title}
                          </td>
                        </tr>

                        {section.subsections.map((row, rIdx) => (
                          <tr key={`row-${sIdx}-${rIdx}`} className={cn(
                            "border-b border-gray-200",
                            row.isTotal && "border-t-2 border-indigo-500 bg-gray-50"
                          )}>
                            <td className={cn(
                              "py-2 px-2",
                              row.indent === 1 && "pl-6",
                              row.indent === 2 && "pl-10",
                              (row.isSubtotal || row.isTotal) && "font-semibold text-gray-700"
                            )}>
                              {row.label}
                            </td>

                            {row.values.map((val, vIdx) => (
                              <td key={vIdx} className={cn(
                                "text-right py-2 px-4 font-mono tabular-nums",
                                (row.isSubtotal || row.isTotal) ? "text-gray-700 font-semibold" : "text-foreground"
                              )}>
                                {formatCurrency(val)} RON
                              </td>
                            ))}

                            {row.variations.map((variation, vIdx) => (
                              <td key={`var-${vIdx}`} className="text-right py-2 px-4">
                                {variation.percent === null ? (
                                  <span className="text-muted-foreground">-</span>
                                ) : (
                                  <div className="flex flex-col items-end">
                                    <span className={cn(
                                      "text-xs font-semibold",
                                      variation.percent < 0 ? "text-destructive" : "text-emerald-600"
                                    )}>
                                      {variation.percent < 0 ? "↓" : "↑"} {Math.abs(variation.percent).toFixed(2)}%
                                    </span>
                                    <span className={cn(
                                      "text-xs font-mono tabular-nums",
                                      variation.absolute! < 0 ? "text-destructive" : "text-emerald-600"
                                    )}>
                                      ({formatCurrency(Math.abs(variation.absolute!))} RON)
                                    </span>
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: Cash Flow */}
        <TabsContent value="cashflow">
          <Card className="p-6">
            <div className="space-y-6" id="report-cashflow">
              <div className="flex items-center justify-between border-b border-indigo-500 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Cash Flow Comparativ</h2>
                  <p className="text-sm text-muted-foreground">Comparație între perioadele selectate</p>
                </div>
                <div className="flex gap-2 no-print">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={handlePrint}>
                          <Printer className="w-4 h-4 mr-2" />
                          Printează
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Printează raportul</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button variant="outline" size="sm" onClick={() => handleExportExcel('cashflow')}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel
                  </Button>

                  <Button variant="outline" size="sm" onClick={() => handleExportPDF('cashflow')}>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>

                  <Button variant="default" size="sm" onClick={() => handleEmailPDF('cashflow')}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                  <thead>
                    <tr className="border-b-2 border-indigo-500">
                      <th className="text-left py-3 px-2 font-semibold text-foreground">
                        Denumire
                      </th>
                      {periods.map((p, idx) => (
                        <th key={idx} className="text-right py-3 px-4 font-semibold text-foreground min-w-[140px]">
                          {p.label}
                        </th>
                      ))}
                      {periods.length > 1 && periods.map((p, idx) => {
                        if (idx === 0) return null;
                        return (
                          <th key={`var-${idx}`} className="text-right py-3 px-4 font-semibold text-foreground min-w-[160px]">
                            {periods[idx - 1].label} vs {p.label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlowData.map((section, sIdx) => (
                      <>
                        <tr key={`section-${sIdx}`} className="border-t-2 border-indigo-500">
                          <td colSpan={periods.length + periods.length} className="py-3 px-2 font-bold text-base text-foreground">
                            {section.title}
                          </td>
                        </tr>

                        {section.subsections.map((row, rIdx) => (
                          <tr key={`row-${sIdx}-${rIdx}`} className={cn(
                            "border-b border-gray-200",
                            row.isTotal && "border-t-2 border-indigo-500 bg-gray-50"
                          )}>
                            <td className={cn(
                              "py-2 px-2",
                              row.indent === 1 && "pl-6",
                              row.indent === 2 && "pl-10",
                              (row.isSubtotal || row.isTotal) && "font-semibold text-gray-700"
                            )}>
                              {row.label}
                            </td>

                            {row.values.map((val, vIdx) => (
                              <td key={vIdx} className={cn(
                                "text-right py-2 px-4 font-mono tabular-nums",
                                (row.isSubtotal || row.isTotal) ? "text-gray-700 font-semibold" : "text-foreground"
                              )}>
                                {val < 0 ? `(${formatCurrency(Math.abs(val))})` : formatCurrency(val)} RON
                              </td>
                            ))}

                            {row.variations.map((variation, vIdx) => (
                              <td key={`var-${vIdx}`} className="text-right py-2 px-4">
                                {variation.percent === null ? (
                                  <span className="text-muted-foreground">-</span>
                                ) : (
                                  <div className="flex flex-col items-end">
                                    <span className={cn(
                                      "text-xs font-semibold",
                                      variation.percent < 0 ? "text-destructive" : "text-emerald-600"
                                    )}>
                                      {variation.percent < 0 ? "↓" : "↑"} {Math.abs(variation.percent).toFixed(2)}%
                                    </span>
                                    <span className={cn(
                                      "text-xs font-mono tabular-nums",
                                      variation.absolute! < 0 ? "text-destructive" : "text-emerald-600"
                                    )}>
                                      ({formatCurrency(Math.abs(variation.absolute!))} RON)
                                    </span>
                                  </div>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 5: Grafice */}
        <TabsContent value="grafice">
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-indigo-500 pb-4">
                <h2 className="text-2xl font-bold text-foreground">Vizualizări Grafice</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-8 h-96 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
                  <div className="text-center">
                    <BarChartIcon className="w-20 h-20 text-indigo-300 mx-auto mb-4" />
                    <p className="text-base font-medium text-foreground mb-2">
                      Evoluția Activelor
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Grafic interactiv în dezvoltare
                    </p>
                  </div>
                </Card>

                <Card className="p-8 h-96 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white">
                  <div className="text-center">
                    <LineChartIcon className="w-20 h-20 text-emerald-300 mx-auto mb-4" />
                    <p className="text-base font-medium text-foreground mb-2">
                      Evoluția Profitabilității
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Grafic interactiv în dezvoltare
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trimite raport prin email</DialogTitle>
            <DialogDescription>
              Introduceți adresa de email unde doriți să trimiteți raportul comparativ.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">Adresa de email</Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplu@companie.ro"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={sendEmailWithPDF}>
              <Mail className="w-4 h-4 mr-2" />
              Trimite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            size: landscape;
            margin: 1cm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default AnalizeComparative;