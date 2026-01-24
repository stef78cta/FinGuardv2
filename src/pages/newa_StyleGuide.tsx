import React, { useState } from 'react';
import { 
  ArrowRight, CheckCircle, AlertTriangle, XCircle, Info, 
  LayoutDashboard, TrendingUp, Search, Bell, Download, 
  ChevronRight, ChevronLeft, ChevronDown, User, CreditCard, Building, Loader2,
  Settings, Shield, Calendar, MoreHorizontal, Target, Plus, Minus,
  TrendingDown, Mail, Lock, Eye, EyeOff, Filter, Menu, HelpCircle,
  PieChart, BarChart3, Activity, Zap, Copy, Check, X, ExternalLink,
  Home, FileText, Users, Folder, Star, Heart, Bookmark, Share2,
  Edit, Trash2, RefreshCw, Upload, Image, Link, Code, Terminal,
  Sun, Moon, Globe, Phone, MapPin, Clock, AlertCircle, CheckCircle2
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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * FP&A SaaS Design System - Style Guide
 * Version 2.0.0
 * 
 * Design tokens source: planning/newa_design-tokens.jsonc
 * 
 * This page showcases ALL UI components styled according to the design tokens.
 * Styles are SCOPED to this page only using the .fpsg- prefix (FP&A Style Guide).
 * 
 * NEW in v2.0: State, Focus, Selection, Semantic/Alert, Typography Roles,
 * Density, Table, Form, Chart Semantic/Categorical tokens
 */

// ============= SCOPED STYLES (Only for this page) =============
const scopedStyles = `
  /* ========================================
     FPSG (FP&A Style Guide) - Scoped Variables
     Source: newa_design-tokens.jsonc v2.0.0
     ======================================== */
  
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

  .fpsg-page {
    /* ===== COLOR: BRAND ===== */
    --fpsg-brand-primary-dark: #0F172A;
    --fpsg-brand-accent-indigo: #6366F1;
    --fpsg-brand-accent-emerald: #34D399;
    --fpsg-brand-danger-rose: #F43F5E;

    /* ===== COLOR: SURFACE ===== */
    --fpsg-surface-light: #FFFFFF;
    --fpsg-surface-canvas: #F8FAFC;

    /* ===== COLOR: TEXT ===== */
    --fpsg-text-primary: #0F172A;
    --fpsg-text-secondary: #475569;
    --fpsg-text-muted: #94A3B8;
    --fpsg-text-inverse: #FFFFFF;

    /* ===== COLOR: BORDER ===== */
    --fpsg-border-default: #E2E8F0;
    --fpsg-border-focus: #6366F1;

    /* ===== COLOR: SEMANTIC (NEW) ===== */
    --fpsg-semantic-success: #34D399;
    --fpsg-semantic-warning: #F59E0B;
    --fpsg-semantic-info: #3B82F6;
    --fpsg-semantic-danger: #F43F5E;

    /* ===== COLOR: ALERT (NEW) ===== */
    --fpsg-alert-success-bg: #ECFDF5;
    --fpsg-alert-warning-bg: #FFFBEB;
    --fpsg-alert-info-bg: #EFF6FF;
    --fpsg-alert-danger-bg: #FFF1F2;
    --fpsg-alert-success-border: #34D399;
    --fpsg-alert-warning-border: #F59E0B;
    --fpsg-alert-info-border: #3B82F6;
    --fpsg-alert-danger-border: #F43F5E;

    /* ===== COLOR: CHART PALETTE ===== */
    --fpsg-chart-1: #6366F1;
    --fpsg-chart-2: #818CF8;
    --fpsg-chart-3: #A5B4FC;
    --fpsg-chart-4: #C7D2FE;
    --fpsg-chart-5: #E0E7FF;

    /* ===== COLOR: CHART SEMANTIC (NEW) ===== */
    --fpsg-chart-positive: #34D399;
    --fpsg-chart-negative: #F43F5E;
    --fpsg-chart-neutral: #94A3B8;

    /* ===== COLOR: CHART CATEGORICAL (NEW) ===== */
    --fpsg-chart-cat-1: #6366F1;
    --fpsg-chart-cat-2: #34D399;
    --fpsg-chart-cat-3: #F59E0B;
    --fpsg-chart-cat-4: #3B82F6;
    --fpsg-chart-cat-5: #F43F5E;
    --fpsg-chart-cat-6: #14B8A6;
    --fpsg-chart-cat-7: #A855F7;
    --fpsg-chart-cat-8: #64748B;

    /* ===== STATE (NEW) ===== */
    --fpsg-state-hover: rgba(99,102,241,0.08);
    --fpsg-state-active: rgba(99,102,241,0.14);
    --fpsg-state-selected: rgba(99,102,241,0.10);
    --fpsg-disabled-opacity: 0.45;
    --fpsg-disabled-text: #94A3B8;
    --fpsg-disabled-border: #E2E8F0;
    --fpsg-disabled-bg: #F8FAFC;

    /* ===== FOCUS (NEW) ===== */
    --fpsg-focus-ring-color: #6366F1;
    --fpsg-focus-ring-width: 2px;
    --fpsg-focus-ring-offset: 2px;

    /* ===== SELECTION (NEW) ===== */
    --fpsg-selection-bg: #E0E7FF;
    --fpsg-selection-border: #6366F1;
    --fpsg-selection-text: #0F172A;

    /* ===== TYPOGRAPHY: FONT FAMILY ===== */
    --fpsg-font-editorial: 'Playfair Display', serif;
    --fpsg-font-application: 'Inter', system-ui, sans-serif;
    --fpsg-font-mono: 'JetBrains Mono', monospace;

    /* ===== TYPOGRAPHY: FONT SIZE ===== */
    --fpsg-font-size-xs: 12px;
    --fpsg-font-size-sm: 14px;
    --fpsg-font-size-base: 16px;
    --fpsg-font-size-lg: 18px;
    --fpsg-font-size-xl: 20px;
    --fpsg-font-size-2xl: 24px;
    --fpsg-font-size-3xl: 30px;
    --fpsg-font-size-4xl: 36px;

    /* ===== TYPOGRAPHY: FONT WEIGHT ===== */
    --fpsg-font-weight-regular: 400;
    --fpsg-font-weight-medium: 500;
    --fpsg-font-weight-semibold: 600;
    --fpsg-font-weight-bold: 700;

    /* ===== TYPOGRAPHY: LINE HEIGHT ===== */
    --fpsg-line-height-tight: 1.25;
    --fpsg-line-height-normal: 1.5;
    --fpsg-line-height-relaxed: 1.75;

    /* ===== SPACING ===== */
    --fpsg-spacing-0: 0px;
    --fpsg-spacing-1: 4px;
    --fpsg-spacing-2: 8px;
    --fpsg-spacing-3: 12px;
    --fpsg-spacing-4: 16px;
    --fpsg-spacing-5: 20px;
    --fpsg-spacing-6: 24px;
    --fpsg-spacing-8: 32px;
    --fpsg-spacing-10: 40px;
    --fpsg-spacing-12: 48px;

    /* ===== RADIUS ===== */
    --fpsg-radius-sm: 6px;
    --fpsg-radius-md: 10px;
    --fpsg-radius-lg: 14px;
    --fpsg-radius-xl: 20px;

    /* ===== SHADOW ===== */
    --fpsg-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --fpsg-shadow-md: 0 4px 12px rgba(15,23,42,0.08);
    --fpsg-shadow-lg: 0 12px 24px rgba(15,23,42,0.12);

    /* ===== Z-INDEX ===== */
    --fpsg-z-base: 0;
    --fpsg-z-dropdown: 10;
    --fpsg-z-sticky: 20;
    --fpsg-z-modal: 30;
    --fpsg-z-tooltip: 40;

    /* ===== DENSITY (NEW) ===== */
    --fpsg-density-compact-row: 36px;
    --fpsg-density-compact-field: 36px;
    --fpsg-density-comfortable-row: 44px;
    --fpsg-density-comfortable-field: 44px;

    /* ===== TABLE (NEW) ===== */
    --fpsg-table-cell-px: 12px;
    --fpsg-table-cell-py-compact: 8px;
    --fpsg-table-cell-py-comfortable: 12px;
    --fpsg-table-header-bg: #F8FAFC;
    --fpsg-table-row-hover: #EEF2FF;
    --fpsg-table-row-selected: #E0E7FF;
    --fpsg-table-grid-border: #E2E8F0;

    /* ===== FORM (NEW) ===== */
    --fpsg-form-field-px: 12px;
    --fpsg-form-field-radius: 10px;
    --fpsg-form-placeholder: #94A3B8;
    --fpsg-form-helper: #94A3B8;
    --fpsg-form-error-text: #F43F5E;
    --fpsg-form-error-border: #F43F5E;
  }

  /* ========================================
     Base Styles
     ======================================== */
  
  .fpsg-page {
    min-height: 100vh;
    background-color: var(--fpsg-surface-canvas);
    color: var(--fpsg-text-primary);
    font-family: var(--fpsg-font-application);
    font-size: var(--fpsg-font-size-base);
    line-height: var(--fpsg-line-height-normal);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Header */
  .fpsg-header {
    background: var(--fpsg-surface-light);
    border-bottom: 1px solid var(--fpsg-border-default);
    position: sticky;
    top: 0;
    z-index: var(--fpsg-z-sticky);
    box-shadow: var(--fpsg-shadow-sm);
  }

  /* Sections */
  .fpsg-section {
    scroll-margin-top: 100px;
  }

  .fpsg-section-title {
    font-family: var(--fpsg-font-application);
    font-size: var(--fpsg-font-size-2xl);
    font-weight: var(--fpsg-font-weight-bold);
    color: var(--fpsg-text-primary);
    margin-bottom: var(--fpsg-spacing-2);
    line-height: var(--fpsg-line-height-tight);
  }

  .fpsg-section-desc {
    color: var(--fpsg-text-secondary);
    font-size: var(--fpsg-font-size-sm);
    margin-bottom: var(--fpsg-spacing-6);
  }

  .fpsg-subsection-title {
    font-size: var(--fpsg-font-size-xs);
    font-weight: var(--fpsg-font-weight-semibold);
    color: var(--fpsg-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: var(--fpsg-spacing-4);
  }

  /* Cards */
  .fpsg-card {
    background: var(--fpsg-surface-light);
    border: 1px solid var(--fpsg-border-default);
    border-radius: var(--fpsg-radius-lg);
    box-shadow: var(--fpsg-shadow-sm);
  }

  /* Editorial Typography */
  .fpsg-font-editorial {
    font-family: var(--fpsg-font-editorial);
  }

  /* Mono Typography */
  .fpsg-font-mono {
    font-family: var(--fpsg-font-mono);
  }

  /* Color Swatch */
  .fpsg-color-swatch {
    border-radius: var(--fpsg-radius-md);
    overflow: hidden;
    border: 1px solid var(--fpsg-border-default);
  }

  /* Sidebar */
  .fpsg-sidebar-item {
    display: flex;
    align-items: center;
    gap: var(--fpsg-spacing-3);
    padding: var(--fpsg-spacing-2) var(--fpsg-spacing-3);
    border-radius: var(--fpsg-radius-sm);
    color: var(--fpsg-text-secondary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .fpsg-sidebar-item:hover {
    background: var(--fpsg-surface-canvas);
    color: var(--fpsg-text-primary);
  }

  .fpsg-sidebar-item.active {
    background: var(--fpsg-brand-primary-dark);
    color: var(--fpsg-text-inverse);
  }

  /* Code Block */
  .fpsg-code-block {
    background: var(--fpsg-brand-primary-dark);
    color: var(--fpsg-text-inverse);
    border-radius: var(--fpsg-radius-lg);
    font-family: var(--fpsg-font-mono);
  }

  /* ========================================
     Animation Keyframes
     ======================================== */
  
  @keyframes fpsg-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes fpsg-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .fpsg-animate-spin {
    animation: fpsg-spin 1s linear infinite;
  }

  .fpsg-animate-pulse {
    animation: fpsg-pulse 2s ease-in-out infinite;
  }
`;

// ============= DESIGN TOKENS EXPORT (matches newa_design-tokens.jsonc v2.0.0) =============
export const designTokens = {
  meta: {
    name: "FP&A SaaS Design Tokens",
    version: "2.0.0",
    description: "Design tokens centralizate pentru brand, aplicație și data viz - Extins cu state, semantic, density, forms, tables, charts"
  },
  color: {
    brand: {
      primaryDark: "#0F172A",
      accentIndigo: "#6366F1",
      accentEmerald: "#34D399",
      dangerRose: "#F43F5E"
    },
    surface: { light: "#FFFFFF", canvas: "#F8FAFC" },
    text: { primary: "#0F172A", secondary: "#475569", muted: "#94A3B8", inverse: "#FFFFFF" },
    border: { default: "#E2E8F0", focus: "#6366F1" },
    semantic: { success: "#34D399", warning: "#F59E0B", info: "#3B82F6", danger: "#F43F5E" },
    alert: {
      successBg: "#ECFDF5", warningBg: "#FFFBEB", infoBg: "#EFF6FF", dangerBg: "#FFF1F2",
      successBorder: "#34D399", warningBorder: "#F59E0B", infoBorder: "#3B82F6", dangerBorder: "#F43F5E"
    },
    chart: {
      1: "#6366F1", 2: "#818CF8", 3: "#A5B4FC", 4: "#C7D2FE", 5: "#E0E7FF",
      semantic: { positive: "#34D399", negative: "#F43F5E", neutral: "#94A3B8" },
      categorical: ["#6366F1", "#34D399", "#F59E0B", "#3B82F6", "#F43F5E", "#14B8A6", "#A855F7", "#64748B"]
    }
  },
  state: {
    hoverOverlay: "rgba(99,102,241,0.08)",
    activeOverlay: "rgba(99,102,241,0.14)",
    selectedOverlay: "rgba(99,102,241,0.10)",
    disabled: { opacity: 0.45, text: "#94A3B8", border: "#E2E8F0", background: "#F8FAFC" }
  },
  focus: {
    ring: { color: "#6366F1", width: "2px", offset: "2px" },
    outline: { color: "#6366F1", width: "2px" }
  },
  selection: { background: "#E0E7FF", border: "#6366F1", text: "#0F172A" },
  typography: {
    fontFamily: { editorial: "Playfair Display, serif", application: "Inter, system-ui, sans-serif", mono: "JetBrains Mono, monospace" },
    fontSize: { xs: "12px", sm: "14px", base: "16px", lg: "18px", xl: "20px", "2xl": "24px", "3xl": "30px", "4xl": "36px" },
    fontWeight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
    role: {
      pageTitle: { fontSize: "24px", fontWeight: 700 },
      sectionTitle: { fontSize: "20px", fontWeight: 700 },
      kpiValue: { fontFamily: "mono", fontSize: "24px", fontWeight: 700 },
      tableHeader: { fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" },
      tableCell: { fontSize: "14px", fontWeight: 500 },
      formLabel: { fontSize: "12px", fontWeight: 600 },
      helperText: { fontSize: "12px", fontWeight: 400 },
      monoCurrency: { fontFamily: "mono", fontSize: "14px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }
    }
  },
  spacing: { 0: "0px", 1: "4px", 2: "8px", 3: "12px", 4: "16px", 5: "20px", 6: "24px", 8: "32px", 10: "40px", 12: "48px" },
  radius: { sm: "6px", md: "10px", lg: "14px", xl: "20px" },
  shadow: { sm: "0 1px 2px rgba(0,0,0,0.05)", md: "0 4px 12px rgba(15,23,42,0.08)", lg: "0 12px 24px rgba(15,23,42,0.12)" },
  zIndex: { base: 0, dropdown: 10, sticky: 20, modal: 30, tooltip: 40 },
  density: {
    compact: { tableRowHeight: "36px", fieldHeight: "36px" },
    comfortable: { tableRowHeight: "44px", fieldHeight: "44px" }
  },
  table: {
    cellPaddingX: "12px", cellPaddingYCompact: "8px", cellPaddingYComfortable: "12px",
    headerBackground: "#F8FAFC", rowHoverBackground: "#EEF2FF", rowSelectedBackground: "#E0E7FF", gridBorder: "#E2E8F0"
  },
  form: {
    fieldHeight: { compact: "36px", comfortable: "44px" },
    fieldPaddingX: "12px", fieldRadius: "10px",
    placeholderText: "#94A3B8", helperText: "#94A3B8", errorText: "#F43F5E", errorBorder: "#F43F5E"
  }
};

// ============= HELPER COMPONENTS =============

/** Color Swatch Component */
const ColorSwatch = ({ name, value, description, isDark = false }: { 
  name: string; value: string; description: string; isDark?: boolean;
}) => (
  <div className="fpsg-color-swatch">
    <div 
      className="h-16 flex items-end p-3"
      style={{ backgroundColor: value }}
    >
      <span 
        className="text-xs fpsg-font-mono font-semibold"
        style={{ color: isDark ? '#FFFFFF' : '#475569' }}
      >
        {value}
      </span>
    </div>
    <div className="p-3" style={{ background: '#FFFFFF' }}>
      <p className="font-semibold text-sm" style={{ color: '#0F172A' }}>{name}</p>
      <p className="text-xs" style={{ color: '#94A3B8' }}>{description}</p>
    </div>
  </div>
);

/** Typography Sample Component */
const TypographySample = ({ label, size, lineHeight, children }: {
  label: string; size: string; lineHeight?: string; children: React.ReactNode;
}) => (
  <div className="flex items-baseline gap-4 py-2 border-b last:border-0" style={{ borderColor: '#E2E8F0' }}>
    <span className="text-xs fpsg-font-mono w-12 shrink-0" style={{ color: '#94A3B8' }}>{label}</span>
    <span className="text-xs fpsg-font-mono w-14 shrink-0" style={{ color: '#94A3B8' }}>{size}</span>
    <span style={{ color: '#0F172A', fontSize: size, lineHeight: lineHeight || '1.5' }}>{children}</span>
  </div>
);

/** Spacing Block Component */
const SpacingBlock = ({ value, label }: { value: string; label: string }) => (
  <div className="flex items-center gap-3">
    <div 
      className="rounded"
      style={{ 
        width: value, 
        height: value, 
        minWidth: value, 
        background: '#6366F1' 
      }}
    />
    <div>
      <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>{label}</span>
      <span className="text-xs fpsg-font-mono ml-2" style={{ color: '#94A3B8' }}>{value}</span>
    </div>
  </div>
);

/** Radius Demo Component */
const RadiusDemo = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center">
    <div 
      className="w-14 h-14 mx-auto mb-2"
      style={{ 
        borderRadius: value,
        background: '#E0E7FF',
        border: '2px solid #6366F1'
      }}
    />
    <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>{label}</p>
    <p className="text-[10px] fpsg-font-mono" style={{ color: '#94A3B8' }}>{value}</p>
  </div>
);

/** Shadow Demo Component */
const ShadowDemo = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center">
    <div 
      className="w-16 h-16 mx-auto mb-2"
      style={{ 
        boxShadow: value, 
        borderRadius: '10px',
        background: '#FFFFFF'
      }}
    />
    <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>{label}</p>
  </div>
);

/** Navigation Item Component */
const NavItem = ({ icon, label, active = false, badge }: { 
  icon: React.ReactNode; label: string; active?: boolean; badge?: string;
}) => (
  <div className={`fpsg-sidebar-item ${active ? 'active' : ''}`}>
    {icon}
    <span className="text-sm flex-1">{label}</span>
    {badge && (
      <span 
        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: '#6366F1', color: '#FFFFFF' }}
      >
        {badge}
      </span>
    )}
  </div>
);

