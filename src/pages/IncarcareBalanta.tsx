import { useState, useEffect } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Info, 
  Calendar as CalendarIcon,
  FileCheck,
  X,
  Download,
  Eye,
  Trash2,
  ChevronDown,
  FileX,
  Building2,
  Loader2,
  AlertCircle
} from 'lucide-react';
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
import { useCompany } from '@/hooks/useCompany';
import { useTrialBalances, TrialBalanceImport } from '@/hooks/useTrialBalances';
import { supabase } from '@/integrations/supabase/client';

const IncarcareBalanta = () => {
  const { user } = useAuth();
  const { company, loading: companyLoading, createCompany } = useCompany();
  const { imports, loading: importsLoading, uploadBalance, deleteImport, getAccounts } = useTrialBalances(company?.id || null);
  
  const [referenceDate, setReferenceDate] = useState<Date>();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [dateError, setDateError] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);
  const [specsOpen, setSpecsOpen] = useState(false);
  
  // Company creation dialog
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [companyCUI, setCompanyCUI] = useState('');
  const [creatingCompany, setCreatingCompany] = useState(false);
  
  // View accounts dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingAccounts, setViewingAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
  // Account totals cache
  const [importTotals, setImportTotals] = useState<Record<string, { totalDebit: number; totalCredit: number; accountsCount: number }>>({});

  // Load account totals for each import
  useEffect(() => {
    const loadTotals = async () => {
      const totals: Record<string, { totalDebit: number; totalCredit: number; accountsCount: number }> = {};
      
      for (const imp of imports) {
        if (imp.status === 'completed') {
          try {
            const accounts = await getAccounts(imp.id);
            const totalDebit = accounts.reduce((sum, acc) => sum + (acc.closing_debit || 0), 0);
            const totalCredit = accounts.reduce((sum, acc) => sum + (acc.closing_credit || 0), 0);
            totals[imp.id] = { totalDebit, totalCredit, accountsCount: accounts.length };
          } catch (err) {
            console.error('Error loading totals:', err);
          }
        }
      }
      
      setImportTotals(totals);
    };
    
    if (imports.length > 0) {
      loadTotals();
    }
  }, [imports, getAccounts]);

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
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

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
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

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
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast.error(error instanceof Error ? error.message : 'Eroare la încărcare');
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

  const handleViewAccounts = async (importId: string) => {
    setLoadingAccounts(true);
    setViewDialogOpen(true);
    
    try {
      const accounts = await getAccounts(importId);
      setViewingAccounts(accounts);
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
      const { data, error } = await supabase.storage
        .from('balante')
        .download(imp.source_file_url);

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

  const handleCreateCompany = async () => {
    if (!companyName.trim() || !companyCUI.trim()) {
      toast.error('Toate câmpurile sunt obligatorii');
      return;
    }

    setCreatingCompany(true);
    try {
      await createCompany(companyName.trim(), companyCUI.trim());
      toast.success('Compania a fost creată cu succes!');
      setShowCompanyDialog(false);
      setCompanyName('');
      setCompanyCUI('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Eroare la crearea companiei');
    } finally {
      setCreatingCompany(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2
    }).format(value);
  };

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
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  // Loading state
  if (companyLoading) {
    return (
      <div className="container-app flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No company state
  if (!company) {
    return (
      <div className="container-app">
        <div className="page-header">
          <h1 className="page-title">Încărcare Balanță</h1>
          <p className="page-description">
            Încărcați și procesați balanțe contabile
          </p>
        </div>

        <Card className="p-8 text-center">
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nicio companie asociată</h2>
          <p className="text-muted-foreground mb-6">
            Pentru a încărca balanțe, trebuie să creați sau să vă asociați unei companii.
          </p>
          <Button onClick={() => setShowCompanyDialog(true)}>
            <Building2 className="w-4 h-4 mr-2" />
            Creează companie
          </Button>
        </Card>

        {/* Create Company Dialog */}
        <Dialog open={showCompanyDialog} onOpenChange={setShowCompanyDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Creează companie nouă</DialogTitle>
              <DialogDescription>
                Introduceți datele companiei pentru a începe să încărcați balanțe.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nume companie *</Label>
                <Input
                  id="company-name"
                  placeholder="SC Exemplu SRL"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-cui">CUI *</Label>
                <Input
                  id="company-cui"
                  placeholder="RO12345678"
                  value={companyCUI}
                  onChange={(e) => setCompanyCUI(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompanyDialog(false)}>
                Anulează
              </Button>
              <Button onClick={handleCreateCompany} disabled={creatingCompany}>
                {creatingCompany && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Creează
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="container-app">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Încărcare Balanță</h1>
        <p className="page-description">
          Încărcați și procesați balanțe contabile pentru {company.name}
        </p>
      </div>

      {/* Main Container */}
      <Card className="overflow-hidden">
        {/* Header Section */}
        <div className="bg-muted/30 p-5 border-b">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-6 h-6 text-primary mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  Încărcare Balanță de Verificare
                </h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Încărcați fișierul Excel cu balanța contabilă pentru analiza automată a datelor financiare</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Încărcați fișierul Excel cu structura conturilor conform formatului specificat
              </p>
            </div>
          </div>
        </div>

        {/* Date Picker Section */}
        <div className="p-5 2xl:p-8 border-b">
          <div className="max-w-xs 2xl:max-w-sm">
            <Label htmlFor="reference-date" className="text-sm font-semibold mb-2 block">
              Data de Referință <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="reference-date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !referenceDate && "text-muted-foreground",
                    dateError && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {referenceDate ? format(referenceDate, "dd.MM.yyyy", { locale: ro }) : "Selectează data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={referenceDate}
                  onSelect={(date) => {
                    setReferenceDate(date);
                    setDateError(false);
                  }}
                  initialFocus
                  locale={ro}
                />
              </PopoverContent>
            </Popover>
            {dateError && (
              <p className="text-xs text-destructive mt-1">Data de referință este obligatorie</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Data până la care este validă balanța contabilă
            </p>
          </div>
        </div>

        {/* Upload Zone */}
        <div className="p-6 border-b">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 transition-all",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              uploadedFile && "border-primary"
            )}
          >
            {!uploadedFile ? (
              <div className="text-center">
                <Upload className={cn(
                  "w-12 h-12 mx-auto mb-4",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
                <p className="text-sm font-medium text-foreground mb-1">
                  Trageți fișierul Excel aici sau click pentru a selecta
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Acceptăm fișiere .xlsx și .xls (max 10MB)
                </p>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileInputChange}
                />
                <Button asChild variant="outline">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Selectează fișier
                  </label>
                </Button>
              </div>
            ) : (
              <div>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    disabled={uploadStatus === 'uploading'}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {uploadStatus === 'uploading' && (
                  <div className="mb-4">
                    <Progress value={uploadProgress} className="mb-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      Se procesează... {uploadProgress}%
                    </p>
                  </div>
                )}
                
                <Button 
                  onClick={handleUpload} 
                  className="w-full"
                  disabled={uploadStatus === 'uploading'}
                >
                  {uploadStatus === 'uploading' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Se procesează...
                    </>
                  ) : (
                    'Încarcă balanța'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Lista Balanțe Încărcate */}
        <div className="p-6 2xl:p-8 border-b">
          <h3 className="text-lg 2xl:text-xl font-semibold text-foreground mb-4">Balanțe Încărcate</h3>
          
          {importsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : imports.length === 0 ? (
            <div className="text-center py-12">
              <FileX className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nu există balanțe încărcate</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                  {imports.map((imp) => {
                    const totals = importTotals[imp.id];
                    return (
                      <TableRow key={imp.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">{imp.source_file_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(imp.period_end), "MMMM yyyy", { locale: ro })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(imp.created_at), "dd.MM.yyyy HH:mm", { locale: ro })}
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
                              {imp.error_message && (
                                <AlertCircle className="w-4 h-4 text-destructive" />
                              )}
                            </div>
                            {imp.error_message && (
                              <p className="text-xs text-destructive max-w-[200px] break-words">
                                {imp.error_message}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => handleDownload(imp)}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Descarcă</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => handleViewAccounts(imp.id)}
                                    disabled={imp.status !== 'completed'}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Vizualizează conturi</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(imp.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Șterge</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Specificații Tehnice */}
        <Collapsible open={specsOpen} onOpenChange={setSpecsOpen}>
          <div className="p-6 bg-primary/5 border-l-4 border-primary">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <span className="text-sm font-semibold text-foreground">
                  Specificații Tehnice și Format Acceptat
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  specsOpen && "transform rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-4">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Structura Excel obligatorie:</h4>
                  <ul className="space-y-1 text-muted-foreground ml-4">
                    <li>• <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">Coloană A</span>: Cont (text) - ex: 1012, 4111</li>
                    <li>• <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">Coloană B</span>: Denumire (text) - ex: "Conturi curente la bănci"</li>
                    <li>• <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">Coloană C</span>: Sold Inițial Debit (număr)</li>
                    <li>• <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">Coloană D</span>: Sold Inițial Credit (număr)</li>
                    <li>• <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">Coloană E</span>: Rulaj Debit (număr)</li>
                    <li>• <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">Coloană F</span>: Rulaj Credit (număr)</li>
                    <li>• <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">Coloană G</span>: Sold Final Debit (număr)</li>
                    <li>• <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">Coloană H</span>: Sold Final Credit (număr)</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Cerințe format:</h4>
                  <ul className="space-y-1 text-muted-foreground ml-4">
                    <li>• Prima linie: Header (ignorat la procesare)</li>
                    <li>• Linii goale: Ignorate automat</li>
                    <li>• Numere: Format românesc (virgulă) SAU internațional (punct)</li>
                    <li>• Conturi: Minim 3 cifre, maxim 6 cifre</li>
                  </ul>
                </div>

                <div className="bg-muted/50 p-3 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2 text-xs">Exemplu structură:</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-1 font-mono">Cont</th>
                          <th className="text-left p-1 font-mono">Denumire</th>
                          <th className="text-right p-1 font-mono">SI Debit</th>
                          <th className="text-right p-1 font-mono">SI Credit</th>
                          <th className="text-right p-1 font-mono">Rulaj D</th>
                          <th className="text-right p-1 font-mono">Rulaj C</th>
                          <th className="text-right p-1 font-mono">SF Debit</th>
                          <th className="text-right p-1 font-mono">SF Credit</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b">
                          <td className="p-1 font-mono">1012</td>
                          <td className="p-1">Conturi la bănci</td>
                          <td className="text-right p-1 font-mono">50000.00</td>
                          <td className="text-right p-1 font-mono">0.00</td>
                          <td className="text-right p-1 font-mono">25000.00</td>
                          <td className="text-right p-1 font-mono">15000.00</td>
                          <td className="text-right p-1 font-mono">60000.00</td>
                          <td className="text-right p-1 font-mono">0.00</td>
                        </tr>
                        <tr>
                          <td className="p-1 font-mono">4111</td>
                          <td className="p-1">Venituri din vânzări</td>
                          <td className="text-right p-1 font-mono">0.00</td>
                          <td className="text-right p-1 font-mono">100000.00</td>
                          <td className="text-right p-1 font-mono">0.00</td>
                          <td className="text-right p-1 font-mono">50000.00</td>
                          <td className="text-right p-1 font-mono">0.00</td>
                          <td className="text-right p-1 font-mono">150000.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
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

      {/* View Accounts Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Conturi Balanță</DialogTitle>
            <DialogDescription>
              Lista completă a conturilor din balanța selectată
            </DialogDescription>
          </DialogHeader>
          
          {loadingAccounts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cont</TableHead>
                    <TableHead>Denumire</TableHead>
                    <TableHead className="text-right">SI Debit</TableHead>
                    <TableHead className="text-right">SI Credit</TableHead>
                    <TableHead className="text-right">Rulaj D</TableHead>
                    <TableHead className="text-right">Rulaj C</TableHead>
                    <TableHead className="text-right">SF Debit</TableHead>
                    <TableHead className="text-right">SF Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono">{account.account_code}</TableCell>
                      <TableCell>{account.account_name}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(account.opening_debit)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(account.opening_credit)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(account.debit_turnover)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(account.credit_turnover)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(account.closing_debit)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(account.closing_credit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IncarcareBalanta;
