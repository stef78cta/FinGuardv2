import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { ChartCard } from '@/components/app/ChartCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { useBalante, BalanceWithAccounts } from '@/hooks/useBalante';
import { useFinancialCalculations } from '@/hooks/useFinancialCalculations';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  '#a855f7',
];

const AnalizeFinanciare = () => {
  const { balances, loading, hasData, getAllBalancesWithAccounts, companyId } = useBalante();
  const [allBalances, setAllBalances] = useState<BalanceWithAccounts[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('venituri');

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
        console.log('[AnalizeFinanciare] Loading data for company:', companyId);
        const all = await getAllBalancesWithAccounts();
        setAllBalances(all);
      } catch (error) {
        console.error('[AnalizeFinanciare] Error loading data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [loading, hasData, companyId, getAllBalancesWithAccounts]);

  // Calculate financial data for each balance
  const financialDataByPeriod = useMemo(() => {
    return allBalances.map(balance => {
      const { profitPierdereData, bilantData } = useFinancialCalculations(balance.accounts);
      return {
        period: balance.period_end,
        periodLabel: format(new Date(balance.period_end), 'MMM yyyy', { locale: ro }),
        venituri: profitPierdereData.venituri,
        cheltuieli: profitPierdereData.cheltuieli,
        rezultatNet: profitPierdereData.rezultatNet,
        bilant: bilantData,
      };
    }).reverse(); // Oldest first
  }, [allBalances]);

  // Revenue evolution data
  const revenueData = useMemo(() => {
    return financialDataByPeriod.map(d => ({
      month: d.periodLabel,
      vanzari: d.venituri.vanzari,
      altele: d.venituri.altele,
      total: d.venituri.total,
    }));
  }, [financialDataByPeriod]);

  // Expense breakdown (from latest balance)
  const expenseBreakdown = useMemo(() => {
    if (financialDataByPeriod.length === 0) return [];
    const latest = financialDataByPeriod[financialDataByPeriod.length - 1];
    return [
      { name: 'Materii prime', value: latest.cheltuieli.materiale, color: COLORS[0] },
      { name: 'Personal', value: latest.cheltuieli.personal, color: COLORS[1] },
      { name: 'Alte cheltuieli', value: latest.cheltuieli.altele, color: COLORS[2] },
    ].filter(e => e.value > 0);
  }, [financialDataByPeriod]);

  // Profit margins
  const profitMargins = useMemo(() => {
    return financialDataByPeriod.map(d => {
      const marjaBruta = d.venituri.total > 0 
        ? ((d.venituri.total - d.cheltuieli.total) / d.venituri.total) * 100 
        : 0;
      const marjaNeta = d.venituri.total > 0 
        ? (d.rezultatNet / d.venituri.total) * 100 
        : 0;
      return {
        month: d.periodLabel,
        bruta: Math.max(0, marjaBruta),
        neta: marjaNeta,
      };
    });
  }, [financialDataByPeriod]);

  // YoY comparison (compare first and last if we have at least 2)
  const yoyComparison = useMemo(() => {
    if (financialDataByPeriod.length < 2) return [];
    
    const oldest = financialDataByPeriod[0];
    const newest = financialDataByPeriod[financialDataByPeriod.length - 1];
    
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    return [
      { 
        categorie: 'Venituri', 
        actual: newest.venituri.total, 
        anterior: oldest.venituri.total, 
        change: calcChange(newest.venituri.total, oldest.venituri.total) 
      },
      { 
        categorie: 'Cheltuieli', 
        actual: newest.cheltuieli.total, 
        anterior: oldest.cheltuieli.total, 
        change: calcChange(newest.cheltuieli.total, oldest.cheltuieli.total) 
      },
      { 
        categorie: 'Profit Net', 
        actual: newest.rezultatNet, 
        anterior: oldest.rezultatNet, 
        change: calcChange(newest.rezultatNet, oldest.rezultatNet) 
      },
    ];
  }, [financialDataByPeriod]);

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
          title="Analize Financiare"
          description="Analize detaliate ale performanței financiare"
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
        title="Analize Financiare"
        description="Analize detaliate ale performanței financiare și structurii veniturilor/cheltuielilor"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2">
          <TabsTrigger value="venituri" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Structura Veniturilor
          </TabsTrigger>
          <TabsTrigger value="cheltuieli" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Structura Cheltuielilor
          </TabsTrigger>
          <TabsTrigger value="marje" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Marje de Profit
          </TabsTrigger>
          <TabsTrigger value="comparatie" className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" />
            Comparație Perioade
          </TabsTrigger>
        </TabsList>

        {/* Structura Veniturilor */}
        <TabsContent value="venituri" className="space-y-6">
          <ChartCard 
            title="Evoluția Veniturilor pe Categorii"
            subtitle={`Ultimele ${revenueData.length} perioade - defalcare pe surse de venit`}
          >
            <div className="h-[350px] 2xl:h-[420px]">
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorVanzari" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAltele" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="vanzari" stackId="1" stroke="hsl(var(--primary))" fill="url(#colorVanzari)" name="Vânzări" />
                    <Area type="monotone" dataKey="altele" stackId="1" stroke="hsl(var(--accent))" fill="url(#colorAltele)" name="Alte venituri" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Încarcă mai multe balanțe pentru a vedea evoluția</p>
                </div>
              )}
            </div>
          </ChartCard>
        </TabsContent>

        {/* Structura Cheltuielilor */}
        <TabsContent value="cheltuieli" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-7 2xl:grid-cols-9 gap-5 2xl:gap-6">
            <ChartCard title="Distribuția Cheltuielilor" subtitle="Ponderea fiecărei categorii" className="lg:col-span-4 2xl:col-span-6">
              <div className="h-[300px] 2xl:h-[380px]">
                {expenseBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {expenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Nu există date de afișat</p>
                  </div>
                )}
              </div>
            </ChartCard>

            <div className="card-app lg:col-span-3 2xl:col-span-3">
              <div className="card-app-header">
                <h3 className="font-semibold text-foreground">Detalii Cheltuieli</h3>
              </div>
              <div className="card-app-content p-0">
                <table className="table-financial">
                  <thead>
                    <tr>
                      <th>Categorie</th>
                      <th className="text-right">Valoare</th>
                      <th className="text-right">% din total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseBreakdown.map((item, idx) => {
                      const total = expenseBreakdown.reduce((sum, i) => sum + i.value, 0);
                      const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                      return (
                        <tr key={idx}>
                          <td className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              {item.name}
                            </div>
                          </td>
                          <td className="text-right font-mono">{formatCurrency(item.value)}</td>
                          <td className="text-right">{percent}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Marje de Profit */}
        <TabsContent value="marje" className="space-y-6">
          <ChartCard 
            title="Evoluția Marjelor de Profit"
            subtitle="Marja brută și netă pe perioade"
          >
            <div className="h-[350px] 2xl:h-[420px]">
              {profitMargins.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitMargins}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem' }}
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                    />
                    <Legend />
                    <Bar dataKey="bruta" fill="hsl(var(--primary))" name="Marja Brută" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="neta" fill="hsl(var(--accent))" name="Marja Netă" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Încarcă mai multe balanțe pentru a vedea evoluția</p>
                </div>
              )}
            </div>
          </ChartCard>
        </TabsContent>

        {/* Comparație Perioade */}
        <TabsContent value="comparatie" className="space-y-6">
          <div className="card-app">
            <div className="card-app-header">
              <h3 className="font-semibold text-foreground">Comparație Între Perioade</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {financialDataByPeriod.length >= 2 
                  ? `${financialDataByPeriod[0].periodLabel} vs. ${financialDataByPeriod[financialDataByPeriod.length - 1].periodLabel}`
                  : 'Încarcă cel puțin 2 balanțe pentru comparație'
                }
              </p>
            </div>
            <div className="card-app-content p-0">
              {yoyComparison.length > 0 ? (
                <table className="table-financial">
                  <thead>
                    <tr>
                      <th>Categorie</th>
                      <th className="text-right">Perioada actuală</th>
                      <th className="text-right">Perioada anterioară</th>
                      <th className="text-right">Variație</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yoyComparison.map((row, idx) => (
                      <tr key={idx} className={cn(row.categorie.includes('Profit') && 'bg-muted/30')}>
                        <td className="font-medium">{row.categorie}</td>
                        <td className="text-right font-mono">{formatCurrency(row.actual)}</td>
                        <td className="text-right font-mono text-muted-foreground">{formatCurrency(row.anterior)}</td>
                        <td className="text-right">
                          <span className={cn(
                            "inline-flex items-center gap-1 font-medium",
                            row.change > 0 ? "text-accent" : "text-destructive"
                          )}>
                            {row.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {row.change > 0 ? '+' : ''}{row.change.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p>Încarcă cel puțin 2 balanțe pentru a vedea comparația</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalizeFinanciare;
