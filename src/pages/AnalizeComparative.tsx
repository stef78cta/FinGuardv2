import { useState, useEffect, useMemo } from 'react';
import { 
  GitCompare,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useBalante, BalanceWithAccounts } from '@/hooks/useBalante';
import { useFinancialCalculations } from '@/hooks/useFinancialCalculations';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

interface ComparisonRow {
  label: string;
  indent: number;
  isSubtotal: boolean;
  isTotal: boolean;
  value1: number;
  value2: number;
  variation: number;
  variationPercent: number;
}

const AnalizeComparative = () => {
  const { balances, loading, hasData, getBalanceAccounts } = useBalante();
  const [balance1Id, setBalance1Id] = useState<string>('');
  const [balance2Id, setBalance2Id] = useState<string>('');
  const [balance1Data, setBalance1Data] = useState<BalanceWithAccounts | null>(null);
  const [balance2Data, setBalance2Data] = useState<BalanceWithAccounts | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('bilant');

  // Load balance data when selected
  useEffect(() => {
    const loadBalanceData = async () => {
      if (!balance1Id && !balance2Id) {
        setBalance1Data(null);
        setBalance2Data(null);
        return;
      }

      setDataLoading(true);
      try {
        if (balance1Id) {
          const accounts = await getBalanceAccounts(balance1Id);
          const balance = balances.find(b => b.id === balance1Id);
          if (balance) {
            setBalance1Data({ ...balance, accounts });
          }
        }
        
        if (balance2Id) {
          const accounts = await getBalanceAccounts(balance2Id);
          const balance = balances.find(b => b.id === balance2Id);
          if (balance) {
            setBalance2Data({ ...balance, accounts });
          }
        }
      } catch (error) {
        console.error('Error loading balance data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    loadBalanceData();
  }, [balance1Id, balance2Id, balances, getBalanceAccounts]);

  const { bilantData: bilant1, profitPierdereData: pl1 } = useFinancialCalculations(balance1Data?.accounts || []);
  const { bilantData: bilant2, profitPierdereData: pl2 } = useFinancialCalculations(balance2Data?.accounts || []);

  // Generate comparison data
  const bilantComparison = useMemo((): ComparisonRow[] => {
    if (!balance1Data || !balance2Data) return [];

    const createRow = (label: string, val1: number, val2: number, indent = 0, isSubtotal = false, isTotal = false): ComparisonRow => {
      const variation = val2 - val1;
      const variationPercent = val1 !== 0 ? (variation / Math.abs(val1)) * 100 : (val2 > 0 ? 100 : 0);
      return { label, indent, isSubtotal, isTotal, value1: val1, value2: val2, variation, variationPercent };
    };

    return [
      createRow('ACTIVE', bilant1.active.total, bilant2.active.total, 0, false, true),
      createRow('Active imobilizate', bilant1.active.imobilizate.subtotal, bilant2.active.imobilizate.subtotal, 0, true),
      createRow('Imobilizări corporale', bilant1.active.imobilizate.corporale, bilant2.active.imobilizate.corporale, 1),
      createRow('Imobilizări necorporale', bilant1.active.imobilizate.necorporale, bilant2.active.imobilizate.necorporale, 1),
      createRow('Imobilizări financiare', bilant1.active.imobilizate.financiare, bilant2.active.imobilizate.financiare, 1),
      createRow('Active circulante', bilant1.active.circulante.subtotal, bilant2.active.circulante.subtotal, 0, true),
      createRow('Stocuri', bilant1.active.circulante.stocuri, bilant2.active.circulante.stocuri, 1),
      createRow('Creanțe', bilant1.active.circulante.creante, bilant2.active.circulante.creante, 1),
      createRow('Casa și bănci', bilant1.active.circulante.casaBanci, bilant2.active.circulante.casaBanci, 1),
      createRow('PASIVE', bilant1.pasive.total, bilant2.pasive.total, 0, false, true),
      createRow('Capitaluri proprii', bilant1.pasive.capitaluri.subtotal, bilant2.pasive.capitaluri.subtotal, 0, true),
      createRow('Capital social', bilant1.pasive.capitaluri.capitalSocial, bilant2.pasive.capitaluri.capitalSocial, 1),
      createRow('Rezerve', bilant1.pasive.capitaluri.rezerve, bilant2.pasive.capitaluri.rezerve, 1),
      createRow('Profit/Pierdere', bilant1.pasive.capitaluri.profitPierdere, bilant2.pasive.capitaluri.profitPierdere, 1),
      createRow('Datorii', bilant1.pasive.datorii.subtotal, bilant2.pasive.datorii.subtotal, 0, true),
      createRow('Datorii pe termen lung', bilant1.pasive.datorii.termenLung, bilant2.pasive.datorii.termenLung, 1),
      createRow('Datorii pe termen scurt', bilant1.pasive.datorii.termenScurt, bilant2.pasive.datorii.termenScurt, 1),
    ];
  }, [bilant1, bilant2, balance1Data, balance2Data]);

  const plComparison = useMemo((): ComparisonRow[] => {
    if (!balance1Data || !balance2Data) return [];

    const createRow = (label: string, val1: number, val2: number, indent = 0, isSubtotal = false, isTotal = false): ComparisonRow => {
      const variation = val2 - val1;
      const variationPercent = val1 !== 0 ? (variation / Math.abs(val1)) * 100 : (val2 > 0 ? 100 : 0);
      return { label, indent, isSubtotal, isTotal, value1: val1, value2: val2, variation, variationPercent };
    };

    return [
      createRow('VENITURI TOTALE', pl1.venituri.total, pl2.venituri.total, 0, false, true),
      createRow('Venituri din vânzări', pl1.venituri.vanzari, pl2.venituri.vanzari, 1),
      createRow('Alte venituri', pl1.venituri.altele, pl2.venituri.altele, 1),
      createRow('CHELTUIELI TOTALE', pl1.cheltuieli.total, pl2.cheltuieli.total, 0, false, true),
      createRow('Cheltuieli materiale', pl1.cheltuieli.materiale, pl2.cheltuieli.materiale, 1),
      createRow('Cheltuieli personal', pl1.cheltuieli.personal, pl2.cheltuieli.personal, 1),
      createRow('Alte cheltuieli', pl1.cheltuieli.altele, pl2.cheltuieli.altele, 1),
      createRow('REZULTAT BRUT', pl1.rezultatBrut, pl2.rezultatBrut, 0, true),
      createRow('Impozit pe profit', pl1.impozit, pl2.impozit, 1),
      createRow('REZULTAT NET', pl1.rezultatNet, pl2.rezultatNet, 0, false, true),
    ];
  }, [pl1, pl2, balance1Data, balance2Data]);

  const isLoading = loading || dataLoading;

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
        <PageHeader 
          title="Analize Comparative"
          description="Comparați performanța financiară între perioade"
        />

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Upload className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Încarcă balanțe pentru comparație
          </h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Ai nevoie de cel puțin 2 balanțe pentru a face o analiză comparativă.
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

  if (balances.length < 2) {
    return (
      <div className="container-app">
        <PageHeader 
          title="Analize Comparative"
          description="Comparați performanța financiară între perioade"
        />

        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Date insuficiente</h3>
          <p className="text-muted-foreground mb-6">
            Ai nevoie de cel puțin 2 balanțe pentru a face o comparație. Momentan ai {balances.length} balanță.
          </p>
          <Link to="/app/incarcare-balanta">
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Încarcă altă balanță
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const hasSelectedBoth = balance1Id && balance2Id;

  return (
    <div className="container-app">
      <PageHeader 
        title="Analize Comparative"
        description="Comparați performanța financiară între perioade"
      />

      {/* Period Selector */}
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Perioada 1</Label>
            <Select value={balance1Id} onValueChange={setBalance1Id}>
              <SelectTrigger>
                <SelectValue placeholder="Selectează prima balanță" />
              </SelectTrigger>
              <SelectContent>
                {balances.map((balance) => (
                  <SelectItem 
                    key={balance.id} 
                    value={balance.id}
                    disabled={balance.id === balance2Id}
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-primary" />
                      <span>{balance.source_file_name}</span>
                      <span className="text-muted-foreground text-xs">
                        ({format(new Date(balance.period_end), 'MMM yyyy', { locale: ro })})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">Perioada 2</Label>
            <Select value={balance2Id} onValueChange={setBalance2Id}>
              <SelectTrigger>
                <SelectValue placeholder="Selectează a doua balanță" />
              </SelectTrigger>
              <SelectContent>
                {balances.map((balance) => (
                  <SelectItem 
                    key={balance.id} 
                    value={balance.id}
                    disabled={balance.id === balance1Id}
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-primary" />
                      <span>{balance.source_file_name}</span>
                      <span className="text-muted-foreground text-xs">
                        ({format(new Date(balance.period_end), 'MMM yyyy', { locale: ro })})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Comparison Results */}
      {hasSelectedBoth && !dataLoading ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 w-full md:w-auto">
            <TabsTrigger value="bilant">Bilanț Comparativ</TabsTrigger>
            <TabsTrigger value="pl">Profit & Pierdere</TabsTrigger>
          </TabsList>

          <TabsContent value="bilant">
            <div className="card-app">
              <div className="card-app-header">
                <h3 className="font-semibold text-foreground">Comparație Bilanț</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {balance1Data && balance2Data && (
                    <>
                      {format(new Date(balance1Data.period_end), 'MMM yyyy', { locale: ro })} vs. {format(new Date(balance2Data.period_end), 'MMM yyyy', { locale: ro })}
                    </>
                  )}
                </p>
              </div>
              <div className="card-app-content p-0 overflow-x-auto">
                <table className="table-financial">
                  <thead>
                    <tr>
                      <th>Element</th>
                      <th className="text-right">Perioada 1</th>
                      <th className="text-right">Perioada 2</th>
                      <th className="text-right">Variație</th>
                      <th className="text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bilantComparison.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className={cn(
                          row.isTotal && 'bg-muted/40 font-bold',
                          row.isSubtotal && 'bg-muted/20 font-semibold'
                        )}
                      >
                        <td className={cn(row.indent === 1 && 'pl-8')}>{row.label}</td>
                        <td className="text-right font-mono">{formatCurrency(row.value1)}</td>
                        <td className="text-right font-mono">{formatCurrency(row.value2)}</td>
                        <td className={cn(
                          "text-right font-mono",
                          row.variation > 0 ? "text-accent" : row.variation < 0 ? "text-destructive" : ""
                        )}>
                          {row.variation > 0 ? '+' : ''}{formatCurrency(row.variation)}
                        </td>
                        <td className="text-right">
                          <span className={cn(
                            "inline-flex items-center gap-1",
                            row.variationPercent > 0 ? "text-accent" : row.variationPercent < 0 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {row.variationPercent > 0 ? <ArrowUpRight className="w-3 h-3" /> : row.variationPercent < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                            {row.variationPercent > 0 ? '+' : ''}{row.variationPercent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pl">
            <div className="card-app">
              <div className="card-app-header">
                <h3 className="font-semibold text-foreground">Comparație Profit & Pierdere</h3>
              </div>
              <div className="card-app-content p-0 overflow-x-auto">
                <table className="table-financial">
                  <thead>
                    <tr>
                      <th>Element</th>
                      <th className="text-right">Perioada 1</th>
                      <th className="text-right">Perioada 2</th>
                      <th className="text-right">Variație</th>
                      <th className="text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plComparison.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className={cn(
                          row.isTotal && 'bg-muted/40 font-bold',
                          row.isSubtotal && 'bg-muted/20 font-semibold'
                        )}
                      >
                        <td className={cn(row.indent === 1 && 'pl-8')}>{row.label}</td>
                        <td className="text-right font-mono">{formatCurrency(row.value1)}</td>
                        <td className="text-right font-mono">{formatCurrency(row.value2)}</td>
                        <td className={cn(
                          "text-right font-mono",
                          row.variation > 0 ? "text-accent" : row.variation < 0 ? "text-destructive" : ""
                        )}>
                          {row.variation > 0 ? '+' : ''}{formatCurrency(row.variation)}
                        </td>
                        <td className="text-right">
                          <span className={cn(
                            "inline-flex items-center gap-1",
                            row.variationPercent > 0 ? "text-accent" : row.variationPercent < 0 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {row.variationPercent > 0 ? <ArrowUpRight className="w-3 h-3" /> : row.variationPercent < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                            {row.variationPercent > 0 ? '+' : ''}{row.variationPercent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : dataLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="p-8 text-center">
          <GitCompare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Selectează două perioade</h3>
          <p className="text-muted-foreground">
            Alege două balanțe din selecțiile de mai sus pentru a vedea comparația.
          </p>
        </Card>
      )}
    </div>
  );
};

export default AnalizeComparative;
