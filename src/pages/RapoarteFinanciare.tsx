import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  FileSpreadsheet,
  Printer,
  FileText,
  Mail,
  Upload,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { useBalante, BalanceWithAccounts } from '@/hooks/useBalante';
import { useFinancialCalculations, BilantData, ProfitPierdereData, CashFlowData } from '@/hooks/useFinancialCalculations';

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
      <span className="text-sm font-mono tabular-nums text-foreground">
        {isNegative && '('}
        {formatCurrency(Math.abs(value))}
        {isNegative && ')'}
      </span>
    </div>
  );
};

// ============ MAIN COMPONENT ============

const RapoarteFinanciare = () => {
  const { balances, loading, hasData, getBalanceAccounts } = useBalante();
  const [selectedBalanta, setSelectedBalanta] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('bilant');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [balanceData, setBalanceData] = useState<BalanceWithAccounts | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  const { bilantData, profitPierdereData, cashFlowData } = useFinancialCalculations(
    balanceData?.accounts || []
  );

  // Load accounts when balance is selected
  useEffect(() => {
    const loadAccounts = async () => {
      if (!selectedBalanta) {
        setBalanceData(null);
        return;
      }

      setDataLoading(true);
      try {
        const accounts = await getBalanceAccounts(selectedBalanta);
        const balance = balances.find(b => b.id === selectedBalanta);
        if (balance) {
          setBalanceData({ ...balance, accounts });
        }
      } catch (error) {
        console.error('Error loading accounts:', error);
        toast.error('Eroare la încărcarea datelor');
      } finally {
        setDataLoading(false);
      }
    };

    loadAccounts();
  }, [selectedBalanta, balances, getBalanceAccounts]);

  // ============ EXPORT FUNCTIONS ============

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (activeTab === 'bilant') {
      const activeData = [
        ['ACTIVE', ''],
        ['', ''],
        ['A. Active imobilizate', ''],
        ['Imobilizări corporale', bilantData.active.imobilizate.corporale],
        ['Imobilizări necorporale', bilantData.active.imobilizate.necorporale],
        ['Imobilizări financiare', bilantData.active.imobilizate.financiare],
        ['Subtotal Active imobilizate', bilantData.active.imobilizate.subtotal],
        ['', ''],
        ['B. Active circulante', ''],
        ['Stocuri', bilantData.active.circulante.stocuri],
        ['Creanțe', bilantData.active.circulante.creante],
        ['Casa și bănci', bilantData.active.circulante.casaBanci],
        ['Subtotal Active circulante', bilantData.active.circulante.subtotal],
        ['', ''],
        ['TOTAL ACTIVE', bilantData.active.total],
      ];

      const wsActive = XLSX.utils.aoa_to_sheet(activeData);
      XLSX.utils.book_append_sheet(wb, wsActive, 'Active');

      const pasiveData = [
        ['PASIVE', ''],
        ['', ''],
        ['A. Capitaluri proprii', ''],
        ['Capital social', bilantData.pasive.capitaluri.capitalSocial],
        ['Rezerve', bilantData.pasive.capitaluri.rezerve],
        ['Profit/Pierdere', bilantData.pasive.capitaluri.profitPierdere],
        ['Subtotal Capitaluri', bilantData.pasive.capitaluri.subtotal],
        ['', ''],
        ['B. Datorii', ''],
        ['Datorii pe termen lung', bilantData.pasive.datorii.termenLung],
        ['Datorii pe termen scurt', bilantData.pasive.datorii.termenScurt],
        ['Subtotal Datorii', bilantData.pasive.datorii.subtotal],
        ['', ''],
        ['TOTAL PASIVE', bilantData.pasive.total],
      ];

      const wsPasive = XLSX.utils.aoa_to_sheet(pasiveData);
      XLSX.utils.book_append_sheet(wb, wsPasive, 'Pasive');
    } else if (activeTab === 'pl') {
      const plData = [
        ['PROFIT ȘI PIERDERE', ''],
        ['', ''],
        ['I. VENITURI', ''],
        ['Venituri din vânzări', profitPierdereData.venituri.vanzari],
        ['Alte venituri operaționale', profitPierdereData.venituri.altele],
        ['TOTAL VENITURI', profitPierdereData.venituri.total],
        ['', ''],
        ['II. CHELTUIELI', ''],
        ['Cheltuieli cu materiile prime', -profitPierdereData.cheltuieli.materiale],
        ['Cheltuieli cu personalul', -profitPierdereData.cheltuieli.personal],
        ['Alte cheltuieli operaționale', -profitPierdereData.cheltuieli.altele],
        ['TOTAL CHELTUIELI', -profitPierdereData.cheltuieli.total],
        ['', ''],
        ['Rezultat brut', profitPierdereData.rezultatBrut],
        ['Impozit pe profit', -profitPierdereData.impozit],
        ['PROFIT/PIERDERE NET', profitPierdereData.rezultatNet],
      ];

      const wsPL = XLSX.utils.aoa_to_sheet(plData);
      XLSX.utils.book_append_sheet(wb, wsPL, 'Profit si Pierdere');
    } else if (activeTab === 'cashflow') {
      const cfData = [
        ['SITUAȚIA FLUXURILOR DE NUMERAR', ''],
        ['', ''],
        ['A. ACTIVITĂȚI OPERAȚIONALE', ''],
        ['Încasări de la clienți', cashFlowData.operational.incasariClienti],
        ['Plăți către furnizori', cashFlowData.operational.platiFurnizori],
        ['Plăți salarii și contribuții', cashFlowData.operational.platiSalarii],
        ['Flux net din activități operaționale', cashFlowData.operational.flux],
        ['', ''],
        ['B. ACTIVITĂȚI DE INVESTIȚII', ''],
        ['Achiziții de imobilizări', cashFlowData.investitii.achizitiiImobilizari],
        ['Vânzări de imobilizări', cashFlowData.investitii.vanzariImobilizari],
        ['Flux net din activități de investiții', cashFlowData.investitii.flux],
        ['', ''],
        ['C. ACTIVITĂȚI DE FINANȚARE', ''],
        ['Împrumuturi primite', cashFlowData.finantare.imprumuturiPrimite],
        ['Rambursări de împrumuturi', cashFlowData.finantare.rambursari],
        ['Flux net din activități de finanțare', cashFlowData.finantare.flux],
        ['', ''],
        ['VARIAȚIA NETĂ A NUMERARULUI', cashFlowData.variatieNeta],
        ['Numerar la începutul perioadei', cashFlowData.numerarInceput],
        ['NUMERAR LA SFÂRȘITUL PERIOADEI', cashFlowData.numerarSfarsit],
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
    }
  };

  // ============ RENDER ============

  if (loading) {
    return (
      <div className="container-app flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="container-app">
        <div className="page-header">
          <h1 className="page-title">Rapoarte Financiare</h1>
          <p className="page-description">
            Generați și vizualizați rapoarte financiare detaliate
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Upload className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Încarcă o balanță pentru a genera rapoarte
          </h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Pentru a vizualiza rapoartele financiare, trebuie să încarci cel puțin o balanță de verificare.
          </p>
          <Link to="/app/incarcare-balanta">
            <Button className="btn-primary" size="lg">
              <Upload className="w-5 h-5 mr-2" />
              Încarcă balanță
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!selectedBalanta) {
    return (
      <div className="container-app">
        <div className="page-header">
          <h1 className="page-title">Rapoarte Financiare</h1>
          <p className="page-description">
            Generați și vizualizați rapoarte financiare detaliate
          </p>
        </div>

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
                  {balances.map((balance) => (
                    <SelectItem key={balance.id} value={balance.id}>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-primary" />
                        <span>{balance.source_file_name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({format(new Date(balance.period_end), 'dd.MM.yyyy')})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-app">
      <div className="page-header">
        <h1 className="page-title">Rapoarte Financiare</h1>
        <p className="page-description">
          Rapoarte generate din balanța: {balanceData?.source_file_name}
        </p>
      </div>

      {/* Balance Selector */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 max-w-md">
            <Label className="text-xs text-muted-foreground mb-1 block">Balanță selectată</Label>
            <Select value={selectedBalanta} onValueChange={setSelectedBalanta}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {balances.map((balance) => (
                  <SelectItem key={balance.id} value={balance.id}>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-primary" />
                      <span>{balance.source_file_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </Card>

      {dataLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div id="report-content">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 w-full md:w-auto">
              <TabsTrigger value="bilant" className="flex items-center gap-2">
                Bilanț
              </TabsTrigger>
              <TabsTrigger value="pl" className="flex items-center gap-2">
                Profit & Pierdere
              </TabsTrigger>
              <TabsTrigger value="cashflow" className="flex items-center gap-2">
                Cash Flow
              </TabsTrigger>
            </TabsList>

            {/* Bilant Tab */}
            <TabsContent value="bilant">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active */}
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 border-b pb-2">ACTIVE</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">A. Active imobilizate</h4>
                      <BilantRow label="Imobilizări corporale" value={bilantData.active.imobilizate.corporale} indent />
                      <BilantRow label="Imobilizări necorporale" value={bilantData.active.imobilizate.necorporale} indent />
                      <BilantRow label="Imobilizări financiare" value={bilantData.active.imobilizate.financiare} indent />
                      <BilantRow label="Subtotal Active imobilizate" value={bilantData.active.imobilizate.subtotal} className="font-semibold bg-muted/50 rounded px-2 -mx-2" />
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">B. Active circulante</h4>
                      <BilantRow label="Stocuri" value={bilantData.active.circulante.stocuri} indent />
                      <BilantRow label="Creanțe" value={bilantData.active.circulante.creante} indent />
                      <BilantRow label="Casa și bănci" value={bilantData.active.circulante.casaBanci} indent />
                      <BilantRow label="Subtotal Active circulante" value={bilantData.active.circulante.subtotal} className="font-semibold bg-muted/50 rounded px-2 -mx-2" />
                    </div>

                    <BilantRow label="TOTAL ACTIVE" value={bilantData.active.total} className="font-bold text-lg border-t pt-4 mt-4" />
                  </div>
                </Card>

                {/* Pasive */}
                <Card className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 border-b pb-2">PASIVE</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">A. Capitaluri proprii</h4>
                      <BilantRow label="Capital social" value={bilantData.pasive.capitaluri.capitalSocial} indent />
                      <BilantRow label="Rezerve" value={bilantData.pasive.capitaluri.rezerve} indent />
                      <BilantRow label="Profit/Pierdere" value={bilantData.pasive.capitaluri.profitPierdere} indent />
                      <BilantRow label="Subtotal Capitaluri" value={bilantData.pasive.capitaluri.subtotal} className="font-semibold bg-muted/50 rounded px-2 -mx-2" />
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">B. Datorii</h4>
                      <BilantRow label="Datorii pe termen lung" value={bilantData.pasive.datorii.termenLung} indent />
                      <BilantRow label="Datorii pe termen scurt" value={bilantData.pasive.datorii.termenScurt} indent />
                      <BilantRow label="Subtotal Datorii" value={bilantData.pasive.datorii.subtotal} className="font-semibold bg-muted/50 rounded px-2 -mx-2" />
                    </div>

                    <BilantRow label="TOTAL PASIVE" value={bilantData.pasive.total} className="font-bold text-lg border-t pt-4 mt-4" />
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Profit & Pierdere Tab */}
            <TabsContent value="pl">
              <Card className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 border-b pb-2">CONTUL DE PROFIT ȘI PIERDERE</h3>
                
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h4 className="font-semibold text-accent mb-2">I. VENITURI</h4>
                    <BilantRow label="Venituri din vânzări" value={profitPierdereData.venituri.vanzari} />
                    <BilantRow label="Alte venituri operaționale" value={profitPierdereData.venituri.altele} />
                    <BilantRow label="TOTAL VENITURI" value={profitPierdereData.venituri.total} className="font-semibold bg-accent/10 rounded px-2 -mx-2 text-accent" />
                  </div>

                  <div>
                    <h4 className="font-semibold text-destructive mb-2">II. CHELTUIELI</h4>
                    <BilantRow label="Cheltuieli cu materiile prime" value={-profitPierdereData.cheltuieli.materiale} />
                    <BilantRow label="Cheltuieli cu personalul" value={-profitPierdereData.cheltuieli.personal} />
                    <BilantRow label="Alte cheltuieli operaționale" value={-profitPierdereData.cheltuieli.altele} />
                    <BilantRow label="TOTAL CHELTUIELI" value={-profitPierdereData.cheltuieli.total} className="font-semibold bg-destructive/10 rounded px-2 -mx-2 text-destructive" />
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <BilantRow label="Rezultat brut" value={profitPierdereData.rezultatBrut} className="font-semibold" />
                    <BilantRow label="Impozit pe profit" value={-profitPierdereData.impozit} />
                    <BilantRow 
                      label="PROFIT/PIERDERE NET" 
                      value={profitPierdereData.rezultatNet} 
                      className={cn(
                        "font-bold text-lg bg-primary/10 rounded px-2 -mx-2 py-2",
                        profitPierdereData.rezultatNet >= 0 ? "text-accent" : "text-destructive"
                      )} 
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Cash Flow Tab */}
            <TabsContent value="cashflow">
              <Card className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4 border-b pb-2">SITUAȚIA FLUXURILOR DE NUMERAR</h3>
                
                <div className="max-w-2xl space-y-6">
                  <div>
                    <h4 className="font-semibold text-primary mb-2">A. ACTIVITĂȚI OPERAȚIONALE</h4>
                    <BilantRow label="Încasări de la clienți" value={cashFlowData.operational.incasariClienti} />
                    <BilantRow label="Plăți către furnizori" value={cashFlowData.operational.platiFurnizori} />
                    <BilantRow label="Plăți salarii și contribuții" value={cashFlowData.operational.platiSalarii} />
                    <BilantRow label="Flux net operațional" value={cashFlowData.operational.flux} className="font-semibold bg-primary/10 rounded px-2 -mx-2" />
                  </div>

                  <div>
                    <h4 className="font-semibold text-primary mb-2">B. ACTIVITĂȚI DE INVESTIȚII</h4>
                    <BilantRow label="Achiziții de imobilizări" value={cashFlowData.investitii.achizitiiImobilizari} />
                    <BilantRow label="Vânzări de imobilizări" value={cashFlowData.investitii.vanzariImobilizari} />
                    <BilantRow label="Flux net investiții" value={cashFlowData.investitii.flux} className="font-semibold bg-primary/10 rounded px-2 -mx-2" />
                  </div>

                  <div>
                    <h4 className="font-semibold text-primary mb-2">C. ACTIVITĂȚI DE FINANȚARE</h4>
                    <BilantRow label="Împrumuturi primite" value={cashFlowData.finantare.imprumuturiPrimite} />
                    <BilantRow label="Rambursări de împrumuturi" value={cashFlowData.finantare.rambursari} />
                    <BilantRow label="Flux net finanțare" value={cashFlowData.finantare.flux} className="font-semibold bg-primary/10 rounded px-2 -mx-2" />
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <BilantRow label="Variația netă a numerarului" value={cashFlowData.variatieNeta} className="font-semibold" />
                    <BilantRow label="Numerar la începutul perioadei" value={cashFlowData.numerarInceput} />
                    <BilantRow label="NUMERAR LA SFÂRȘITUL PERIOADEI" value={cashFlowData.numerarSfarsit} className="font-bold text-lg bg-accent/10 rounded px-2 -mx-2 py-2 text-accent" />
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trimite raportul pe email</DialogTitle>
            <DialogDescription>
              Introduceți adresa de email unde doriți să primiți raportul.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="email">Adresa de email</Label>
            <Input
              id="email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="email@exemplu.ro"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={() => {
              toast.success(`Raportul va fi trimis la ${recipientEmail}`);
              setEmailDialogOpen(false);
              setRecipientEmail('');
            }}>
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
