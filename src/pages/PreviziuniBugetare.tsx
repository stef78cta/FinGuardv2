import { useState } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Target,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Settings,
  Play
} from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { ChartCard } from '@/components/app/ChartCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// Mock forecast data
const forecastData = [
  { month: 'Ian', actual: 245000, forecast: null, optimist: null, pesimist: null },
  { month: 'Feb', actual: 268000, forecast: null, optimist: null, pesimist: null },
  { month: 'Mar', actual: 285000, forecast: null, optimist: null, pesimist: null },
  { month: 'Apr', actual: 295000, forecast: null, optimist: null, pesimist: null },
  { month: 'Mai', actual: 310000, forecast: null, optimist: null, pesimist: null },
  { month: 'Iun', actual: 328000, forecast: null, optimist: null, pesimist: null },
  { month: 'Iul', actual: null, forecast: 345000, optimist: 365000, pesimist: 325000 },
  { month: 'Aug', actual: null, forecast: 358000, optimist: 385000, pesimist: 335000 },
  { month: 'Sep', actual: null, forecast: 372000, optimist: 410000, pesimist: 340000 },
  { month: 'Oct', actual: null, forecast: 385000, optimist: 430000, pesimist: 350000 },
  { month: 'Nov', actual: null, forecast: 398000, optimist: 455000, pesimist: 355000 },
  { month: 'Dec', actual: null, forecast: 415000, optimist: 480000, pesimist: 365000 },
];

const monthlyBreakdown = [
  { month: 'Iulie 2025', venituri: 345000, cheltuieli: 275000, profit: 70000, variation: 5.2 },
  { month: 'August 2025', venituri: 358000, cheltuieli: 282000, profit: 76000, variation: 8.6 },
  { month: 'Septembrie 2025', venituri: 372000, cheltuieli: 290000, profit: 82000, variation: 7.9 },
  { month: 'Octombrie 2025', venituri: 385000, cheltuieli: 298000, profit: 87000, variation: 6.1 },
  { month: 'Noiembrie 2025', venituri: 398000, cheltuieli: 308000, profit: 90000, variation: 3.4 },
  { month: 'Decembrie 2025', venituri: 415000, cheltuieli: 318000, profit: 97000, variation: 7.8 },
];

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const TimelineStep = ({ 
  step, 
  title, 
  status, 
  isLast 
}: { 
  step: number; 
  title: string; 
  status: 'completed' | 'current' | 'pending'; 
  isLast?: boolean;
}) => (
  <div className="flex items-start gap-3">
    <div className="flex flex-col items-center">
      <div className={cn(
        "step-circle text-sm",
        status === 'completed' && "step-circle-completed",
        status === 'current' && "step-circle-active",
        status === 'pending' && "step-circle-pending"
      )}>
        {status === 'completed' ? <CheckCircle className="w-5 h-5" /> : step}
      </div>
      {!isLast && (
        <div className={cn(
          "w-0.5 h-12 mt-2",
          status === 'completed' ? "bg-gradient-to-b from-indigo-500 to-purple-500" : "bg-gray-200"
        )} />
      )}
    </div>
    <div className="pt-2">
      <span className={cn(
        "font-medium",
        status === 'current' ? "text-indigo-600" : "text-foreground"
      )}>{title}</span>
    </div>
  </div>
);

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
    type === 'optimist' && "border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-green-50/50",
    type === 'realistic' && "border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50",
    type === 'pesimist' && "border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/50"
  )}>
    <div className="flex items-center justify-between mb-3">
      <Badge variant="outline" className={cn(
        type === 'optimist' && "border-emerald-300 text-emerald-700",
        type === 'realistic' && "border-indigo-300 text-indigo-700",
        type === 'pesimist' && "border-amber-300 text-amber-700"
      )}>
        {title}
      </Badge>
      <Target className={cn(
        "w-5 h-5",
        type === 'optimist' && "text-emerald-500",
        type === 'realistic' && "text-indigo-500",
        type === 'pesimist' && "text-amber-500"
      )} />
    </div>
    <div className="text-2xl font-bold text-foreground mb-1">
      {formatCurrency(value)}
    </div>
    <div className="flex items-center gap-2 text-sm">
      <span className={cn(
        "font-medium",
        change > 0 ? "text-emerald-600" : "text-red-600"
      )}>
        {change > 0 ? '+' : ''}{change}%
      </span>
      <span className="text-gray-500">vs. actual</span>
    </div>
    <p className="text-xs text-gray-500 mt-2">{description}</p>
  </div>
);

const PreviziuniBugetare = () => {
  const [forecastPeriod, setForecastPeriod] = useState('6');

  return (
    <div className="container-app">
      <PageHeader 
        title="Previziuni Bugetare"
        description="Planificați și previzionați performanța financiară viitoare"
        actions={
          <Button className="btn-primary">
            <Play className="w-4 h-4 mr-2" />
            Generează previziuni
          </Button>
        }
      />

      {/* Timeline & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Timeline */}
        <Card className="p-5 lg:col-span-1">
          <h3 className="app-section-title">Etape Previziune</h3>
          <div className="space-y-2">
            <TimelineStep step={1} title="Încărcare date istorice" status="completed" />
            <TimelineStep step={2} title="Analiză tendințe" status="completed" />
            <TimelineStep step={3} title="Generare previziuni" status="current" />
            <TimelineStep step={4} title="Validare scenarii" status="pending" isLast />
          </div>
        </Card>

        {/* Scenario Cards */}
        <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <ScenarioCard 
            title="Optimist"
            type="optimist"
            value={480000}
            change={26.5}
            description="Creștere accelerată bazată pe tendințele pozitive"
          />
          <ScenarioCard 
            title="Realist"
            type="realistic"
            value={415000}
            change={15.2}
            description="Estimare bazată pe media tendințelor istorice"
          />
          <ScenarioCard 
            title="Pesimist"
            type="pesimist"
            value={365000}
            change={3.8}
            description="Scenariu conservator cu factori de risc"
          />
        </div>
      </div>

      {/* Main Chart */}
      <ChartCard 
        title="Previziuni vs. Realizat"
        subtitle="Comparație între datele actuale și proiecțiile pentru următoarele 6 luni"
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
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `${v/1000}k`} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '0.75rem',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                formatter={(value: number) => value ? formatCurrency(value) : '-'}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="actual" 
                stroke="#6366f1" 
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
                stroke="#10b981" 
                strokeWidth={1} 
                strokeDasharray="3 3"
                dot={false}
                name="Optimist"
              />
              <Line 
                type="monotone" 
                dataKey="pesimist" 
                stroke="#f59e0b" 
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
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-4 lg:col-start-2">
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
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="font-medium">{row.month}</td>
                  <td className="text-right font-mono">{formatCurrency(row.venituri)}</td>
                  <td className="text-right font-mono">{formatCurrency(row.cheltuieli)}</td>
                  <td className="text-right font-mono font-semibold text-emerald-600">
                    {formatCurrency(row.profit)}
                  </td>
                  <td className="text-right">
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <TrendingUp className="w-3 h-3" />
                      +{row.variation}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviziuniBugetare;
