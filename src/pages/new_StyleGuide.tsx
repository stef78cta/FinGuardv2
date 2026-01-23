import React, { useState } from 'react';
import { 
  ArrowRight, CheckCircle, AlertTriangle, XCircle, Info, 
  LayoutDashboard, TrendingUp, Search, Bell, Download, 
  ChevronRight, User, CreditCard, Building, Loader2,
  Settings, Shield, Calendar, MoreHorizontal, Target,
  TrendingDown, Mail, Lock, Eye, Filter, Menu, HelpCircle,
  PieChart, BarChart3, Activity, Zap
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

/**
 * FinGuard Design System - Style Guide Component
 * Version 1.3 / Enterprise
 * 
 * This component can be imported into any application to display
 * the complete design system documentation with all 7 sections.
 * 
 * Usage:
 * import { StyleGuide } from '@/components/StyleGuide';
 * <StyleGuide />
 */

// ============= DESIGN TOKENS =============
export const designTokens = {
  // Brand Colors
  colors: {
    primary: {
      dark: '#0F172A',
      indigo: '#6366F1',
      indigoLight: '#818CF8',
    },
    semantic: {
      success: '#34D399',
      danger: '#F43F5E',
      warning: '#F59E0B',
      info: '#3B82F6',
    },
    surface: {
      white: '#FFFFFF',
      canvas: '#F8FAFC',
      border: '#E2E8F0',
    },
    chart: {
      chart1: '#6366F1',
      chart2: '#818CF8',
      chart3: '#A5B4FC',
      chart4: '#C7D2FE',
      chart5: '#E0E7FF',
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      serif: 'Georgia, serif',
      sans: 'system-ui, -apple-system, sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
  },
  
  // Spacing (8px grid)
  spacing: {
    compact: '8px',
    comfortable: '16px',
    section: '80px',
  },
  
  // Border Radius
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    cards: '20px',
    buttons: '40px',
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },
};

// ============= HELPER COMPONENTS =============
const ColorCard = ({ name, hex, desc, colorClass, dark = false }: { 
  name: string, 
  hex: string, 
  desc: string, 
  colorClass: string, 
  dark?: boolean 
}) => (
  <div className="rounded-xl overflow-hidden border border-slate-200">
    <div className={`${colorClass} h-20 flex items-end p-3`}>
      <span className={`text-xs font-mono font-bold ${dark ? 'text-white' : 'text-slate-600'}`}>{hex}</span>
    </div>
    <div className="p-3 bg-white">
      <p className="font-bold text-sm text-[#0F172A]">{name}</p>
      <p className="text-xs text-slate-400">{desc}</p>
    </div>
  </div>
);

const NavItem = ({ icon, label, active = false }: { 
  icon: React.ReactNode, 
  label: string, 
  active?: boolean 
}) => (
  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
    active ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'
  }`}>
    {icon}
    <span className="text-sm">{label}</span>
    {active && <ChevronRight className="w-4 h-4 ml-auto" />}
  </div>
);

const StatCard = ({ title, value, trend, negative = false }: { 
  title: string, 
  value: string, 
  trend: string, 
  negative?: boolean 
}) => (
  <div className="p-3 bg-slate-50 rounded-lg">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
    <div className="text-sm font-mono font-bold text-[#0F172A] mt-1">
      {value} RON
    </div>
    <div className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${negative ? 'text-rose-500' : 'text-emerald-500'}`}>
      {negative ? <TrendingDown className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />}
      {trend} vs luna trecută
    </div>
  </div>
);

