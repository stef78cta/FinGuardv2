import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Target,
  Play,
  Upload,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { ChartCard } from '@/components/app/ChartCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip,
  Legend,
  Line,
  ComposedChart
} from 'recharts';
import { useBalante, BalanceWithAccounts } from '@/hooks/useBalante';
import { useFinancialCalculations } from '@/hooks/useFinancialCalculations';
import { format, addMonths } from 'date-fns';
import { ro } from 'date-fns/locale';

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const ScenarioCard = ({ 
  title, 
  type, 
  value, 
  change, 
  description 
}: { 
  title: string; 
  type: 'optimist' | 'realistic' | 'pesimist';
  value: number;
  change: number;
  description: string;
}) => (
  <div className={cn(
    "card-app p-5",
    type === 'optimist' && "border-accent/30 bg-gradient-to-br from-accent/5 to-accent/10",
    type === 'realistic' && "border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10",
    type === 'pesimist' && "border-warning/30 bg-gradient-to-br from-warning/5 to-warning/10"
  )}>
    <div className="flex items-center justify-between mb-3">
      <Badge variant="outline" className={cn(
        type === 'optimist' && "border-accent text-accent",
        type === 'realistic' && "border-primary text-primary",
        type === 'pesimist' && "border-warning text-warning"
      )}>
        {title}
      </Badge>
      <Target className={cn(
        "w-5 h-5",
        type === 'optimist' && "text-accent",
        type === 'realistic' && "text-primary",
        type === 'pesimist' && "text-warning"
      )} />
    </div>
    <div className="text-2xl font-bold text-foreground mb-1">
      {formatCurrency(value)}
    </div>
    <div className="flex items-center gap-2 text-sm">
      <span className={cn(
        "font-medium",
        change > 0 ? "text-accent" : "text-destructive"
      )}>
        {change > 0 ? '+' : ''}{change.toFixed(1)}%
      </span>
      <span className="text-muted-foreground">vs. actual</span>
    </div>
    <p className="text-xs text-muted-foreground mt-2">{description}</p>
  </div>
);