/** KPI Card Component */
const KPICard = ({ title, value, trend, trendLabel, icon, accentColor = '#6366F1' }: {
  title: string; value: string; trend?: string; trendLabel?: string; 
  icon?: React.ReactNode; accentColor?: string;
}) => {
  const isPositive = trend?.startsWith('+');
  return (
    <div className="fpsg-card p-5" style={{ borderLeft: `4px solid ${accentColor}` }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="fpsg-subsection-title mb-1">{title}</p>
          <p className="text-2xl fpsg-font-mono font-bold" style={{ color: '#0F172A' }}>{value}</p>
        </div>
        {icon && (
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${accentColor}20` }}
          >
            <span style={{ color: accentColor }}>{icon}</span>
          </div>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: '#E2E8F0' }}>
          <span 
            className="text-xs font-semibold flex items-center gap-1"
            style={{ color: isPositive ? '#34D399' : '#F43F5E' }}
          >
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
          {trendLabel && <span className="text-xs" style={{ color: '#94A3B8' }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
};

// ============= TABLE OF CONTENTS =============
const tableOfContents = [
  { id: 'colors', label: '1. Culori Brand', icon: <div className="w-3 h-3 rounded-full" style={{ background: '#6366F1' }} /> },
  { id: 'semantic', label: '2. Semantic & Alert', icon: <AlertCircle className="w-4 h-4" /> },
  { id: 'state-focus', label: '3. State & Focus', icon: <Target className="w-4 h-4" /> },
  { id: 'charts', label: '4. Charts', icon: <PieChart className="w-4 h-4" /> },
  { id: 'typography', label: '5. Tipografie', icon: <FileText className="w-4 h-4" /> },
  { id: 'typography-roles', label: '6. Typography Roles', icon: <Code className="w-4 h-4" /> },
  { id: 'spacing', label: '7. Spacing & Radius', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'density', label: '8. Density & Table', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'buttons', label: '9. Butoane', icon: <div className="w-4 h-4 rounded-full" style={{ background: '#0F172A' }} /> },
  { id: 'forms', label: '10. Formulare', icon: <Edit className="w-4 h-4" /> },
  { id: 'cards', label: '11. Carduri', icon: <Folder className="w-4 h-4" /> },
  { id: 'badges', label: '12. Badges', icon: <Star className="w-4 h-4" /> },
  { id: 'tables', label: '13. Tabele Demo', icon: <Menu className="w-4 h-4" /> },
  { id: 'navigation', label: '14. Navigație', icon: <Home className="w-4 h-4" /> },
  { id: 'alerts', label: '15. Alerte Demo', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'modals', label: '16. Modale', icon: <ExternalLink className="w-4 h-4" /> },
  { id: 'avatars', label: '17. Avatare', icon: <User className="w-4 h-4" /> },
  { id: 'loading', label: '18. Loading', icon: <RefreshCw className="w-4 h-4" /> },
  { id: 'empty', label: '19. Empty States', icon: <Search className="w-4 h-4" /> },
  { id: 'misc', label: '20. Extra', icon: <Zap className="w-4 h-4" /> },
];

// ============= MAIN STYLE GUIDE COMPONENT =============
export const NewaStyleGuide = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      {/* Inject scoped styles */}
      <style>{scopedStyles}</style>

      <div className="fpsg-page">
        {/* ========== HEADER ========== */}
        <header className="fpsg-header">
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 32px' }}>
            <div className="h-16 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 flex items-center justify-center"
                  style={{ background: '#0F172A', borderRadius: '10px' }}
                >
                  <Shield className="w-5 h-5" style={{ color: '#FFFFFF' }} />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight" style={{ color: '#0F172A' }}>
                    FP&A Design System
                  </h1>
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#94A3B8' }}>
                    v2.0.0 • newa_design-tokens.jsonc
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Bell className="w-5 h-5" style={{ color: '#94A3B8' }} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Notificări</TooltipContent>
                </Tooltip>
                
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" /> Export
                </Button>
                
                <Avatar className="w-8 h-8">
                  <AvatarFallback style={{ background: '#E0E7FF', color: '#6366F1' }}>FG</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* ========== MAIN CONTENT ========== */}
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>
          <div className="grid grid-cols-12 gap-8">
            
            {/* ========== SIDEBAR / TOC ========== */}
            <aside className="col-span-3 hidden lg:block">
              <div className="sticky top-24">
                <div className="fpsg-card p-4">
                  <p className="fpsg-subsection-title">Cuprins</p>
                  <nav className="space-y-1">
                    {tableOfContents.map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        className="fpsg-sidebar-item text-sm"
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </a>
                    ))}
                  </nav>
                </div>
              </div>
            </aside>

            {/* ========== MAIN SECTIONS ========== */}
            <main className="col-span-12 lg:col-span-9 space-y-12">

              {/* ==================== SECTION 1: COLORS BRAND ==================== */}
              <section id="colors" className="fpsg-section">
                <h2 className="fpsg-section-title">1. Culori Brand & Surface</h2>
                <p className="fpsg-section-desc">Culorile de bază definite în design tokens pentru brand, surface și text.</p>
                
                <div className="fpsg-card p-6">
                  {/* Brand Colors */}
                  <p className="fpsg-subsection-title">Brand Colors</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <ColorSwatch name="Primary Dark" value="#0F172A" description="Fundal header/sidebar" isDark />
                    <ColorSwatch name="Accent Indigo" value="#6366F1" description="CTA-uri și focus" isDark />
                    <ColorSwatch name="Accent Emerald" value="#34D399" description="Pozitiv / Profit" isDark />
                    <ColorSwatch name="Danger Rose" value="#F43F5E" description="Negativ / Alertă" isDark />
                  </div>

                  {/* Surface Colors */}
                  <p className="fpsg-subsection-title">Surface Colors</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <ColorSwatch name="Surface Light" value="#FFFFFF" description="Carduri și zone" />
                    <ColorSwatch name="Surface Canvas" value="#F8FAFC" description="Fundal aplicație" />
                  </div>

                  {/* Text Colors */}
                  <p className="fpsg-subsection-title">Text Colors</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <ColorSwatch name="Text Primary" value="#0F172A" description="Text principal" isDark />
                    <ColorSwatch name="Text Secondary" value="#475569" description="Text secundar" isDark />
                    <ColorSwatch name="Text Muted" value="#94A3B8" description="Text atenuat" />
                    <ColorSwatch name="Text Inverse" value="#FFFFFF" description="Text pe fundal închis" />
                  </div>

                  {/* Border Colors */}
                  <p className="fpsg-subsection-title">Border Colors</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <ColorSwatch name="Border Default" value="#E2E8F0" description="Borduri standard" />
                    <ColorSwatch name="Border Focus" value="#6366F1" description="Focus state" isDark />
                  </div>

                  {/* Chart Palette */}
                  <p className="fpsg-subsection-title">Chart Palette (Data Visualization)</p>
                  <div className="flex gap-2">
                    {[
                      { color: '#6366F1', label: '1', desc: 'Indigo-500' },
                      { color: '#818CF8', label: '2', desc: 'Indigo-400' },
                      { color: '#A5B4FC', label: '3', desc: 'Indigo-300' },
                      { color: '#C7D2FE', label: '4', desc: 'Indigo-200' },
                      { color: '#E0E7FF', label: '5', desc: 'Indigo-100' },
                    ].map((c, i) => (
                      <div 
                        key={i}
                        className="flex-1 h-16 flex items-center justify-center"
                        style={{ background: c.color, borderRadius: '10px' }}
                      >
                        <span 
                          className="text-xs font-bold"
                          style={{ color: i < 2 ? '#FFFFFF' : '#475569' }}
                        >
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {['Indigo-500', 'Indigo-400', 'Indigo-300', 'Indigo-200', 'Indigo-100'].map((desc, i) => (
                      <div key={i} className="flex-1 text-center">
                        <span className="text-[10px]" style={{ color: '#94A3B8' }}>{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 2: SEMANTIC & ALERT COLORS ==================== */}
              <section id="semantic" className="fpsg-section">
                <h2 className="fpsg-section-title">2. Culori Semantice & Alert</h2>
                <p className="fpsg-section-desc">Culorile pentru stări semantice (success, warning, info, danger) și backgrounds pentru alerte.</p>
                
                <div className="fpsg-card p-6">
                  <p className="fpsg-subsection-title">Semantic Colors</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <ColorSwatch name="Success" value="#34D399" description="Succes / pozitiv / profit" isDark />
                    <ColorSwatch name="Warning" value="#F59E0B" description="Atenție / pending" isDark />
                    <ColorSwatch name="Info" value="#3B82F6" description="Informare / neutru" isDark />
                    <ColorSwatch name="Danger" value="#F43F5E" description="Eroare / negativ" isDark />
                  </div>

                  <p className="fpsg-subsection-title">Alert Backgrounds</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <ColorSwatch name="Success Bg" value="#ECFDF5" description="Fundal alert success" />
                    <ColorSwatch name="Warning Bg" value="#FFFBEB" description="Fundal alert warning" />
                    <ColorSwatch name="Info Bg" value="#EFF6FF" description="Fundal alert info" />
                    <ColorSwatch name="Danger Bg" value="#FFF1F2" description="Fundal alert danger" />
                  </div>

                  <p className="fpsg-subsection-title">Alert Demos</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border-l-4" style={{ background: '#ECFDF5', borderColor: '#34D399' }}>
                      <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: '#065F46' }}>
                        <CheckCircle className="w-4 h-4" style={{ color: '#34D399' }} /> Success Alert
                      </div>
                      <p className="text-sm mt-1" style={{ color: '#047857' }}>Operațiunea a fost finalizată cu succes.</p>
                    </div>
                    <div className="p-4 rounded-lg border-l-4" style={{ background: '#FFFBEB', borderColor: '#F59E0B' }}>
                      <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: '#92400E' }}>
                        <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} /> Warning Alert
                      </div>
                      <p className="text-sm mt-1" style={{ color: '#B45309' }}>Verifică datele înainte de continuare.</p>
                    </div>
                    <div className="p-4 rounded-lg border-l-4" style={{ background: '#EFF6FF', borderColor: '#3B82F6' }}>
                      <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: '#1E40AF' }}>
                        <Info className="w-4 h-4" style={{ color: '#3B82F6' }} /> Info Alert
                      </div>
                      <p className="text-sm mt-1" style={{ color: '#1D4ED8' }}>Raportul va fi disponibil în câteva minute.</p>
                    </div>
                    <div className="p-4 rounded-lg border-l-4" style={{ background: '#FFF1F2', borderColor: '#F43F5E' }}>
                      <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: '#9F1239' }}>
                        <XCircle className="w-4 h-4" style={{ color: '#F43F5E' }} /> Danger Alert
                      </div>
                      <p className="text-sm mt-1" style={{ color: '#BE123C' }}>Eroare la procesarea fișierului.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 3: STATE & FOCUS ==================== */}
              <section id="state-focus" className="fpsg-section">
                <h2 className="fpsg-section-title">3. State & Focus</h2>
                <p className="fpsg-section-desc">Overlay-uri pentru hover, active, selected și tokens pentru focus ring și disabled states.</p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="fpsg-card p-6">
                    <p className="fpsg-subsection-title">State Overlays</p>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg border relative" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
                          <div className="absolute inset-0 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)' }} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: '#0F172A' }}>Hover Overlay</p>
                          <p className="text-xs fpsg-font-mono" style={{ color: '#94A3B8' }}>rgba(99,102,241,0.08)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg border relative" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
                          <div className="absolute inset-0 rounded-lg" style={{ background: 'rgba(99,102,241,0.14)' }} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: '#0F172A' }}>Active Overlay</p>
                          <p className="text-xs fpsg-font-mono" style={{ color: '#94A3B8' }}>rgba(99,102,241,0.14)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg border relative" style={{ background: '#FFFFFF', borderColor: '#E2E8F0' }}>
                          <div className="absolute inset-0 rounded-lg" style={{ background: 'rgba(99,102,241,0.10)' }} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: '#0F172A' }}>Selected Overlay</p>
                          <p className="text-xs fpsg-font-mono" style={{ color: '#94A3B8' }}>rgba(99,102,241,0.10)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="fpsg-card p-6">
                    <p className="fpsg-subsection-title">Focus Ring</p>
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-16 h-10 rounded-lg"
                          style={{ 
                            background: '#FFFFFF', 
                            border: '1px solid #E2E8F0',
                            outline: '2px solid #6366F1',
                            outlineOffset: '2px'
                          }} 
                        />
                        <div>
                          <p className="font-semibold text-sm" style={{ color: '#0F172A' }}>Focus State</p>
                          <p className="text-xs fpsg-font-mono" style={{ color: '#94A3B8' }}>ring: #6366F1 / 2px / offset 2px</p>
                        </div>
                      </div>
                    </div>

                    <p className="fpsg-subsection-title">Disabled State</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <Button disabled>Disabled Button</Button>
                        <p className="text-xs fpsg-font-mono" style={{ color: '#94A3B8' }}>opacity: 0.45</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Input disabled placeholder="Disabled input" className="max-w-[200px]" />
                      </div>
                    </div>

                    <p className="fpsg-subsection-title mt-6">Selection</p>
                    <div className="flex items-center gap-4">
                      <div 
                        className="px-4 py-2 rounded-lg border-2 text-sm font-medium"
                        style={{ background: '#E0E7FF', borderColor: '#6366F1', color: '#0F172A' }}
                      >
                        Selected Item
                      </div>
                      <p className="text-xs fpsg-font-mono" style={{ color: '#94A3B8' }}>bg: #E0E7FF / border: #6366F1</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 4: CHART COLORS ==================== */}
              <section id="charts" className="fpsg-section">
                <h2 className="fpsg-section-title">4. Chart Colors</h2>
                <p className="fpsg-section-desc">Palette de culori pentru grafice: indigo gradient, semantic (positive/negative/neutral), și categorical (8 culori distincte).</p>
                
                <div className="fpsg-card p-6">
                  <p className="fpsg-subsection-title">Indigo Gradient (Rampă)</p>
                  <div className="flex gap-2 mb-2">
                    {[
                      { color: '#6366F1', label: '1' },
                      { color: '#818CF8', label: '2' },
                      { color: '#A5B4FC', label: '3' },
                      { color: '#C7D2FE', label: '4' },
                      { color: '#E0E7FF', label: '5' },
                    ].map((c, i) => (
                      <div 
                        key={i}
                        className="flex-1 h-16 flex items-center justify-center"
                        style={{ background: c.color, borderRadius: '10px' }}
                      >
                        <span className="text-xs font-bold" style={{ color: i < 2 ? '#FFFFFF' : '#475569' }}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-center mb-8" style={{ color: '#94A3B8' }}>Utilizat pentru heatmaps, gradient charts</p>

                  <p className="fpsg-subsection-title">Semantic (Profit/Loss/Neutral)</p>
                  <div className="flex gap-4 mb-8">
                    <div className="flex-1 text-center">
                      <div className="h-16 flex items-center justify-center rounded-lg mb-2" style={{ background: '#34D399' }}>
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>Positive</p>
                      <p className="text-[10px] fpsg-font-mono" style={{ color: '#94A3B8' }}>#34D399</p>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="h-16 flex items-center justify-center rounded-lg mb-2" style={{ background: '#F43F5E' }}>
                        <TrendingDown className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>Negative</p>
                      <p className="text-[10px] fpsg-font-mono" style={{ color: '#94A3B8' }}>#F43F5E</p>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="h-16 flex items-center justify-center rounded-lg mb-2" style={{ background: '#94A3B8' }}>
                        <Minus className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>Neutral</p>
                      <p className="text-[10px] fpsg-font-mono" style={{ color: '#94A3B8' }}>#94A3B8</p>
                    </div>
                  </div>

                  <p className="fpsg-subsection-title">Categorical (8 culori distincte)</p>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                    {[
                      { color: '#6366F1', name: 'Indigo' },
                      { color: '#34D399', name: 'Emerald' },
                      { color: '#F59E0B', name: 'Amber' },
                      { color: '#3B82F6', name: 'Blue' },
                      { color: '#F43F5E', name: 'Rose' },
                      { color: '#14B8A6', name: 'Teal' },
                      { color: '#A855F7', name: 'Purple' },
                      { color: '#64748B', name: 'Slate' },
                    ].map((c, i) => (
                      <div key={i} className="text-center">
                        <div className="h-12 rounded-lg mb-1" style={{ background: c.color }} />
                        <p className="text-[10px] font-semibold" style={{ color: '#0F172A' }}>{i + 1}</p>
                        <p className="text-[9px]" style={{ color: '#94A3B8' }}>{c.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 5: TYPOGRAPHY ==================== */}
              <section id="typography" className="fpsg-section">
                <h2 className="fpsg-section-title">5. Tipografie</h2>
                <p className="fpsg-section-desc">Familii de fonturi, dimensiuni, weights și line-heights.</p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="fpsg-card p-6">
                    <p className="fpsg-subsection-title">Font Families</p>
                    <div className="space-y-6">
                      <div>
                        <p className="text-xs mb-2" style={{ color: '#94A3B8' }}>Editorial (Playfair Display)</p>
                        <p className="text-2xl fpsg-font-editorial" style={{ color: '#0F172A' }}>
                          Premium Experience for Users
                        </p>
                        <p className="text-sm mt-1" style={{ color: '#475569' }}>
                          Utilizat pentru landing pages, empty states, headlines
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs mb-2" style={{ color: '#94A3B8' }}>Application (Inter)</p>
                        <p className="text-2xl" style={{ color: '#0F172A' }}>
                          Dashboard & Functional UI
                        </p>
                        <p className="text-sm mt-1" style={{ color: '#475569' }}>
                          Interfață aplicație, dashboard, UI funcțional
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-xs mb-2" style={{ color: '#94A3B8' }}>Mono (JetBrains Mono)</p>
                        <p className="text-2xl fpsg-font-mono" style={{ color: '#0F172A' }}>
                          12.450,00 RON
                        </p>
                        <p className="text-sm mt-1" style={{ color: '#475569' }}>
                          Valori monetare și coduri
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="fpsg-card p-6">
                    <p className="fpsg-subsection-title">Font Sizes</p>
                    <div className="space-y-0">
                      <TypographySample label="4xl" size="36px" lineHeight="1.25">Display</TypographySample>
                      <TypographySample label="3xl" size="30px" lineHeight="1.25">Heading 1</TypographySample>
                      <TypographySample label="2xl" size="24px" lineHeight="1.25">Heading 2</TypographySample>
                      <TypographySample label="xl" size="20px">Heading 3</TypographySample>
                      <TypographySample label="lg" size="18px">Large Text</TypographySample>
                      <TypographySample label="base" size="16px">Body Text</TypographySample>
                      <TypographySample label="sm" size="14px">Small Text</TypographySample>
                      <TypographySample label="xs" size="12px">Caption</TypographySample>
                    </div>
                  </div>
                </div>

                {/* Font Weights & Line Heights */}
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <div className="fpsg-card p-6">
                    <p className="fpsg-subsection-title">Font Weights</p>
                    <div className="space-y-3">
                      <p style={{ fontWeight: 400, color: '#0F172A' }}>Regular (400) - Body text</p>
                      <p style={{ fontWeight: 500, color: '#0F172A' }}>Medium (500) - Emphasis</p>
                      <p style={{ fontWeight: 600, color: '#0F172A' }}>Semibold (600) - Subheadings</p>
                      <p style={{ fontWeight: 700, color: '#0F172A' }}>Bold (700) - Headlines</p>
                    </div>
                  </div>

                  <div className="fpsg-card p-6">
                    <p className="fpsg-subsection-title">Line Heights</p>
                    <div className="space-y-4">
                      <div className="p-3 rounded" style={{ background: '#F8FAFC' }}>
                        <p className="text-xs fpsg-font-mono mb-1" style={{ color: '#94A3B8' }}>tight: 1.25</p>
                        <p style={{ lineHeight: 1.25, color: '#0F172A' }}>Pentru headlines și titluri care necesită mai puțin spațiu vertical.</p>
                      </div>
                      <div className="p-3 rounded" style={{ background: '#F8FAFC' }}>
                        <p className="text-xs fpsg-font-mono mb-1" style={{ color: '#94A3B8' }}>normal: 1.5</p>
                        <p style={{ lineHeight: 1.5, color: '#0F172A' }}>Standard pentru body text și conținut general al aplicației.</p>
                      </div>
                      <div className="p-3 rounded" style={{ background: '#F8FAFC' }}>
                        <p className="text-xs fpsg-font-mono mb-1" style={{ color: '#94A3B8' }}>relaxed: 1.75</p>
                        <p style={{ lineHeight: 1.75, color: '#0F172A' }}>Pentru paragrafe lungi și conținut editorial care necesită mai mult spațiu.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 6: TYPOGRAPHY ROLES ==================== */}
              <section id="typography-roles" className="fpsg-section">
                <h2 className="fpsg-section-title">6. Typography Roles</h2>
                <p className="fpsg-section-desc">Combinații predefinite de font-family, size și weight pentru roluri specifice în UI.</p>
                
                <div className="fpsg-card p-6">
                  <div className="space-y-6">
                    {/* Page Title */}
                    <div className="p-4 rounded-lg" style={{ background: '#F8FAFC' }}>
                      <p className="text-xs fpsg-font-mono mb-2" style={{ color: '#94A3B8' }}>pageTitle: Inter / 24px / Bold</p>
                      <p style={{ fontFamily: 'Inter, system-ui', fontSize: '24px', fontWeight: 700, lineHeight: 1.25, color: '#0F172A' }}>
                        Page Title Example
                      </p>
                    </div>

                    {/* Section Title */}
                    <div className="p-4 rounded-lg" style={{ background: '#F8FAFC' }}>
                      <p className="text-xs fpsg-font-mono mb-2" style={{ color: '#94A3B8' }}>sectionTitle: Inter / 20px / Bold</p>
                      <p style={{ fontFamily: 'Inter, system-ui', fontSize: '20px', fontWeight: 700, lineHeight: 1.25, color: '#0F172A' }}>
                        Section Title Example
                      </p>
                    </div>

                    {/* KPI Value */}
                    <div className="p-4 rounded-lg" style={{ background: '#F8FAFC' }}>
                      <p className="text-xs fpsg-font-mono mb-2" style={{ color: '#94A3B8' }}>kpiValue: JetBrains Mono / 24px / Bold</p>
                      <p className="fpsg-font-mono" style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.25, color: '#0F172A' }}>
                        €124,500.00
                      </p>
                    </div>

                    {/* Table Header */}
                    <div className="p-4 rounded-lg" style={{ background: '#F8FAFC' }}>
                      <p className="text-xs fpsg-font-mono mb-2" style={{ color: '#94A3B8' }}>tableHeader: Inter / 12px / Semibold / Uppercase / 0.05em spacing</p>
                      <p style={{ fontFamily: 'Inter, system-ui', fontSize: '12px', fontWeight: 600, lineHeight: 1.25, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#0F172A' }}>
                        Table Column Header
                      </p>
                    </div>

                    {/* Table Cell */}
                    <div className="p-4 rounded-lg" style={{ background: '#F8FAFC' }}>
                      <p className="text-xs fpsg-font-mono mb-2" style={{ color: '#94A3B8' }}>tableCell: Inter / 14px / Medium</p>
                      <p style={{ fontFamily: 'Inter, system-ui', fontSize: '14px', fontWeight: 500, lineHeight: 1.5, color: '#0F172A' }}>
                        Table cell content value
                      </p>
                    </div>

                    {/* Form Label */}
                    <div className="p-4 rounded-lg" style={{ background: '#F8FAFC' }}>
                      <p className="text-xs fpsg-font-mono mb-2" style={{ color: '#94A3B8' }}>formLabel: Inter / 12px / Semibold</p>
                      <p style={{ fontFamily: 'Inter, system-ui', fontSize: '12px', fontWeight: 600, lineHeight: 1.25, color: '#0F172A' }}>
                        Form Field Label
                      </p>
                    </div>

                    {/* Helper Text */}
                    <div className="p-4 rounded-lg" style={{ background: '#F8FAFC' }}>
                      <p className="text-xs fpsg-font-mono mb-2" style={{ color: '#94A3B8' }}>helperText: Inter / 12px / Regular</p>
                      <p style={{ fontFamily: 'Inter, system-ui', fontSize: '12px', fontWeight: 400, lineHeight: 1.5, color: '#94A3B8' }}>
                        Helper text providing additional context for the field above.
                      </p>
                    </div>

                    {/* Mono Currency */}
                    <div className="p-4 rounded-lg" style={{ background: '#F8FAFC' }}>
                      <p className="text-xs fpsg-font-mono mb-2" style={{ color: '#94A3B8' }}>monoCurrency: JetBrains Mono / 14px / Semibold / tabular-nums</p>
                      <div className="flex gap-8">
                        <span className="fpsg-font-mono" style={{ fontSize: '14px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#0F172A' }}>1,234.56</span>
                        <span className="fpsg-font-mono" style={{ fontSize: '14px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#0F172A' }}>12,345.67</span>
                        <span className="fpsg-font-mono" style={{ fontSize: '14px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: '#0F172A' }}>123.45</span>
                      </div>
                      <p className="text-[10px] mt-2" style={{ color: '#94A3B8' }}>tabular-nums asigură alinierea verticală a cifrelor</p>
                    </div>

                    {/* Empty Title */}
                    <div className="p-4 rounded-lg" style={{ background: '#F8FAFC' }}>
                      <p className="text-xs fpsg-font-mono mb-2" style={{ color: '#94A3B8' }}>emptyTitle: Playfair Display / 20px / Semibold</p>
                      <p className="fpsg-font-editorial" style={{ fontSize: '20px', fontWeight: 600, lineHeight: 1.25, color: '#0F172A' }}>
                        No Data Available Yet
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 7: SPACING & RADIUS ==================== */}
              <section id="spacing" className="fpsg-section">
                <h2 className="fpsg-section-title">7. Spacing & Border Radius</h2>
                <p className="fpsg-section-desc">Tokens pentru spacing, radius și shadows.</p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="fpsg-card p-6">
                    <p className="fpsg-subsection-title">Spacing Scale</p>
                    <div className="space-y-3">
                      <SpacingBlock value="4px" label="spacing-1" />
                      <SpacingBlock value="8px" label="spacing-2" />
                      <SpacingBlock value="12px" label="spacing-3" />
                      <SpacingBlock value="16px" label="spacing-4" />
                      <SpacingBlock value="20px" label="spacing-5" />
                      <SpacingBlock value="24px" label="spacing-6" />
                      <SpacingBlock value="32px" label="spacing-8" />
                      <SpacingBlock value="40px" label="spacing-10" />
                      <SpacingBlock value="48px" label="spacing-12" />
                    </div>
                  </div>

                  <div className="fpsg-card p-6">
                    <p className="fpsg-subsection-title">Border Radius</p>
                    <div className="grid grid-cols-4 gap-4 mb-8">
                      <RadiusDemo label="sm" value="6px" />
                      <RadiusDemo label="md" value="10px" />
                      <RadiusDemo label="lg" value="14px" />
                      <RadiusDemo label="xl" value="20px" />
                    </div>
                    
                    <p className="fpsg-subsection-title">Shadows</p>
                    <div 
                      className="grid grid-cols-3 gap-6 p-6 rounded-lg"
                      style={{ background: '#F8FAFC' }}
                    >
                      <ShadowDemo label="shadow-sm" value="0 1px 2px rgba(0,0,0,0.05)" />
                      <ShadowDemo label="shadow-md" value="0 4px 12px rgba(15,23,42,0.08)" />
                      <ShadowDemo label="shadow-lg" value="0 12px 24px rgba(15,23,42,0.12)" />
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 8: DENSITY & TABLE TOKENS ==================== */}
              <section id="density" className="fpsg-section">
                <h2 className="fpsg-section-title">8. Density & Table/Form Tokens</h2>
                <p className="fpsg-section-desc">Tokens pentru moduri de densitate (compact/comfortable) și tokens specifice pentru tabele și formulare.</p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Density Modes */}
                  <div className="fpsg-card p-6">
                    <p className="fpsg-subsection-title">Density Modes</p>
                    
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border" style={{ borderColor: '#E2E8F0' }}>
                        <p className="text-xs font-semibold mb-3" style={{ color: '#6366F1' }}>COMPACT</p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span style={{ color: '#475569' }}>Table Row Height</span>
                            <span className="fpsg-font-mono font-semibold">36px</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span style={{ color: '#475569' }}>Field Height</span>
                            <span className="fpsg-font-mono font-semibold">36px</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span style={{ color: '#475569' }}>Cell Padding Y</span>
                            <span className="fpsg-font-mono font-semibold">8px</span>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex-1 h-9 rounded flex items-center justify-center text-xs" 
                              style={{ background: '#E0E7FF', color: '#6366F1' }}>
                              {i}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-lg border-2" style={{ borderColor: '#6366F1' }}>
                        <p className="text-xs font-semibold mb-3" style={{ color: '#6366F1' }}>COMFORTABLE (Default)</p>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span style={{ color: '#475569' }}>Table Row Height</span>
                            <span className="fpsg-font-mono font-semibold">44px</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span style={{ color: '#475569' }}>Field Height</span>
                            <span className="fpsg-font-mono font-semibold">44px</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span style={{ color: '#475569' }}>Cell Padding Y</span>
                            <span className="fpsg-font-mono font-semibold">12px</span>
                          </div>
                        </div>
                        <div className="mt-4 flex gap-3">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex-1 h-11 rounded-lg flex items-center justify-center text-sm font-medium" 
                              style={{ background: '#E0E7FF', color: '#6366F1' }}>
                              {i}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table & Form Tokens */}
                  <div className="fpsg-card p-6">
                    <p className="fpsg-subsection-title">Table Tokens</p>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-10 rounded" style={{ background: '#F8FAFC' }} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Header Background</p>
                          <p className="text-xs fpsg-font-mono" style={{ color: '#94A3B8' }}>#F8FAFC</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-10 rounded" style={{ background: '#EEF2FF' }} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Row Hover</p>
                          <p className="text-xs fpsg-font-mono" style={{ color: '#94A3B8' }}>#EEF2FF</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-10 rounded" style={{ background: '#E0E7FF' }} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Row Selected</p>
                          <p className="text-xs fpsg-font-mono" style={{ color: '#94A3B8' }}>#E0E7FF</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-10 rounded border-2" style={{ borderColor: '#E2E8F0' }} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>Grid Border</p>
                          <p className="text-xs fpsg-font-mono" style={{ color: '#94A3B8' }}>#E2E8F0</p>
                        </div>
                      </div>
                    </div>

                    <p className="fpsg-subsection-title">Form Tokens</p>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#475569' }}>Field Padding X</span>
                        <span className="fpsg-font-mono font-semibold">12px</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#475569' }}>Field Radius</span>
                        <span className="fpsg-font-mono font-semibold">10px</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: '#475569' }}>Placeholder Text</span>
                        <span className="fpsg-font-mono" style={{ color: '#94A3B8' }}>#94A3B8</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: '#475569' }}>Error Text/Border</span>
                        <span className="fpsg-font-mono" style={{ color: '#F43F5E' }}>#F43F5E</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 9: BUTTONS ==================== */}
              <section id="buttons" className="fpsg-section">
                <h2 className="fpsg-section-title">9. Butoane</h2>
                <p className="fpsg-section-desc">Toate variantele și dimensiunile de butoane.</p>
                
                <div className="fpsg-card p-6">
                  <p className="fpsg-subsection-title">Variante</p>
                  <div className="flex flex-wrap gap-3 mb-8">
                    <Button>Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button disabled>Disabled</Button>
                  </div>

                  <p className="fpsg-subsection-title">Dimensiuni</p>
                  <div className="flex flex-wrap items-center gap-3 mb-8">
                    <Button size="sm">Small</Button>
                    <Button>Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon"><Plus className="w-4 h-4" /></Button>
                  </div>

                  <p className="fpsg-subsection-title">Cu Iconițe</p>
                  <div className="flex flex-wrap gap-3 mb-8">
                    <Button className="gap-2">
                      <Download className="w-4 h-4" /> Download
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <Upload className="w-4 h-4" /> Upload
                    </Button>
                    <Button variant="ghost" className="gap-2">
                      <RefreshCw className="w-4 h-4" /> Refresh
                    </Button>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="w-4 h-4" /> Delete
                    </Button>
                  </div>

                  <p className="fpsg-subsection-title">Loading States</p>
                  <div className="flex flex-wrap gap-3">
                    <Button disabled className="gap-2">
                      <Loader2 className="w-4 h-4 fpsg-animate-spin" /> Processing...
                    </Button>
                    <Button disabled variant="outline" className="gap-2">
                      <Loader2 className="w-4 h-4 fpsg-animate-spin" /> Loading...
                    </Button>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 10: FORMS ==================== */}
              <section id="forms" className="fpsg-section">
                <h2 className="fpsg-section-title">10. Elemente de Formular</h2>
                <p className="fpsg-section-desc">Input-uri, select-uri, checkbox-uri și controale.</p>
                
                <div className="fpsg-card p-6">
                  <div className="grid md:grid-cols-3 gap-8">
                    {/* Text Inputs */}
                    <div className="space-y-4">
                      <p className="fpsg-subsection-title">Text Inputs</p>
                      
                      <div className="space-y-2">
                        <Label>Standard Input</Label>
                        <Input placeholder="Enter text..." />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>With Icon</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
                          <Input placeholder="email@company.com" className="pl-10" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="••••••••" 
                            className="pl-10 pr-10" 
                          />
                          <button 
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            style={{ color: '#94A3B8' }}
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label style={{ color: '#F43F5E' }}>With Error</Label>
                        <Input placeholder="Invalid" style={{ borderColor: '#F43F5E' }} />
                        <p className="text-xs" style={{ color: '#F43F5E' }}>This field is required</p>
                      </div>
                    </div>

                    {/* Select & Textarea */}
                    <div className="space-y-4">
                      <p className="fpsg-subsection-title">Select & Textarea</p>
                      
                      <div className="space-y-2">
                        <Label>Select</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select option..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="opt1">Option 1</SelectItem>
                            <SelectItem value="opt2">Option 2</SelectItem>
                            <SelectItem value="opt3">Option 3</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Textarea</Label>
                        <Textarea placeholder="Enter description..." rows={3} />
                      </div>
                      
                      <p className="fpsg-subsection-title mt-6">Toggle</p>
                      <div 
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{ background: '#F8FAFC' }}
                      >
                        <Label>Notifications</Label>
                        <Switch />
                      </div>
                    </div>

                    {/* Checkbox, Radio, Slider */}
                    <div className="space-y-4">
                      <p className="fpsg-subsection-title">Checkbox & Radio</p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Checkbox id="c1" />
                          <Label htmlFor="c1">Option 1</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="c2" defaultChecked />
                          <Label htmlFor="c2">Option 2 (checked)</Label>
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <Label className="mb-3 block">Radio Group</Label>
                        <RadioGroup defaultValue="opt1">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="opt1" id="r1" />
                            <Label htmlFor="r1">Option A</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="opt2" id="r2" />
                            <Label htmlFor="r2">Option B</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      
                      <p className="fpsg-subsection-title mt-6">Slider</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span style={{ color: '#94A3B8' }}>Value</span>
                          <span className="font-semibold">{sliderValue[0]}%</span>
                        </div>
                        <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} />
                      </div>
                      
                      <p className="fpsg-subsection-title mt-6">Progress</p>
                      <Progress value={65} className="h-2" />
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 11: CARDS ==================== */}
              <section id="cards" className="fpsg-section">
                <h2 className="fpsg-section-title">11. Carduri</h2>
                <p className="fpsg-section-desc">Containere pentru gruparea conținutului.</p>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Card</CardTitle>
                      <CardDescription>Simple card component</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm" style={{ color: '#475569' }}>
                        Card content goes here. Standard container for content grouping.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" size="sm">Action</Button>
                    </CardFooter>
                  </Card>

                  <KPICard 
                    title="Total Revenue" 
                    value="€124,500"
                    trend="+12.5%" 
                    trendLabel="vs last month"
                    icon={<TrendingUp className="w-5 h-5" />}
                    accentColor="#34D399"
                  />

                  <KPICard 
                    title="Pending Tasks" 
                    value="23"
                    trend="-8.2%" 
                    trendLabel="vs last month"
                    icon={<AlertCircle className="w-5 h-5" />}
                    accentColor="#F43F5E"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  {/* Feature Card */}
                  <Card className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
                    <CardHeader>
                      <div 
                        className="w-12 h-12 flex items-center justify-center mb-3 transition-colors"
                        style={{ background: '#E0E7FF', borderRadius: '10px' }}
                      >
                        <Activity className="w-6 h-6" style={{ color: '#6366F1' }} />
                      </div>
                      <CardTitle>Real-Time Analytics</CardTitle>
                      <CardDescription>
                        Monitor data flows with intelligent alerts.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div 
                        className="flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all"
                        style={{ color: '#6366F1' }}
                      >
                        Learn more <ArrowRight className="w-4 h-4" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pricing Card */}
                  <Card className="relative overflow-hidden" style={{ border: '2px solid #6366F1' }}>
                    <div 
                      className="absolute top-0 right-0 text-xs font-bold px-3 py-1"
                      style={{ background: '#6366F1', color: '#FFFFFF', borderRadius: '0 0 0 10px' }}
                    >
                      POPULAR
                    </div>
                    <CardHeader>
                      <CardTitle>Pro Plan</CardTitle>
                      <CardDescription>For growing teams</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-3xl fpsg-font-mono font-bold" style={{ color: '#0F172A' }}>€49</span>
                        <span style={{ color: '#94A3B8' }}>/month</span>
                      </div>
                      <Separator className="my-4" />
                      <ul className="space-y-2 text-sm">
                        {['Unlimited users', 'Advanced reports', '24/7 support'].map((f, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" style={{ color: '#34D399' }} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Get Started</Button>
                    </CardFooter>
                  </Card>
                </div>
              </section>

              {/* ==================== SECTION 12: BADGES ==================== */}
              <section id="badges" className="fpsg-section">
                <h2 className="fpsg-section-title">12. Badges & Tags</h2>
                <p className="fpsg-section-desc">Status indicators și etichete.</p>
                
                <div className="fpsg-card p-6">
                  <p className="fpsg-subsection-title">Badge Variants</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                  </div>
                  
                  <p className="fpsg-subsection-title">Status Badges</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    <Badge style={{ background: '#34D399' }} className="gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Success
                    </Badge>
                    <Badge style={{ background: '#F59E0B' }} className="gap-1">
                      <Clock className="w-3 h-3" /> Pending
                    </Badge>
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" /> Failed
                    </Badge>
                    <Badge style={{ background: '#3B82F6' }} className="gap-1">
                      <Info className="w-3 h-3" /> Info
                    </Badge>
                  </div>
                  
                  <p className="fpsg-subsection-title">Notification Dots</p>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <Bell className="w-6 h-6" style={{ color: '#94A3B8' }} />
                      <span 
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] text-white flex items-center justify-center font-bold"
                        style={{ background: '#F43F5E' }}
                      >
                        3
                      </span>
                    </div>
                    <div className="relative">
                      <Mail className="w-6 h-6" style={{ color: '#94A3B8' }} />
                      <span 
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
                        style={{ background: '#34D399' }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 13: TABLES ==================== */}
              <section id="tables" className="fpsg-section">
                <h2 className="fpsg-section-title">13. Tabele Demo</h2>
                <p className="fpsg-section-desc">Afișarea datelor în format tabelar.</p>
                
                <div className="fpsg-card overflow-hidden">
                  <div 
                    className="flex justify-between items-center px-6 py-4 border-b"
                    style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}
                  >
                    <h4 className="font-semibold" style={{ color: '#0F172A' }}>Transactions</h4>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="w-4 h-4" /> Filter
                    </Button>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { name: "Orange Romania", cat: "Utilities", status: "Paid", val: "1,250.00" },
                        { name: "AWS", cat: "Cloud", status: "Pending", val: "4,450.20" },
                        { name: "Dedeman SRL", cat: "Investment", status: "Overdue", val: "12,000.00" },
                      ].map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{row.name}</TableCell>
                          <TableCell><Badge variant="outline">{row.cat}</Badge></TableCell>
                          <TableCell>
                            <div 
                              className="flex items-center gap-1.5 text-xs font-semibold"
                              style={{ 
                                color: row.status === 'Paid' ? '#34D399' : 
                                       row.status === 'Overdue' ? '#F43F5E' : '#F59E0B' 
                              }}
                            >
                              <div 
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ 
                                  background: row.status === 'Paid' ? '#34D399' : 
                                              row.status === 'Overdue' ? '#F43F5E' : '#F59E0B'
                                }}
                              />
                              {row.status}
                            </div>
                          </TableCell>
                          <TableCell className="text-right fpsg-font-mono font-semibold">€{row.val}</TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                                <DropdownMenuItem><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                                <DropdownMenuItem style={{ color: '#F43F5E' }}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div 
                    className="flex justify-between items-center px-6 py-4 border-t"
                    style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}
                  >
                    <p className="text-sm" style={{ color: '#94A3B8' }}>Showing 3 of 45 entries</p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled><ChevronLeft className="w-4 h-4" /></Button>
                      <Button variant="outline" size="sm" style={{ background: '#0F172A', color: '#FFFFFF' }}>1</Button>
                      <Button variant="outline" size="sm">2</Button>
                      <Button variant="outline" size="sm"><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 14: NAVIGATION ==================== */}
              <section id="navigation" className="fpsg-section">
                <h2 className="fpsg-section-title">14. Navigație</h2>
                <p className="fpsg-section-desc">Sidebar, tabs și breadcrumbs.</p>
                
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Sidebar */}
                  <div className="fpsg-card p-4">
                    <p className="fpsg-subsection-title">Sidebar Navigation</p>
                    <nav className="space-y-1">
                      <NavItem icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" active />
                      <NavItem icon={<TrendingUp className="w-4 h-4" />} label="Analytics" badge="New" />
                      <NavItem icon={<FileText className="w-4 h-4" />} label="Reports" />
                      <NavItem icon={<Settings className="w-4 h-4" />} label="Settings" />
                    </nav>
                  </div>

                  {/* Tabs */}
                  <div className="fpsg-card md:col-span-2 overflow-hidden">
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList 
                        className="w-full justify-start rounded-none border-b h-auto p-0"
                        style={{ background: '#F8FAFC' }}
                      >
                        <TabsTrigger 
                          value="overview" 
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent px-6 py-3"
                        >
                          Overview
                        </TabsTrigger>
                        <TabsTrigger 
                          value="analytics" 
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent px-6 py-3"
                        >
                          Analytics
                        </TabsTrigger>
                        <TabsTrigger 
                          value="settings" 
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent px-6 py-3"
                        >
                          Settings
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="overview" className="p-6">
                        <p style={{ color: '#475569' }}>Overview content here...</p>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>

                {/* Breadcrumbs & Accordion */}
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <div className="fpsg-card p-6">
                    <p className="fpsg-subsection-title">Breadcrumbs</p>
                    <div className="flex items-center gap-2 text-sm">
                      <a href="#" className="hover:underline" style={{ color: '#94A3B8' }}>
                        <Home className="w-4 h-4" />
                      </a>
                      <ChevronRight className="w-4 h-4" style={{ color: '#E2E8F0' }} />
                      <a href="#" className="hover:underline" style={{ color: '#94A3B8' }}>Dashboard</a>
                      <ChevronRight className="w-4 h-4" style={{ color: '#E2E8F0' }} />
                      <span className="font-medium" style={{ color: '#0F172A' }}>Reports</span>
                    </div>
                  </div>

                  <div className="fpsg-card p-6">
                    <p className="fpsg-subsection-title">Accordion</p>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="item-1">
                        <AccordionTrigger>How do I upload data?</AccordionTrigger>
                        <AccordionContent>
                          Drag & drop your file or click to browse.
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="item-2">
                        <AccordionTrigger>What formats are supported?</AccordionTrigger>
                        <AccordionContent>
                          Excel, CSV, and JSON formats.
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 15: ALERTS ==================== */}
              <section id="alerts" className="fpsg-section">
                <h2 className="fpsg-section-title">15. Alerte Demo</h2>
                <p className="fpsg-section-desc">Mesaje de feedback pentru utilizator.</p>
                
                <div className="fpsg-card p-6 space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Information</AlertTitle>
                    <AlertDescription>Your report will be ready shortly.</AlertDescription>
                  </Alert>
                  
                  <Alert style={{ borderColor: '#34D399', background: '#ECFDF5' }}>
                    <CheckCircle className="h-4 w-4" style={{ color: '#34D399' }} />
                    <AlertTitle style={{ color: '#065F46' }}>Success</AlertTitle>
                    <AlertDescription style={{ color: '#047857' }}>Data synchronized successfully.</AlertDescription>
                  </Alert>
                  
                  <Alert style={{ borderColor: '#F59E0B', background: '#FFFBEB' }}>
                    <AlertTriangle className="h-4 w-4" style={{ color: '#F59E0B' }} />
                    <AlertTitle style={{ color: '#92400E' }}>Warning</AlertTitle>
                    <AlertDescription style={{ color: '#B45309' }}>Some transactions need verification.</AlertDescription>
                  </Alert>
                  
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Failed to process. Please try again.</AlertDescription>
                  </Alert>
                </div>
              </section>

              {/* ==================== SECTION 16: MODALS ==================== */}
              <section id="modals" className="fpsg-section">
                <h2 className="fpsg-section-title">16. Modale</h2>
                <p className="fpsg-section-desc">Dialog boxes pentru confirmări și input.</p>
                
                <div className="fpsg-card p-6">
                  <div className="flex flex-wrap gap-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>Open Dialog</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirm Action</DialogTitle>
                          <DialogDescription>Are you sure you want to proceed?</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button>Confirm</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <Plus className="w-4 h-4" /> Add Entry
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Entry</DialogTitle>
                          <DialogDescription>Fill in the details below.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input placeholder="Enter name..." />
                          </div>
                          <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input type="number" placeholder="0.00" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button>Save</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" className="gap-2">
                          <Trash2 className="w-4 h-4" /> Delete
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle style={{ color: '#F43F5E' }}>Delete Item</DialogTitle>
                          <DialogDescription>This action cannot be undone.</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button variant="destructive">Delete</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 17: AVATARS ==================== */}
              <section id="avatars" className="fpsg-section">
                <h2 className="fpsg-section-title">17. Avatare</h2>
                <p className="fpsg-section-desc">Reprezentări vizuale pentru utilizatori.</p>
                
                <div className="fpsg-card p-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <p className="fpsg-subsection-title">Sizes</p>
                      <div className="flex items-end gap-4 mb-6">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs" style={{ background: '#E0E7FF', color: '#6366F1' }}>SM</AvatarFallback>
                        </Avatar>
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="text-sm" style={{ background: '#E0E7FF', color: '#6366F1' }}>MD</AvatarFallback>
                        </Avatar>
                        <Avatar className="w-12 h-12">
                          <AvatarFallback style={{ background: '#E0E7FF', color: '#6366F1' }}>LG</AvatarFallback>
                        </Avatar>
                        <Avatar className="w-16 h-16">
                          <AvatarFallback className="text-lg" style={{ background: '#E0E7FF', color: '#6366F1' }}>XL</AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    
                    <div>
                      <p className="fpsg-subsection-title">Avatar Group</p>
                      <div className="flex -space-x-3 mb-6">
                        {['AB', 'CD', 'EF', 'GH'].map((initials, i) => (
                          <Avatar key={i} className="w-10 h-10 border-2 border-white">
                            <AvatarFallback className="text-sm" style={{ background: '#E0E7FF', color: '#6366F1' }}>{initials}</AvatarFallback>
                          </Avatar>
                        ))}
                        <div 
                          className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold"
                          style={{ background: '#F8FAFC', color: '#94A3B8' }}
                        >
                          +5
                        </div>
                      </div>
                      
                      <p className="fpsg-subsection-title">User Card</p>
                      <div 
                        className="flex items-center gap-3 p-3"
                        style={{ background: '#F8FAFC', borderRadius: '10px' }}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback style={{ background: '#0F172A', color: '#FFFFFF' }}>JD</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm" style={{ color: '#0F172A' }}>John Doe</p>
                          <p className="text-xs" style={{ color: '#94A3B8' }}>john@company.com</p>
                        </div>
                        <Badge variant="secondary">Admin</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 18: LOADING ==================== */}
              <section id="loading" className="fpsg-section">
                <h2 className="fpsg-section-title">18. Loading States</h2>
                <p className="fpsg-section-desc">Indicatori de încărcare și progres.</p>
                
                <div className="fpsg-card p-6">
                  <div className="grid md:grid-cols-3 gap-8">
                    <div>
                      <p className="fpsg-subsection-title">Spinners</p>
                      <div className="flex items-center gap-4">
                        <Loader2 className="w-6 h-6 fpsg-animate-spin" style={{ color: '#6366F1' }} />
                        <Loader2 className="w-8 h-8 fpsg-animate-spin" style={{ color: '#6366F1' }} />
                        <RefreshCw className="w-6 h-6 fpsg-animate-spin" style={{ color: '#94A3B8' }} />
                      </div>
                    </div>
                    
                    <div>
                      <p className="fpsg-subsection-title">Loading Message</p>
                      <div 
                        className="text-center p-6"
                        style={{ background: '#F8FAFC', borderRadius: '10px' }}
                      >
                        <Loader2 className="w-8 h-8 fpsg-animate-spin mx-auto mb-2" style={{ color: '#6366F1' }} />
                        <p className="font-medium text-sm" style={{ color: '#0F172A' }}>Loading...</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="fpsg-subsection-title">Skeleton</p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                        <Skeleton className="h-16 w-full" style={{ borderRadius: '10px' }} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <p className="fpsg-subsection-title">Progress Bars</p>
                    <div className="space-y-4 max-w-md">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span style={{ color: '#94A3B8' }}>Uploading...</span>
                          <span className="font-semibold">45%</span>
                        </div>
                        <Progress value={45} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span style={{ color: '#94A3B8' }}>Processing...</span>
                          <span className="font-semibold">78%</span>
                        </div>
                        <Progress value={78} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 19: EMPTY STATES ==================== */}
              <section id="empty" className="fpsg-section">
                <h2 className="fpsg-section-title">19. Empty States</h2>
                <p className="fpsg-section-desc">Stări de placeholder când nu există date.</p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="fpsg-card p-8 text-center">
                    <div 
                      className="w-16 h-16 mx-auto flex items-center justify-center mb-4"
                      style={{ background: '#E0E7FF', borderRadius: '50%' }}
                    >
                      <FileText className="w-8 h-8" style={{ color: '#6366F1' }} />
                    </div>
                    <h3 className="text-lg font-semibold fpsg-font-editorial mb-2" style={{ color: '#0F172A' }}>
                      No reports yet
                    </h3>
                    <p className="text-sm mb-4" style={{ color: '#475569' }}>
                      Upload your first file to start generating reports.
                    </p>
                    <Button className="gap-2">
                      <Upload className="w-4 h-4" /> Upload Now
                    </Button>
                  </div>

                  <div className="fpsg-card p-8 text-center">
                    <div 
                      className="w-16 h-16 mx-auto flex items-center justify-center mb-4"
                      style={{ background: '#F8FAFC', borderRadius: '50%' }}
                    >
                      <Search className="w-8 h-8" style={{ color: '#94A3B8' }} />
                    </div>
                    <h3 className="text-lg font-semibold fpsg-font-editorial mb-2" style={{ color: '#0F172A' }}>
                      No results found
                    </h3>
                    <p className="text-sm mb-4" style={{ color: '#475569' }}>
                      Try adjusting your search filters.
                    </p>
                    <Button variant="outline" className="gap-2">
                      <RefreshCw className="w-4 h-4" /> Clear Filters
                    </Button>
                  </div>
                </div>
              </section>

              {/* ==================== SECTION 20: MISC ==================== */}
              <section id="misc" className="fpsg-section">
                <h2 className="fpsg-section-title">20. Componente Extra</h2>
                <p className="fpsg-section-desc">Tooltips, dropdown-uri și alte elemente.</p>
                
                <div className="fpsg-card p-6">
                  <div className="grid md:grid-cols-3 gap-8">
                    {/* Tooltips */}
                    <div>
                      <p className="fpsg-subsection-title">Tooltips</p>
                      <div className="flex gap-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Info className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Helpful information</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button>Hover Me</Button>
                          </TooltipTrigger>
                          <TooltipContent>Click to perform action</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Dropdown */}
                    <div>
                      <p className="fpsg-subsection-title">Dropdown Menu</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="gap-2">
                            Options <ChevronDown className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>My Account</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem><User className="w-4 h-4 mr-2" /> Profile</DropdownMenuItem>
                          <DropdownMenuItem><Settings className="w-4 h-4 mr-2" /> Settings</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem style={{ color: '#F43F5E' }}>
                            <X className="w-4 h-4 mr-2" /> Log out
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Copy */}
                    <div>
                      <p className="fpsg-subsection-title">Copy to Clipboard</p>
                      <div 
                        className="flex items-center gap-2 p-3 fpsg-font-mono text-sm"
                        style={{ background: '#F8FAFC', borderRadius: '10px' }}
                      >
                        <code className="flex-1 truncate">#6366F1</code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleCopy('#6366F1')}
                        >
                          {copied ? <Check className="w-4 h-4" style={{ color: '#34D399' }} /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Code Block */}
                  <div className="mt-8">
                    <p className="fpsg-subsection-title">Code Block</p>
                    <div className="fpsg-code-block overflow-hidden">
                      <div 
                        className="flex items-center justify-between px-4 py-2 border-b"
                        style={{ borderColor: '#334155' }}
                      >
                        <span className="text-xs" style={{ color: '#94A3B8' }}>newa_design-tokens.jsonc</span>
                        <Button variant="ghost" size="sm" className="h-6" style={{ color: '#94A3B8' }}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <pre className="p-4 text-sm overflow-x-auto" style={{ color: '#F8FAFC' }}>
{`{
  "color": {
    "brand": {
      "primaryDark": "#0F172A",
      "accentIndigo": "#6366F1",
      "accentEmerald": "#34D399",
      "dangerRose": "#F43F5E"
    }
  },
  "radius": {
    "sm": "6px",
    "md": "10px",
    "lg": "14px",
    "xl": "20px"
  }
}`}
                      </pre>
                    </div>
                  </div>

                  {/* Separators */}
                  <div className="mt-8">
                    <p className="fpsg-subsection-title">Separators</p>
                    <div className="space-y-4">
                      <Separator />
                      <div className="flex items-center gap-4">
                        <Separator className="flex-1" />
                        <span className="text-xs" style={{ color: '#94A3B8' }}>OR</span>
                        <Separator className="flex-1" />
                      </div>
                      <div className="flex items-center gap-4 text-sm" style={{ color: '#475569' }}>
                        <span>Item A</span>
                        <Separator orientation="vertical" className="h-4" />
                        <span>Item B</span>
                        <Separator orientation="vertical" className="h-4" />
                        <span>Item C</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* ========== FOOTER ========== */}
              <footer className="pt-12 pb-8 text-center border-t" style={{ borderColor: '#E2E8F0' }}>
                <p className="text-sm" style={{ color: '#94A3B8' }}>
                  FP&A SaaS Design System v2.0.0
                </p>
                <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                  Design Tokens: <code className="px-1" style={{ background: '#F8FAFC', borderRadius: '4px' }}>newa_design-tokens.jsonc</code>
                </p>
                <p className="text-[10px] mt-2" style={{ color: '#94A3B8' }}>
                  20 secțiuni • State • Focus • Selection • Semantic • Alert • Typography Roles • Density • Table • Form • Charts
                </p>
              </footer>

            </main>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default NewaStyleGuide;
