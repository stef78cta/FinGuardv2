import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/app/PageHeader';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { Upload, Loader2 } from 'lucide-react';
import { useBalante, BalanceWithAccounts } from '@/hooks/useBalante';

import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

// Types
interface ChartDataPoint {
  month: string;
  materiale: number;
  personal: number;
  altele: number;
  totale: number;
}

interface TableRow {
  category: string;
  indent: number;
  isSubtotal: boolean;
  isTotal: boolean;
  values: {
    period: string;
    value: number;
    percent: number;
  }[];
}

interface ChartFilters {
  materiale: boolean;
  personal: boolean;
  altele: boolean;
  totale: boolean;
}

// Chart configuration
const chartConfig = {
  materiale: { label: 'Cheltuieli materiale', color: 'hsl(var(--primary))' },
  personal: { label: 'Cheltuieli personal', color: 'hsl(var(--accent))' },
  altele: { label: 'Alte cheltuieli', color: 'hsl(var(--warning))' },
  totale: { label: 'Cheltuieli totale', color: 'hsl(var(--destructive))' },
};

// Utility function
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Filter Checkbox Component
const FilterCheckbox = ({ 
  label, 
  checked, 
  color, 
  onChange 
}: { 
  label: string; 
  checked: boolean; 
  color: string; 
  onChange: () => void;
}) => {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={label}
        checked={checked}
        onCheckedChange={onChange}
      />
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
        <label htmlFor={label} className="text-sm text-foreground cursor-pointer select-none">
          {label}
        </label>
      </div>
    </div>
  );
};

