import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { BalanceSheetEquationCheck } from '@/types/financialTree';
import type { BalanceSheetDiagnosticSummary } from '@/utils/balanceSheetDiagnostic';
import { formatFinancialValue } from '@/utils/formatFinancialValue';

interface BalanceSheetDiagnosticDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equation: BalanceSheetEquationCheck;
  diagnostic: BalanceSheetDiagnosticSummary | null;
  diagnosticLoading: boolean;
  currency?: string;
}

/**
 * Dialog diagnostic pentru diferența bilanțului și probleme de mapare.
 */
export function BalanceSheetDiagnosticDialog({
  open,
  onOpenChange,
  equation,
  diagnostic,
  diagnosticLoading,
  currency = 'RON',
}: BalanceSheetDiagnosticDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Diagnostic bilanț</DialogTitle>
          <DialogDescription>
            Analiză diferență și mapări conturi — nu modifică datele din baza de date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="rounded-lg border p-4 bg-muted/30">
            <h4 className="font-semibold mb-3">Ecuație bilanț</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                Active totale:{' '}
                <span className="font-mono font-medium">
                  {formatFinancialValue(equation.totalAssets, { currency })}
                </span>
              </div>
              <div>
                Total datorii și capitaluri:{' '}
                <span className="font-mono font-medium">
                  {formatFinancialValue(equation.totalLiabilitiesAndEquity, { currency })}
                </span>
              </div>
              <div className="sm:col-span-2 text-destructive font-medium">
                Diferență: {formatFinancialValue(equation.difference, { currency })}
              </div>
            </div>
          </section>

          <section>
            <h4 className="font-semibold mb-2">Cauze posibile</h4>
            <ul className="list-disc pl-5 text-sm space-y-1 text-muted-foreground">
              {(diagnostic?.possibleCauses ?? [
                'Conturi nemapate în pasiv/capitaluri.',
                'Rezultatul exercițiului (121) neinclus sau parțial.',
                'Datorii incomplete în clasele 4/5.',
                'Solduri creditoare/debitoare tratate incorect.',
              ]).map((cause) => (
                <li key={cause}>{cause}</li>
              ))}
            </ul>
          </section>

          {diagnosticLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : diagnostic && diagnostic.issues.length > 0 ? (
            <section>
              <div className="flex flex-wrap gap-2 mb-3">
                {diagnostic.unmappedCount > 0 && (
                  <Badge variant="destructive">{diagnostic.unmappedCount} nemapate</Badge>
                )}
                {diagnostic.wrongSignCount > 0 && (
                  <Badge variant="outline" className="border-amber-500 text-amber-700">
                    {diagnostic.wrongSignCount} semn suspect
                  </Badge>
                )}
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="table-financial w-full text-sm">
                  <thead>
                    <tr>
                      <th>Cont</th>
                      <th>Denumire</th>
                      <th>Tip</th>
                      <th className="text-right">Sold net</th>
                      <th>Observații</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostic.issues.slice(0, 100).map((issue) => (
                      <tr key={`${issue.type}-${issue.accountCode}`}>
                        <td className="font-mono">{issue.accountCode}</td>
                        <td>{issue.accountName}</td>
                        <td>{issue.type}</td>
                        <td className="text-right font-mono tabular-nums">
                          {formatFinancialValue(issue.netBalance, { currency, showCurrency: false })}
                        </td>
                        <td className="text-muted-foreground text-xs max-w-xs">{issue.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {diagnostic.issues.length > 100 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Afișate primele 100 din {diagnostic.issues.length} probleme.
                </p>
              )}
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nu s-au detectat conturi nemapate sau cu semn suspect în balanța brută. Diferența provine
              probabil din agregarea liniilor de raport (formule CALCULATED, conturi mixte 121/442).
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
