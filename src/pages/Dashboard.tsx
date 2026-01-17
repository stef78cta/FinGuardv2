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
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { KPICard } from '@/components/app/KPICard';
import { ChartCard } from '@/components/app/ChartCard';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, AreaChart, Area } from 'recharts';

// Mock data for charts
const monthlyEvolutionData = [
  { month: 'Ian', venituri: 245000, cheltuieli: 198000, profit: 47000 },
  { month: 'Feb', venituri: 268000, cheltuieli: 215000, profit: 53000 },
  { month: 'Mar', venituri: 285000, cheltuieli: 225000, profit: 60000 },
  { month: 'Apr', venituri: 295000, cheltuieli: 238000, profit: 57000 },
  { month: 'Mai', venituri: 310000, cheltuieli: 245000, profit: 65000 },
  { month: 'Iun', venituri: 328000, cheltuieli: 258000, profit: 70000 },
];

const topAccounts = [
  { name: 'Clienți', value: 425000, change: 12.5 },
  { name: 'Furnizori', value: 312000, change: -5.2 },
  { name: 'Conturi curente', value: 287000, change: 8.7 },
  { name: 'Stocuri', value: 198000, change: 3.1 },
  { name: 'Imobilizări corporale', value: 875000, change: 0.5 },
];

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const Dashboard = () => {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('ro-RO', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Venituri Totale"
          value={formatCurrency(328000)}
          trend={8.2}
          trendLabel="vs. luna trecută"
          icon={<DollarSign className="w-5 h-5" />}
          highlighted
        />
        <KPICard
          label="Cheltuieli Totale"
          value={formatCurrency(258000)}
          trend={5.3}
          trendLabel="vs. luna trecută"
          icon={<CreditCard className="w-5 h-5" />}
        />
        <KPICard
          label="Profit Net"
          value={formatCurrency(70000)}
          trend={7.7}
          trendLabel="vs. luna trecută"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KPICard
          label="Cash Flow"
          value={formatCurrency(125000)}
          trend={-2.1}
          trendLabel="vs. luna trecută"
          icon={<Wallet className="w-5 h-5" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly Evolution Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <ChartCard 
            title="Evoluție Lunară" 
            subtitle="Venituri, cheltuieli și profit din ultimele 6 luni"
          >
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyEvolutionData}>
                  <defs>
                    <linearGradient id="colorVenituri" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="venituri" stroke="#6366f1" strokeWidth={2} fill="url(#colorVenituri)" name="Venituri" />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#colorProfit)" name="Profit" />
                  <Line type="monotone" dataKey="cheltuieli" stroke="#f97316" strokeWidth={2} dot={false} name="Cheltuieli" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Quick Actions */}
        <div className="card-app p-5">
          <h3 className="app-section-title">Acțiuni rapide</h3>
          <div className="space-y-3">
            <Link to="/app/incarcare-balanta" className="btn-action w-full justify-start">
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Încarcă balanță nouă</span>
            </Link>
            <Link to="/app/rapoarte-financiare" className="btn-action w-full justify-start">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Generează raport</span>
            </Link>
            <Link to="/app/analize-comparative" className="btn-action w-full justify-start">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Analiză comparativă</span>
            </Link>
          </div>

          {/* Last Upload Widget */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
              <Clock className="w-4 h-4" />
              <span>Ultima balanță încărcată</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-foreground">balanta_decembrie_2024.xlsx</p>
              <p className="text-xs text-gray-500 mt-1">15 Ianuarie 2025, 10:30</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Accounts Table */}
      <div className="card-app">
        <div className="card-app-header flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Top 5 Conturi</h3>
            <p className="text-sm text-foreground-secondary mt-0.5">Cele mai importante conturi din balanță</p>
          </div>
          <Link to="/app/rapoarte-financiare" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            Vezi toate
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="card-app-content p-0">
          <table className="table-financial">
            <thead>
              <tr>
                <th>Cont</th>
                <th className="text-right">Valoare</th>
                <th className="text-right">Variație</th>
              </tr>
            </thead>
            <tbody>
              {topAccounts.map((account, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="font-medium">{account.name}</td>
                  <td className="text-right font-mono">{formatCurrency(account.value)}</td>
                  <td className="text-right">
                    <span className={`inline-flex items-center gap-1 ${account.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {account.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(account.change)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