// Chart Section Component
const ChartSection = ({ 
  chartData, 
  filters, 
  onFilterChange 
}: { 
  chartData: ChartDataPoint[]; 
  filters: ChartFilters; 
  onFilterChange: (key: keyof ChartFilters) => void;
}) => {
  const filteredData = useMemo(() => {
    return chartData.map(point => {
      const filtered: any = { month: point.month };
      (Object.keys(filters) as Array<keyof ChartFilters>).forEach(key => {
        if (filters[key]) filtered[key] = point[key];
      });
      return filtered;
    });
  }, [chartData, filters]);

  return (
    <div className="p-4 2xl:p-6">
      <h2 className="text-lg 2xl:text-xl font-bold text-foreground mb-4 text-center">
        ANALIZA CHELTUIELILOR
      </h2>
      
      <div className="h-[400px] 2xl:h-[480px] mb-4">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--foreground))" tick={{ fill: 'hsl(var(--foreground))' }} />
              <YAxis 
                stroke="hsl(var(--foreground))" 
                tick={{ fill: 'hsl(var(--foreground))' }} 
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: '0.75rem' 
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              {filters.materiale && (
                <Line type="monotone" dataKey="materiale" stroke={chartConfig.materiale.color} strokeWidth={2} dot={{ r: 4 }} name={chartConfig.materiale.label} />
              )}
              {filters.personal && (
                <Line type="monotone" dataKey="personal" stroke={chartConfig.personal.color} strokeWidth={2} dot={{ r: 4 }} name={chartConfig.personal.label} />
              )}
              {filters.altele && (
                <Line type="monotone" dataKey="altele" stroke={chartConfig.altele.color} strokeWidth={2} dot={{ r: 4 }} name={chartConfig.altele.label} />
              )}
              {filters.totale && (
                <Line type="monotone" dataKey="totale" stroke={chartConfig.totale.color} strokeWidth={2} dot={{ r: 4 }} name={chartConfig.totale.label} />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Încarcă mai multe balanțe pentru a vedea evoluția</p>
          </div>
        )}
      </div>
      
      <div className="pt-4 border-t border-border">
        <p className="text-sm 2xl:text-base font-semibold text-foreground mb-3">
          Filtrare grafic:
        </p>
        <div className="flex flex-wrap 2xl:flex-nowrap gap-4 2xl:gap-6">
          {(Object.entries(chartConfig) as Array<[keyof ChartFilters, typeof chartConfig[keyof typeof chartConfig]]>).map(([key, config]) => (
            <FilterCheckbox
              key={key}
              label={config.label}
              checked={filters[key]}
              color={config.color}
              onChange={() => onFilterChange(key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Comparative Table Component
const ComparativeTable = ({ data }: { data: TableRow[] }) => {
  const periods = data[0]?.values.map(v => v.period) || [];

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead className="sticky left-0 bg-card z-20 min-w-[250px] border-r border-border">
              Categorie
            </TableHead>
            {periods.map(period => (
              <TableHead key={period} colSpan={2} className="text-center border-l border-border font-semibold">
                {period}
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            <TableHead className="sticky left-0 bg-card z-20 border-r border-border"></TableHead>
            {periods.map(period => (
              <div key={period} className="contents">
                <TableHead className="text-right text-xs">Valoare</TableHead>
                <TableHead className="text-right text-xs border-r border-border">%</TableHead>
              </div>
            ))}
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {data.map((row, idx) => (
            <TableRow 
              key={idx}
              className={cn(
                row.isTotal && "bg-muted/30 font-bold",
                row.isSubtotal && "bg-muted/20 font-semibold"
              )}
            >
              <TableCell 
                className={cn(
                  "sticky left-0 bg-background z-10 border-r border-border",
                  row.indent === 1 && "pl-8",
                  row.indent === 2 && "pl-12",
                  (row.isTotal || row.isSubtotal) && "font-bold"
                )}
              >
                {row.category}
              </TableCell>
              
              {row.values.map((val, vIdx) => (
                <div key={vIdx} className="contents">
                  <TableCell className={cn("text-right tabular-nums", val.value < 0 && "text-destructive")}>
                    {formatCurrency(val.value)}
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums border-r border-border", val.value < 0 && "text-destructive")}>
                    {val.percent.toFixed(2)}%
                  </TableCell>
                </div>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const AlteAnalize = () => {
  const { balances, loading, hasData, getAllBalancesWithAccounts, companyId } = useBalante();
  const [allBalances, setAllBalances] = useState<BalanceWithAccounts[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('cheltuieli');
  const [chartFilters, setChartFilters] = useState<ChartFilters>({
    materiale: true,
    personal: true,
    altele: true,
    totale: true,
  });

  useEffect(() => {
    const loadData = async () => {
      if (loading) {
        return;
      }
      
      if (!hasData || !companyId) {
        setDataLoading(false);
        setAllBalances([]);
        return;
      }
      
      try {
        setDataLoading(true);
        console.log('[AlteAnalize] Loading data for company:', companyId);
        const all = await getAllBalancesWithAccounts();
        setAllBalances(all);
      } catch (error) {
        console.error('[AlteAnalize] Error loading data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [loading, hasData, companyId, getAllBalancesWithAccounts]);

  // Generate chart data from balances
  const chartData = useMemo((): ChartDataPoint[] => {
    return allBalances
      .map(balance => {
        const accounts = balance.accounts;
        const materiale = accounts
          .filter(a => a.account_code.startsWith('60'))
          .reduce((sum, a) => sum + (a.debit_turnover || 0), 0);
        const personal = accounts
          .filter(a => a.account_code.startsWith('64'))
          .reduce((sum, a) => sum + (a.debit_turnover || 0), 0);
        const altele = accounts
          .filter(a => a.account_code.startsWith('6') && !a.account_code.startsWith('60') && !a.account_code.startsWith('64'))
          .reduce((sum, a) => sum + (a.debit_turnover || 0), 0);
        
        return {
          month: format(new Date(balance.period_end), 'MMM yyyy', { locale: ro }),
          materiale,
          personal,
          altele,
          totale: materiale + personal + altele,
        };
      })
      .reverse(); // Oldest first
  }, [allBalances]);

  // Generate table data
  const tableData = useMemo((): TableRow[] => {
    if (allBalances.length === 0) return [];

    const periods = allBalances
      .slice()
      .reverse()
      .map(b => format(new Date(b.period_end), 'MMM yyyy', { locale: ro }));

    const financialData = allBalances
      .slice()
      .reverse()
      .map(balance => {
        const accounts = balance.accounts;
        
        // Revenue (class 7)
        const vanzari = accounts
          .filter(a => a.account_code.startsWith('70') || a.account_code.startsWith('71'))
          .reduce((sum, a) => sum + (a.credit_turnover || 0), 0);
        const alteVenituri = accounts
          .filter(a => a.account_code.startsWith('7') && !a.account_code.startsWith('70') && !a.account_code.startsWith('71'))
          .reduce((sum, a) => sum + (a.credit_turnover || 0), 0);
        
        // Expenses (class 6)
        const materiale = accounts
          .filter(a => a.account_code.startsWith('60'))
          .reduce((sum, a) => sum + (a.debit_turnover || 0), 0);
        const personal = accounts
          .filter(a => a.account_code.startsWith('64'))
          .reduce((sum, a) => sum + (a.debit_turnover || 0), 0);
        const alteCheltuieli = accounts
          .filter(a => a.account_code.startsWith('6') && !a.account_code.startsWith('60') && !a.account_code.startsWith('64'))
          .reduce((sum, a) => sum + (a.debit_turnover || 0), 0);
        
        const totalVenituri = vanzari + alteVenituri;
        const totalCheltuieli = materiale + personal + alteCheltuieli;
        
        return {
          venituri: { vanzari, altele: alteVenituri, total: totalVenituri },
          cheltuieli: { materiale, personal, altele: alteCheltuieli, total: totalCheltuieli },
          rezultatNet: totalVenituri - totalCheltuieli,
        };
      });

    const createRow = (category: string, getter: (idx: number) => { value: number; total: number }, indent = 0, isSubtotal = false, isTotal = false): TableRow => ({
      category,
      indent,
      isSubtotal,
      isTotal,
      values: periods.map((period, idx) => {
        const { value, total } = getter(idx);
        return {
          period,
          value,
          percent: total > 0 ? (value / total) * 100 : 0,
        };
      }),
    });

    return [
      createRow('VENITURI TOTALE', (i) => ({ 
        value: financialData[i].venituri.total, 
        total: financialData[i].venituri.total 
      }), 0, false, true),
      createRow('Venituri din vânzări', (i) => ({ 
        value: financialData[i].venituri.vanzari, 
        total: financialData[i].venituri.total 
      }), 1),
      createRow('Alte venituri', (i) => ({ 
        value: financialData[i].venituri.altele, 
        total: financialData[i].venituri.total 
      }), 1),
      createRow('CHELTUIELI TOTALE', (i) => ({ 
        value: financialData[i].cheltuieli.total, 
        total: financialData[i].venituri.total 
      }), 0, false, true),
      createRow('Cheltuieli materiale', (i) => ({ 
        value: financialData[i].cheltuieli.materiale, 
        total: financialData[i].venituri.total 
      }), 1),
      createRow('Cheltuieli personal', (i) => ({ 
        value: financialData[i].cheltuieli.personal, 
        total: financialData[i].venituri.total 
      }), 1),
      createRow('Alte cheltuieli', (i) => ({ 
        value: financialData[i].cheltuieli.altele, 
        total: financialData[i].venituri.total 
      }), 1),
      createRow('PROFIT NET', (i) => ({ 
        value: financialData[i].rezultatNet, 
        total: financialData[i].venituri.total 
      }), 0, true, true),
    ];
  }, [allBalances]);

  const handleFilterChange = (key: keyof ChartFilters) => {
    setChartFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isLoading = loading || dataLoading;

  if (isLoading) {
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
          title="Alte Analize"
          description="Analize suplimentare ale performanței financiare"
        />

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Upload className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Încarcă balanțe pentru analize
          </h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Analizele sunt generate automat din datele balanțelor tale.
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

  return (
    <div className="container-app">
      <PageHeader 
        title="Alte Analize"
        description={`Analize bazate pe ${allBalances.length} perioade încărcate`}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="cheltuieli">Analiza Cheltuielilor</TabsTrigger>
          <TabsTrigger value="comparativ">Tabel Comparativ</TabsTrigger>
        </TabsList>

        <TabsContent value="cheltuieli">
          <Card>
            <ChartSection 
              chartData={chartData}
              filters={chartFilters}
              onFilterChange={handleFilterChange}
            />
          </Card>
        </TabsContent>

        <TabsContent value="comparativ">
          <Card>
            <CardHeader>
              <CardTitle>Analiză Comparativă Multiperioadă</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {tableData.length > 0 ? (
                <ComparativeTable data={tableData} />
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p>Încarcă mai multe balanțe pentru a vedea analiza comparativă</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AlteAnalize;
