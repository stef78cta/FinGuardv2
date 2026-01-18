import { useState } from 'react';
import { 
  TrendingUp,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { ChartCard } from '@/components/app/ChartCard';
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

// Mock data
const revenueData = [
  { month: 'Ian', vanzari: 1850000, servicii: 320000, altele: 85000 },
  { month: 'Feb', vanzari: 1920000, servicii: 345000, altele: 92000 },
  { month: 'Mar', vanzari: 2050000, servicii: 378000, altele: 98000 },
  { month: 'Apr', vanzari: 2180000, servicii: 412000, altele: 105000 },
  { month: 'Mai', vanzari: 2350000, servicii: 445000, altele: 112000 },
  { month: 'Iun', vanzari: 2520000, servicii: 482000, altele: 118000 },
];

const expenseBreakdown = [
  { name: 'Materii prime', value: 1049600, color: '#6366f1' },
  { name: 'Personal', value: 696400, color: '#a855f7' },
  { name: 'Amortizare', value: 105000, color: '#ec4899' },
  { name: 'Operaționale', value: 420000, color: '#f97316' },
  { name: 'Financiare', value: 19600, color: '#eab308' },
];

const profitMargins = [
  { month: 'Ian', bruta: 42.5, operationala: 18.2, neta: 12.8 },
  { month: 'Feb', bruta: 43.1, operationala: 18.8, neta: 13.2 },
  { month: 'Mar', bruta: 43.8, operationala: 19.2, neta: 13.5 },
  { month: 'Apr', bruta: 44.2, operationala: 19.5, neta: 13.8 },
  { month: 'Mai', bruta: 44.8, operationala: 19.9, neta: 14.1 },
  { month: 'Iun', bruta: 45.2, operationala: 20.3, neta: 14.5 },
];

const yoyComparison = [
  { categorie: 'Venituri', y2024: 2520000, y2023: 2180000, change: 15.6 },
  { categorie: 'Cheltuieli', y2024: 2050000, y2023: 1850000, change: 10.8 },
  { categorie: 'Profit Brut', y2024: 470000, y2023: 330000, change: 42.4 },
  { categorie: 'Profit Net', y2024: 365000, y2023: 245000, change: 49.0 },
];

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const AnalizeFinanciare = () => {
  const [activeTab, setActiveTab] = useState('venituri');

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
          <TabsTrigger value="yoy" className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4" />
            Comparație YoY
          </TabsTrigger>
        </TabsList>

        {/* Structura Veniturilor */}
        <TabsContent value="venituri" className="space-y-6">
          <ChartCard 
            title="Evoluția Veniturilor pe Categorii"
            subtitle="Ultimele 6 luni - defalcare pe surse de venit"
          >
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorVanzari" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorServicii" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `${v/1000000}M`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="vanzari" stackId="1" stroke="#6366f1" fill="url(#colorVanzari)" name="Vânzări" />
                  <Area type="monotone" dataKey="servicii" stackId="1" stroke="#a855f7" fill="url(#colorServicii)" name="Servicii" />
                  <Area type="monotone" dataKey="altele" stackId="1" stroke="#10b981" fill="#10b98120" name="Alte venituri" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </TabsContent>

        {/* Structura Cheltuielilor - Extended for better proportions */}
        <TabsContent value="cheltuieli" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-5">
            <ChartCard title="Distribuția Cheltuielilor" subtitle="Ponderea fiecărei categorii" className="lg:col-span-4">
              <div className="h-[300px]">
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
              </div>
            </ChartCard>

            <div className="card-app lg:col-span-3">
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
                      const percent = ((item.value / total) * 100).toFixed(1);
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
            subtitle="Marja brută, operațională și netă pe ultimele 6 luni"
          >
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitMargins}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }}
                    formatter={(value: number) => `${value}%`}
                  />
                  <Legend />
                  <Bar dataKey="bruta" fill="#6366f1" name="Marja Brută" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="operationala" fill="#a855f7" name="Marja Operațională" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="neta" fill="#10b981" name="Marja Netă" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </TabsContent>

        {/* Comparație YoY */}
        <TabsContent value="yoy" className="space-y-6">
          <div className="card-app">
            <div className="card-app-header">
              <h3 className="font-semibold text-foreground">Comparație An vs. An</h3>
              <p className="text-sm text-foreground-secondary mt-0.5">2024 vs. 2023 - valori cumulate la zi</p>
            </div>
            <div className="card-app-content p-0">
              <table className="table-financial">
                <thead>
                  <tr>
                    <th>Categorie</th>
                    <th className="text-right">2024</th>
                    <th className="text-right">2023</th>
                    <th className="text-right">Variație</th>
                  </tr>
                </thead>
                <tbody>
                  {yoyComparison.map((row, idx) => (
                    <tr key={idx} className={cn(row.categorie.includes('Profit') && 'bg-gray-50')}>
                      <td className="font-medium">{row.categorie}</td>
                      <td className="text-right font-mono">{formatCurrency(row.y2024)}</td>
                      <td className="text-right font-mono text-gray-500">{formatCurrency(row.y2023)}</td>
                      <td className="text-right">
                        <span className={cn(
                          "inline-flex items-center gap-1 font-medium",
                          row.change > 0 ? "text-emerald-600" : "text-red-600"
                        )}>
                          {row.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {row.change > 0 ? '+' : ''}{row.change}%
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
    </div>
  );
};

export default AnalizeFinanciare;
