import { useState } from 'react';
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
  FileX
} from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BalantaItem {
  id: string;
  fileName: string;
  referenceDate: Date;
  uploadDate: Date;
  accountsCount: number;
  totalDebit: number;
  totalCredit: number;
  status: 'processed' | 'processing' | 'error';
}

const mockBalante: BalantaItem[] = [
  {
    id: '1',
    fileName: 'balanta_decembrie_2024.xlsx',
    referenceDate: new Date('2024-12-31'),
    uploadDate: new Date('2025-01-15T10:30:00'),
    accountsCount: 156,
    totalDebit: 2456789.50,
    totalCredit: 2456789.50,
    status: 'processed'
  },
  {
    id: '2',
    fileName: 'balanta_noiembrie_2024.xlsx',
    referenceDate: new Date('2024-11-30'),
    uploadDate: new Date('2024-12-10T14:20:00'),
    accountsCount: 148,
    totalDebit: 2123456.75,
    totalCredit: 2123456.75,
    status: 'processed'
  },
  {
    id: '3',
    fileName: 'balanta_octombrie_2024.xlsx',
    referenceDate: new Date('2024-10-31'),
    uploadDate: new Date('2024-11-08T09:15:00'),
    accountsCount: 142,
    totalDebit: 1987654.20,
    totalCredit: 1987654.20,
    status: 'processed'
  }
];

const IncarcareBalanta = () => {
  const [referenceDate, setReferenceDate] = useState<Date>();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [dateError, setDateError] = useState(false);
  const [balante, setBalante] = useState<BalantaItem[]>(mockBalante);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBalantaId, setSelectedBalantaId] = useState<string | null>(null);
  const [specsOpen, setSpecsOpen] = useState(false);

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

  const handleUpload = () => {
    if (!referenceDate) {
      setDateError(true);
      toast.error('Data de referință este obligatorie');
      return;
    }

    if (!uploadedFile) {
      toast.error('Vă rugăm să selectați un fișier');
      return;
    }

    setDateError(false);
    setUploadStatus('uploading');
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setUploadStatus('success');
        toast.success('Balanța a fost încărcată cu succes!');
        
        // Add to list
        const newBalanta: BalantaItem = {
          id: Date.now().toString(),
          fileName: uploadedFile.name,
          referenceDate: referenceDate,
          uploadDate: new Date(),
          accountsCount: Math.floor(Math.random() * 200) + 100,
          totalDebit: Math.random() * 3000000,
          totalCredit: Math.random() * 3000000,
          status: 'processed'
        };
        setBalante([newBalanta, ...balante]);
        
        // Reset form
        setTimeout(() => {
          setUploadedFile(null);
          setUploadStatus('idle');
          setUploadProgress(0);
        }, 1500);
      }
    }, 200);
  };

  const handleDelete = (id: string) => {
    setSelectedBalantaId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedBalantaId) {
      setBalante(balante.filter(b => b.id !== selectedBalantaId));
      toast.success('Balanța a fost ștearsă cu succes');
    }
    setDeleteDialogOpen(false);
    setSelectedBalantaId(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="container-app">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Încărcare Balanță</h1>
        <p className="page-description">
          Încărcați și procesați balanțe contabile
        </p>
      </div>

      {/* Main Container */}
      <Card className="overflow-hidden">
        {/* Header Section */}
        <div className="bg-muted/30 p-6 border-b">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="w-6 h-6 text-primary mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">
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
        <div className="p-6 border-b">
          <div className="max-w-sm">
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
                      Se încarcă... {uploadProgress}%
                    </p>
                  </div>
                )}
                
                <Button 
                  onClick={handleUpload} 
                  className="w-full"
                  disabled={uploadStatus === 'uploading'}
                >
                  {uploadStatus === 'uploading' ? 'Se procesează...' : 'Încarcă balanța'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Lista Balanțe Încărcate */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-foreground mb-4">Balanțe Încărcate</h3>
          
          {balante.length === 0 ? (
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
                    <TableHead>Data Referință</TableHead>
                    <TableHead>Data Încărcare</TableHead>
                    <TableHead className="text-right">Nr. Conturi</TableHead>
                    <TableHead className="text-right">Total Debit</TableHead>
                    <TableHead className="text-right">Total Credit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balante.map((balanta) => (
                    <TableRow key={balanta.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">{balanta.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(balanta.referenceDate, "dd.MM.yyyy", { locale: ro })}
                      </TableCell>
                      <TableCell>
                        {format(balanta.uploadDate, "dd.MM.yyyy HH:mm", { locale: ro })}
                      </TableCell>
                      <TableCell className="text-right">{balanta.accountsCount}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(balanta.totalDebit)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(balanta.totalCredit)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            balanta.status === 'processed' ? 'default' :
                            balanta.status === 'processing' ? 'secondary' : 'destructive'
                          }
                        >
                          {balanta.status === 'processed' ? 'Procesat' :
                           balanta.status === 'processing' ? 'În procesare' : 'Eroare'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Descarcă</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Vizualizează</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(balanta.id)}
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
                  ))}
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
    </div>
  );
};

export default IncarcareBalanta;
