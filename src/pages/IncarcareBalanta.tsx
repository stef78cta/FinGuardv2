import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import {
  Upload,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  Info,
  Download,
  AlertCircle,
  X,
  RotateCcw,
  Table2,
  History,
  Eye,
  Trash2,
  MoreVertical,
  FileX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Balance {
  id: string;
  referenceDate: Date;
  fileName: string;
  uploadedAt: Date;
  recordCount: number;
  status: 'processing' | 'processed' | 'error';
}

const IncarcareBalanta = () => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [referenceDate, setReferenceDate] = useState<Date>();
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Mock balances data
  const [balances, setBalances] = useState<Balance[]>([
    {
      id: '1',
      referenceDate: new Date(2024, 11, 31),
      fileName: 'balanta_decembrie_2024.xlsx',
      uploadedAt: new Date(2025, 0, 5, 10, 30),
      recordCount: 342,
      status: 'processed',
    },
    {
      id: '2',
      referenceDate: new Date(2024, 10, 30),
      fileName: 'balanta_noiembrie_2024.xlsx',
      uploadedAt: new Date(2024, 11, 5, 14, 15),
      recordCount: 338,
      status: 'processed',
    },
  ]);

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    setError(null);

    // Validate file type
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError('Format invalid');
      toast({
        title: 'Format invalid',
        description: 'Vă rugăm să încărcați un fișier Excel (.xlsx sau .xls)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('Fișier prea mare');
      toast({
        title: 'Fișier prea mare',
        description: 'Dimensiunea maximă acceptată este 10 MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleUpload = () => {
    if (!file || !referenceDate) return;

    // Validate date is not in future
    if (referenceDate > new Date()) {
      toast({
        title: 'Data invalidă',
        description: 'Data de referință nu poate fi în viitor',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);

          // Add to balances list
          const newBalance: Balance = {
            id: Date.now().toString(),
            referenceDate: referenceDate,
            fileName: file.name,
            uploadedAt: new Date(),
            recordCount: Math.floor(Math.random() * 400) + 200,
            status: 'processed',
          };
          setBalances([newBalance, ...balances]);

          toast({
            title: 'Balanță încărcată cu succes!',
            description: `Fișierul "${file.name}" a fost procesat cu succes`,
          });

          resetForm();
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const resetForm = () => {
    setFile(null);
    setReferenceDate(undefined);
    setError(null);
    setUploadProgress(0);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    toast({
      title: 'Descărcare în curs...',
      description: 'Șablonul Excel va fi descărcat în curând',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Încărcare Balanță</h1>
        <p className="text-foreground-secondary">
          Încărcați și procesați balanțe contabile pentru analiză
        </p>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Upload Section - Left Column (65%) */}
        <div className="lg:col-span-2">
          <Card className="border-2 border-border shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader className="border-b bg-gradient-to-r from-primary-indigo/10 to-primary-indigo-dark/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shrink-0">
                  <Upload className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">
                    Încărcare Balanță de Verificare
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Încărcați fișierul Excel cu balanța contabilă pentru procesare automată
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1">
                  Data de Referință
                  <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !referenceDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {referenceDate
                        ? format(referenceDate, 'dd.MM.yyyy', { locale: ro })
                        : 'Selectați data balanței...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={referenceDate}
                      onSelect={setReferenceDate}
                      disabled={(date) => date > new Date()}
                      locale={ro}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Upload Zone */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">
                  Fișier Balanță <span className="text-destructive">*</span>
                </Label>
                <div
                  className={cn(
                    'relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer',
                    isDragActive && 'border-primary bg-primary/5 scale-[1.02]',
                    file && !error && 'border-accent-emerald bg-accent-emerald/5',
                    error && 'border-destructive bg-destructive/5',
                    !file && !isDragActive && !error && 'border-border hover:border-primary/50 hover:bg-surface'
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />

                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>

                    <div>
                      <p className="text-lg font-semibold text-foreground mb-1">
                        Trageți fișierul aici sau
                      </p>
                      <Button
                        variant="link"
                        className="text-primary font-semibold p-0 h-auto"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          inputRef.current?.click();
                        }}
                      >
                        răsfoiți computerul
                      </Button>
                    </div>

                    <p className="text-sm text-foreground-secondary">
                      Format acceptat: Excel (.xlsx, .xls) • Max 10MB
                    </p>
                  </div>
                </div>
              </div>

              {/* File Preview */}
              {file && (
                <div className="flex items-center gap-3 p-4 bg-accent-emerald/10 border border-accent-emerald/30 rounded-lg">
                  <FileSpreadsheet className="w-8 h-8 text-accent-emerald shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{file.name}</p>
                    <p className="text-sm text-foreground-secondary">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    className="shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">Se încarcă...</span>
                    <span className="text-foreground-secondary">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  className="flex-1 bg-gradient-primary hover:shadow-lg transition-all duration-300"
                  disabled={!file || !referenceDate || isUploading}
                  onClick={handleUpload}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Încarcă Balanța
                </Button>
                <Button variant="outline" onClick={resetForm} disabled={isUploading}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Resetează
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Specifications Section - Right Column (35%) */}
        <div className="lg:col-span-1">
          <Card className="border border-border bg-gradient-to-br from-surface to-surface-elevated sticky top-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                Specificații Fișier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Format Fișier */}
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-foreground">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  Format acceptat
                </h4>
                <ul className="text-sm text-foreground-secondary space-y-1 pl-6">
                  <li>• Excel (.xlsx, .xls)</li>
                  <li>• Dimensiune maximă: 10 MB</li>
                </ul>
              </div>

              <Separator />

              {/* Structură Necesară */}
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-foreground">
                  <Table2 className="w-4 h-4 text-primary" />
                  Structură coloane
                </h4>
                <div className="bg-surface-elevated border border-border rounded-lg p-3 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-foreground-secondary">A</div>
                    <div className="font-semibold text-foreground">Cont</div>

                    <div className="text-foreground-secondary">B</div>
                    <div className="font-semibold text-foreground">Denumire</div>

                    <div className="text-foreground-secondary">C</div>
                    <div className="font-semibold text-foreground">Sold Inițial Debit</div>

                    <div className="text-foreground-secondary">D</div>
                    <div className="font-semibold text-foreground">Sold Inițial Credit</div>

                    <div className="text-foreground-secondary">E</div>
                    <div className="font-semibold text-foreground">Rulaj Debit</div>

                    <div className="text-foreground-secondary">F</div>
                    <div className="font-semibold text-foreground">Rulaj Credit</div>

                    <div className="text-foreground-secondary">G</div>
                    <div className="font-semibold text-foreground">Sold Final Debit</div>

                    <div className="text-foreground-secondary">H</div>
                    <div className="font-semibold text-foreground">Sold Final Credit</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Informații Importante */}
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  <div className="text-xs text-foreground">
                    <p className="font-semibold mb-1">Important:</p>
                    <ul className="space-y-1 list-disc list-inside text-foreground-secondary">
                      <li>Prima linie trebuie să conțină antetele coloanelor</li>
                      <li>Numerele trebuie formatate corect (fără caractere speciale)</li>
                      <li>Data de referință trebuie să corespundă cu perioada balanței</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Download Template Button */}
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={downloadTemplate}
              >
                <Download className="mr-2 h-4 w-4" />
                Descarcă șablon Excel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Uploaded Balances Section */}
      <Card className="shadow-soft">
        <CardHeader className="border-b bg-surface">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Balanțe Încărcate Recent</CardTitle>
              <CardDescription className="mt-1">
                Istoric al ultimelor balanțe procesate
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <History className="mr-2 h-4 w-4" />
              Vezi Toate
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface hover:bg-surface">
                  <TableHead className="font-semibold">Data Balanței</TableHead>
                  <TableHead className="font-semibold">Nume Fișier</TableHead>
                  <TableHead className="font-semibold">Data Încărcării</TableHead>
                  <TableHead className="font-semibold">Nr. Înregistrări</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <FileX className="w-12 h-12 text-muted-foreground" />
                        <p className="text-foreground-secondary">
                          Nu există balanțe încărcate încă
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  balances.map((balance) => (
                    <TableRow key={balance.id} className="hover:bg-surface/50">
                      <TableCell className="font-medium">
                        {format(balance.referenceDate, 'dd.MM.yyyy', { locale: ro })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-accent-emerald shrink-0" />
                          <span className="truncate max-w-xs">{balance.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground-secondary">
                        {format(balance.uploadedAt, 'dd.MM.yyyy HH:mm', { locale: ro })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{balance.recordCount} linii</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={balance.status === 'processed' ? 'default' : 'secondary'}
                          className={
                            balance.status === 'processed'
                              ? 'bg-accent-emerald text-accent-foreground'
                              : ''
                          }
                        >
                          {balance.status === 'processed' ? 'Procesată' : 'În procesare'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Vizualizează
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Descarcă
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Șterge
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncarcareBalanta;
