import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ParsedAccount, ValidationWarning } from '@/lib/excel-parser';
import type { BalanceUploadTotals } from '@/hooks/useBalanceUploadForm';
import { BALANCE_PREVIEW_ROW_LIMIT } from '@/hooks/useBalanceUploadForm';

interface BalanceUploadPreviewProps {
  fileName: string;
  accountsCount: number;
  previewData: ParsedAccount[];
  totals: BalanceUploadTotals | null;
  validationErrors: string[];
  validationWarnings: ValidationWarning[];
  duplicateAccounts: string[];
  uploadErrorMessage: string | null;
  isParsing: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Afișează preview-ul fișierului selectat: totaluri, erori, warnings și primele rânduri.
 */
export function BalanceUploadPreview({
  fileName,
  accountsCount,
  previewData,
  totals,
  validationErrors,
  validationWarnings,
  duplicateAccounts,
  uploadErrorMessage,
  isParsing,
}: BalanceUploadPreviewProps) {
  if (isParsing) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-sm text-muted-foreground text-center">
          Se analizează fișierul „{fileName}”...
        </CardContent>
      </Card>
    );
  }

  const hasBlockingErrors = validationErrors.length > 0;
  const hasWarnings = validationWarnings.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={hasBlockingErrors ? 'destructive' : 'default'}>
          {accountsCount} conturi detectate
        </Badge>
        {!hasBlockingErrors && accountsCount > 0 && (
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Validare structurală OK
          </Badge>
        )}
      </div>

      {uploadErrorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Eroare</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{uploadErrorMessage}</AlertDescription>
        </Alert>
      )}

      {hasBlockingErrors &&
        validationErrors.map((error, index) => (
          <Alert key={`error-${index}`} variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Eroare de validare</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{error}</AlertDescription>
          </Alert>
        ))}

      {duplicateAccounts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Conturi duplicate</AlertTitle>
          <AlertDescription>{duplicateAccounts.join(', ')}</AlertDescription>
        </Alert>
      )}

      {hasWarnings && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Avertismente ({validationWarnings.length})</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1 mt-2">
              {validationWarnings.slice(0, 5).map((warning) => (
                <li key={warning.code}>{warning.message}</li>
              ))}
              {validationWarnings.length > 5 && (
                <li>+{validationWarnings.length - 5} avertismente suplimentare</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {totals && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Totaluri calculate din fișier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground mb-1">Sold inițial</p>
                <p>D: {formatCurrency(totals.opening_debit)}</p>
                <p>C: {formatCurrency(totals.opening_credit)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground mb-1">Rulaje</p>
                <p>D: {formatCurrency(totals.debit_turnover)}</p>
                <p>C: {formatCurrency(totals.credit_turnover)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground mb-1">Sold final</p>
                <p>D: {formatCurrency(totals.closing_debit)}</p>
                <p>C: {formatCurrency(totals.closing_credit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {previewData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Preview tabel ({Math.min(previewData.length, BALANCE_PREVIEW_ROW_LIMIT)} din{' '}
              {accountsCount} conturi)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cont</TableHead>
                  <TableHead>Denumire</TableHead>
                  <TableHead className="text-right">SI D</TableHead>
                  <TableHead className="text-right">SI C</TableHead>
                  <TableHead className="text-right">SF D</TableHead>
                  <TableHead className="text-right">SF C</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row) => (
                  <TableRow key={row.account_code}>
                    <TableCell className="font-mono text-sm">{row.account_code}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={row.account_name}>
                      {row.account_name}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.opening_debit)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.opening_credit)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.closing_debit)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.closing_credit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
