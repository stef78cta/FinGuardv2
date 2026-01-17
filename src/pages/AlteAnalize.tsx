import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';

// Types
interface ChartDataPoint {
  month: string;
  realizareCA: number;
  alteExploatare: number;
  financiare: number;
  extraordinare: number;
  totale: number;
}

interface TableRow {
  category: string;
  indent: number;
  isSubtotal: boolean;
  isTotal: boolean;
  values: {
    month: string;
    value: number;
    percent: number;
  }[];
}

interface ChartFilters {
  realizareCA: boolean;
  alteExploatare: boolean;
  financiare: boolean;
  extraordinare: boolean;
  totale: boolean;
}

// Chart configuration
const chartConfig = {
  realizareCA: {
    label: 'Cheltuieli pentru realizarea cifrei de afaceri',
    color: '#3b82f6',
  },
  alteExploatare: {
    label: 'Alte cheltuieli de exploatare',
    color: '#f97316',
  },
  financiare: {
    label: 'Cheltuieli financiare',
    color: '#eab308',
  },
  extraordinare: {
    label: 'Cheltuieli extraordinare',
    color: '#a855f7',
  },
  totale: {
    label: 'Cheltuieli totale',
    color: '#10b981',
  },
};

// Mock data generators
const generateChartData = (): ChartDataPoint[] => {
  const months = ['Aprilie', 'Iunie', 'August', 'Octombrie', 'Decembrie'];
  
  return months.map((month, idx) => ({
    month,
    realizareCA: 850000 + (idx * 45000),
    alteExploatare: 120000 + (idx * 8000),
    financiare: 15000 + (idx * 1200),
    extraordinare: 5000 + (idx * 800),
    totale: 990000 + (idx * 55000),
  }));
};

