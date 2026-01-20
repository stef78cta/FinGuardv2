import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Activity,
  Percent,
  Scale,
  Target,
  DollarSign,
  BarChart3,
  Droplets,
  Repeat,
  Info,
  Upload,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useBalante, BalanceWithAccounts } from '@/hooks/useBalante';
import { useFinancialCalculations } from '@/hooks/useFinancialCalculations';

interface KPIIndicator {
  label: string;
  description: string;
  formula: string;
  value: number;
  unit: string;
  trend: number;
  category: 'liquidity' | 'profitability' | 'leverage' | 'efficiency';
  icon: React.ElementType;
  benchmark?: { min: number; max: number; ideal: number };
}

const categoryLabels = {
  liquidity: { label: 'Indicatori de Lichiditate', color: 'from-blue-500 to-cyan-500' },
  profitability: { label: 'Indicatori de Profitabilitate', color: 'from-emerald-500 to-green-500' },
  leverage: { label: 'Indicatori de Îndatorare', color: 'from-amber-500 to-orange-500' },
  efficiency: { label: 'Indicatori de Eficiență', color: 'from-purple-500 to-indigo-500' },
};

const KPIIndicatorCard = ({ indicator }: { indicator: KPIIndicator }) => {
  const Icon = indicator.icon;
  const isPositiveTrend = indicator.trend > 0;
  
  // Generate sparkline data based on current value
  const sparklineData = useMemo(() => {
    const baseValue = indicator.value * 0.85;
    return Array.from({ length: 6 }, (_, i) => ({
      value: baseValue + (indicator.value - baseValue) * (i / 5)
    }));
  }, [indicator.value]);
  
  return (
    <div className="card-app p-5 hover:border-primary/30 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            indicator.category === 'liquidity' && "bg-blue-50 text-blue-600",
            indicator.category === 'profitability' && "bg-emerald-50 text-emerald-600",
            indicator.category === 'leverage' && "bg-amber-50 text-amber-600",
            indicator.category === 'efficiency' && "bg-purple-50 text-purple-600"
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">{indicator.label}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium mb-1">{indicator.description}</p>
                    <p className="text-xs text-muted-foreground font-mono">{indicator.formula}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground">{indicator.description}</p>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold text-foreground">
            {indicator.value.toFixed(2)}{indicator.unit}
          </div>
          <div className={cn(
            "flex items-center gap-1 mt-1 text-sm font-medium",
            isPositiveTrend ? "text-accent" : "text-destructive"
          )}>
            {isPositiveTrend ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{isPositiveTrend ? '+' : ''}{indicator.trend.toFixed(1)}%</span>
            <span className="text-muted-foreground font-normal">vs. perioada anterioară</span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="w-24 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={`gradient-${indicator.label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositiveTrend ? "hsl(var(--accent))" : "hsl(var(--destructive))"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isPositiveTrend ? "hsl(var(--accent))" : "hsl(var(--destructive))"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={isPositiveTrend ? "hsl(var(--accent))" : "hsl(var(--destructive))"} 
                strokeWidth={2}
                fill={`url(#gradient-${indicator.label.replace(/\s/g, '')})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Benchmark bar */}
      {indicator.benchmark && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{indicator.benchmark.min}</span>
            <span className="font-medium">Ideal: {indicator.benchmark.ideal}</span>
            <span>{indicator.benchmark.max}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden relative">
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground"
              style={{ left: `${((indicator.benchmark.ideal - indicator.benchmark.min) / (indicator.benchmark.max - indicator.benchmark.min)) * 100}%` }}
            />
            <div 
              className={cn(
                "absolute top-0 bottom-0 w-2 h-2 rounded-full shadow-sm transform -translate-x-1/2",
                indicator.category === 'liquidity' && "bg-blue-500",
                indicator.category === 'profitability' && "bg-emerald-500",
                indicator.category === 'leverage' && "bg-amber-500",
                indicator.category === 'efficiency' && "bg-purple-500"
              )}
              style={{ 
                left: `${Math.min(100, Math.max(0, ((indicator.value - indicator.benchmark.min) / (indicator.benchmark.max - indicator.benchmark.min)) * 100))}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const IndicatoriCheie = () => {
  const { balances, loading, hasData, getLatestBalance, getAllBalancesWithAccounts, companyId } = useBalante();
  const [latestBalance, setLatestBalance] = useState<BalanceWithAccounts | null>(null);
  const [allBalances, setAllBalances] = useState<BalanceWithAccounts[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const { kpiData } = useFinancialCalculations(latestBalance?.accounts || []);

  // Get previous period accounts for trend calculation (must be at top level for hooks)
  const prevAccounts = useMemo(() => {
    return allBalances.length >= 2 ? (allBalances[1]?.accounts || []) : [];
  }, [allBalances]);

  // Calculate previous period KPIs - hook must be called unconditionally at top level
  const { kpiData: previousKpiData } = useFinancialCalculations(prevAccounts);

  useEffect(() => {
    const loadData = async () => {
      if (loading) {
        return;
      }
      
      if (!hasData || !companyId) {
        setDataLoading(false);
        setLatestBalance(null);
        setAllBalances([]);
        return;
      }
      
      try {
        setDataLoading(true);
        console.log('[IndicatoriCheie] Loading data for company:', companyId);
        const [latest, all] = await Promise.all([
          getLatestBalance(),
          getAllBalancesWithAccounts()
        ]);
        setLatestBalance(latest);
        setAllBalances(all);
      } catch (error) {
        console.error('[IndicatoriCheie] Error loading data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [loading, hasData, companyId, getLatestBalance, getAllBalancesWithAccounts]);

  // Return previous KPIs only if we have enough data
  const previousKPIs = useMemo(() => {
    if (allBalances.length < 2) return null;
    return previousKpiData;
  }, [allBalances.length, previousKpiData]);

  // Build KPI indicators array from real data
  const kpiIndicators: KPIIndicator[] = useMemo(() => {
    const calculateTrend = (current: number, previous: number | undefined) => {
      if (!previous || previous === 0) return 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    return [
      // Liquidity
      {
        label: 'Rata Curentă',
        description: 'Capacitatea de a acoperi datoriile pe termen scurt',
        formula: 'Active curente / Datorii curente',
        value: kpiData.liquidity.rataCurenta,
        unit: '',
        trend: calculateTrend(kpiData.liquidity.rataCurenta, previousKPIs?.liquidity.rataCurenta),
        category: 'liquidity' as const,
        icon: Droplets,
        benchmark: { min: 1.0, max: 3.0, ideal: 2.0 }
      },
      {
        label: 'Rata Rapidă',
        description: 'Lichiditate imediată fără stocuri',
        formula: '(Active curente - Stocuri) / Datorii curente',
        value: kpiData.liquidity.rataRapida,
        unit: '',
        trend: calculateTrend(kpiData.liquidity.rataRapida, previousKPIs?.liquidity.rataRapida),
        category: 'liquidity' as const,
        icon: Activity,
        benchmark: { min: 0.5, max: 2.0, ideal: 1.0 }
      },
      {
        label: 'Cash Ratio',
        description: 'Lichiditate prin numerar disponibil',
        formula: 'Numerar / Datorii curente',
        value: kpiData.liquidity.cashRatio,
        unit: '',
        trend: calculateTrend(kpiData.liquidity.cashRatio, previousKPIs?.liquidity.cashRatio),
        category: 'liquidity' as const,
        icon: DollarSign,
        benchmark: { min: 0.1, max: 0.5, ideal: 0.2 }
      },
      // Profitability
      {
        label: 'Marja Profitului',
        description: 'Procentul din venituri rămas ca profit',
        formula: 'Profit net / Venituri totale × 100',
        value: kpiData.profitability.marjaProfitului,
        unit: '%',
        trend: calculateTrend(kpiData.profitability.marjaProfitului, previousKPIs?.profitability.marjaProfitului),
        category: 'profitability' as const,
        icon: Percent,
        benchmark: { min: 0, max: 30, ideal: 15 }
      },
      {
        label: 'ROA',
        description: 'Return on Assets - eficiența utilizării activelor',
        formula: 'Profit net / Active totale × 100',
        value: kpiData.profitability.roa,
        unit: '%',
        trend: calculateTrend(kpiData.profitability.roa, previousKPIs?.profitability.roa),
        category: 'profitability' as const,
        icon: Target,
        benchmark: { min: 0, max: 25, ideal: 10 }
      },
      {
        label: 'ROE',
        description: 'Return on Equity - randamentul capitalului propriu',
        formula: 'Profit net / Capital propriu × 100',
        value: kpiData.profitability.roe,
        unit: '%',
        trend: calculateTrend(kpiData.profitability.roe, previousKPIs?.profitability.roe),
        category: 'profitability' as const,
        icon: TrendingUp,
        benchmark: { min: 0, max: 50, ideal: 15 }
      },
      // Leverage
      {
        label: 'Debt-to-Equity',
        description: 'Raportul datorii/capital propriu',
        formula: 'Datorii totale / Capital propriu',
        value: kpiData.leverage.debtToEquity,
        unit: '',
        trend: calculateTrend(kpiData.leverage.debtToEquity, previousKPIs?.leverage.debtToEquity),
        category: 'leverage' as const,
        icon: Scale,
        benchmark: { min: 0, max: 2.0, ideal: 1.0 }
      },
      {
        label: 'Grad Îndatorare',
        description: 'Ponderea datoriilor în active',
        formula: 'Datorii totale / Active totale × 100',
        value: kpiData.leverage.gradIndatorare,
        unit: '%',
        trend: calculateTrend(kpiData.leverage.gradIndatorare, previousKPIs?.leverage.gradIndatorare),
        category: 'leverage' as const,
        icon: BarChart3,
        benchmark: { min: 0, max: 70, ideal: 40 }
      },
      // Efficiency
      {
        label: 'Rotația Activelor',
        description: 'Câte venituri generează activele',
        formula: 'Venituri / Active totale',
        value: kpiData.efficiency.rotatiaActivelor,
        unit: 'x',
        trend: calculateTrend(kpiData.efficiency.rotatiaActivelor, previousKPIs?.efficiency.rotatiaActivelor),
        category: 'efficiency' as const,
        icon: Repeat,
        benchmark: { min: 0.5, max: 3.0, ideal: 1.5 }
      },
    ];
  }, [kpiData, previousKPIs]);

  const categories = ['liquidity', 'profitability', 'leverage', 'efficiency'] as const;
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
          title="Indicatori Cheie"
          description="Monitorizați KPI-urile financiare esențiale ale afacerii"
        />

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Upload className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Încarcă o balanță pentru a vedea indicatorii
          </h2>
          <p className="text-muted-foreground max-w-md mb-8">
            KPI-urile sunt calculate automat din datele balanței tale de verificare.
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
        title="Indicatori Cheie"
        description="KPI-uri calculate din ultima balanță încărcată"
      />

      {categories.map((category) => {
        const categoryInfo = categoryLabels[category];
        const categoryKPIs = kpiIndicators.filter(kpi => kpi.category === category);

        return (
          <div key={category} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-1 h-6 rounded-full bg-gradient-to-b",
                categoryInfo.color
              )} />
              <h2 className="section-title text-lg">{categoryInfo.label}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 2xl:gap-5">
              {categoryKPIs.map((kpi) => (
                <KPIIndicatorCard key={kpi.label} indicator={kpi} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default IndicatoriCheie;
