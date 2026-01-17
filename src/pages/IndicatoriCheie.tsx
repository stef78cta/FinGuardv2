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
  Info
} from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { KPICard } from '@/components/app/KPICard';
import { ChartCard } from '@/components/app/ChartCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface KPIIndicator {
  label: string;
  description: string;
  formula: string;
  value: number;
  unit: string;
  trend: number;
  category: 'liquidity' | 'profitability' | 'leverage' | 'efficiency';
  icon: React.ElementType;
  sparklineData: { value: number }[];
  benchmark?: { min: number; max: number; ideal: number };
}

const kpiData: KPIIndicator[] = [
  // Lichiditate
  {
    label: 'Rata Curentă',
    description: 'Capacitatea de a acoperi datoriile pe termen scurt',
    formula: 'Active curente / Datorii curente',
    value: 2.85,
    unit: '',
    trend: 5.2,
    category: 'liquidity',
    icon: Droplets,
    sparklineData: [{ value: 2.45 }, { value: 2.52 }, { value: 2.68 }, { value: 2.75 }, { value: 2.80 }, { value: 2.85 }],
    benchmark: { min: 1.5, max: 3.0, ideal: 2.0 }
  },
  {
    label: 'Rata Rapidă',
    description: 'Lichiditate imediată fără stocuri',
    formula: '(Active curente - Stocuri) / Datorii curente',
    value: 1.92,
    unit: '',
    trend: 3.8,
    category: 'liquidity',
    icon: Activity,
    sparklineData: [{ value: 1.72 }, { value: 1.78 }, { value: 1.82 }, { value: 1.85 }, { value: 1.88 }, { value: 1.92 }],
    benchmark: { min: 1.0, max: 2.0, ideal: 1.5 }
  },
  {
    label: 'Cash Ratio',
    description: 'Lichiditate prin numerar disponibil',
    formula: 'Numerar / Datorii curente',
    value: 0.45,
    unit: '',
    trend: 8.5,
    category: 'liquidity',
    icon: DollarSign,
    sparklineData: [{ value: 0.38 }, { value: 0.40 }, { value: 0.41 }, { value: 0.42 }, { value: 0.44 }, { value: 0.45 }],
    benchmark: { min: 0.2, max: 0.5, ideal: 0.3 }
  },
  // Profitabilitate
  {
    label: 'Marja Profitului',
    description: 'Procentul din venituri rămas ca profit',
    formula: 'Profit net / Venituri totale × 100',
    value: 13.21,
    unit: '%',
    trend: 4.1,
    category: 'profitability',
    icon: Percent,
    sparklineData: [{ value: 11.5 }, { value: 12.0 }, { value: 12.4 }, { value: 12.8 }, { value: 13.0 }, { value: 13.21 }],
    benchmark: { min: 5, max: 20, ideal: 15 }
  },
  {
    label: 'ROA',
    description: 'Return on Assets - eficiența utilizării activelor',
    formula: 'Profit net / Active totale × 100',
    value: 23.03,
    unit: '%',
    trend: 5.5,
    category: 'profitability',
    icon: Target,
    sparklineData: [{ value: 20.5 }, { value: 21.2 }, { value: 21.8 }, { value: 22.3 }, { value: 22.7 }, { value: 23.03 }],
    benchmark: { min: 5, max: 25, ideal: 15 }
  },
  {
    label: 'ROE',
    description: 'Return on Equity - randamentul capitalului propriu',
    formula: 'Profit net / Capital propriu × 100',
    value: 43.75,
    unit: '%',
    trend: 7.1,
    category: 'profitability',
    icon: TrendingUp,
    sparklineData: [{ value: 38.5 }, { value: 39.8 }, { value: 41.0 }, { value: 42.2 }, { value: 43.0 }, { value: 43.75 }],
    benchmark: { min: 10, max: 50, ideal: 20 }
  },
  // Îndatorare
  {
    label: 'Debt-to-Equity',
    description: 'Raportul datorii/capital propriu',
    formula: 'Datorii totale / Capital propriu',
    value: 0.90,
    unit: '',
    trend: -2.1,
    category: 'leverage',
    icon: Scale,
    sparklineData: [{ value: 0.98 }, { value: 0.96 }, { value: 0.94 }, { value: 0.92 }, { value: 0.91 }, { value: 0.90 }],
    benchmark: { min: 0.5, max: 2.0, ideal: 1.0 }
  },
  {
    label: 'Grad Îndatorare',
    description: 'Ponderea datoriilor în active',
    formula: 'Datorii totale / Active totale × 100',
    value: 47.3,
    unit: '%',
    trend: -1.5,
    category: 'leverage',
    icon: BarChart3,
    sparklineData: [{ value: 50.2 }, { value: 49.5 }, { value: 48.8 }, { value: 48.2 }, { value: 47.8 }, { value: 47.3 }],
    benchmark: { min: 30, max: 60, ideal: 40 }
  },
  // Eficiență
  {
    label: 'Rotația Activelor',
    description: 'Câte venituri generează activele',
    formula: 'Venituri / Active totale',
    value: 1.74,
    unit: 'x',
    trend: 3.2,
    category: 'efficiency',
    icon: Repeat,
    sparklineData: [{ value: 1.58 }, { value: 1.62 }, { value: 1.66 }, { value: 1.69 }, { value: 1.72 }, { value: 1.74 }],
    benchmark: { min: 1.0, max: 3.0, ideal: 2.0 }
  },
];

