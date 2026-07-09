import { useState, lazy, Suspense, useEffect } from 'react';
import { format } from 'date-fns';
import {
  FileSpreadsheet,
  Printer,
  FileText,
  Mail,
  Upload,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BalanceMonthPicker } from '@/components/app/BalanceMonthPicker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useBalante, type BalanceAccount } from '@/hooks/useBalante';
import { useBalanceMonthSelection } from '@/hooks/useBalanceMonthSelection';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useGeneratedFinancialStatements } from '@/hooks/useGeneratedFinancialStatements';
import { useStatementLineDefinitions } from '@/hooks/useStatementLineDefinitions';
import {
  formatStatementAmount,
  groupCashFlowLines,
  groupIncomeStatementLines,
  isEmphasizedLineType,
} from '@/lib/financialStatementDisplay';
import type { Database } from '@/integrations/supabase/types';

const FinancialTreeTable = lazy(() =>
  import('@/components/financial-reports/FinancialTreeTable').then((m) => ({
    default: m.FinancialTreeTable,
  })),
);

type BalanceSheetLineRow = Database['public']['Tables']['balance_sheet_lines']['Row'];
type IncomeStatementLineRow = Database['public']['Tables']['income_statement_lines']['Row'];
type CashFlowLineRow = Database['public']['Tables']['cash_flow_lines']['Row'];

interface StatementLineRowProps {
  label: string;
  value: number;
  emphasized?: boolean;
  indent?: boolean;
}

const StatementLineRow = ({ label, value, emphasized = false, indent = false }: StatementLineRowProps) => (
  <tr className={cn(emphasized && 'table-row-total')}>
    <td className={cn(indent && 'pl-8')}>{label}</td>
    <td className="text-right font-mono tabular-nums">{formatStatementAmount(value)}</td>
  </tr>
);

interface StatementTableProps<T extends { description: string | null; amount: number; line_type?: string | null }> {
  lines: T[];
  getLabel: (line: T) => string;
  isEmphasized?: (line: T) => boolean;
}

function StatementTable<T extends { description: string | null; amount: number; line_type?: string | null }>({
  lines,
  getLabel,
  isEmphasized = (line) => isEmphasizedLineType(line.line_type),
}: StatementTableProps<T>) {
  if (lines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nu există linii de afișat pentru această secțiune.
      </p>
    );
  }

  return (
    <table className="table-financial">
      <thead>
        <tr>
          <th>Descriere</th>
          <th className="text-right">Sumă</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, idx) => (
          <StatementLineRow
            key={`${getLabel(line)}-${idx}`}
            label={getLabel(line)}
            value={line.amount}
            emphasized={isEmphasized(line)}
            indent={!isEmphasized(line)}
          />
        ))}
      </tbody>
    </table>
  );
}