const generateTableData = (): TableRow[] => {
  const months = ['Aprilie 2024', 'Iunie 2024', 'August 2024', 'Octombrie 2024', 'Decembrie 2024'];
  
  return [
    {
      category: 'VENITURI TOTALE',
      indent: 0,
      isSubtotal: false,
      isTotal: true,
      values: months.map((m, i) => ({
        month: m,
        value: 2500000 + (i * 120000),
        percent: 100,
      })),
    },
    {
      category: 'Venituri din vânzări',
      indent: 1,
      isSubtotal: false,
      isTotal: false,
      values: months.map((m, i) => ({
        month: m,
        value: 2200000 + (i * 100000),
        percent: 88 - (i * 0.5),
      })),
    },
    {
      category: 'Alte venituri de exploatare',
      indent: 1,
      isSubtotal: false,
      isTotal: false,
      values: months.map((m, i) => ({
        month: m,
        value: 300000 + (i * 20000),
        percent: 12 + (i * 0.5),
      })),
    },
    {
      category: 'CHELTUIELI TOTALE',
      indent: 0,
      isSubtotal: false,
      isTotal: true,
      values: months.map((m, i) => ({
        month: m,
        value: 2200000 + (i * 95000),
        percent: 88 - (i * 0.3),
      })),
    },
    {
      category: 'Cheltuieli cu materiile prime',
      indent: 1,
      isSubtotal: false,
      isTotal: false,
      values: months.map((m, i) => ({
        month: m,
        value: 850000 + (i * 45000),
        percent: 34 + (i * 0.2),
      })),
    },
    {
      category: 'Cheltuieli cu personalul',
      indent: 1,
      isSubtotal: false,
      isTotal: false,
      values: months.map((m, i) => ({
        month: m,
        value: 650000 + (i * 28000),
        percent: 26 + (i * 0.1),
      })),
    },
    {
      category: 'Alte cheltuieli de exploatare',
      indent: 1,
      isSubtotal: false,
      isTotal: false,
      values: months.map((m, i) => ({
        month: m,
        value: 120000 + (i * 8000),
        percent: 4.8 + (i * 0.05),
      })),
    },
    {
      category: 'Cheltuieli financiare',
      indent: 1,
      isSubtotal: false,
      isTotal: false,
      values: months.map((m, i) => ({
        month: m,
        value: 15000 + (i * 1200),
        percent: 0.6 + (i * 0.01),
      })),
    },
    {
      category: 'EBITDA',
      indent: 0,
      isSubtotal: true,
      isTotal: true,
      values: months.map((m, i) => ({
        month: m,
        value: 450000 + (i * 35000),
        percent: 18 + (i * 0.4),
      })),
    },
    {
      category: 'EBIT',
      indent: 0,
      isSubtotal: true,
      isTotal: true,
      values: months.map((m, i) => ({
        month: m,
        value: 300000 + (i * 25000),
        percent: 12 + (i * 0.3),
      })),
    },
    {
      category: 'PROFIT NET',
      indent: 0,
      isSubtotal: true,
      isTotal: true,
      values: months.map((m, i) => ({
        month: m,
        value: i === 0 ? -50000 : 250000 + (i * 20000),
        percent: i === 0 ? -2 : 10 + (i * 0.2),
      })),
    },
  ];
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
        <div 
          className="w-4 h-4 rounded" 
          style={{ backgroundColor: color }}
        />
        <label 
          htmlFor={label}
          className="text-sm text-foreground cursor-pointer select-none"
        >
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
    <div className="p-5">
      <h2 className="text-xl font-bold text-foreground mb-5 text-center">
        ANALIZA CHELTUIELILOR
      </h2>
      
      <div className="h-[380px] mb-5">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--foreground))"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <YAxis 
              stroke="hsl(var(--foreground))"
              tick={{ fill: 'hsl(var(--foreground))' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-surface border border-border rounded-lg shadow-lg p-3">
                      <p className="font-semibold text-foreground mb-2">{payload[0].payload.month}</p>
                      {payload.map((entry: any) => (
                        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
                          <div 
                            className="w-3 h-3 rounded" 
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-foreground-secondary">
                            {chartConfig[entry.dataKey as keyof typeof chartConfig]?.label}:
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(entry.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              content={({ payload }) => (
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {payload?.map((entry: any) => (
                    <div key={entry.dataKey} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-foreground">
                        {chartConfig[entry.dataKey as keyof typeof chartConfig]?.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            />
            {filters.realizareCA && (
              <Line 
                type="monotone" 
                dataKey="realizareCA" 
                stroke={chartConfig.realizareCA.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.realizareCA.color, r: 4 }}
              />
            )}
            {filters.alteExploatare && (
              <Line 
                type="monotone" 
                dataKey="alteExploatare" 
                stroke={chartConfig.alteExploatare.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.alteExploatare.color, r: 4 }}
              />
            )}
            {filters.financiare && (
              <Line 
                type="monotone" 
                dataKey="financiare" 
                stroke={chartConfig.financiare.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.financiare.color, r: 4 }}
              />
            )}
            {filters.extraordinare && (
              <Line 
                type="monotone" 
                dataKey="extraordinare" 
                stroke={chartConfig.extraordinare.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.extraordinare.color, r: 4 }}
              />
            )}
            {filters.totale && (
              <Line 
                type="monotone" 
                dataKey="totale" 
                stroke={chartConfig.totale.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.totale.color, r: 4 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="pt-6 border-t border-border">
        <p className="text-sm font-semibold text-foreground mb-4">
          Filtrare grafic:
        </p>
        <div className="flex flex-wrap gap-4">
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
  const months = data[0]?.values.map(v => v.month) || [];

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-surface z-10">
          <TableRow>
            <TableHead className="sticky left-0 bg-surface z-20 min-w-[250px] border-r border-border">
              Categorie
            </TableHead>
            {months.map(month => (
              <TableHead 
                key={month} 
                colSpan={2}
                className="text-center border-l border-border font-semibold"
              >
                {month}
              </TableHead>
            ))}
          </TableRow>
          <TableRow>
            <TableHead className="sticky left-0 bg-surface z-20 border-r border-border"></TableHead>
            {months.map(month => (
              <div key={month} className="contents">
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
                  <TableCell 
                    className={cn(
                      "text-right tabular-nums",
                      val.value < 0 && "text-destructive"
                    )}
                  >
                    {formatCurrency(val.value)}
                  </TableCell>
                  <TableCell 
                    className={cn(
                      "text-right tabular-nums border-r border-border",
                      val.value < 0 && "text-destructive"
                    )}
                  >
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
  const [activeTab, setActiveTab] = useState<string>('cheltuieli');
  const [chartFilters, setChartFilters] = useState<ChartFilters>({
    realizareCA: true,
    alteExploatare: true,
    financiare: true,
    extraordinare: true,
    totale: true,
  });

  const chartData = useMemo(() => generateChartData(), []);
  const tableData = useMemo(() => generateTableData(), []);

  const handleFilterChange = (key: keyof ChartFilters) => {
    setChartFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="container-app">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Alte Analize</h1>
        <p className="page-description">
          Analize suplimentare și rapoarte personalizate
        </p>
      </div>

      {/* Explanatory Text */}
      <div className="card-app p-4 mb-6">
        <p className="text-sm text-foreground leading-relaxed">
          Selectați lunile ale căror valori doriți să le vizualizați. Rapoartele redau informații 
          despre datele realizate în cadrul unei luni. Se pot compara rezultate realizate lunar 
          între luni din același an sau din ani diferiți. Informațiile sunt prezentate tabelar 
          sau grafic. Se pot face comparații pentru 2-12 luni.
        </p>
      </div>

      {/* SECTION 1: Graphical Analysis */}
      <Card className="mb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-4">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 gap-2">
              <TabsTrigger value="pl">Analiza P&L</TabsTrigger>
              <TabsTrigger value="venituri">Analiza Venituri</TabsTrigger>
              <TabsTrigger value="cheltuieli">Analiza Cheltuieli</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="pasive">Pasive</TabsTrigger>
              <TabsTrigger value="indicatori">Indicatori</TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <CardContent className="p-0">
            <TabsContent value="cheltuieli" className="m-0">
              <ChartSection 
                chartData={chartData} 
                filters={chartFilters}
                onFilterChange={handleFilterChange}
              />
            </TabsContent>
            
            <TabsContent value="pl" className="m-0 p-6">
              <div className="text-center text-foreground-secondary py-12">
                Analiza P&L - În curând
              </div>
            </TabsContent>
            
            <TabsContent value="venituri" className="m-0 p-6">
              <div className="text-center text-foreground-secondary py-12">
                Analiza Venituri - În curând
              </div>
            </TabsContent>
            
            <TabsContent value="active" className="m-0 p-6">
              <div className="text-center text-foreground-secondary py-12">
                Activul Patrimonial - În curând
              </div>
            </TabsContent>
            
            <TabsContent value="pasive" className="m-0 p-6">
              <div className="text-center text-foreground-secondary py-12">
                Pasivul Patrimonial - În curând
              </div>
            </TabsContent>
            
            <TabsContent value="indicatori" className="m-0 p-6">
              <div className="text-center text-foreground-secondary py-12">
                Indicatori Financiari - În curând
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* SECTION 2: Comparative Financial Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tabel Financiar Comparativ</CardTitle>
        </CardHeader>
        <CardContent>
          <ComparativeTable data={tableData} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AlteAnalize;
