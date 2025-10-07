import { useState } from 'react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileText,
  Scale,
  TrendingUp,
  ArrowUpDown,
  Building2,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  TrendingDown,
  Landmark,
  Printer,
  Download,
  Mail,
  ChevronDown,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
  Info,
  Percent,
  Target,
  Shield,
  Coins,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const RapoarteFinanciare = () => {
  const { toast } = useToast();
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', message: '' });
  const [activeTab, setActiveTab] = useState('bilant');

  const referenceDate = new Date(2024, 11, 31);
  const sourceFile = 'balanta_decembrie_2024.xlsx';

  // Mock data for Balance Sheet
  const activesImmobilized = [
    { id: '1', label: 'Imobilizări necorporale', value: 45000 },
    { id: '2', label: 'Imobilizări corporale', value: 320000 },
    { id: '3', label: 'Imobilizări financiare', value: 85000 },
  ];

  const activesCurrent = [
    { id: '4', label: 'Stocuri', value: 125000 },
    { id: '5', label: 'Creanțe', value: 180000 },
    { id: '6', label: 'Disponibilități bănești', value: 95000 },
  ];

  const pasivesEquity = [
    { id: '7', label: 'Capital social', value: 200000 },
    { id: '8', label: 'Rezerve', value: 80000 },
    { id: '9', label: 'Rezultat reportat', value: 120000 },
    { id: '10', label: 'Rezultat exercițiului', value: 90000 },
  ];

  const pasivesLiabilities = [
    { id: '11', label: 'Datorii pe termen lung', value: 150000 },
    { id: '12', label: 'Datorii pe termen scurt', value: 170000 },
    { id: '13', label: 'Furnizori', value: 40000 },
  ];

  const subtotalActiveImobilizate = activesImmobilized.reduce((sum, item) => sum + item.value, 0);
  const subtotalActiveCirculante = activesCurrent.reduce((sum, item) => sum + item.value, 0);
  const totalActive = subtotalActiveImobilizate + subtotalActiveCirculante;

  const subtotalCapitaluri = pasivesEquity.reduce((sum, item) => sum + item.value, 0);
  const subtotalDatorii = pasivesLiabilities.reduce((sum, item) => sum + item.value, 0);
  const totalPasive = subtotalCapitaluri + subtotalDatorii;

  const isBalanced = Math.abs(totalActive - totalPasive) < 1;

  // Mock data for P&L
  const revenues = [
    { id: '1', label: 'Cifra de afaceri netă', value: 850000 },
    { id: '2', label: 'Alte venituri din exploatare', value: 45000 },
  ];

  const expenses = [
    { id: '3', label: 'Cheltuieli cu materiile prime', value: 320000 },
    { id: '4', label: 'Cheltuieli cu personalul', value: 180000 },
    { id: '5', label: 'Cheltuieli cu amortizările', value: 65000 },
    { id: '6', label: 'Alte cheltuieli de exploatare', value: 95000 },
  ];

  const totalVenituri = revenues.reduce((sum, item) => sum + item.value, 0);
  const totalCheltuieli = expenses.reduce((sum, item) => sum + item.value, 0);
  const profitBrut = totalVenituri - totalCheltuieli;
  const venituriFinanciare = 12000;
  const cheltuieliFinanciare = 8000;
  const profitCurent = profitBrut + venituriFinanciare - cheltuieliFinanciare;
  const impozit = profitCurent * 0.16;
  const profitNet = profitCurent - impozit;

  // Mock data for Cash Flow
  const operatingActivities = [
    { id: '1', label: 'Amortizare și depreciere', value: 65000 },
    { id: '2', label: 'Variația creanțelor', value: -25000 },
    { id: '3', label: 'Variația stocurilor', value: -15000 },
    { id: '4', label: 'Variația datoriilor', value: 35000 },
  ];

  const investmentActivities = [
    { id: '5', label: 'Achiziții de imobilizări', value: -85000 },
    { id: '6', label: 'Vânzări de active', value: 20000 },
  ];

  const financingActivities = [
    { id: '7', label: 'Împrumuturi contractate', value: 50000 },
    { id: '8', label: 'Rambursări de împrumuturi', value: -30000 },
    { id: '9', label: 'Dividende plătite', value: -25000 },
  ];

  const cashInitial = 70000;
  const totalOperational = profitNet + operatingActivities.reduce((sum, item) => sum + item.value, 0);
  const totalInvestment = investmentActivities.reduce((sum, item) => sum + item.value, 0);
  const totalFinancing = financingActivities.reduce((sum, item) => sum + item.value, 0);
  const cashChange = totalOperational + totalInvestment + totalFinancing;
  const cashFinal = cashInitial + cashChange;

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    let data: any[][] = [];
    
    if (activeTab === 'bilant') {
      data = [
        ['BILANȚ CONTABIL', '', `La data: ${format(referenceDate, 'dd.MM.yyyy')}`],
        [''],
        ['ACTIVE', 'Valoare (RON)', 'PASIVE', 'Valoare (RON)'],
        ['Active Imobilizate', '', 'Capitaluri Proprii', ''],
        ...activesImmobilized.map((item, idx) => [
          item.label,
          formatCurrency(item.value),
          pasivesEquity[idx]?.label || '',
          pasivesEquity[idx] ? formatCurrency(pasivesEquity[idx].value) : '',
        ]),
        ['Total Active Imobilizate', formatCurrency(subtotalActiveImobilizate), 'Total Capitaluri', formatCurrency(subtotalCapitaluri)],
        [''],
        ['Active Circulante', '', 'Datorii', ''],
        ...activesCurrent.map((item, idx) => [
          item.label,
          formatCurrency(item.value),
          pasivesLiabilities[idx]?.label || '',
          pasivesLiabilities[idx] ? formatCurrency(pasivesLiabilities[idx].value) : '',
        ]),
        ['Total Active Circulante', formatCurrency(subtotalActiveCirculante), 'Total Datorii', formatCurrency(subtotalDatorii)],
        [''],
        ['TOTAL ACTIVE', formatCurrency(totalActive), 'TOTAL PASIVE', formatCurrency(totalPasive)],
      ];
    } else if (activeTab === 'pnl') {
      data = [
        ['PROFIT ȘI PIERDERE', `La data: ${format(referenceDate, 'dd.MM.yyyy')}`],
        [''],
        ['VENITURI DIN EXPLOATARE', 'Valoare (RON)'],
        ...revenues.map(item => [item.label, formatCurrency(item.value)]),
        ['Total Venituri', formatCurrency(totalVenituri)],
        [''],
        ['CHELTUIELI DIN EXPLOATARE', 'Valoare (RON)'],
        ...expenses.map(item => [item.label, formatCurrency(item.value)]),
        ['Total Cheltuieli', formatCurrency(totalCheltuieli)],
        [''],
        ['PROFIT BRUT', formatCurrency(profitBrut)],
        ['Venituri Financiare', formatCurrency(venituriFinanciare)],
        ['Cheltuieli Financiare', formatCurrency(cheltuieliFinanciare)],
        ['PROFIT CURENT', formatCurrency(profitCurent)],
        ['Impozit pe Profit', formatCurrency(impozit)],
        ['PROFIT NET', formatCurrency(profitNet)],
      ];
    } else {
      data = [
        ['FLUXURI DE NUMERAR', `La data: ${format(referenceDate, 'dd.MM.yyyy')}`],
        [''],
        ['Numerar Inițial', formatCurrency(cashInitial)],
        [''],
        ['ACTIVITĂȚI OPERAȚIONALE', 'Valoare (RON)'],
        ['Profit Net', formatCurrency(profitNet)],
        ...operatingActivities.map(item => [item.label, formatCurrency(item.value)]),
        ['Total Operațional', formatCurrency(totalOperational)],
        [''],
        ['ACTIVITĂȚI DE INVESTIȚII', 'Valoare (RON)'],
        ...investmentActivities.map(item => [item.label, formatCurrency(item.value)]),
        ['Total Investiții', formatCurrency(totalInvestment)],
        [''],
        ['ACTIVITĂȚI DE FINANȚARE', 'Valoare (RON)'],
        ...financingActivities.map(item => [item.label, formatCurrency(item.value)]),
        ['Total Finanțare', formatCurrency(totalFinancing)],
        [''],
        ['Numerar Final', formatCurrency(cashFinal)],
      ];
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab === 'bilant' ? 'Bilanț' : activeTab === 'pnl' ? 'P&L' : 'Cash Flow');
    
    XLSX.writeFile(wb, `${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    toast({
      title: "Export reușit!",
      description: "Raportul a fost exportat în format Excel",
    });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    const title = activeTab === 'bilant' ? 'Bilanț Contabil' : activeTab === 'pnl' ? 'Profit și Pierdere' : 'Fluxuri de Numerar';
    doc.text(title, 20, 20);
    
    doc.setFontSize(10);
    doc.text(`Data: ${format(referenceDate, 'dd.MM.yyyy', { locale: ro })}`, 20, 28);
    
    if (activeTab === 'bilant') {
      autoTable(doc, {
        head: [['ACTIVE', 'Valoare (RON)', 'PASIVE', 'Valoare (RON)']],
        body: [
          ['Active Imobilizate', '', 'Capitaluri Proprii', ''],
          ...activesImmobilized.map((item, idx) => [
            item.label,
            formatCurrency(item.value),
            pasivesEquity[idx]?.label || '',
            pasivesEquity[idx] ? formatCurrency(pasivesEquity[idx].value) : '',
          ]),
          ['TOTAL', formatCurrency(totalActive), 'TOTAL', formatCurrency(totalPasive)],
        ],
        startY: 35,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] },
      });
    }
    
    doc.save(`${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    toast({
      title: "Export reușit!",
      description: "Raportul a fost exportat în format PDF",
    });
  };

  const handleSendEmail = () => {
    setEmailDialogOpen(true);
    setEmailForm({
      to: '',
      subject: `Raport Financiar - ${format(referenceDate, 'MMMM yyyy', { locale: ro })}`,
      message: 'Bună ziua,\n\nVă transmit atașat raportul financiar solicitat.\n\nCu respect,',
    });
  };

  const handleConfirmSendEmail = () => {
    toast({
      title: "Email trimis!",
      description: `Raportul a fost trimis la ${emailForm.to}`,
    });
    setEmailDialogOpen(false);
  };

  return (
    <div className="container-custom py-8">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                Rapoarte Financiare
              </h1>
              <Badge variant="secondary" className="text-sm">
                <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                {format(referenceDate, "MMMM yyyy", { locale: ro })}
              </Badge>
            </div>
            <p className="text-text-secondary">
              Situații financiare generate automat din balanța de verificare
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-text-secondary bg-surface px-4 py-2 rounded-lg no-print">
            <Info className="w-4 h-4 text-primary-indigo" />
            <span>
              Sursa: <span className="font-semibold text-foreground">{sourceFile}</span>
            </span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-4 bg-transparent h-auto p-0 mb-8 no-print">
          <TabsTrigger 
            value="bilant" 
            className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-indigo-50 data-[state=active]:to-purple-50 data-[state=active]:border-2 data-[state=active]:border-indigo-200 data-[state=active]:shadow-medium border-2 border-gray-200 rounded-xl py-4 px-6 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Scale className="w-5 h-5 text-primary-indigo" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-base">Bilanț Contabil</div>
                <div className="text-xs text-text-secondary">Active & Pasive</div>
              </div>
            </div>
          </TabsTrigger>
          
          <TabsTrigger 
            value="pnl"
            className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-50 data-[state=active]:to-teal-50 data-[state=active]:border-2 data-[state=active]:border-emerald-200 data-[state=active]:shadow-medium border-2 border-gray-200 rounded-xl py-4 px-6 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent-emerald" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-base">Profit și Pierdere</div>
                <div className="text-xs text-text-secondary">Venituri & Cheltuieli</div>
              </div>
            </div>
          </TabsTrigger>
          
          <TabsTrigger 
            value="cashflow"
            className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-50 data-[state=active]:to-cyan-50 data-[state=active]:border-2 data-[state=active]:border-blue-200 data-[state=active]:shadow-medium border-2 border-gray-200 rounded-xl py-4 px-6 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ArrowUpDown className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-base">Fluxuri Numerar</div>
                <div className="text-xs text-text-secondary">Cash Flow</div>
              </div>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* BILANȚ TAB */}
        <TabsContent value="bilant" className="mt-0">
          <Card className="border-2 border-gray-200 shadow-soft">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-indigo to-purple-600 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Bilanț Contabil</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      La data de {format(referenceDate, 'dd.MM.yyyy')} • Valori în RON
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 no-print">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" />
                    Printează
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={handleExportPDF}>
                        <FileText className="w-4 h-4 mr-2 text-red-600" />
                        Export PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportExcel}>
                        <FileSpreadsheet className="w-4 h-4 mr-2 text-accent-emerald" />
                        Export Excel
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSendEmail}>
                        <Mail className="w-4 h-4 mr-2 text-blue-600" />
                        Trimite pe Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ACTIVE */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-primary-indigo">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary-indigo" />
                      ACTIVE
                    </h3>
                    <span className="text-sm font-semibold text-primary-indigo">Total</span>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-text-secondary text-sm uppercase tracking-wide">
                      Active Imobilizate
                    </h4>
                    
                    <div className="space-y-2">
                      {activesImmobilized.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2 transition-colors">
                          <span className="text-sm text-foreground">{item.label}</span>
                          <span className="text-sm font-medium text-accent-emerald tabular-nums">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                      ))}
                      
                      <div className="flex items-center justify-between py-2 bg-indigo-50 rounded px-2 border-l-4 border-primary-indigo">
                        <span className="text-sm font-semibold text-foreground">
                          Total Active Imobilizate
                        </span>
                        <span className="text-sm font-bold text-primary-indigo tabular-nums">
                          {formatCurrency(subtotalActiveImobilizate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-text-secondary text-sm uppercase tracking-wide">
                      Active Circulante
                    </h4>
                    
                    <div className="space-y-2">
                      {activesCurrent.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2 transition-colors">
                          <span className="text-sm text-foreground">{item.label}</span>
                          <span className="text-sm font-medium text-accent-emerald tabular-nums">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                      ))}
                      
                      <div className="flex items-center justify-between py-2 bg-indigo-50 rounded px-2 border-l-4 border-primary-indigo">
                        <span className="text-sm font-semibold text-foreground">
                          Total Active Circulante
                        </span>
                        <span className="text-sm font-bold text-primary-indigo tabular-nums">
                          {formatCurrency(subtotalActiveCirculante)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex items-center justify-between py-4 bg-gradient-to-r from-primary-indigo to-purple-600 rounded-lg px-4">
                    <span className="text-base font-bold text-white">
                      TOTAL ACTIVE
                    </span>
                    <span className="text-lg font-bold text-white tabular-nums">
                      {formatCurrency(totalActive)}
                    </span>
                  </div>
                </div>
                
                {/* PASIVE */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-purple-600">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-purple-600" />
                      PASIVE
                    </h3>
                    <span className="text-sm font-semibold text-purple-600">Total</span>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-text-secondary text-sm uppercase tracking-wide">
                      Capitaluri Proprii
                    </h4>
                    
                    <div className="space-y-2">
                      {pasivesEquity.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2 transition-colors">
                          <span className="text-sm text-foreground">{item.label}</span>
                          <span className="text-sm font-medium text-accent-emerald tabular-nums">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                      ))}
                      
                      <div className="flex items-center justify-between py-2 bg-purple-50 rounded px-2 border-l-4 border-purple-600">
                        <span className="text-sm font-semibold text-foreground">
                          Total Capitaluri Proprii
                        </span>
                        <span className="text-sm font-bold text-purple-600 tabular-nums">
                          {formatCurrency(subtotalCapitaluri)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-text-secondary text-sm uppercase tracking-wide">
                      Datorii
                    </h4>
                    
                    <div className="space-y-2">
                      {pasivesLiabilities.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2 transition-colors">
                          <span className="text-sm text-foreground">{item.label}</span>
                          <span className="text-sm font-medium text-foreground tabular-nums">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                      ))}
                      
                      <div className="flex items-center justify-between py-2 bg-purple-50 rounded px-2 border-l-4 border-purple-600">
                        <span className="text-sm font-semibold text-foreground">
                          Total Datorii
                        </span>
                        <span className="text-sm font-bold text-purple-600 tabular-nums">
                          {formatCurrency(subtotalDatorii)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex items-center justify-between py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg px-4">
                    <span className="text-base font-bold text-white">
                      TOTAL PASIVE
                    </span>
                    <span className="text-lg font-bold text-white tabular-nums">
                      {formatCurrency(totalPasive)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className={cn(
                "mt-8 p-4 rounded-lg border-2",
                isBalanced ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isBalanced ? (
                      <CheckCircle2 className="w-5 h-5 text-accent-emerald" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                    <span className={cn(
                      "font-semibold",
                      isBalanced ? "text-emerald-700" : "text-destructive"
                    )}>
                      {isBalanced ? "Bilanțul este balansat" : "Atenție: Bilanțul nu este balansat"}
                    </span>
                  </div>
                  <span className="text-sm font-mono text-text-secondary">
                    Diferență: {formatCurrency(Math.abs(totalActive - totalPasive))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary uppercase">Lichiditate Curentă</p>
                    <p className="text-2xl font-bold text-foreground mt-1">2.35</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent-emerald" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary uppercase">Grad Îndatorare</p>
                    <p className="text-2xl font-bold text-foreground mt-1">45%</p>
                  </div>
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Percent className="w-5 h-5 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary uppercase">Capital de Lucru</p>
                    <p className="text-2xl font-bold text-foreground mt-1">125K</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary uppercase">Solvabilitate</p>
                    <p className="text-2xl font-bold text-foreground mt-1">1.85</p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary-indigo" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* P&L TAB */}
        <TabsContent value="pnl" className="mt-0">
          <Card className="border-2 border-gray-200 shadow-soft">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-accent-emerald to-teal-600 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Profit și Pierdere</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      La data de {format(referenceDate, 'dd.MM.yyyy')} • Valori în RON
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 no-print">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" />
                    Printează
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={handleExportPDF}>
                        <FileText className="w-4 h-4 mr-2 text-red-600" />
                        Export PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportExcel}>
                        <FileSpreadsheet className="w-4 h-4 mr-2 text-accent-emerald" />
                        Export Excel
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSendEmail}>
                        <Mail className="w-4 h-4 mr-2 text-blue-600" />
                        Trimite pe Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-8">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-accent-emerald">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <ArrowUpCircle className="w-5 h-5 text-accent-emerald" />
                      VENITURI DIN EXPLOATARE
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    {revenues.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2 transition-colors">
                        <span className="text-sm text-foreground">{item.label}</span>
                        <span className="text-sm font-medium text-accent-emerald tabular-nums">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    ))}
                    
                    <div className="flex items-center justify-between py-3 bg-emerald-50 rounded-lg px-3 border-l-4 border-accent-emerald mt-3">
                      <span className="text-base font-bold text-foreground">
                        Total Venituri din Exploatare
                      </span>
                      <span className="text-base font-bold text-accent-emerald tabular-nums">
                        {formatCurrency(totalVenituri)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-red-600">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <ArrowDownCircle className="w-5 h-5 text-red-600" />
                      CHELTUIELI DIN EXPLOATARE
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    {expenses.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2 transition-colors">
                        <span className="text-sm text-foreground">{item.label}</span>
                        <span className="text-sm font-medium text-destructive tabular-nums">
                          ({formatCurrency(item.value)})
                        </span>
                      </div>
                    ))}
                    
                    <div className="flex items-center justify-between py-3 bg-red-50 rounded-lg px-3 border-l-4 border-red-600 mt-3">
                      <span className="text-base font-bold text-foreground">
                        Total Cheltuieli din Exploatare
                      </span>
                      <span className="text-base font-bold text-destructive tabular-nums">
                        ({formatCurrency(totalCheltuieli)})
                      </span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between py-4 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg px-4 border-l-4 border-accent-emerald">
                  <span className="text-base font-bold text-foreground">
                    PROFIT BRUT DIN EXPLOATARE
                  </span>
                  <span className="text-lg font-bold text-emerald-700 tabular-nums">
                    {formatCurrency(profitBrut)}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold text-text-secondary text-sm uppercase">
                    Rezultat Financiar
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between py-2 px-3 bg-emerald-50 rounded">
                      <span className="text-sm text-foreground">Venituri Financiare</span>
                      <span className="text-sm font-medium text-accent-emerald tabular-nums">
                        {formatCurrency(venituriFinanciare)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-red-50 rounded">
                      <span className="text-sm text-foreground">Cheltuieli Financiare</span>
                      <span className="text-sm font-medium text-destructive tabular-nums">
                        ({formatCurrency(cheltuieliFinanciare)})
                      </span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between py-4 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg px-4 border-l-4 border-primary-indigo">
                  <span className="text-base font-bold text-foreground">
                    PROFIT CURENT ÎNAINTE DE IMPOZITARE
                  </span>
                  <span className="text-lg font-bold text-indigo-700 tabular-nums">
                    {formatCurrency(profitCurent)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2 px-3 bg-amber-50 rounded">
                  <span className="text-sm font-semibold text-foreground">Impozit pe Profit (16%)</span>
                  <span className="text-sm font-semibold text-amber-700 tabular-nums">
                    ({formatCurrency(impozit)})
                  </span>
                </div>
                
                <Separator className="border-2" />
                
                <div className="flex items-center justify-between py-5 bg-gradient-to-r from-accent-emerald to-teal-600 rounded-xl px-6 shadow-large">
                  <div>
                    <p className="text-white/80 text-sm mb-1">REZULTAT FINAL</p>
                    <span className="text-xl font-bold text-white">
                      PROFIT NET
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-white tabular-nums">
                    {formatCurrency(profitNet)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary uppercase">Marjă Brută</p>
                    <p className="text-2xl font-bold text-foreground mt-1">32%</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Percent className="w-5 h-5 text-accent-emerald" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary uppercase">Marjă Netă</p>
                    <p className="text-2xl font-bold text-foreground mt-1">18%</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary uppercase">ROA</p>
                    <p className="text-2xl font-bold text-foreground mt-1">12%</p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary-indigo" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary uppercase">ROE</p>
                    <p className="text-2xl font-bold text-foreground mt-1">22%</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CASH FLOW TAB */}
        <TabsContent value="cashflow" className="mt-0">
          <Card className="border-2 border-gray-200 shadow-soft">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-white space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                    <ArrowUpDown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Fluxuri de Numerar</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      La data de {format(referenceDate, 'dd.MM.yyyy')} • Valori în RON
                    </CardDescription>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 no-print">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" />
                    Printează
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={handleExportPDF}>
                        <FileText className="w-4 h-4 mr-2 text-red-600" />
                        Export PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportExcel}>
                        <FileSpreadsheet className="w-4 h-4 mr-2 text-accent-emerald" />
                        Export Excel
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSendEmail}>
                        <Mail className="w-4 h-4 mr-2 text-blue-600" />
                        Trimite pe Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-8">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between py-4 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-lg px-4">
                  <span className="text-base font-bold text-foreground">
                    Numerar și Echivalente la Începutul Perioadei
                  </span>
                  <span className="text-lg font-bold text-blue-700 tabular-nums">
                    {formatCurrency(cashInitial)}
                  </span>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-accent-emerald">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Activity className="w-5 h-5 text-accent-emerald" />
                      FLUXURI DIN ACTIVITĂȚI OPERAȚIONALE
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 bg-emerald-50 rounded">
                      <span className="text-sm font-semibold text-foreground">Profit Net</span>
                      <span className="text-sm font-semibold text-accent-emerald tabular-nums">
                        {formatCurrency(profitNet)}
                      </span>
                    </div>
                    
                    <p className="text-xs text-text-secondary px-3 py-1">Ajustări pentru:</p>
                    
                    {operatingActivities.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-3 transition-colors">
                        <span className="text-sm text-foreground pl-4">{item.label}</span>
                        <span className={cn(
                          "text-sm font-medium tabular-nums",
                          item.value >= 0 ? "text-accent-emerald" : "text-destructive"
                        )}>
                          {item.value >= 0 ? formatCurrency(item.value) : `(${formatCurrency(Math.abs(item.value))})`}
                        </span>
                      </div>
                    ))}
                    
                    <div className="flex items-center justify-between py-3 bg-emerald-100 rounded-lg px-3 border-l-4 border-accent-emerald mt-3">
                      <span className="text-base font-bold text-foreground">
                        Fluxuri Nete din Activități Operaționale
                      </span>
                      <span className="text-base font-bold text-emerald-700 tabular-nums">
                        {formatCurrency(totalOperational)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-amber-600">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-warning" />
                      FLUXURI DIN ACTIVITĂȚI DE INVESTIȚII
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    {investmentActivities.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-3 transition-colors">
                        <span className="text-sm text-foreground">{item.label}</span>
                        <span className={cn(
                          "text-sm font-medium tabular-nums",
                          item.value >= 0 ? "text-accent-emerald" : "text-destructive"
                        )}>
                          {item.value >= 0 ? formatCurrency(item.value) : `(${formatCurrency(Math.abs(item.value))})`}
                        </span>
                      </div>
                    ))}
                    
                    <div className="flex items-center justify-between py-3 bg-amber-100 rounded-lg px-3 border-l-4 border-warning mt-3">
                      <span className="text-base font-bold text-foreground">
                        Fluxuri Nete din Activități de Investiții
                      </span>
                      <span className={cn(
                        "text-base font-bold tabular-nums",
                        totalInvestment >= 0 ? "text-emerald-700" : "text-amber-700"
                      )}>
                        {totalInvestment >= 0 ? formatCurrency(totalInvestment) : `(${formatCurrency(Math.abs(totalInvestment))})`}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-purple-600">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Landmark className="w-5 h-5 text-purple-600" />
                      FLUXURI DIN ACTIVITĂȚI DE FINANȚARE
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    {financingActivities.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-3 transition-colors">
                        <span className="text-sm text-foreground">{item.label}</span>
                        <span className={cn(
                          "text-sm font-medium tabular-nums",
                          item.value >= 0 ? "text-accent-emerald" : "text-destructive"
                        )}>
                          {item.value >= 0 ? formatCurrency(item.value) : `(${formatCurrency(Math.abs(item.value))})`}
                        </span>
                      </div>
                    ))}
                    
                    <div className="flex items-center justify-between py-3 bg-purple-100 rounded-lg px-3 border-l-4 border-purple-600 mt-3">
                      <span className="text-base font-bold text-foreground">
                        Fluxuri Nete din Activități de Finanțare
                      </span>
                      <span className={cn(
                        "text-base font-bold tabular-nums",
                        totalFinancing >= 0 ? "text-emerald-700" : "text-purple-700"
                      )}>
                        {totalFinancing >= 0 ? formatCurrency(totalFinancing) : `(${formatCurrency(Math.abs(totalFinancing))})`}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Separator className="border-2" />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 bg-blue-50 rounded-lg px-3">
                    <span className="text-sm font-semibold text-foreground">
                      Creștere/(Descreștere) Netă a Numerarului
                    </span>
                    <span className={cn(
                      "text-sm font-semibold tabular-nums",
                      cashChange >= 0 ? "text-accent-emerald" : "text-destructive"
                    )}>
                      {cashChange >= 0 ? formatCurrency(cashChange) : `(${formatCurrency(Math.abs(cashChange))})`}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl px-6 shadow-large">
                    <div>
                      <p className="text-white/80 text-sm mb-1">REZULTAT FINAL</p>
                      <span className="text-xl font-bold text-white">
                        Numerar la Sfârșitul Perioadei
                      </span>
                    </div>
                    <span className="text-2xl font-bold text-white tabular-nums">
                      {formatCurrency(cashFinal)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary uppercase">Cash Flow Operațional</p>
                    <p className="text-2xl font-bold text-accent-emerald mt-1">+{formatCurrency(totalOperational / 1000)}K</p>
                  </div>
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <ArrowUpCircle className="w-5 h-5 text-accent-emerald" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary uppercase">Free Cash Flow</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency((totalOperational + totalInvestment) / 1000)}K</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Coins className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary uppercase">Conversie Cash</p>
                    <p className="text-2xl font-bold text-foreground mt-1">78%</p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Percent className="w-5 h-5 text-primary-indigo" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-secondary uppercase">Zile de Cash</p>
                    <p className="text-2xl font-bold text-foreground mt-1">45</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Trimite Raport pe Email</DialogTitle>
            <DialogDescription>
              Raportul va fi atașat în format PDF
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email-to">Către (Email)</Label>
              <Input
                id="email-to"
                type="email"
                placeholder="exemplu@email.com"
                value={emailForm.to}
                onChange={(e) => setEmailForm({...emailForm, to: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subiect</Label>
              <Input
                id="email-subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-message">Mesaj</Label>
              <Textarea
                id="email-message"
                rows={5}
                value={emailForm.message}
                onChange={(e) => setEmailForm({...emailForm, message: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleConfirmSendEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Trimite Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RapoarteFinanciare;