const PreviziuniBugetare = () => {
  const { balances, loading, hasData, getAllBalancesWithAccounts } = useBalante();
  const [allBalances, setAllBalances] = useState<BalanceWithAccounts[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [forecastPeriod, setForecastPeriod] = useState('6');

  useEffect(() => {
    const loadData = async () => {
      if (!loading && hasData) {
        try {
          setDataLoading(true);
          const all = await getAllBalancesWithAccounts();
          setAllBalances(all);
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setDataLoading(false);
        }
      } else if (!loading) {
        setDataLoading(false);
      }
    };

    loadData();
  }, [loading, hasData, getAllBalancesWithAccounts]);

  // Calculate historical data and projections
  const { forecastData, scenarioValues, monthlyBreakdown } = useMemo(() => {
    if (allBalances.length === 0) {
      return { forecastData: [], scenarioValues: null, monthlyBreakdown: [] };
    }

    // Get historical revenue data
    const historicalData = allBalances.map(balance => {
      const { profitPierdereData } = useFinancialCalculations(balance.accounts);
      return {
        date: new Date(balance.period_end),
        venituri: profitPierdereData.venituri.total,
        cheltuieli: profitPierdereData.cheltuieli.total,
        profit: profitPierdereData.rezultatNet,
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate growth trend
    let avgGrowth = 0.05; // Default 5% growth
    if (historicalData.length >= 2) {
      const first = historicalData[0].venituri;
      const last = historicalData[historicalData.length - 1].venituri;
      if (first > 0) {
        const periods = historicalData.length - 1;
        avgGrowth = Math.pow(last / first, 1 / periods) - 1;
      }
    }

    const lastPeriod = historicalData[historicalData.length - 1];
    const lastDate = lastPeriod?.date || new Date();
    const numForecast = parseInt(forecastPeriod);

    // Build forecast data
    const data: any[] = [];
    
    // Add historical data
    historicalData.forEach(h => {
      data.push({
        month: format(h.date, 'MMM', { locale: ro }),
        actual: h.venituri,
        forecast: null,
        optimist: null,
        pesimist: null,
      });
    });

    // Add forecast data
    let baseValue = lastPeriod?.venituri || 100000;
    const forecastMonths: any[] = [];
    
    for (let i = 1; i <= numForecast; i++) {
      const forecastDate = addMonths(lastDate, i);
      const realisticGrowth = 1 + avgGrowth;
      const optimistGrowth = 1 + avgGrowth * 1.5;
      const pesimistGrowth = 1 + avgGrowth * 0.3;

      const realistic = baseValue * Math.pow(realisticGrowth, i);
      const optimist = baseValue * Math.pow(optimistGrowth, i);
      const pesimist = baseValue * Math.pow(pesimistGrowth, i);

      data.push({
        month: format(forecastDate, 'MMM', { locale: ro }),
        actual: null,
        forecast: realistic,
        optimist: optimist,
        pesimist: pesimist,
      });

      // Calculate estimated expenses and profit
      const expenseRatio = lastPeriod 
        ? lastPeriod.cheltuieli / lastPeriod.venituri 
        : 0.8;
      
      forecastMonths.push({
        month: format(forecastDate, 'MMMM yyyy', { locale: ro }),
        venituri: realistic,
        cheltuieli: realistic * expenseRatio,
        profit: realistic * (1 - expenseRatio),
        variation: ((Math.pow(realisticGrowth, i) - 1) * 100),
      });
    }

    // Calculate scenario values for cards
    const lastForecast = data[data.length - 1];
    const scenarios = lastForecast ? {
      optimist: {
        value: lastForecast.optimist,
        change: baseValue > 0 ? ((lastForecast.optimist - baseValue) / baseValue) * 100 : 0,
      },
      realistic: {
        value: lastForecast.forecast,
        change: baseValue > 0 ? ((lastForecast.forecast - baseValue) / baseValue) * 100 : 0,
      },
      pesimist: {
        value: lastForecast.pesimist,
        change: baseValue > 0 ? ((lastForecast.pesimist - baseValue) / baseValue) * 100 : 0,
      },
    } : null;

    return { 
      forecastData: data, 
      scenarioValues: scenarios,
      monthlyBreakdown: forecastMonths,
    };
  }, [allBalances, forecastPeriod]);

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
          title="Previziuni Bugetare"
          description="Planificați și previzionați performanța financiară viitoare"
        />

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Upload className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Încarcă balanțe pentru previziuni
          </h2>
          <p className="text-muted-foreground max-w-md mb-8">
            Previziunile sunt generate pe baza tendințelor din balanțele tale istorice.
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

  if (allBalances.length < 2) {
    return (
      <div className="container-app">
        <PageHeader 
          title="Previziuni Bugetare"
          description="Planificați și previzionați performanța financiară viitoare"
        />

        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Date insuficiente pentru previziuni</h3>
          <p className="text-muted-foreground mb-6">
            Pentru a genera previziuni precise, ai nevoie de cel puțin 2 balanțe încărcate.
            Momentan ai {allBalances.length} balanță.
          </p>
          <Link to="/app/incarcare-balanta">
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Încarcă mai multe balanțe
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-app">
      <PageHeader 
        title="Previziuni Bugetare"
        description={`Previziuni bazate pe ${allBalances.length} perioade istorice`}
        actions={
          <Button className="btn-primary" disabled>
            <Play className="w-4 h-4 mr-2" />
            Previziuni generate
          </Button>
        }
      />

      {/* Scenario Cards */}
      {scenarioValues && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 2xl:gap-6 mb-6">
          <ScenarioCard 
            title="Optimist"
            type="optimist"
            value={scenarioValues.optimist.value}
            change={scenarioValues.optimist.change}
            description="Creștere accelerată bazată pe tendințe pozitive"
          />
          <ScenarioCard 
            title="Realist"
            type="realistic"
            value={scenarioValues.realistic.value}
            change={scenarioValues.realistic.change}
            description="Estimare bazată pe media tendințelor istorice"
          />
          <ScenarioCard 
            title="Pesimist"
            type="pesimist"
            value={scenarioValues.pesimist.value}
            change={scenarioValues.pesimist.change}
            description="Scenariu conservator cu factori de risc"
          />
        </div>
      )}

      {/* Main Chart */}
      <ChartCard 
        title="Previziuni vs. Realizat"
        subtitle={`Date istorice și proiecții pentru următoarele ${forecastPeriod} luni`}
        className="mb-6"
        actions={
          <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 luni</SelectItem>
              <SelectItem value="6">6 luni</SelectItem>
              <SelectItem value="12">12 luni</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        <div className="h-[350px] 2xl:h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))', 
                  borderRadius: '0.75rem',
                }}
                formatter={(value: number) => value ? formatCurrency(value) : '-'}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="actual" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2} 
                fill="url(#colorActual)" 
                name="Realizat"
              />
              <Area 
                type="monotone" 
                dataKey="forecast" 
                stroke="#a855f7" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                fill="url(#colorForecast)" 
                name="Previziune"
              />
              <Line 
                type="monotone" 
                dataKey="optimist" 
                stroke="hsl(var(--accent))" 
                strokeWidth={1} 
                strokeDasharray="3 3"
                dot={false}
                name="Optimist"
              />
              <Line 
                type="monotone" 
                dataKey="pesimist" 
                stroke="hsl(var(--warning))" 
                strokeWidth={1} 
                strokeDasharray="3 3"
                dot={false}
                name="Pesimist"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Monthly Breakdown Table */}
      {monthlyBreakdown.length > 0 && (
        <div className="card-app">
          <div className="card-app-header">
            <h3 className="font-semibold text-foreground">Detaliere Lunară Previziuni</h3>
          </div>
          <div className="card-app-content p-0">
            <table className="table-financial">
              <thead>
                <tr>
                  <th>Lună</th>
                  <th className="text-right">Venituri Previzionate</th>
                  <th className="text-right">Cheltuieli Estimate</th>
                  <th className="text-right">Profit Estimat</th>
                  <th className="text-right">Variație</th>
                </tr>
              </thead>
              <tbody>
                {monthlyBreakdown.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/50 transition-colors">
                    <td className="font-medium">{row.month}</td>
                    <td className="text-right font-mono">{formatCurrency(row.venituri)}</td>
                    <td className="text-right font-mono">{formatCurrency(row.cheltuieli)}</td>
                    <td className="text-right font-mono font-semibold text-accent">
                      {formatCurrency(row.profit)}
                    </td>
                    <td className="text-right">
                      <span className="inline-flex items-center gap-1 text-accent">
                        <TrendingUp className="w-3 h-3" />
                        +{row.variation.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviziuniBugetare;
