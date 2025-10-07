import { useState } from 'react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  FileSpreadsheet,
  Printer,
  FileText,
  Mail,
  TrendingUp,
  Layers,
  DollarSign,
  FileX,
  Upload,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ============ INTERFACES & TYPES ============

interface BalanceSelection {
  id: string;
  fileName: string;
  referenceDate: Date;
}

interface BilantData {
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

interface ProfitPierdereData {
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

interface CashFlowData {
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

// ============ MOCK DATA ============

const mockBalances: BalanceSelection[] = [
  {
    id: '1',
    fileName: 'balanta_decembrie_2024.xlsx',
    referenceDate: new Date('2024-12-31'),
  },
  {
    id: '2',
    fileName: 'balanta_noiembrie_2024.xlsx',
    referenceDate: new Date('2024-11-30'),
  },
  {
    id: '3',
    fileName: 'balanta_octombrie_2024.xlsx',
    referenceDate: new Date('2024-10-31'),
  },
];

const mockBilantData: BilantData = {
  active: {
    imobilizate: {
      corporale: 450000,
      necorporale: 75000,
      financiare: 120000,
      subtotal: 645000,
    },
    circulante: {
      stocuri: 235000,
      creante: 187500,
      casaBanci: 98750,
      subtotal: 521250,
    },
    total: 1166250,
  },
  pasive: {
    capitaluri: {
      capitalSocial: 500000,
      rezerve: 150000,
      profitPierdere: 125000,
      subtotal: 775000,
    },
    datorii: {
      termenLung: 250000,
      termenScurt: 141250,
      subtotal: 391250,
    },
    total: 1166250,
  },
};

const mockPLData: ProfitPierdereData = {
  venituri: {
    vanzari: 1250000,
    altele: 45000,
    total: 1295000,
  },
  cheltuieli: {
    materiale: 620000,
    personal: 385000,
    altele: 165000,
    total: 1170000,
  },
  rezultatBrut: 125000,
  impozit: 20000,
  rezultatNet: 105000,
};

const mockCashFlowData: CashFlowData = {
  operational: {
    incasariClienti: 1180000,
    platiFurnizori: -580000,
    platiSalarii: -375000,
    flux: 225000,
  },
  investitii: {
    achizitiiImobilizari: -125000,
    vanzariImobilizari: 35000,
    flux: -90000,
  },
  finantare: {
    imprumuturiPrimite: 100000,
    rambursari: -75000,
    flux: 25000,
  },
  variatieNeta: 160000,
  numerarInceput: 78750,
  numerarSfarsit: 238750,
};

// ============ UTILITY FUNCTIONS ============

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// ============ COMPONENTS ============

interface BilantRowProps {
  label: string;
  value: number;
  className?: string;
  indent?: boolean;
}

const BilantRow = ({ label, value, className, indent = false }: BilantRowProps) => {
  const isNegative = value < 0;

  return (
    <div
      className={cn(
        'flex justify-between items-center py-1',
        indent && 'pl-4',
        className
      )}
    >
      <span className="text-sm">{label}</span>
      <span className="text-sm font-mono tabular-nums text-gray-700">
        {isNegative && '('}
        {formatCurrency(Math.abs(value))}
        {isNegative && ')'}
      </span>
    </div>
  );
};

interface PLRowProps {
  label: string;
  value: number;
  type?: 'income' | 'expense' | 'neutral';
  className?: string;
}

const PLRow = ({ label, value, type = 'neutral', className }: PLRowProps) => {
  const displayValue =
    type === 'expense' || value < 0
      ? `(${formatCurrency(Math.abs(value))})`
      : formatCurrency(value);

  return (
    <div className={cn('flex justify-between items-center py-2', className)}>
      <span className="text-sm">{label}</span>
      <span className="text-sm font-mono tabular-nums text-gray-700">
        {displayValue}
      </span>
    </div>
  );
};

// ============ MAIN COMPONENT ============

const RapoarteFinanciare = () => {
  const [selectedBalanta, setSelectedBalanta] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('bilant');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');

  const selectedBalance = mockBalances.find((b) => b.id === selectedBalanta);

  // ============ EXPORT FUNCTIONS ============

  const handlePrint = () => {
    const hideElements = document.querySelectorAll('.no-print');
    hideElements.forEach((el) => el.classList.add('hidden'));

    window.print();

    setTimeout(() => {
      hideElements.forEach((el) => el.classList.remove('hidden'));
    }, 500);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (activeTab === 'bilant') {
      // Active sheet
      const activeData = [
        ['ACTIVE', ''],
        ['', ''],
        ['A. Active imobilizate', ''],
        ['Imobilizări corporale', mockBilantData.active.imobilizate.corporale],
        ['Imobilizări necorporale', mockBilantData.active.imobilizate.necorporale],
        ['Imobilizări financiare', mockBilantData.active.imobilizate.financiare],
        ['Subtotal Active imobilizate', mockBilantData.active.imobilizate.subtotal],
        ['', ''],
        ['B. Active circulante', ''],
        ['Stocuri', mockBilantData.active.circulante.stocuri],
        ['Creanțe', mockBilantData.active.circulante.creante],
        ['Casa și bănci', mockBilantData.active.circulante.casaBanci],
        ['Subtotal Active circulante', mockBilantData.active.circulante.subtotal],
        ['', ''],
        ['TOTAL ACTIVE', mockBilantData.active.total],
      ];

      const wsActive = XLSX.utils.aoa_to_sheet(activeData);
      XLSX.utils.book_append_sheet(wb, wsActive, 'Active');

      // Pasive sheet
      const pasiveData = [
        ['PASIVE', ''],
        ['', ''],
        ['A. Capitaluri proprii', ''],
        ['Capital social', mockBilantData.pasive.capitaluri.capitalSocial],
        ['Rezerve', mockBilantData.pasive.capitaluri.rezerve],
        ['Profit/Pierdere', mockBilantData.pasive.capitaluri.profitPierdere],
        ['Subtotal Capitaluri', mockBilantData.pasive.capitaluri.subtotal],
        ['', ''],
        ['B. Datorii', ''],
        ['Datorii pe termen lung', mockBilantData.pasive.datorii.termenLung],
        ['Datorii pe termen scurt', mockBilantData.pasive.datorii.termenScurt],
        ['Subtotal Datorii', mockBilantData.pasive.datorii.subtotal],
        ['', ''],
        ['TOTAL PASIVE', mockBilantData.pasive.total],
      ];

      const wsPasive = XLSX.utils.aoa_to_sheet(pasiveData);
      XLSX.utils.book_append_sheet(wb, wsPasive, 'Pasive');
    } else if (activeTab === 'pl') {
      const plData = [
        ['PROFIT ȘI PIERDERE', ''],
        ['', ''],
        ['I. VENITURI', ''],
        ['Venituri din vânzări', mockPLData.venituri.vanzari],
        ['Alte venituri operaționale', mockPLData.venituri.altele],
        ['TOTAL VENITURI', mockPLData.venituri.total],
        ['', ''],
        ['II. CHELTUIELI', ''],
        ['Cheltuieli cu materiile prime', -mockPLData.cheltuieli.materiale],
        ['Cheltuieli cu personalul', -mockPLData.cheltuieli.personal],
        ['Alte cheltuieli operaționale', -mockPLData.cheltuieli.altele],
        ['TOTAL CHELTUIELI', -mockPLData.cheltuieli.total],
        ['', ''],
        ['Rezultat brut', mockPLData.rezultatBrut],
        ['Impozit pe profit', -mockPLData.impozit],
        ['PROFIT/PIERDERE NET', mockPLData.rezultatNet],
      ];

      const wsPL = XLSX.utils.aoa_to_sheet(plData);
      XLSX.utils.book_append_sheet(wb, wsPL, 'Profit si Pierdere');
    } else if (activeTab === 'cashflow') {
      const cfData = [
        ['SITUAȚIA FLUXURILOR DE NUMERAR', ''],
        ['', ''],
        ['A. ACTIVITĂȚI OPERAȚIONALE', ''],
        ['Încasări de la clienți', mockCashFlowData.operational.incasariClienti],
        ['Plăți către furnizori', mockCashFlowData.operational.platiFurnizori],
        ['Plăți salarii și contribuții', mockCashFlowData.operational.platiSalarii],
        ['Flux net din activități operaționale', mockCashFlowData.operational.flux],
        ['', ''],
        ['B. ACTIVITĂȚI DE INVESTIȚII', ''],
        ['Achiziții de imobilizări', mockCashFlowData.investitii.achizitiiImobilizari],
        ['Vânzări de imobilizări', mockCashFlowData.investitii.vanzariImobilizari],
        ['Flux net din activități de investiții', mockCashFlowData.investitii.flux],
        ['', ''],
        ['C. ACTIVITĂȚI DE FINANȚARE', ''],
        ['Împrumuturi primite', mockCashFlowData.finantare.imprumuturiPrimite],
        ['Rambursări de împrumuturi', mockCashFlowData.finantare.rambursari],
        ['Flux net din activități de finanțare', mockCashFlowData.finantare.flux],
        ['', ''],
        ['VARIAȚIA NETĂ A NUMERARULUI', mockCashFlowData.variatieNeta],
        ['Numerar la începutul perioadei', mockCashFlowData.numerarInceput],
        ['NUMERAR LA SFÂRȘITUL PERIOADEI', mockCashFlowData.numerarSfarsit],
      ];

      const wsCF = XLSX.utils.aoa_to_sheet(cfData);
      XLSX.utils.book_append_sheet(wb, wsCF, 'Cash Flow');
    }

    const fileName = `Raport_${activeTab}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast.success('Raportul a fost exportat în Excel');
  };

  const handleExportPDF = async () => {
    const reportElement = document.getElementById('report-content');
    if (!reportElement) return;

    const actionsElement = document.querySelector('.report-actions');
    if (actionsElement) actionsElement.classList.add('hidden');

    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Raport_${activeTab}_${format(new Date(), 'dd-MM-yyyy')}.pdf`);

      toast.success('Raportul a fost exportat în PDF');
    } catch (error) {
      toast.error('Eroare la generarea PDF-ului');
    } finally {
      if (actionsElement) actionsElement.classList.remove('hidden');
    }
  };

