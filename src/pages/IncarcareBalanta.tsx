import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Info, Calendar as CalendarIcon, FileCheck, X, Download, Eye, Trash2, ChevronDown, FileX, Building2, Loader2, AlertCircle, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { usePageUiState } from '@/hooks/usePageUiState';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { BalanceAccount } from '@/hooks/useBalante';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { useTrialBalances, TrialBalanceImport, TrialBalanceImportWithTotals } from '@/hooks/useTrialBalances';
import { supabase } from '@/integrations/supabase/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/** Numărul de conturi afișate per pagină în dialog-ul de vizualizare */
const ACCOUNTS_PER_PAGE = 50;

/**
 * Pagina pentru încărcarea și gestionarea balanțelor contabile.
 * Optimizată pentru performanță cu:
 * - Totaluri calculate server-side (evită N+1 queries)
 * - Paginare pentru lista de conturi
 * - Error Boundary pentru gestionarea erorilor
 */
/**
 * Interfața pentru state-ul UI persistent al paginii.
 * Acest state se salvează în sessionStorage și se restaurează la revenirea în tab.
 */
interface PageUiState {
  /** Secțiunea de specificații tehnice expandată/colapsată */
  detailedSpecsOpen: boolean;
  /** ID-ul importului vizualizat în dialog (pentru restaurare) */
  lastViewedImportId: string | null;
  /** Pagina curentă în dialog-ul de vizualizare conturi */
  accountsDialogPage: number;
  /** Index signature pentru compatibilitate cu Record<string, unknown> */
  [key: string]: unknown;
}
const IncarcareBalanta = () => {
  const {
    user
  } = useAuth();
  const {
    activeCompany
  } = useCompanyContext();
  const {
    imports,
    importsWithTotals,
    loading: importsLoading,
    uploadBalance,
    deleteImport,
    getAccounts,
    retryFailedImport
  } = useTrialBalances(activeCompany?.id || null);

  // Referință pentru containerul de scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /**
   * State UI persistent - se păstrează la schimbarea tab-ului.
   * Folosește usePageUiState pentru salvare automată în sessionStorage.
   */
  const {
    state: uiState,
    updateState: updateUiState
  } = usePageUiState<PageUiState>('incarcare-balanta', {
    detailedSpecsOpen: false,
    lastViewedImportId: null,
    accountsDialogPage: 0
  }, {
    scrollContainerRef,
    restoreScroll: true
  });

  // State-uri pentru formularul de upload (nu persistăm - se resetează intenționat)
  const [referenceDate, setReferenceDate] = useState<Date>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [dateError, setDateError] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);

  // Wrapper pentru detailedSpecsOpen - folosește state-ul persistent
  const detailedSpecsOpen = uiState.detailedSpecsOpen;
  const setDetailedSpecsOpen = useCallback((open: boolean) => {
    updateUiState({
      detailedSpecsOpen: open
    });
  }, [updateUiState]);

  // View accounts dialog cu paginare
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingAccounts, setViewingAccounts] = useState<BalanceAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountsPage, setAccountsPage] = useState(0);
  const [totalAccountsCount, setTotalAccountsCount] = useState(0);

  /**
   * Calculează totalurile din importsWithTotals (optimizat server-side).
   * Dacă importsWithTotals nu este disponibil, returnează un map gol.
   * Evită N+1 queries prin folosirea datelor pre-calculate.
   */
  const importTotals = useMemo(() => {
    const totals: Record<string, {
      totalDebit: number;
      totalCredit: number;
      accountsCount: number;
    }> = {};

    // Folosim datele optimizate din RPC dacă sunt disponibile
    if (importsWithTotals && importsWithTotals.length > 0) {
      importsWithTotals.forEach(imp => {
        totals[imp.id] = {
          totalDebit: imp.total_closing_debit || 0,
          totalCredit: imp.total_closing_credit || 0,
          accountsCount: imp.accounts_count || 0
        };
      });
    }
    return totals;
  }, [importsWithTotals]);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };
  const handleFileSelect = (file: File) => {
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type)) {
      toast.error('Format fișier neacceptat. Vă rugăm să încărcați un fișier Excel (.xlsx, .xls)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fișierul depășește dimensiunea maximă de 10MB');
      return;
    }
    setUploadedFile(file);
    setUploadStatus('success');
    toast.success('Fișier selectat cu succes!');
  };
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
  };
  const handleUpload = async () => {
    if (!referenceDate) {
      setDateError(true);
      toast.error('Data de referință este obligatorie');
      return;
    }
    if (!uploadedFile) {
      toast.error('Vă rugăm să selectați un fișier');
      return;
    }
    if (!user) {
      toast.error('Trebuie să fiți autentificat');
      return;
    }

    // Get user's internal ID
    const {
      data: userData,
      error: userError
    } = await supabase.from('users').select('id').eq('auth_user_id', user.id).single();
    if (userError || !userData) {
      toast.error('Eroare la încărcare. Vă rugăm să încercați din nou.');
      return;
    }
    setDateError(false);
    setUploadStatus('uploading');
    setUploadProgress(10);
    try {
      // Calculate period start (first day of month)
      const periodStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      setUploadProgress(30);
      await uploadBalance(uploadedFile, periodStart, referenceDate, userData.id);
      setUploadProgress(100);
      setUploadStatus('success');
      toast.success('Balanța a fost încărcată și procesată cu succes!');

      // Reset form
      setTimeout(() => {
        setUploadedFile(null);
        setUploadStatus('idle');
        setUploadProgress(0);
        setReferenceDate(undefined);
      }, 1500);
    } catch (error) {
      console.error('[handleUpload] Upload error:', error);
      setUploadStatus('error');
      
      // v2.0: Afișare îmbunătățită pentru erori de validare blocking
      const errorMessage = error instanceof Error ? error.message : 'Eroare la încărcare';
      
      // Verifică dacă e eroare de validare (conține ❌)
      if (errorMessage.includes('❌')) {
        // Eroare de validare blocking - afișează cu formatare
        const errorLines = errorMessage.split('\n');
        const mainError = errorLines[0];
        
        // Toast principal cu prima linie
        toast.error(mainError, {
          duration: 8000, // 8 secunde pentru a putea citi
        });
        
        // Log detalii în consolă pentru debugging
        console.error('[handleUpload] Validation errors:', errorLines);
      } else {
        // Eroare generică
        toast.error(errorMessage);
      }
    }
  };
  const handleDelete = (id: string) => {
    setSelectedImportId(id);
    setDeleteDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (selectedImportId) {
      try {
        await deleteImport(selectedImportId);
        toast.success('Balanța a fost ștearsă cu succes');
      } catch (error) {
        toast.error('Eroare la ștergere');
      }
    }
    setDeleteDialogOpen(false);
    setSelectedImportId(null);
  };

  /**
   * Reîncearcă procesarea unui import failed/error.
   * v1.9: Handler pentru butonul de retry din UI
   * 
   * @param importId - ID-ul importului de reîncercat
   */
  const handleRetry = async (importId: string) => {
    try {
      toast.info('Reîncerc procesarea balanței...');
      await retryFailedImport(importId);
      toast.success('Balanța a fost reprocesată cu succes!');
    } catch (error) {
      console.error('[IncarcareBalanta] Error retrying import:', error);
      toast.error(error instanceof Error ? error.message : 'Eroare la reprocesare');
    }
  };

  /**
   * Deschide dialog-ul pentru vizualizarea conturilor unui import.
   * Folosește paginare pentru performanță optimă cu liste mari.
   * 
   * @param importId - ID-ul importului pentru care se afișează conturile
   */
  const handleViewAccounts = async (importId: string) => {
    setLoadingAccounts(true);
    setViewDialogOpen(true);
    setAccountsPage(0);
    setSelectedImportId(importId);
    try {
      const accounts = await getAccounts(importId, {
        limit: ACCOUNTS_PER_PAGE,
        offset: 0
      });
      setViewingAccounts(accounts);

      // Obținem numărul total de conturi din totals (dacă există)
      const totals = importTotals[importId];
      setTotalAccountsCount(totals?.accountsCount || accounts.length);
    } catch (error) {
      toast.error('Eroare la încărcarea conturilor');
      console.error('[IncarcareBalanta] Error loading accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  /**
   * Încarcă pagina următoare de conturi.
   */
  const handleNextAccountsPage = async () => {
    if (!selectedImportId) return;
    const nextPage = accountsPage + 1;
    const offset = nextPage * ACCOUNTS_PER_PAGE;
    if (offset >= totalAccountsCount) return;
    setLoadingAccounts(true);
    try {
      const accounts = await getAccounts(selectedImportId, {
        limit: ACCOUNTS_PER_PAGE,
        offset
      });
      setViewingAccounts(accounts);
      setAccountsPage(nextPage);
    } catch (error) {
      toast.error('Eroare la încărcarea conturilor');
    } finally {
      setLoadingAccounts(false);
    }
  };

  /**
   * Încarcă pagina anterioară de conturi.
   */
  const handlePrevAccountsPage = async () => {
    if (!selectedImportId || accountsPage === 0) return;
    const prevPage = accountsPage - 1;
    const offset = prevPage * ACCOUNTS_PER_PAGE;
    setLoadingAccounts(true);
    try {
      const accounts = await getAccounts(selectedImportId, {
        limit: ACCOUNTS_PER_PAGE,
        offset
      });
      setViewingAccounts(accounts);
      setAccountsPage(prevPage);
    } catch (error) {
      toast.error('Eroare la încărcarea conturilor');
    } finally {
      setLoadingAccounts(false);
    }
  };
  const handleDownload = async (imp: TrialBalanceImport) => {
    if (!imp.source_file_url) {
      toast.error('Fișierul nu este disponibil');
      return;
    }
    try {
      const {
        data,
        error
      } = await supabase.storage.from('balante').download(imp.source_file_url);
      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = imp.source_file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Eroare la descărcare');
    }
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2
    }).format(value);
  };

  /**
   * Returnează badge-ul corespunzător statusului importului.
   * v1.9.2: Status conform ENUM: 'draft', 'processing', 'validated', 'completed', 'error'
   */
  const getStatusBadge = (status: TrialBalanceImport['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Procesat</Badge>;
      case 'processing':
        return <Badge variant="secondary">În procesare</Badge>;
      case 'validated':
        return <Badge variant="outline">Validat</Badge>;
      case 'error':
        return <Badge variant="destructive">Eroare</Badge>;
      case 'draft':
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };
  return <div className="container-app" ref={scrollContainerRef}>
      {/* Page Header with Active Company */}
      <div className="page-header">
        <h1 className="page-title">Încărcare Balanță</h1>
        <p className="page-description">
          Încărcați și procesați balanțe contabile pentru <span className="font-semibold text-primary">{activeCompany?.name}</span>
        </p>
      </div>

      {/* Active Company Banner */}
      

      {/* Main Container */}
      <Card className="overflow-hidden">

        {/* Date Picker Section */}
        <div className="p-5 2xl:p-8 border-b">
          <div className="max-w-xs 2xl:max-w-sm">
            <Label htmlFor="reference-date" className="text-sm font-semibold mb-2 block">
              Data de Referință <span className="text-destructive">*</span>
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button id="reference-date" variant="outline" className={cn("w-full justify-start text-left font-normal", !referenceDate && "text-muted-foreground", dateError && "border-destructive")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {referenceDate ? format(referenceDate, "dd.MM.yyyy", {
                  locale: ro
                }) : "Selectează data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={referenceDate} onSelect={date => {
                setReferenceDate(date);
                setDateError(false);
                setCalendarOpen(false);
              }} initialFocus locale={ro} className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {dateError && <p className="text-xs text-destructive mt-1">Data de referință este obligatorie</p>}
            <p className="text-xs text-muted-foreground mt-1">
              Data până la care este validă balanța contabilă
            </p>
          </div>
        </div>

        {/* Specificații Tehnice - Help Callout Style */}
        <div className="p-5 border-b">
          <Collapsible open={detailedSpecsOpen} onOpenChange={setDetailedSpecsOpen}>
            <div className={cn(
              "bg-[var(--newa-alert-info-bg)]",
              "border border-[var(--newa-semantic-info)]/30",
              "border-l-4 border-l-[var(--newa-semantic-info)]",
              "rounded-[var(--newa-radius-md)]",
              "overflow-hidden"
            )}>
              {/* Header Collapsible cu Icon + Subtitlu */}
              <CollapsibleTrigger className={cn(
                "w-full flex items-start gap-3 p-4",
                "hover:bg-[var(--newa-semantic-info)]/10",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-[var(--newa-focus-ring-color)]",
                "focus-visible:ring-offset-2",
                "transition-colors"
              )}>
                {/* Icon Info */}
                <Info className="w-5 h-5 text-[var(--newa-semantic-info)] flex-shrink-0 mt-0.5" />
                
                {/* Text Group */}
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-foreground">
                    Specificații tehnice și format acceptat
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vezi structura fișierului, coloanele obligatorii și regulile de validare.
                  </p>
                </div>
                
                {/* Chevron */}
                <ChevronDown className={cn(
                  "w-5 h-5 text-[var(--newa-semantic-info)] flex-shrink-0 mt-0.5",
                  "transition-transform duration-200",
                  detailedSpecsOpen && "rotate-180"
                )} />
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="p-5 pt-0 space-y-6">
                  {/* Formate Acceptate */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Formate acceptate:
                    </span>
                    <Badge variant="secondary" className="font-mono">.xlsx</Badge>
                    <Badge variant="secondary" className="font-mono">.xls</Badge>
                    <span className="text-sm text-muted-foreground">Max 10MB</span>
                  </div>

                  {/* Coloane Obligatorii - Grid */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Coloane obligatorii (A-H)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="bg-white/60 border border-[var(--newa-semantic-info)]/20 rounded-md px-3 py-2">
                        <code className="font-mono text-xs font-semibold text-[var(--newa-semantic-info)]">A</code>
                        <span className="text-sm ml-1.5">Cont</span>
                      </div>
                      <div className="bg-white/60 border border-[var(--newa-semantic-info)]/20 rounded-md px-3 py-2">
                        <code className="font-mono text-xs font-semibold text-[var(--newa-semantic-info)]">B</code>
                        <span className="text-sm ml-1.5">Denumire</span>
                      </div>
                      <div className="bg-white/60 border border-[var(--newa-semantic-info)]/20 rounded-md px-3 py-2">
                        <code className="font-mono text-xs font-semibold text-[var(--newa-semantic-info)]">C</code>
                        <span className="text-sm ml-1.5">SI Debit</span>
                      </div>
                      <div className="bg-white/60 border border-[var(--newa-semantic-info)]/20 rounded-md px-3 py-2">
                        <code className="font-mono text-xs font-semibold text-[var(--newa-semantic-info)]">D</code>
                        <span className="text-sm ml-1.5">SI Credit</span>
                      </div>
                      <div className="bg-white/60 border border-[var(--newa-semantic-info)]/20 rounded-md px-3 py-2">
                        <code className="font-mono text-xs font-semibold text-[var(--newa-semantic-info)]">E</code>
                        <span className="text-sm ml-1.5">Rulaj D</span>
                      </div>
                      <div className="bg-white/60 border border-[var(--newa-semantic-info)]/20 rounded-md px-3 py-2">
                        <code className="font-mono text-xs font-semibold text-[var(--newa-semantic-info)]">F</code>
                        <span className="text-sm ml-1.5">Rulaj C</span>
                      </div>
                      <div className="bg-white/60 border border-[var(--newa-semantic-info)]/20 rounded-md px-3 py-2">
                        <code className="font-mono text-xs font-semibold text-[var(--newa-semantic-info)]">G</code>
                        <span className="text-sm ml-1.5">SF Debit</span>
                      </div>
                      <div className="bg-white/60 border border-[var(--newa-semantic-info)]/20 rounded-md px-3 py-2">
                        <code className="font-mono text-xs font-semibold text-[var(--newa-semantic-info)]">H</code>
                        <span className="text-sm ml-1.5">SF Credit</span>
                      </div>
                    </div>
                  </div>

                  {/* Reguli Cheie */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Reguli cheie
                    </h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-[var(--newa-semantic-success)] flex-shrink-0" />
                        <span>Prima linie = header (ignorată la procesare)</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-[var(--newa-semantic-success)] flex-shrink-0" />
                        <span>Numere: format românesc (virgulă) sau internațional (punct)</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-[var(--newa-semantic-success)] flex-shrink-0" />
                        <span>Conturi: minim 3 cifre, maxim 6 cifre</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-[var(--newa-semantic-success)] flex-shrink-0" />
                        <span>Linii goale: ignorate automat</span>
                      </li>
                    </ul>
                  </div>

                  {/* Exemplu - Tabel compact */}
                  <div className="bg-white/80 rounded-lg p-4 border border-[var(--newa-semantic-info)]/20">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Exemplu structură
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--newa-semantic-info)]/20">
                            <th className="text-left p-2 font-mono text-xs font-semibold text-muted-foreground">Cont</th>
                            <th className="text-left p-2 font-mono text-xs font-semibold text-muted-foreground">Denumire</th>
                            <th className="text-right p-2 font-mono text-xs font-semibold text-muted-foreground">SI D</th>
                            <th className="text-right p-2 font-mono text-xs font-semibold text-muted-foreground">SI C</th>
                            <th className="text-right p-2 font-mono text-xs font-semibold text-muted-foreground">Rul D</th>
                            <th className="text-right p-2 font-mono text-xs font-semibold text-muted-foreground">Rul C</th>
                            <th className="text-right p-2 font-mono text-xs font-semibold text-muted-foreground">SF D</th>
                            <th className="text-right p-2 font-mono text-xs font-semibold text-muted-foreground">SF C</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-[var(--newa-semantic-info)]/10">
                            <td className="p-2 font-mono text-xs">1012</td>
                            <td className="p-2 text-xs">Conturi la bănci</td>
                            <td className="text-right p-2 font-mono text-xs">50000</td>
                            <td className="text-right p-2 font-mono text-xs">0</td>
                            <td className="text-right p-2 font-mono text-xs">25000</td>
                            <td className="text-right p-2 font-mono text-xs">15000</td>
                            <td className="text-right p-2 font-mono text-xs">60000</td>
                            <td className="text-right p-2 font-mono text-xs">0</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-mono text-xs">4111</td>
                            <td className="p-2 text-xs">Venituri vânzări</td>
                            <td className="text-right p-2 font-mono text-xs">0</td>
                            <td className="text-right p-2 font-mono text-xs">100000</td>
                            <td className="text-right p-2 font-mono text-xs">0</td>
                            <td className="text-right p-2 font-mono text-xs">50000</td>
                            <td className="text-right p-2 font-mono text-xs">0</td>
                            <td className="text-right p-2 font-mono text-xs">150000</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        {/* Upload Zone */}
        <div className="p-6 border-b">
          <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={cn("border-2 border-dashed rounded-xl p-8 transition-all", isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25", uploadedFile && "border-primary")}>
            {!uploadedFile ? <div className="text-center">
                <Upload className={cn("w-12 h-12 mx-auto mb-4", isDragging ? "text-primary" : "text-muted-foreground")} />
                <p className="text-sm font-medium text-foreground mb-1">
                  Trageți fișierul Excel aici sau click pentru a selecta
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Acceptăm fișiere .xlsx și .xls (max 10MB)
                </p>
                <input type="file" id="file-upload" className="hidden" accept=".xlsx,.xls" onChange={handleFileInputChange} />
                <Button asChild variant="outline">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Selectează fișier
                  </label>
                </Button>
              </div> : <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleRemoveFile} disabled={uploadStatus === 'uploading'}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {uploadStatus === 'uploading' && <div className="mb-4">
                    <Progress value={uploadProgress} className="mb-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      Se procesează... {uploadProgress}%
                    </p>
                  </div>}
                
                <Button onClick={handleUpload} className="w-full" disabled={uploadStatus === 'uploading'}>
                  {uploadStatus === 'uploading' ? <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Se procesează...
                    </> : 'Încarcă balanța'}
                </Button>
              </div>}
          </div>
        </div>

        {/* Lista Balanțe Încărcate */}
        <div className="p-6 2xl:p-8 border-b">
          <h3 className="text-lg 2xl:text-xl font-semibold text-foreground mb-4">Balanțe Încărcate</h3>
          
          {importsLoading ? <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div> : imports.length === 0 ? <div className="text-center py-12">
              <FileX className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nu există balanțe încărcate</p>
            </div> : <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nume Fișier</TableHead>
                    <TableHead>Perioadă</TableHead>
                    <TableHead>Data Încărcare</TableHead>
                    <TableHead className="text-right">Nr. Conturi</TableHead>
                    <TableHead className="text-right">Total Debit</TableHead>
                    <TableHead className="text-right">Total Credit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map(imp => {
                const totals = importTotals[imp.id];
                return <TableRow key={imp.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">{imp.source_file_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(imp.period_end), "MMMM yyyy", {
                      locale: ro
                    })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(imp.created_at), "dd.MM.yyyy HH:mm", {
                      locale: ro
                    })}
                        </TableCell>
                        <TableCell className="text-right">
                          {totals?.accountsCount || '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {totals ? formatCurrency(totals.totalDebit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {totals ? formatCurrency(totals.totalCredit) : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              {getStatusBadge(imp.status)}
                              {imp.error_message && <AlertCircle className="w-4 h-4 text-destructive" />}
                            </div>
                            {imp.error_message && <p className="text-xs text-destructive max-w-[200px] break-words">
                                {imp.error_message}
                              </p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(imp)}>
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Descarcă</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewAccounts(imp.id)} disabled={imp.status !== 'completed'}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Vizualizează conturi</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {/* v1.9.2: Buton Retry pentru imports cu status 'error' */}
                            {imp.status === 'error' && <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700" onClick={() => handleRetry(imp.id)}>
                                      <RotateCcw className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Reîncearcă procesarea</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>}
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(imp.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Șterge</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>;
              })}
                </TableBody>
              </Table>
            </div>}
        </div>

      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmare ștergere</AlertDialogTitle>
            <AlertDialogDescription>
              Sunteți sigur că doriți să ștergeți această balanță? Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Accounts Dialog cu Paginare - Optimizat pentru vizibilitate completă coloane */}
      <Dialog open={viewDialogOpen} onOpenChange={open => {
      setViewDialogOpen(open);
      if (!open) {
        setAccountsPage(0);
        setViewingAccounts([]);
        setTotalAccountsCount(0);
      }
    }}>
        <DialogContent className="w-[95vw] max-w-[1400px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Conturi Balanță</DialogTitle>
            <DialogDescription>
              {totalAccountsCount > 0 ? <>
                  Afișez {accountsPage * ACCOUNTS_PER_PAGE + 1} - {Math.min((accountsPage + 1) * ACCOUNTS_PER_PAGE, totalAccountsCount)} din {totalAccountsCount} conturi
                </> : 'Lista conturilor din balanța selectată'}
            </DialogDescription>
          </DialogHeader>
          
          {loadingAccounts ? <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div> : <>
              {/* Container cu scroll orizontal explicit pentru tabel */}
              <div className="flex-1 overflow-hidden border rounded-md">
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(85vh-180px)]">
                  <Table className="min-w-[1200px]">
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[80px] min-w-[80px]">Cont</TableHead>
                        <TableHead className="min-w-[180px]">Denumire</TableHead>
                        <TableHead className="text-right w-[120px] min-w-[120px] whitespace-nowrap">SI Debit</TableHead>
                        <TableHead className="text-right w-[120px] min-w-[120px] whitespace-nowrap">SI Credit</TableHead>
                        <TableHead className="text-right w-[130px] min-w-[130px] whitespace-nowrap">Rulaj D</TableHead>
                        <TableHead className="text-right w-[130px] min-w-[130px] whitespace-nowrap">Rulaj C</TableHead>
                        <TableHead className="text-right w-[120px] min-w-[120px] whitespace-nowrap">SF Debit</TableHead>
                        <TableHead className="text-right w-[120px] min-w-[120px] whitespace-nowrap">SF Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingAccounts.map(account => <TableRow key={account.id}>
                          <TableCell className="font-mono text-sm">{account.account_code}</TableCell>
                          <TableCell className="max-w-[250px] truncate" title={account.account_name}>
                            {account.account_name}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                            {formatCurrency(account.opening_debit)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                            {formatCurrency(account.opening_credit)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                            {formatCurrency(account.debit_turnover)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                            {formatCurrency(account.credit_turnover)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                            {formatCurrency(account.closing_debit)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                            {formatCurrency(account.closing_credit)}
                          </TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              {/* Controale paginare */}
              {totalAccountsCount > ACCOUNTS_PER_PAGE && <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Pagina {accountsPage + 1} din {Math.ceil(totalAccountsCount / ACCOUNTS_PER_PAGE)}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrevAccountsPage} disabled={accountsPage === 0 || loadingAccounts}>
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNextAccountsPage} disabled={(accountsPage + 1) * ACCOUNTS_PER_PAGE >= totalAccountsCount || loadingAccounts}>
                      Următor
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>}
            </>}
        </DialogContent>
      </Dialog>
    </div>;
};

/**
 * Componentă exportată cu Error Boundary pentru gestionarea erorilor.
 */
const IncarcareBalantaWithErrorBoundary = () => <ErrorBoundary errorTitle="Eroare la încărcarea paginii" retryButtonText="Reîncearcă" onError={error => {
  console.error('[IncarcareBalanta] Caught error:', error);
}}>
    <IncarcareBalanta />
  </ErrorBoundary>;
export default IncarcareBalantaWithErrorBoundary;