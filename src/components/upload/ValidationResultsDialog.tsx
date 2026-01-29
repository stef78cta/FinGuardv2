/**
 * Componenta ValidationResultsDialog
 * 
 * v1.3: Dialog modal pentru afișarea rezultatelor validării balanței
 * înainte de confirmare upload.
 * 
 * Afișează:
 * - Totaluri calculate (debit, credit, diferențe)
 * - Erori blocante (cu detalii)
 * - Warnings non-blocante
 * - Info (observații)
 * 
 * UX:
 * - Erori → Upload blocat, trebuie corectat fișierul
 * - Warnings → Upload permis, dar avertizare
 * - Info → Upload permis, informații utile
 */

import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { BalanceValidationResult, ValidationResult } from '@/utils/balanceValidation';

interface ValidationResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validationResult: BalanceValidationResult | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Componenta pentru afișarea unui singur rezultat de validare.
 */
const ValidationResultItem: React.FC<{
  result: ValidationResult;
  defaultOpen?: boolean;
}> = ({ result, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const getIcon = () => {
    switch (result.severity) {
      case 'error':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'info':
        return <Info className="w-5 h-5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getSeverityBadge = () => {
    switch (result.severity) {
      case 'error':
        return <Badge variant="destructive">Eroare</Badge>;
      case 'warning':
        return <Badge className="bg-warning text-warning-foreground">Avertizare</Badge>;
      case 'info':
        return <Badge variant="secondary">Info</Badge>;
      default:
        return null;
    }
  };

  const hasDetails = result.details || (result.affectedAccounts && result.affectedAccounts.length > 0);

  return (
    <div
      className={cn(
        'rounded-lg border p-3 mb-2',
        result.severity === 'error' && 'border-destructive bg-destructive/5',
        result.severity === 'warning' && 'border-warning bg-warning/5',
        result.severity === 'info' && 'border-muted bg-muted/5'
      )}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getSeverityBadge()}
            <span className="text-xs text-muted-foreground font-mono">{result.code}</span>
          </div>
          <p className="text-sm text-foreground">{result.message}</p>

          {hasDetails && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 p-0 text-xs">
                  {isOpen ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Ascunde detalii
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Arată detalii
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                {result.details && (
                  <div className="bg-background/50 rounded p-2 mb-2">
                    <p className="text-xs font-semibold mb-1">Detalii:</p>
                    <pre className="text-xs text-muted-foreground overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
                {result.affectedAccounts && result.affectedAccounts.length > 0 && (
                  <div className="bg-background/50 rounded p-2">
                    <p className="text-xs font-semibold mb-1">
                      Conturi afectate ({result.affectedAccounts.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {result.affectedAccounts.slice(0, 20).map((code, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs font-mono">
                          {code}
                        </Badge>
                      ))}
                      {result.affectedAccounts.length > 20 && (
                        <Badge variant="outline" className="text-xs">
                          +{result.affectedAccounts.length - 20} mai multe
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Dialog principal pentru rezultatele validării.
 */
export const ValidationResultsDialog: React.FC<ValidationResultsDialogProps> = ({
  open,
  onOpenChange,
  validationResult,
  onConfirm,
  onCancel,
}) => {
  if (!validationResult) return null;

  const { isValid, errors, warnings, info, totals } = validationResult;

  // Calculăm diferențele pentru totaluri
  const openingDiff = totals.opening_debit - totals.opening_credit;
  const turnoverDiff = totals.debit_turnover - totals.credit_turnover;
  const closingDiff = totals.closing_debit - totals.closing_credit;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getDiffBadge = (diff: number) => {
    const isBalanced = Math.abs(diff) <= 1;
    return (
      <Badge variant={isBalanced ? 'default' : 'destructive'} className="ml-2">
        {isBalanced ? (
          <>
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Echilibrat
          </>
        ) : (
          <>
            <XCircle className="w-3 h-3 mr-1" />
            Diferență: {formatCurrency(diff)}
          </>
        )}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isValid ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-primary" />
                Validare Reușită
              </>
            ) : (
              <>
                <AlertCircle className="w-6 h-6 text-destructive" />
                Erori de Validare
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isValid
              ? 'Balanța a trecut toate verificările critice. Revizuiește totalurile și avertizările înainte de încărcare.'
              : 'Balanța conține erori critice care trebuie corectate înainte de încărcare.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Totaluri */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Totaluri Calculate</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Conturi</p>
                  <p className="text-lg font-semibold">{totals.accounts_count}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 col-span-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Solduri Inițiale
                    {getDiffBadge(openingDiff)}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Debit:</span>
                      <span className="font-mono ml-2">{formatCurrency(totals.opening_debit)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Credit:</span>
                      <span className="font-mono ml-2">{formatCurrency(totals.opening_credit)}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 col-span-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Rulaje
                    {getDiffBadge(turnoverDiff)}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Debit:</span>
                      <span className="font-mono ml-2">{formatCurrency(totals.debit_turnover)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Credit:</span>
                      <span className="font-mono ml-2">{formatCurrency(totals.credit_turnover)}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 col-span-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Solduri Finale
                    {getDiffBadge(closingDiff)}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Debit:</span>
                      <span className="font-mono ml-2">{formatCurrency(totals.closing_debit)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Credit:</span>
                      <span className="font-mono ml-2">{formatCurrency(totals.closing_credit)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Erori Critice */}
            {errors.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  Erori Critice ({errors.length})
                </h3>
                <Alert variant="destructive" className="mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Aceste erori trebuie corectate în fișierul Excel înainte de reîncărcare.
                  </AlertDescription>
                </Alert>
                {errors.map((error, idx) => (
                  <ValidationResultItem key={idx} result={error} defaultOpen={idx === 0} />
                ))}
              </div>
            )}

            {/* Avertizări */}
            {warnings.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Avertizări ({warnings.length})
                </h3>
                <Alert className="mb-3 border-warning bg-warning/5">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertDescription>
                    Poți continua cu încărcarea, dar revizuiește aceste avertizări.
                  </AlertDescription>
                </Alert>
                {warnings.map((warning, idx) => (
                  <ValidationResultItem key={idx} result={warning} />
                ))}
              </div>
            )}

            {/* Informații */}
            {info.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  Informații ({info.length})
                </h3>
                {info.map((infoItem, idx) => (
                  <ValidationResultItem key={idx} result={infoItem} />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onCancel}>
            Anulează
          </Button>
          <Button onClick={onConfirm} disabled={!isValid}>
            {isValid ? 'Confirmă Încărcarea' : 'Corectează Erorile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