  const handleEmailPDF = () => {
    setEmailDialogOpen(true);
  };

  const sendEmailWithPDF = async () => {
    if (!recipientEmail) {
      toast.error('Vă rugăm să introduceți o adresă de email');
      return;
    }

    // Mock API call
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Se trimite raportul...',
        success: `Raportul a fost trimis cu succes la ${recipientEmail}`,
        error: 'Eroare la trimiterea email-ului',
      }
    );

    setEmailDialogOpen(false);
    setRecipientEmail('');
  };

  // ============ RENDER ============

  if (!selectedBalanta || !selectedBalance) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Rapoarte Financiare</h1>
          <p className="text-foreground-secondary">
            Generați și vizualizați rapoarte financiare detaliate
          </p>
        </div>

        {/* Balance Selector */}
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="balance-select" className="text-sm font-semibold mb-2 block">
                Selectați balanța de referință
              </Label>
              <Select value={selectedBalanta} onValueChange={setSelectedBalanta}>
                <SelectTrigger id="balance-select" className="w-full">
                  <SelectValue placeholder="Alegeți o balanță" />
                </SelectTrigger>
                <SelectContent>
                  {mockBalances.map((balance) => (
                    <SelectItem key={balance.id} value={balance.id}>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-primary" />
                        <span>{balance.fileName}</span>
                        <span className="text-muted-foreground text-xs">
                          ({format(balance.referenceDate, 'dd.MM.yyyy')})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mockBalances.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nu există balanțe încărcate. Vă rugăm să încărcați o balanță.
              </p>
            )}
          </div>
        </Card>

        {/* Empty State */}
        <Card className="p-12">
          <div className="text-center">
            <FileX className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nicio balanță selectată
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Vă rugăm să selectați o balanță pentru a genera raportul
            </p>
            <Button onClick={() => window.location.href = '/app/incarcare-balanta'}>
              <Upload className="w-4 h-4 mr-2" />
              Încarcă balanță
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const getReportTitle = () => {
    switch (activeTab) {
      case 'bilant':
        return 'Bilanț Contabil';
      case 'pl':
        return 'Profit și Pierdere';
      case 'cashflow':
        return 'Situația Fluxurilor de Numerar';
      default:
        return '';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Rapoarte Financiare</h1>
        <p className="text-foreground-secondary">
          Generați și vizualizați rapoarte financiare detaliate
        </p>
      </div>

      {/* Balance Selector */}
      <Card className="p-6 mb-6">
        <div>
          <Label htmlFor="balance-select-main" className="text-sm font-semibold mb-2 block">
            Selectați balanța de referință
          </Label>
          <Select value={selectedBalanta} onValueChange={setSelectedBalanta}>
            <SelectTrigger id="balance-select-main" className="w-full md:w-96">
              <SelectValue placeholder="Alegeți o balanță" />
            </SelectTrigger>
            <SelectContent>
              {mockBalances.map((balance) => (
                <SelectItem key={balance.id} value={balance.id}>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                    <span>{balance.fileName}</span>
                    <span className="text-muted-foreground text-xs">
                      ({format(balance.referenceDate, 'dd.MM.yyyy')})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 no-print">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Profit Net</p>
              <p className="text-2xl font-bold text-accent-emerald">
                {formatCurrency(mockPLData.rezultatNet)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-accent-emerald" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Active</p>
              <p className="text-2xl font-bold text-primary-indigo">
                {formatCurrency(mockBilantData.active.total)}
              </p>
            </div>
            <Layers className="w-8 h-8 text-primary-indigo" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Cash Flow</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(mockCashFlowData.variatieNeta)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
        </Card>
      </div>

      {/* Main Report Card */}
      <Card className="overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tabs List */}
          <div className="border-b bg-surface p-2">
            <TabsList className="grid w-full grid-cols-3 gap-2 bg-transparent p-0">
              <TabsTrigger
                value="bilant"
                className="data-[state=active]:bg-primary-indigo data-[state=active]:text-white border-2 border-border data-[state=active]:border-primary-indigo rounded-lg px-6 py-3 transition-all"
              >
                Bilanț Contabil
              </TabsTrigger>
              <TabsTrigger
                value="pl"
                className="data-[state=active]:bg-primary-indigo data-[state=active]:text-white border-2 border-border data-[state=active]:border-primary-indigo rounded-lg px-6 py-3 transition-all"
              >
                Profit și Pierdere
              </TabsTrigger>
              <TabsTrigger
                value="cashflow"
                className="data-[state=active]:bg-primary-indigo data-[state=active]:text-white border-2 border-border data-[state=active]:border-primary-indigo rounded-lg px-6 py-3 transition-all"
              >
                Cash Flow
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Report Content */}
          <div id="report-content" className="p-6">
            {/* Report Header */}
            <div className="flex items-center justify-between border-b pb-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">{getReportTitle()}</h2>
                <p className="text-sm text-muted-foreground">
                  Data referință: {format(selectedBalance.referenceDate, 'dd.MM.yyyy', { locale: ro })}
                </p>
              </div>

              <div className="flex items-center gap-2 report-actions no-print">
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

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={handleExportExcel}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Excel
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export în Excel</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" onClick={handleExportPDF}>
                        <FileText className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export în PDF</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button variant="default" size="sm" onClick={handleEmailPDF}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
              </div>
            </div>

            {/* Bilanț Contabil */}
            <TabsContent value="bilant" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Coloană Active */}
                <div className="border-r pr-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 pb-2 border-b">
                    ACTIVE
                  </h3>

                  <div className="mb-6">
                    <h4 className="font-semibold text-sm text-foreground mb-3">
                      A. Active imobilizate
                    </h4>
                    <div className="space-y-2 pl-4">
                      <BilantRow
                        label="Imobilizări corporale"
                        value={mockBilantData.active.imobilizate.corporale}
                      />
                      <BilantRow
                        label="Imobilizări necorporale"
                        value={mockBilantData.active.imobilizate.necorporale}
                      />
                      <BilantRow
                        label="Imobilizări financiare"
                        value={mockBilantData.active.imobilizate.financiare}
                      />
                    </div>
                    <BilantRow
                      label="Subtotal Active imobilizate"
                      value={mockBilantData.active.imobilizate.subtotal}
                      className="font-semibold mt-2 pt-2 border-t-4 border-double border-indigo-500 text-gray-700"
                    />
                  </div>

                  <div className="mb-6">
                    <h4 className="font-semibold text-sm text-foreground mb-3">
                      B. Active circulante
                    </h4>
                    <div className="space-y-2 pl-4">
                      <BilantRow
                        label="Stocuri"
                        value={mockBilantData.active.circulante.stocuri}
                      />
                      <BilantRow
                        label="Creanțe"
                        value={mockBilantData.active.circulante.creante}
                      />
                      <BilantRow
                        label="Casa și bănci"
                        value={mockBilantData.active.circulante.casaBanci}
                      />
                    </div>
                    <BilantRow
                      label="Subtotal Active circulante"
                      value={mockBilantData.active.circulante.subtotal}
                      className="font-semibold mt-2 pt-2 border-t-4 border-double border-indigo-500 text-gray-700"
                    />
                  </div>

                  <BilantRow
                    label="TOTAL ACTIVE"
                    value={mockBilantData.active.total}
                    className="font-bold text-lg mt-6 pt-4 border-t-4 border-double border-indigo-500 pb-4 border-b-4 border-double text-gray-700"
                  />
                </div>

                {/* Coloană Pasive */}
                <div className="pl-0 md:pl-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 pb-2 border-b">
                    PASIVE
                  </h3>

                  <div className="mb-6">
                    <h4 className="font-semibold text-sm text-foreground mb-3">
                      A. Capitaluri proprii
                    </h4>
                    <div className="space-y-2 pl-4">
                      <BilantRow
                        label="Capital social"
                        value={mockBilantData.pasive.capitaluri.capitalSocial}
                      />
                      <BilantRow
                        label="Rezerve"
                        value={mockBilantData.pasive.capitaluri.rezerve}
                      />
                      <BilantRow
                        label="Profit/Pierdere"
                        value={mockBilantData.pasive.capitaluri.profitPierdere}
                      />
                    </div>
                    <BilantRow
                      label="Subtotal Capitaluri proprii"
                      value={mockBilantData.pasive.capitaluri.subtotal}
                      className="font-semibold mt-2 pt-2 border-t-4 border-double border-indigo-500 text-gray-700"
                    />
                  </div>

                  <div className="mb-6">
                    <h4 className="font-semibold text-sm text-foreground mb-3">B. Datorii</h4>
                    <div className="space-y-2 pl-4">
                      <BilantRow
                        label="Datorii pe termen lung"
                        value={mockBilantData.pasive.datorii.termenLung}
                      />
                      <BilantRow
                        label="Datorii pe termen scurt"
                        value={mockBilantData.pasive.datorii.termenScurt}
                      />
                    </div>
                    <BilantRow
                      label="Subtotal Datorii"
                      value={mockBilantData.pasive.datorii.subtotal}
                      className="font-semibold mt-2 pt-2 border-t-4 border-double border-indigo-500 text-gray-700"
                    />
                  </div>

                  <BilantRow
                    label="TOTAL PASIVE"
                    value={mockBilantData.pasive.total}
                    className="font-bold text-lg mt-6 pt-4 border-t-4 border-double border-indigo-500 pb-4 border-b-4 border-double text-gray-700"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Profit și Pierdere */}
            <TabsContent value="pl" className="mt-0">
              <div className="max-w-3xl mx-auto">
                {/* Secțiune Venituri */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 pb-2 border-b">
                    I. VENITURI
                  </h3>
                  <div className="space-y-2">
                    <PLRow
                      label="Venituri din vânzări"
                      value={mockPLData.venituri.vanzari}
                      type="income"
                    />
                    <PLRow
                      label="Alte venituri operaționale"
                      value={mockPLData.venituri.altele}
                      type="income"
                    />
                  </div>
                  <PLRow
                    label="TOTAL VENITURI"
                    value={mockPLData.venituri.total}
                    className="font-bold mt-3 pt-3 border-t-4 border-double border-indigo-500 pb-3 border-b-4 border-double text-base text-gray-700"
                    type="income"
                  />
                </div>

                {/* Secțiune Cheltuieli */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 pb-2 border-b">
                    II. CHELTUIELI
                  </h3>
                  <div className="space-y-2">
                    <PLRow
                      label="Cheltuieli cu materiile prime"
                      value={mockPLData.cheltuieli.materiale}
                      type="expense"
                    />
                    <PLRow
                      label="Cheltuieli cu personalul"
                      value={mockPLData.cheltuieli.personal}
                      type="expense"
                    />
                    <PLRow
                      label="Alte cheltuieli operaționale"
                      value={mockPLData.cheltuieli.altele}
                      type="expense"
                    />
                  </div>
                  <PLRow
                    label="TOTAL CHELTUIELI"
                    value={mockPLData.cheltuieli.total}
                    className="font-bold mt-3 pt-3 border-t-4 border-double border-indigo-500 pb-3 border-b-4 border-double text-base text-gray-700"
                    type="expense"
                  />
                </div>

                {/* Rezultate */}
                <div className="bg-primary-indigo/10 p-6 rounded-xl border-2 border-primary-indigo/20">
                  <PLRow
                    label="Rezultat brut"
                    value={mockPLData.rezultatBrut}
                    className="text-base font-semibold mb-2"
                  />
                  <PLRow
                    label="Impozit pe profit"
                    value={mockPLData.impozit}
                    type="expense"
                    className="text-sm mb-3 pb-3 border-b border-primary-indigo/20"
                  />
                  <PLRow
                    label="PROFIT/PIERDERE NET"
                    value={mockPLData.rezultatNet}
                    className="text-xl font-bold"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Cash Flow */}
            <TabsContent value="cashflow" className="mt-0">
              <div className="max-w-3xl mx-auto">
                {/* Activități Operaționale */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 pb-2 border-b">
                    A. ACTIVITĂȚI OPERAȚIONALE
                  </h3>
                  <div className="space-y-2">
                    <PLRow
                      label="Încasări de la clienți"
                      value={mockCashFlowData.operational.incasariClienti}
                      type="income"
                    />
                    <PLRow
                      label="Plăți către furnizori"
                      value={mockCashFlowData.operational.platiFurnizori}
                    />
                    <PLRow
                      label="Plăți salarii și contribuții"
                      value={mockCashFlowData.operational.platiSalarii}
                    />
                  </div>
                  <PLRow
                    label="Flux net din activități operaționale"
                    value={mockCashFlowData.operational.flux}
                    className="font-bold mt-3 pt-3 border-t-4 border-double border-indigo-500 text-base text-gray-700"
                  />
                </div>

                {/* Activități de Investiții */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 pb-2 border-b">
                    B. ACTIVITĂȚI DE INVESTIȚII
                  </h3>
                  <div className="space-y-2">
                    <PLRow
                      label="Achiziții de imobilizări"
                      value={mockCashFlowData.investitii.achizitiiImobilizari}
                    />
                    <PLRow
                      label="Vânzări de imobilizări"
                      value={mockCashFlowData.investitii.vanzariImobilizari}
                      type="income"
                    />
                  </div>
                  <PLRow
                    label="Flux net din activități de investiții"
                    value={mockCashFlowData.investitii.flux}
                    className="font-bold mt-3 pt-3 border-t-4 border-double border-indigo-500 text-base text-gray-700"
                  />
                </div>

                {/* Activități de Finanțare */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 pb-2 border-b">
                    C. ACTIVITĂȚI DE FINANȚARE
                  </h3>
                  <div className="space-y-2">
                    <PLRow
                      label="Împrumuturi primite"
                      value={mockCashFlowData.finantare.imprumuturiPrimite}
                      type="income"
                    />
                    <PLRow
                      label="Rambursări de împrumuturi"
                      value={mockCashFlowData.finantare.rambursari}
                    />
                  </div>
                  <PLRow
                    label="Flux net din activități de finanțare"
                    value={mockCashFlowData.finantare.flux}
                    className="font-bold mt-3 pt-3 border-t-4 border-double border-indigo-500 text-base text-gray-700"
                  />
                </div>

                {/* Rezultat Final */}
                <div className="bg-primary-indigo/10 p-6 rounded-xl border-2 border-primary-indigo/20">
                  <PLRow
                    label="VARIAȚIA NETĂ A NUMERARULUI"
                    value={mockCashFlowData.variatieNeta}
                    className="text-base font-bold mb-3 pt-3 border-t-4 border-double border-indigo-500 pb-3 border-b-4 border-double text-gray-700"
                  />
                  <PLRow
                    label="Numerar la începutul perioadei"
                    value={mockCashFlowData.numerarInceput}
                    className="text-sm mb-2"
                  />
                  <PLRow
                    label="NUMERAR LA SFÂRȘITUL PERIOADEI"
                    value={mockCashFlowData.numerarSfarsit}
                    className="text-xl font-bold"
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trimite raport prin email</DialogTitle>
            <DialogDescription>
              Introduceți adresa de email unde doriți să trimiteți raportul în format PDF.
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
    </div>
  );
};

export default RapoarteFinanciare;