// ============= MAIN STYLE GUIDE COMPONENT =============
export const StyleGuide = () => {
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [uiState, setUiState] = useState<'success' | 'loading' | 'error' | 'empty'>('success');

  const cellPadding = density === 'compact' ? 'py-2 px-3' : 'py-4 px-6';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">

      {/* HEADER PREMIUM */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#0F172A] rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold tracking-tight text-[#0F172A]">
                FinGuard Design System
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Version 1.3 / Enterprise
                </span>
                <Separator orientation="vertical" className="h-3" />
                <span className="text-[10px] text-slate-400">Documentație completă a componentelor</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDensity('comfortable')}
                className={density === 'comfortable' ? 'bg-white shadow-sm text-[#0F172A]' : 'text-slate-500'}
              >
                Comfortable
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDensity('compact')}
                className={density === 'compact' ? 'bg-white shadow-sm text-[#0F172A]' : 'text-slate-500'}
              >
                Compact
              </Button>
            </div>
            
            <Separator orientation="vertical" className="h-8" />
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5 text-slate-400" />
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" /> Export assets
              </Button>
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                AD
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-16 space-y-20">
        
        {/* SECTION 1: PALETA CROMATICĂ */}
        <section>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full">
                  1. Fundamente Vizuale & Brand
                </span>
              </div>
              <CardDescription>Ierarhia v1.3 incluzând paleta semantică și cea de grafice.</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <ColorCard name="Primary Dark" hex="#0F172A" desc="Fundal header/sidebar" colorClass="bg-[#0F172A]" dark />
                <ColorCard name="Accent Indigo" hex="#6366F1" desc="CTA-uri și focus" colorClass="bg-[#6366F1]" dark />
                <ColorCard name="Accent Emerald" hex="#34D399" desc="Pozitiv / Profit" colorClass="bg-[#34D399]" dark />
                <ColorCard name="Danger Rose" hex="#F43F5E" desc="Negativ / Alertă" colorClass="bg-[#F43F5E]" dark />
                <ColorCard name="Surface Light" hex="#FFFFFF" desc="Carduri și zone" colorClass="bg-white border" />
                <ColorCard name="Canvas" hex="#F8FAFC" desc="Fundal aplicație" colorClass="bg-slate-50 border" />
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Chart Palette (Data Viz)</p>
                <div className="flex gap-2">
                  {['bg-[#6366F1]', 'bg-[#818CF8]', 'bg-[#A5B4FC]', 'bg-[#C7D2FE]', 'bg-[#E0E7FF]'].map((c, i) => (
                    <div key={i} className={`${c} w-16 h-16 rounded-lg flex items-center justify-center text-white text-xs font-bold`}>
                      Chart {i+1}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 2: TIPOGRAFIE */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-[#0F172A]">2. Tipografie & Ierarhie</h2>
            <Separator className="flex-1" />
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Stil Editorial (Serif)</p>
              <h3 className="text-3xl font-serif font-bold text-[#0F172A] leading-tight mb-4">
                Experiență Premium pentru Utilizator
              </h3>
              <p className="text-slate-500">
                Utilizat pentru landing pages și stări de tip "Empty State" pentru a crea o conexiune emoțională și profesională cu brandul.
              </p>
            </Card>
            
            <Card className="p-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Stil Aplicație (Sans)</p>
              <div className="space-y-4">
                <h4 className="text-xl font-bold text-[#0F172A]">Titlu Secțiune Dashboard</h4>
                <p className="text-slate-500 text-sm">
                  Interfață funcțională optimizată pentru scanare rapidă și decizii informate.
                </p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <span className="font-mono text-lg font-bold text-[#0F172A]">
                    JetBrains Mono: 12.450,00 RON
                  </span>
                </div>
                <p className="text-xs text-slate-400">Pentru valori monetare și coduri</p>
              </div>
            </Card>
          </div>
        </section>

        {/* SECTION 3: BUTOANE & INTERACȚIUNE */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-[#0F172A]">3. Componente de Acțiune</h2>
            <CardDescription>Ierarhia de butoane conform secțiunii 1 din Ghid.</CardDescription>
          </div>
          
          <Card className="p-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Variante Butoane</p>
                <div className="flex flex-wrap gap-3">
                  <Button className="bg-indigo-500 hover:bg-indigo-600 rounded-[40px]">Primary Indigo</Button>
                  <Button variant="outline" className="rounded-[40px]">Secondary Outline</Button>
                  <Button variant="ghost" className="rounded-[40px]">Ghost Action</Button>
                  <Button variant="link" className="rounded-[40px]">Link Button</Button>
                  <Button variant="destructive" className="rounded-[40px]">Destructive</Button>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dimensiuni & Iconițe</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" className="bg-indigo-500 rounded-[40px]">Small</Button>
                  <Button className="bg-indigo-500 rounded-[40px]">Default</Button>
                  <Button size="lg" className="bg-indigo-500 rounded-[40px]">Large Editorial</Button>
                  <Button size="icon" variant="outline" className="rounded-[40px]">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* SECTION 4: ELEMENTE DE FORMULAR */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-[#0F172A]">4. Form Elements & Inputs</h2>
            <CardDescription>Optimizate pentru densitate și accesibilitate.</CardDescription>
          </div>
          
          <Card className="p-6">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Input-uri de bază */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Adresă Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="exemplu@companie.ro" className="pl-10" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Parolă Securizată</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input type="password" placeholder="••••••••" className="pl-10 pr-10" />
                    <Eye className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 cursor-pointer" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Căutare Avansată</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Caută tranzacții..." className="pl-10 pr-10" />
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 cursor-pointer" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-400">Disabled Input</Label>
                  <Input placeholder="Nu poate fi editat" disabled className="bg-slate-100 cursor-not-allowed" />
                </div>
              </div>

              {/* Select & Toggle */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Perioadă Raportare</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectează perioada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="q1">Trimestrul 1</SelectItem>
                      <SelectItem value="q2">Trimestrul 2</SelectItem>
                      <SelectItem value="q3">Trimestrul 3</SelectItem>
                      <SelectItem value="q4">Trimestrul 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <Label>Notificări Smart</Label>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <Label>Analytics Tracking</Label>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms" className="text-sm">
                    Acceptă termenii și condițiile
                  </Label>
                </div>
              </div>

              {/* Progress & Badges */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-widest">UPLOAD PROGRESS</span>
                    <span className="font-bold">65%</span>
                  </div>
                  <Progress value={65} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-widest">BUDGET UTILIZATION</span>
                    <span className="font-bold">75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Badge Variants</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-indigo-500">Primar</Badge>
                    <Badge variant="secondary">Secundar</Badge>
                    <Badge className="bg-emerald-500">Succes</Badge>
                    <Badge variant="destructive">Eroare</Badge>
                    <Badge variant="outline">Neutral</Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* SECTION 5: CARDURI ȘI NAVIGATION */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-[#0F172A]">5. Navigation & Structure</h2>
            <CardDescription>Sisteme de taburi și ierarhii de carduri.</CardDescription>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-4 rounded-[20px]">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Sidebar Navigation</p>
              <nav className="space-y-1">
                <NavItem icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" active />
                <NavItem icon={<TrendingUp className="w-4 h-4" />} label="Analiză Cash" />
                <NavItem icon={<PieChart className="w-4 h-4" />} label="Rapoarte" />
                <NavItem icon={<BarChart3 className="w-4 h-4" />} label="Vizualizări" />
                <NavItem icon={<Settings className="w-4 h-4" />} label="Configurare" />
                <Separator className="my-2" />
                <NavItem icon={<HelpCircle className="w-4 h-4" />} label="Ajutor & Suport" />
              </nav>
            </Card>
            
            <Card className="md:col-span-2 p-0 overflow-hidden rounded-[20px]">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b bg-slate-50 p-0 h-auto">
                  <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent px-6 py-3">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent px-6 py-3">
                    Detalii Tranzacții
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent px-6 py-3">
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent px-6 py-3">
                    Setări Raport
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-l-4 border-l-emerald-500 rounded-[20px]">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase tracking-widest">
                          Lichiditate Totală
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-mono font-bold text-[#0F172A]">
                          1.420.500 RON
                        </div>
                        <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-1">
                          <TrendingUp className="w-3 h-3" /> +5.2% vs luna trecută
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-l-4 border-l-rose-500 rounded-[20px]">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-xs uppercase tracking-widest">
                          Datorii Curente
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-mono font-bold text-[#0F172A]">
                          240.000 RON
                        </div>
                        <div className="flex items-center gap-1 text-rose-500 text-xs font-bold mt-1">
                          <TrendingDown className="w-3 h-3" /> +12% risc crescut
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
          
          {/* Pricing Card & Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {/* Pricing Card */}
            <Card className="relative overflow-hidden border-2 border-indigo-500 rounded-[20px]">
              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                POPULAR
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Pro Plan</CardTitle>
                <CardDescription>Pentru echipe în creștere</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-mono font-bold text-[#0F172A]">€49</span>
                  <span className="text-slate-400">/lună</span>
                </div>
                <Separator />
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Utilizatori nelimitați
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Rapoarte avansate
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Suport prioritar 24/7
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Integrări API complete
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-indigo-500 hover:bg-indigo-600">
                  Începe Acum
                </Button>
              </CardFooter>
            </Card>
            
            {/* Feature Card 1 */}
            <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 rounded-[20px]">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-500 transition-colors duration-300">
                  <Activity className="w-6 h-6 text-indigo-500 group-hover:text-white transition-colors duration-300" />
                </div>
                <CardTitle className="text-lg">Analiză Real-Time</CardTitle>
                <CardDescription>
                  Monitorizare continuă a fluxurilor financiare cu alerte inteligente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-indigo-500 text-sm font-medium group-hover:gap-3 transition-all duration-300">
                  Află mai multe <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
            
            {/* Feature Card 2 */}
            <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 rounded-[20px]">
              <CardHeader>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-500 transition-colors duration-300">
                  <Zap className="w-6 h-6 text-emerald-500 group-hover:text-white transition-colors duration-300" />
                </div>
                <CardTitle className="text-lg">Automatizări Smart</CardTitle>
                <CardDescription>
                  Reguli personalizate pentru procesarea automată a tranzacțiilor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium group-hover:gap-3 transition-all duration-300">
                  Explorează <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SECTION 6: TABELE ȘI DENSITATE */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-[#0F172A]">6. Tabele Date & Densitate</h2>
              <CardDescription>Regula 8px (Compact) vs 16px (Comfortable).</CardDescription>
            </div>
            <Badge variant="outline" className="font-mono">
              Mod: {density.toUpperCase()}
            </Badge>
          </div>
          
          <Card className="overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className={cellPadding}>Partener / Entitate</TableHead>
                  <TableHead className={cellPadding}>Categorie</TableHead>
                  <TableHead className={cellPadding}>Status</TableHead>
                  <TableHead className={`${cellPadding} text-right`}>Valoare</TableHead>
                  <TableHead className={`${cellPadding} text-center`}>Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "Orange Romania SA", cat: "Utilități", status: "Plătit", val: "1.250,00" },
                  { name: "Amazon Web Services", cat: "Cloud", status: "În procesare", val: "4.450,20" },
                  { name: "Dedeman SRL", cat: "Investiții", status: "Restant", val: "12.000,00" },
                  { name: "Google Workspace", cat: "Productivitate", status: "Plătit", val: "850,00" },
                  { name: "Stripe Processing", cat: "Financiar", status: "În procesare", val: "1.120,00" }
                ].map((row, i) => (
                  <TableRow key={i} className="hover:bg-indigo-50/30">
                    <TableCell className={`${cellPadding} font-medium`}>{row.name}</TableCell>
                    <TableCell className={cellPadding}>
                      <Badge variant="outline" className="font-normal">
                        {row.cat}
                      </Badge>
                    </TableCell>
                    <TableCell className={cellPadding}>
                      <div className={`flex items-center gap-1.5 text-xs font-bold ${
                        row.status === 'Plătit' ? 'text-emerald-600' : 
                        row.status === 'Restant' ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          row.status === 'Plătit' ? 'bg-emerald-500' : 
                          row.status === 'Restant' ? 'bg-rose-500' : 'bg-amber-500'
                        }`} />
                        {row.status}
                      </div>
                    </TableCell>
                    <TableCell className={`${cellPadding} text-right font-mono font-bold`}>
                      {row.val} RON
                    </TableCell>
                    <TableCell className={`${cellPadding} text-center`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-between items-center px-6 py-4 border-t bg-slate-50">
              <p className="text-sm text-slate-500">Afișare 5 din 124 înregistrări</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Anterior</Button>
                <Button variant="outline" size="sm">Următor</Button>
              </div>
            </div>
          </Card>
        </section>

        {/* SECTION 7: STĂRI UI & FEEDBACK */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl font-bold text-[#0F172A]">7. Stări UI & Feedback</h2>
            <div className="flex gap-2">
              {(['success', 'loading', 'error', 'empty'] as const).map(s => (
                <Button 
                  key={s}
                  variant="outline" 
                  size="sm"
                  onClick={() => setUiState(s)} 
                  className={uiState === s ? 'border-[#6366F1] text-[#6366F1] bg-indigo-50 shadow-sm' : ''}
                >
                  Test Stare: {s.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          <Card className="min-h-[400px] flex items-center justify-center p-8">
            {uiState === 'loading' && (
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto" />
                <h3 className="text-lg font-bold text-[#0F172A]">Generăm raportul financiar...</h3>
                <p className="text-slate-500">Aceasta poate dura câteva secunde.</p>
              </div>
            )}

            {uiState === 'empty' && (
              <div className="text-center max-w-md space-y-6">
                <div className="w-20 h-20 mx-auto bg-indigo-100 rounded-full flex items-center justify-center">
                  <Target className="w-10 h-10 text-indigo-500" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#0F172A]">Nicio balanță găsită</h3>
                <p className="text-slate-500">
                  Încarcă prima ta balanță contabilă pentru a începe analiza automată a datelor.
                </p>
                <Button className="bg-indigo-500 hover:bg-indigo-600 gap-2">
                  <Download className="w-4 h-4" /> Încarcă acum
                </Button>
              </div>
            )}

            {uiState === 'error' && (
              <div className="max-w-lg w-full">
                <Alert variant="destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle>Eroare de procesare fișier</AlertTitle>
                  <AlertDescription className="space-y-4">
                    <p>Fișierul încărcat nu respectă structura standard. Te rugăm să verifici dacă coloanele sunt corect denumite.</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-rose-300 text-rose-600 hover:bg-rose-50">
                        Încearcă din nou
                      </Button>
                      <Button size="sm" variant="ghost" className="text-rose-600">
                        Descarcă model .xlsx
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {uiState === 'success' && (
              <div className="max-w-lg w-full space-y-6">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="text-emerald-700 font-medium">Datele au fost sincronizate cu succes.</span>
                </div>
                
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-[#0F172A]">Sumar Performanță Trimestru 3</h4>
                    <Badge className="bg-emerald-500">Realizat: 102%</Badge>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <StatCard title="Venit Net" value="154.000" trend="+8.2%" />
                    <StatCard title="Cheltuieli" value="92.450" trend="-2.1%" negative />
                    <StatCard title="Profit" value="61.550" trend="+15.4%" />
                    <StatCard title="Cash Flow" value="22.100" trend="+4.1%" />
                  </div>
                </Card>
              </div>
            )}
          </Card>
        </section>

      </main>
    </div>
  );
};

// Export default pentru compatibilitate
export default StyleGuide;
