import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BalanceAccount } from '@/hooks/useBalante';
import { cn } from '@/lib/utils';

type BalanceViewFormat = '8_COLUMNS' | '10_COLUMNS';

interface BalanceAccountsViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: BalanceAccount[];
  loading: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  balanceFormat: BalanceViewFormat;
  onPrevPage: () => void;
  onNextPage: () => void;
  formatCurrency: (value: number) => string;
}

/** Lățimi fixe — fiecare coloană are dimensiune explicită, fără flex-grow. */
const COLUMN_WIDTHS = {
  account: 90,
  name: {
    '8_COLUMNS': 380,
    '10_COLUMNS': 320,
  },
  numeric: 160,
} as const;

const ACCOUNT_COL_CLASS =
  'w-[90px] min-w-[90px] max-w-[90px] overflow-hidden whitespace-nowrap';

const NAME_COL_CLASS = 'overflow-hidden text-ellipsis whitespace-nowrap';

const NUMERIC_COL_CLASS =
  'min-w-[160px] max-w-[160px] w-[160px] text-right whitespace-nowrap overflow-hidden text-clip tabular-nums';

/**
 * Lățimea minimă totală = suma lățimilor explicite ale coloanelor.
 * Tabelul nu comprimă coloanele sub aceste valori; scroll orizontal intern când e necesar.
 */
function getTableMinWidth(format: BalanceViewFormat): number {
  const numericCount = format === '10_COLUMNS' ? 8 : 6;
  return (
    COLUMN_WIDTHS.account +
    COLUMN_WIDTHS.name[format] +
    numericCount * COLUMN_WIDTHS.numeric
  );
}

/**
 * Dialog modal pentru vizualizarea conturilor din balanță.
 * Responsabilitate exclusiv de layout: dimensiune modal, tabel responsive 8/10 coloane.
 */
export function BalanceAccountsViewDialog({
  open,
  onOpenChange,
  accounts,
  loading,
  totalCount,
  page,
  pageSize,
  balanceFormat,
  onPrevPage,
  onNextPage,
  formatCurrency,
}: BalanceAccountsViewDialogProps) {
  const is10Columns = balanceFormat === '10_COLUMNS';
  const numericColumnCount = is10Columns ? 8 : 6;
  const nameColumnWidth = COLUMN_WIDTHS.name[balanceFormat];
  const tableMinWidth = getTableMinWidth(balanceFormat);
  const pageStart = totalCount > 0 ? page * pageSize + 1 : 0;
  const pageEnd = Math.min((page + 1) * pageSize, totalCount);
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col gap-4 overflow-hidden',
          'w-[96vw] max-w-[1720px] max-h-[92vh]',
          'p-[var(--newa-spacing-6)]',
        )}
      >
        <DialogHeader className="flex-shrink-0 space-y-1.5">
          <DialogTitle>Conturi Balanță</DialogTitle>
          <DialogDescription>
            {totalCount > 0 ? (
              <>
                Afișez {pageStart} - {pageEnd} din {totalCount} conturi
                {!is10Columns && (
                  <span className="text-muted-foreground"> · format 8 coloane</span>
                )}
              </>
            ) : (
              'Lista conturilor din balanța selectată'
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-auto rounded-md border border-[var(--newa-table-grid-border)]">
              <table
                className="caption-bottom text-sm table-fixed"
                style={{ minWidth: tableMinWidth }}
              >
                <colgroup>
                  <col style={{ width: COLUMN_WIDTHS.account }} />
                  <col style={{ width: nameColumnWidth }} />
                  {Array.from({ length: numericColumnCount }).map((_, index) => (
                    <col key={index} style={{ width: COLUMN_WIDTHS.numeric }} />
                  ))}
                </colgroup>

                <TableHeader className="sticky top-0 z-10 bg-[var(--newa-table-header-bg)]">
                  <TableRow>
                    <TableHead className={ACCOUNT_COL_CLASS}>Cont</TableHead>
                    <TableHead
                      className={NAME_COL_CLASS}
                      style={{ width: nameColumnWidth, maxWidth: nameColumnWidth }}
                    >
                      Denumire
                    </TableHead>
                    <TableHead className={NUMERIC_COL_CLASS}>SI Debit</TableHead>
                    <TableHead className={NUMERIC_COL_CLASS}>SI Credit</TableHead>
                    <TableHead className={NUMERIC_COL_CLASS}>Rulaj D</TableHead>
                    <TableHead className={NUMERIC_COL_CLASS}>Rulaj C</TableHead>
                    {is10Columns && (
                      <>
                        <TableHead className={NUMERIC_COL_CLASS}>Tot. Debit</TableHead>
                        <TableHead className={NUMERIC_COL_CLASS}>Tot. Credit</TableHead>
                      </>
                    )}
                    <TableHead className={NUMERIC_COL_CLASS}>SF Debit</TableHead>
                    <TableHead className={NUMERIC_COL_CLASS}>SF Credit</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className={cn(ACCOUNT_COL_CLASS, 'font-mono text-sm')}>
                        {account.account_code}
                      </TableCell>
                      <TableCell
                        className={cn(NAME_COL_CLASS, 'text-sm')}
                        style={{ width: nameColumnWidth, maxWidth: nameColumnWidth }}
                        title={account.account_name}
                      >
                        {account.account_name}
                      </TableCell>
                      <TableCell className={cn(NUMERIC_COL_CLASS, 'font-mono text-sm')}>
                        {formatCurrency(account.opening_debit)}
                      </TableCell>
                      <TableCell className={cn(NUMERIC_COL_CLASS, 'font-mono text-sm')}>
                        {formatCurrency(account.opening_credit)}
                      </TableCell>
                      <TableCell className={cn(NUMERIC_COL_CLASS, 'font-mono text-sm')}>
                        {formatCurrency(account.debit_turnover)}
                      </TableCell>
                      <TableCell className={cn(NUMERIC_COL_CLASS, 'font-mono text-sm')}>
                        {formatCurrency(account.credit_turnover)}
                      </TableCell>
                      {is10Columns && (
                        <>
                          <TableCell className={cn(NUMERIC_COL_CLASS, 'font-mono text-sm')}>
                            {formatCurrency(account.total_sume_debitoare ?? 0)}
                          </TableCell>
                          <TableCell className={cn(NUMERIC_COL_CLASS, 'font-mono text-sm')}>
                            {formatCurrency(account.total_sume_creditoare ?? 0)}
                          </TableCell>
                        </>
                      )}
                      <TableCell className={cn(NUMERIC_COL_CLASS, 'font-mono text-sm')}>
                        {formatCurrency(account.closing_debit)}
                      </TableCell>
                      <TableCell className={cn(NUMERIC_COL_CLASS, 'font-mono text-sm')}>
                        {formatCurrency(account.closing_credit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </table>
            </div>

            {totalCount > pageSize && (
              <div className="flex flex-shrink-0 items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Pagina {page + 1} din {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPrevPage}
                    disabled={page === 0 || loading}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onNextPage}
                    disabled={(page + 1) * pageSize >= totalCount || loading}
                  >
                    Următor
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
