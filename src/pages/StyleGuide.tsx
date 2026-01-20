import React from 'react';
import { 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  LayoutDashboard, 
  TrendingUp, 
  Target, 
  Search, 
  Bell, 
  Settings, 
  Shield,
  Download,
  Calendar,
  MoreHorizontal,
  ChevronRight,
  TrendingDown,
  User,
  CreditCard,
  Building
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KPICard } from "@/components/app/KPICard";

const StyleGuide = () => {
  return (
    <div className="min-h-screen bg-background p-8 font-sans text-foreground">
      <div className="max-w-[1400px] mx-auto space-y-16">
        
        {/* Header */}
        <header className="space-y-4 border-b border-border pb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-md">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">FinGuard Design System</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl">
            A comprehensive guide to the visual language, components, and patterns used throughout the FinGuard application.
            Based on the design guidelines v1.0.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">v1.0.0</Badge>
            <span>Last updated: January 2026</span>
          </div>
        </header>

        {/* 1. Typography */}
        <section id="typography" className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Typography</h2>
            <p className="text-muted-foreground">Type hierarchy using Lato (UI) and EB Garamond (Editorial/Headings).</p>
            <Separator />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Headline XL</span>
                <h1 className="text-6xl font-black tracking-tight leading-none mt-2">
                  Financial Intelligence
                </h1>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Headline L</span>
                <h2 className="text-5xl font-black tracking-tight leading-none mt-2">
                  Quarterly Report
                </h2>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Headline M</span>
                <h3 className="text-4xl font-bold tracking-tight mt-2">
                  Growth Analysis
                </h3>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Headline S</span>
                <h4 className="text-2xl font-bold tracking-tight mt-2">
                  Account Overview
                </h4>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Body Large</span>
                <p className="text-lg leading-relaxed mt-2 text-muted-foreground">
                  FinGuard transforms complex financial data into actionable insights with clarity and confidence. 
                  Our platform leverages AI to provide CFO-level analysis in seconds.
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Body Regular</span>
                <p className="text-base leading-relaxed mt-2">
                  This allows business owners to make informed decisions without waiting for end-of-month reports. 
                  The dashboard provides real-time visibility into key performance indicators and cash flow trends.
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Body Small</span>
                <p className="text-sm leading-normal mt-2 text-muted-foreground">
                  Data is encrypted and stored securely. Last updated: 2 hours ago.
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Mono (Financial Data)</span>
                <p className="font-mono text-sm mt-2 bg-muted/30 p-2 rounded border border-border inline-block">
                  RON 1,234,567.89 <span className="text-emerald-600">+12.5%</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Colors */}
        <section id="colors" className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Color System</h2>
            <p className="text-muted-foreground">Primary, secondary, and semantic color palettes defined in HSL.</p>
            <Separator />
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-4">Brand Colors</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <ColorSwatch name="Primary Navy" color="bg-[hsl(222,47%,11%)]" text="text-white" hex="#0F172A" />
                <ColorSwatch name="Primary Indigo" color="bg-[hsl(244,58%,64%)]" text="text-white" hex="#6366F1" />
                <ColorSwatch name="Indigo Dark" color="bg-[hsl(243,75%,59%)]" text="text-white" hex="#4F46E5" />
                <ColorSwatch name="Accent Emerald" color="bg-[hsl(158,64%,52%)]" text="text-white" hex="#34D399" />
                <ColorSwatch name="Warning Amber" color="bg-[hsl(38,92%,50%)]" text="text-white" hex="#F59E0B" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Semantic UI Colors</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <ColorSwatch name="Background" color="bg-background" text="text-foreground" border />
                <ColorSwatch name="Surface" color="bg-card" text="text-card-foreground" border />
                <ColorSwatch name="Muted" color="bg-muted" text="text-muted-foreground" />
                <ColorSwatch name="Destructive" color="bg-destructive" text="text-destructive-foreground" />
                <ColorSwatch name="Border" color="bg-border" text="text-foreground" />
                <ColorSwatch name="Input" color="bg-input" text="text-foreground" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Chart Palette</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <ColorSwatch name="Chart 1" color="bg-[hsl(234,89%,73%)]" text="text-white" />
                <ColorSwatch name="Chart 2" color="bg-[hsl(255,91%,76%)]" text="text-white" />
                <ColorSwatch name="Chart 3" color="bg-[hsl(270,95%,75%)]" text="text-white" />
                <ColorSwatch name="Chart 4" color="bg-[hsl(238,83%,66%)]" text="text-white" />
                <ColorSwatch name="Chart 5" color="bg-[hsl(0,0%,45%)]" text="text-white" />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Buttons */}
        <section id="buttons" className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Buttons</h2>
            <p className="text-muted-foreground">Interactive elements with various hierarchies and states.</p>
            <Separator />
          </div>

          <div className="flex flex-wrap gap-12">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Variants</h4>
              <div className="flex flex-col gap-4 items-start">
                <Button className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 shadow-xl hover:scale-[1.03] transition-all">
                  Hero Button <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button>Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="outline">Outline Button</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link Button</Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Sizes</h4>
              <div className="flex flex-col gap-4 items-start">
                <Button size="lg">Large Button</Button>
                <Button size="default">Default Button</Button>
                <Button size="sm">Small Button</Button>
                <Button size="icon"><Settings className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">States</h4>
              <div className="flex flex-col gap-4 items-start">
                <Button disabled>Disabled</Button>
                <Button className="opacity-80">
                  <span className="animate-spin mr-2">⟳</span> Loading
                </Button>
                <Button className="ring-2 ring-primary ring-offset-2">Focused</Button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Form Elements */}
        <section id="forms" className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Form Elements</h2>
            <p className="text-muted-foreground">Inputs, controls, and selectors for data entry.</p>
            <Separator />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input type="email" id="email" placeholder="name@company.com" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="search">Search Input</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="search" placeholder="Search..." className="pl-9" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="disabled">Disabled Input</Label>
                <Input disabled id="disabled" placeholder="Cannot type here" />
              </div>

              <div className="space-y-2">
                <Label className="text-destructive">Error State</Label>
                <Input className="border-destructive focus-visible:ring-destructive" placeholder="Invalid value" defaultValue="wrong@input" />
                <p className="text-xs text-destructive">Please enter a valid email address.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Select Option</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="q1">Q1 2026</SelectItem>
                    <SelectItem value="q2">Q2 2026</SelectItem>
                    <SelectItem value="q3">Q3 2026</SelectItem>
                    <SelectItem value="q4">Q4 2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="airplane-mode" />
                <Label htmlFor="airplane-mode">Dark Mode</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="terms" />
                <Label htmlFor="terms">Accept terms and conditions</Label>
              </div>

              <div className="space-y-2">
                <Label>Slider (Risk Tolerance)</Label>
                {/* Mock slider visually since we don't have the component imported or it might need specific setup */}
                <div className="relative w-full h-2 bg-secondary rounded-full mt-2">
                  <div className="absolute top-0 left-0 h-full bg-primary rounded-full w-[60%]"></div>
                  <div className="absolute top-1/2 left-[60%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-background border-2 border-primary rounded-full shadow-sm"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Cards & Containers */}
        <section id="cards" className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Cards</h2>
            <p className="text-muted-foreground">Various container styles for different content types.</p>
            <Separator />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature Card */}
            <Card className="hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <CardTitle>Feature Card</CardTitle>
                <CardDescription>Hover for interaction effect</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Designed for feature grids. Uses subtle hover states to indicate interactivity.
                </p>
              </CardContent>
            </Card>

            {/* App Card */}
            <Card className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle>App Card</CardTitle>
                <CardDescription>Dashboard widget style</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-mono">RON 45,000</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expenses</span>
                    <span className="font-mono">RON 12,500</span>
                  </div>
                  <Separator className="my-2"/>
                  <div className="flex justify-between font-medium">
                    <span>Profit</span>
                    <span className="text-emerald-600">RON 32,500</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing/Highlight Card */}
            <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-md">
              <div className="absolute top-0 right-0 p-3">
                <Badge className="bg-primary text-primary-foreground">Recommended</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-primary-navy">Pro Plan</CardTitle>
                <CardDescription>For growing businesses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-4">€49<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500"/> Unlimited Analysis</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500"/> AI Forecasts</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500"/> Priority Support</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-primary hover:bg-primary/90">Get Started</Button>
              </CardFooter>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard 
              label="Total Revenue" 
              value="RON 1.2M" 
              trend={12.5} 
              icon={<CreditCard className="w-5 h-5"/>} 
            />
            <KPICard 
              label="Active Clients" 
              value="142" 
              trend={-2.4} 
              icon={<User className="w-5 h-5"/>} 
            />
            <KPICard 
              label="Net Profit" 
              value="RON 450K" 
              trend={8.2} 
              icon={<TrendingUp className="w-5 h-5"/>} 
              highlighted
            />
            <KPICard 
              label="Expenses" 
              value="RON 750K" 
              trend={5.1} 
              trendLabel="vs last month"
              icon={<TrendingDown className="w-5 h-5"/>} 
            />
          </div>
        </section>

        {/* 6. Data Display */}
        <section id="data" className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Data Display</h2>
            <p className="text-muted-foreground">Tables, badges, and status indicators.</p>
            <Separator />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                <Table>
                  <TableCaption>Recent Financial Transactions</TableCaption>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Building className="w-4 h-4" />
                          </div>
                          Software License
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-transparent">Completed</Badge></TableCell>
                      <TableCell>Credit Card</TableCell>
                      <TableCell className="text-right font-mono">- $250.00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <User className="w-4 h-4" />
                          </div>
                          Client Payment
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="bg-blue-50 text-blue-700 border-transparent">Processing</Badge></TableCell>
                      <TableCell>Bank Transfer</TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">+ $1,250.00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          Refund Request
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="bg-amber-50 text-amber-700 border-transparent">Pending</Badge></TableCell>
                      <TableCell>PayPal</TableCell>
                      <TableCell className="text-right font-mono">- $85.00</TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right font-mono">$915.00</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Badges & Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                  </div>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                      Success
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                      Warning
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                      Danger
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                      Info
                    </span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="text-muted-foreground">45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* 7. Navigation & Tabs */}
        <section id="navigation" className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Navigation Components</h2>
            <p className="text-muted-foreground">Tabs, menus, and navigation patterns.</p>
            <Separator />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Tabs (Pill Style - Default)</h3>
              <Tabs defaultValue="account" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="password">Password</TabsTrigger>
                </TabsList>
                <TabsContent value="account">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account</CardTitle>
                      <CardDescription>
                        Make changes to your account here.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">Account settings content goes here...</p>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="password">
                  <Card>
                    <CardHeader>
                      <CardTitle>Password</CardTitle>
                      <CardDescription>
                        Change your password here.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">Password change form goes here...</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-medium">Sidebar Item Example</h3>
              <div className="w-64 border rounded-lg bg-card p-2 space-y-1">
                <div className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md cursor-pointer flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </div>
                <div className="px-3 py-2 text-sm font-medium bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-l-4 border-primary pl-2 rounded-r-md cursor-pointer flex items-center gap-3">
                  <Target className="w-4 h-4" /> Analytics
                </div>
                <div className="px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md cursor-pointer flex items-center gap-3">
                  <Settings className="w-4 h-4" /> Settings
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Alerts & Empty States */}
        <section id="feedback" className="space-y-8 pb-20">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Feedback & States</h2>
            <p className="text-muted-foreground">Communicating system status to the user.</p>
            <Separator />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                  Your trial period expires in 3 days. Upgrade to keep premium features.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to process the uploaded balance sheet. Please check the file format.
                </AlertDescription>
              </Alert>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex gap-3 text-emerald-800">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-medium text-sm">Success!</h4>
                  <p className="text-sm text-emerald-700 mt-1">Your report has been generated successfully.</p>
                </div>
              </div>
            </div>

            <Card className="flex flex-col items-center justify-center py-12 text-center border-dashed">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <UploadIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No Data Available</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                Upload your first balance sheet to generate financial insights and KPIs.
              </p>
              <Button>
                <Download className="w-4 h-4 mr-2" /> Upload Balance Sheet
              </Button>
            </Card>
          </div>
        </section>

      </div>
    </div>
  );
};

// Helper component for color swatches
const ColorSwatch = ({ name, color, text = "text-foreground", hex, border = false }: { name: string, color: string, text: string, hex?: string, border?: boolean }) => (
  <div className={`p-4 rounded-xl ${color} ${text} ${border ? 'border border-border' : ''} flex flex-col justify-between h-24 shadow-sm`}>
    <span className="font-medium text-sm">{name}</span>
    {hex && <span className="text-xs opacity-80 font-mono">{hex}</span>}
  </div>
);

// Helper icon
const UploadIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
  </svg>
);

export default StyleGuide;
