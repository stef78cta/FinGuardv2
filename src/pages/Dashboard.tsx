import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  FileText,
  BarChart3,
  Clock,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { KPICard } from '@/components/app/KPICard';
import { ChartCard } from '@/components/app/ChartCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';
import { useBalante, BalanceWithAccounts } from '@/hooks/useBalante';
import { useKPIs } from '@/hooks/useKPIs';
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

const Dashboard = () => {
  const { balances, loading, hasData, getLatestBalance, getAllBalancesWithAccounts, companyId } = useBalante();
  const [latestBalance, setLatestBalance] = useState<BalanceWithAccounts | null>(null);
  const [allBalancesWithAccounts, setAllBalancesWithAccounts] = useState<BalanceWithAccounts[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const { kpis, topAccounts, chartData, hasData: hasKPIData } = useKPIs(latestBalance, allBalancesWithAccounts);

  useEffect(() => {
    const loadData = async () => {
      // Wait until balances are loaded and we have data
      if (loading) {
        return;
      }
      
      if (!hasData || !companyId) {
        setDataLoading(false);
        setLatestBalance(null);
        setAllBalancesWithAccounts([]);
        return;
      }
      
      try {
        setDataLoading(true);
        console.log('[Dashboard] Loading data for company:', companyId);
        
        const [latest, allWithAccounts] = await Promise.all([
          getLatestBalance(),
          getAllBalancesWithAccounts(),
        ]);
        
        console.log('[Dashboard] Loaded latest balance:', latest?.id, 'accounts:', latest?.accounts?.length);
        console.log('[Dashboard] Loaded all balances:', allWithAccounts.length);
        
        setLatestBalance(latest);
        setAllBalancesWithAccounts(allWithAccounts);
      } catch (error) {
        console.error('[Dashboard] Error loading dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [loading, hasData, companyId, getLatestBalance, getAllBalancesWithAccounts]);

  const today = new Date();
  const formattedDate = today.toLocaleDateString('ro-RO', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const isLoading = loading || dataLoading;

  // Empty state when no balances uploaded
  if (!isLoading && !hasData) {
    return (
      <div className="container-app">
        <PageHeader 
          title="Bun venit în FinGuard"
          description={`${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}`}
        />

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Upload className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Încarcă prima ta balanță
          </h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Pentru a vedea indicatorii financiari, graficele și analiza conturilor, 
            trebuie să încarci cel puțin o balanță de verificare.
          </p>
          <Link to="/app/incarcare-balanta">
            <Button className="btn-primary" size="lg">
              <Upload className="w-5 h-5 mr-2" />
              Încarcă balanță acum
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-app">
      <PageHeader 
        title="Bun venit în FinGuard"
        description={`${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}`}
        actions={
          <Link to="/app/incarcare-balanta">
            <Button className="btn-primary">
              <Upload className="w-4 h-4 mr-2" />
              Încarcă balanță
            </Button>
          </Link>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 2xl:gap-6 mb-6">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <KPICard
              label="Venituri Totale"
              value={formatCurrency(kpis.venituri)}
              trend={kpis.venituriTrend}
              trendLabel="vs. perioada anterioară"
              icon={<DollarSign className="w-5 h-5" />}
              highlighted
            />
            <KPICard
              label="Cheltuieli Totale"
              value={formatCurrency(kpis.cheltuieli)}
              trend={kpis.cheltuieliTrend}
              trendLabel="vs. perioada anterioară"
              icon={<CreditCard className="w-5 h-5" />}
            />
            <KPICard
              label="Profit Net"
              value={formatCurrency(kpis.profitNet)}
              trend={kpis.profitTrend}
              trendLabel="vs. perioada anterioară"
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <KPICard
              label="Cash Flow"
              value={formatCurrency(kpis.cashFlow)}
              trend={kpis.cashFlowTrend}
              trendLabel="vs. perioada anterioară"
              icon={<Wallet className="w-5 h-5" />}
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 2xl:grid-cols-6 gap-5 2xl:gap-6 mb-6">
        {/* Monthly Evolution Chart */}
        <div className="lg:col-span-4 2xl:col-span-5">
          <ChartCard 
            title="Evoluție Lunară" 
            subtitle={chartData.length > 0 
              ? `Venituri, cheltuieli și profit din ultimele ${chartData.length} perioade`
              : 'Încarcă mai multe balanțe pentru a vedea evoluția'
            }
          >
            <div className="h-[300px] 2xl:h-[380px]">
              {isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVenituri" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                      tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))', 
                        borderRadius: '0.75rem',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="venituri" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      fill="url(#colorVenituri)" 
                      name="Venituri" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={2} 
                      fill="url(#colorProfit)" 
                      name="Profit" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cheltuieli" 
                      stroke="hsl(var(--warning))" 
                      strokeWidth={2} 
                      dot={false} 
                      name="Cheltuieli" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm">Încarcă mai multe balanțe pentru a vedea evoluția</p>
                </div>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Quick Actions */}
        <div className="card-app p-5">
          <h3 className="app-section-title">Acțiuni rapide</h3>
          <div className="space-y-3">
            <Link to="/app/incarcare-balanta" className="btn-action w-full justify-start">
              <Upload className="w-4 h-4 text-primary" />
              <span>Încarcă balanță nouă</span>
            </Link>
            <Link to="/app/rapoarte-financiare" className="btn-action w-full justify-start">
              <FileText className="w-4 h-4 text-primary" />
              <span>Generează raport</span>
            </Link>
            <Link to="/app/analize-comparative" className="btn-action w-full justify-start">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span>Analiză comparativă</span>
            </Link>
          </div>

          {/* Last Upload Widget */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Clock className="w-4 h-4" />
              <span>Ultima balanță încărcată</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : latestBalance ? (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm font-medium text-foreground truncate">
                  {latestBalance.source_file_name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(latestBalance.created_at), "d MMMM yyyy, HH:mm", { locale: ro })}
                </p>
                <p className="text-xs text-primary mt-1">
                  Perioada: {format(new Date(latestBalance.period_start), "MMM yyyy", { locale: ro })} - {format(new Date(latestBalance.period_end), "MMM yyyy", { locale: ro })}
                </p>
              </div>
            ) : (
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground">Nicio balanță încărcată</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Accounts Table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 2xl:grid-cols-6 gap-5 2xl:gap-6">
        <div className="lg:col-span-4 2xl:col-span-5">
          <div className="card-app">
            <div className="card-app-header flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Top 5 Conturi</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Cele mai importante conturi din ultima balanță
                </p>
              </div>
              <Link 
                to="/app/rapoarte-financiare" 
                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                Vezi toate
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="card-app-content p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : topAccounts.length > 0 ? (
                <table className="table-financial">
                  <thead>
                    <tr>
                      <th>Cod</th>
                      <th>Cont</th>
                      <th className="text-right">Valoare</th>
                      <th className="text-right">Variație</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAccounts.map((account, idx) => (
                      <tr key={idx} className="hover:bg-muted/50 transition-colors">
                        <td className="font-mono text-sm text-muted-foreground">{account.code}</td>
                        <td className="font-medium">{account.name}</td>
                        <td className="text-right font-mono">{formatCurrency(account.value)}</td>
                        <td className="text-right">
                          <span className={`inline-flex items-center gap-1 ${
                            account.change > 0 
                              ? 'text-accent' 
                              : account.change < 0 
                                ? 'text-destructive' 
                                : 'text-muted-foreground'
                          }`}>
                            {account.change > 0 ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : account.change < 0 ? (
                              <ArrowDownRight className="w-3 h-3" />
                            ) : null}
                            {Math.abs(account.change)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p>Niciun cont disponibil</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