const categoryLabels = {
  liquidity: { label: 'Indicatori de Lichiditate', color: 'from-blue-500 to-cyan-500' },
  profitability: { label: 'Indicatori de Profitabilitate', color: 'from-emerald-500 to-green-500' },
  leverage: { label: 'Indicatori de Îndatorare', color: 'from-amber-500 to-orange-500' },
  efficiency: { label: 'Indicatori de Eficiență', color: 'from-purple-500 to-indigo-500' },
};

const KPIIndicatorCard = ({ indicator }: { indicator: KPIIndicator }) => {
  const Icon = indicator.icon;
  const isPositiveTrend = indicator.trend > 0;
  
  return (
    <div className="card-app p-5 hover:border-indigo-200 transition-all group">
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
                    <Info className="w-3.5 h-3.5 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium mb-1">{indicator.description}</p>
                    <p className="text-xs text-gray-400 font-mono">{indicator.formula}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-gray-500">{indicator.description}</p>
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
            isPositiveTrend ? "text-emerald-600" : "text-red-600"
          )}>
            {isPositiveTrend ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{isPositiveTrend ? '+' : ''}{indicator.trend.toFixed(1)}%</span>
            <span className="text-gray-400 font-normal">vs. perioada anterioară</span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="w-24 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={indicator.sparklineData}>
              <defs>
                <linearGradient id={`gradient-${indicator.label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositiveTrend ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isPositiveTrend ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={isPositiveTrend ? "#10b981" : "#ef4444"} 
                strokeWidth={2}
                fill={`url(#gradient-${indicator.label})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Benchmark bar */}
      {indicator.benchmark && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{indicator.benchmark.min}</span>
            <span className="font-medium">Ideal: {indicator.benchmark.ideal}</span>
            <span>{indicator.benchmark.max}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
            {/* Ideal marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
              style={{ left: `${((indicator.benchmark.ideal - indicator.benchmark.min) / (indicator.benchmark.max - indicator.benchmark.min)) * 100}%` }}
            />
            {/* Current value marker */}
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
  const categories = ['liquidity', 'profitability', 'leverage', 'efficiency'] as const;

  return (
    <div className="container-app">
      <PageHeader 
        title="Indicatori Cheie"
        description="Monitorizați KPI-urile financiare esențiale ale afacerii"
      />

      {categories.map((category) => {
        const categoryInfo = categoryLabels[category];
        const categoryKPIs = kpiData.filter(kpi => kpi.category === category);

        return (
          <div key={category} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-1 h-6 rounded-full bg-gradient-to-b",
                categoryInfo.color
              )} />
              <h2 className="section-title text-lg">{categoryInfo.label}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