const RapoarteFinanciare = () => {
  const { activeCompany } = useCompanyContext();
  const { balances, loading, hasData, getBalanceAccounts } = useBalante();
  const {
    selectedMonth,
    selectedBalanceId: selectedBalanta,
    selectedBalance,
    handleMonthChange: handleBalanceMonthChange,
  } = useBalanceMonthSelection({ balances });
  const [activeTab, setActiveTab] = useState<string>('bilant');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [trialBalanceAccounts, setTrialBalanceAccounts] = useState<BalanceAccount[]>([]);

  const {
    loading: statementsLoading,
    isGenerating,
    error: statementsError,
    hasStatements,
    data: statementsData,
    refresh,
    generateStatements,
  } = useGeneratedFinancialStatements(selectedBalanta || null, activeCompany?.id ?? null);

  const {
    definitions: balanceSheetDefinitions,
    loading: definitionsLoading,
    error: definitionsError,
  } = useStatementLineDefinitions(activeCompany?.id ?? null, 'balance_sheet');

  useEffect(() => {
    if (!selectedBalanta) {
      setTrialBalanceAccounts([]);
      return;
    }
    void getBalanceAccounts(selectedBalanta).then(setTrialBalanceAccounts).catch(() => {
      setTrialBalanceAccounts([]);
    });
  }, [selectedBalanta, getBalanceAccounts]);

  const handlePrint = () => {
    window.print();
  };

  const exportLinesToSheet = (
    sheetName: string,
    rows: Array<{ category: string; subcategory: string; description: string; amount: number }>,
  ) => {
    const sheetData = [
      ['Categorie', 'Subcategorie', 'Descriere', 'Sumă'],
      ...rows.map((r) => [r.category, r.subcategory, r.description, r.amount]),
    ];
    return { sheetName, sheetData };
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (activeTab === 'bilant' && statementsData.balanceSheet) {
      const rows = statementsData.balanceSheet.lines.map((line) => ({
        category: line.category,
        subcategory: line.subcategory ?? '',
        description: line.description ?? line.line_key,
        amount: line.amount,
      }));
      const { sheetName, sheetData } = exportLinesToSheet('Bilant', rows);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), sheetName);
    } else if (activeTab === 'pl' && statementsData.incomeStatement) {
      const rows = statementsData.incomeStatement.lines.map((line) => ({
        category: line.category,
        subcategory: line.subcategory ?? '',
        description: line.description ?? line.line_key,
        amount: line.amount,
      }));
      const { sheetName, sheetData } = exportLinesToSheet('Profit si Pierdere', rows);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), sheetName);
    } else if (activeTab === 'cashflow' && statementsData.cashFlow) {
      const rows = statementsData.cashFlow.lines.map((line) => ({
        category: line.section,
        subcategory: line.cash_flow_area ?? '',
        description: line.description ?? line.line_key,
        amount: line.amount,
      }));
      const { sheetName, sheetData } = exportLinesToSheet('Cash Flow', rows);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), sheetName);
    } else {
      toast.error('Nu există date de exportat pentru tab-ul selectat');
      return;
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
    } catch {
      toast.error('Eroare la generarea PDF-ului');
    }
  };

  const handleGenerate = async () => {
    const result = await generateStatements();
    if (result.success) {
      toast.success('Rapoartele financiare au fost generate cu succes');
    } else {
      toast.error(result.error ?? 'Generarea rapoartelor a eșuat');
    }
  };

  const handleRegenerateConfirm = async () => {
    setRegenerateDialogOpen(false);
    await handleGenerate();
  };

  const getLineLabel = (line: BalanceSheetLineRow | IncomeStatementLineRow | CashFlowLineRow) =>
    line.description ?? ('line_key' in line ? line.line_key : '');

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
            Generați și vizualizați rapoarte financiare detaliate din datele Supabase
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

  const incomeGroups = statementsData.incomeStatement
    ? groupIncomeStatementLines(statementsData.incomeStatement.lines)
    : [];
  const cashFlowGroups = statementsData.cashFlow
    ? groupCashFlowLines(statementsData.cashFlow.lines)
    : [];

  const isReportLoading = statementsLoading || isGenerating || definitionsLoading;
  const balanceSheetCurrency =
    statementsData.balanceSheet?.statement.currency_code ?? activeCompany?.currency ?? 'RON';
  const balanceSheetPeriodEnd = statementsData.balanceSheet?.statement.period_end;
  const balanceSheetYear = balanceSheetPeriodEnd
    ? new Date(balanceSheetPeriodEnd).getFullYear()
    : undefined;
  const balanceSheetPeriodLabel = balanceSheetPeriodEnd
    ? `Sold la ${format(new Date(balanceSheetPeriodEnd), 'dd.MM.yyyy')}`
    : undefined;

  return (
    <div className="container-app">
      <div className="page-header">
        <h1 className="page-title">Rapoarte Financiare</h1>
        <p className="page-description">
          Rapoarte generate din balanța: {selectedBalance?.source_file_name}
          {statementsData.balanceSheet?.statement.period_end && (
            <span className="text-muted-foreground">
              {' '}
              · Perioada {format(new Date(statementsData.balanceSheet.statement.period_start), 'dd.MM.yyyy')}
              {' – '}
              {format(new Date(statementsData.balanceSheet.statement.period_end), 'dd.MM.yyyy')}
            </span>
          )}
        </p>
      </div>

      <Card className="p-4 mb-6 rounded-[20px]">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <BalanceMonthPicker
            value={selectedMonth}
            onChange={handleBalanceMonthChange}
            containerClassName="flex-1 max-w-md"
          />

          <div className="flex flex-wrap gap-2">
            {!hasStatements ? (
              <Button
                className="btn-primary h-9 rounded-[40px]"
                onClick={handleGenerate}
                disabled={isReportLoading}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generează rapoarte
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-9 rounded-[40px]"
                onClick={() => setRegenerateDialogOpen(true)}
                disabled={isReportLoading}
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', isGenerating && 'animate-spin')} />
                Regenerează
              </Button>
            )}

            <Button variant="outline" className="h-9 rounded-[40px]" onClick={() => void refresh()} disabled={isReportLoading}>
              <RefreshCw className={cn('w-4 h-4 mr-2', statementsLoading && 'animate-spin')} />
              Refresh
            </Button>

            <Button variant="outline" className="h-9 rounded-[40px]" onClick={handlePrint} disabled={!hasStatements}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" className="h-9 rounded-[40px]" onClick={handleExportExcel} disabled={!hasStatements}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" className="h-9 rounded-[40px]" onClick={handleExportPDF} disabled={!hasStatements}>
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" className="h-9 rounded-[40px]" onClick={() => setEmailDialogOpen(true)} disabled={!hasStatements}>
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
          </div>
        </div>
      </Card>

      {definitionsError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Structură raport indisponibilă</AlertTitle>
          <AlertDescription>{definitionsError}</AlertDescription>
        </Alert>
      )}

      {statementsError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Eroare rapoarte</AlertTitle>
          <AlertDescription>{statementsError}</AlertDescription>
        </Alert>
      )}

      {!hasStatements && !isReportLoading && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Rapoarte indisponibile</AlertTitle>
          <AlertDescription>
            Balanța este importată, dar situațiile financiare nu au fost generate încă. Apăsați
            „Generează rapoarte” pentru a rula pipeline-ul Supabase (mapare conturi + generare BS/P&L/CF).
          </AlertDescription>
        </Alert>
      )}

      {isReportLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : hasStatements ? (
        <div id="report-content">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 w-full md:w-auto bg-transparent border-b border-border rounded-none p-0 h-auto">
              <TabsTrigger
                value="bilant"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground px-4 py-2.5"
              >
                Bilanț
              </TabsTrigger>
              <TabsTrigger
                value="pl"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground px-4 py-2.5"
              >
                Profit & Pierdere
              </TabsTrigger>
              <TabsTrigger
                value="cashflow"
                className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground px-4 py-2.5"
              >
                Cash Flow
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bilant">
              <Card className="p-6 rounded-[20px] card-accent-indigo">
                <div className="mb-4 border-b pb-3">
                  <h3 className="text-lg font-bold text-foreground">Bilanț contabil</h3>
                  {statementsData.balanceSheet?.statement && selectedBalance && (
                    <p className="label-micro mt-1">
                      {activeCompany?.name}
                      {' · '}
                      {format(new Date(statementsData.balanceSheet.statement.period_start), 'dd.MM.yyyy')}
                      {' – '}
                      {format(new Date(statementsData.balanceSheet.statement.period_end), 'dd.MM.yyyy')}
                      {' · '}
                      {selectedBalance.source_file_name}
                    </p>
                  )}
                </div>
                {!statementsData.balanceSheet?.lines.length ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nu există linii de bilanț generate pentru această balanță.
                  </p>
                ) : (
                  <Suspense
                    fallback={
                      <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    }
                  >
                    <FinancialTreeTable
                      reportType="balance_sheet"
                      companyId={activeCompany?.id ?? null}
                      importId={selectedBalanta}
                      trialBalanceAccounts={trialBalanceAccounts}
                      reportStatus={statementsData.reportStatus}
                      currency={balanceSheetCurrency}
                      definitions={balanceSheetDefinitions}
                      currentLines={statementsData.balanceSheet.lines}
                      selectedYear={balanceSheetYear}
                      selectedPeriod={balanceSheetPeriodLabel}
                      onExport={handleExportExcel}
                      onPrint={handlePrint}
                    />
                  </Suspense>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="pl">
              <Card className="p-6 rounded-[20px]">
                <h3 className="text-lg font-bold text-foreground mb-4 border-b pb-2">
                  CONTUL DE PROFIT ȘI PIERDERE
                </h3>
                {incomeGroups.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nu există linii P&L generate pentru această balanță.
                  </p>
                ) : (
                  <div className="space-y-8">
                    {incomeGroups.map((group) => (
                      <div key={group.groupKey}>
                        <h4
                          className={cn(
                            'font-semibold mb-3',
                            group.groupKey === 'venituri' && 'text-accent',
                            group.groupKey === 'cheltuieli' && 'text-destructive',
                          )}
                        >
                          {group.groupLabel}
                        </h4>
                        <StatementTable
                          lines={group.subgroups[0]?.lines ?? []}
                          getLabel={(line) => getLineLabel(line)}
                          isEmphasized={(line) => isEmphasizedLineType(line.line_type)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="cashflow">
              <Card className="p-6 rounded-[20px]">
                <h3 className="text-lg font-bold text-foreground mb-4 border-b pb-2">
                  SITUAȚIA FLUXURILOR DE NUMERAR
                </h3>
                {cashFlowGroups.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nu există linii cash flow generate pentru această balanță.
                  </p>
                ) : (
                  <div className="space-y-8">
                    {cashFlowGroups.map((group) => (
                      <div key={group.groupKey}>
                        <h4 className="font-semibold text-primary mb-3">{group.groupLabel}</h4>
                        <StatementTable
                          lines={group.subgroups[0]?.lines ?? []}
                          getLabel={(line) => getLineLabel(line)}
                          isEmphasized={(line) =>
                            isEmphasizedLineType(line.line_type) ||
                            ['calculated', 'closing_cash', 'opening_cash'].includes(group.groupKey)
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}

      <AlertDialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerare rapoarte</AlertDialogTitle>
            <AlertDialogDescription>
              Această acțiune va înlocui situațiile financiare existente pentru balanța selectată cu
              versiuni nou generate. Continuați?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRegenerateConfirm()}>
              Regenerează
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <Button
              onClick={() => {
                toast.success(`Raportul va fi trimis la ${recipientEmail}`);
                setEmailDialogOpen(false);
                setRecipientEmail('');
              }}
            >
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
