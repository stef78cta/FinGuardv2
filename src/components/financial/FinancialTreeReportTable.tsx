import { useEffect, useMemo, useRef, useState } from 'react';
import type { ICellRendererParams, RowClassParams } from 'ag-grid-community';
import { AlertTriangle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { BaseAgGridTreeTable } from '@/components/ag-grid/BaseAgGridTreeTable';
import type {
  BaseAgGridTreeTableHandle,
  BaseAgGridTreeTableProps,
} from '@/components/ag-grid/BaseAgGridTreeTable.types';
import type { FinancialTreeRow } from '@/types/financialTree';
import { buildFinancialColumns } from './financialTreeColumns';
import { mapFinancialTreeRows, type FinancialViewRow } from './financialTreeMapper';

import './financialTreeStyles.css';

const DEFAULT_LAYOUT_KEY = 'finguard.financialTreeReport.layout.v1';

/**
 * Concrete, typed alias of the generic Base grid.
 *
 * Avoids the `<Component<T>>` generic-in-JSX syntax, which the dev SWC tagger
 * plugin cannot parse, while preserving full type safety for our row type.
 */
const FinancialBaseGrid = BaseAgGridTreeTable as (
  props: BaseAgGridTreeTableProps<FinancialViewRow> & {
    ref?: React.Ref<BaseAgGridTreeTableHandle>;
  },
) => React.ReactElement | null;

/**
 * Props for {@link FinancialTreeReportTable}.
 *
 * `currency` is kept for backward compatibility but is intentionally NOT
 * rendered — values are shown without a currency suffix.
 */
export interface FinancialTreeReportTableProps {
  rows: FinancialTreeRow[];
  /** Reserved for future custom column overrides. */
  columns?: unknown[];
  selectedYear?: number | string;
  selectedPeriod?: string;
  loading?: boolean;
  debugMode?: boolean;
  /** Kept for compatibility; not displayed in values. */
  currency?: string;
  /** localStorage key for layout persistence. */
  localStorageKey?: string;
  onRowExpand?: (row: FinancialViewRow) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

/** Styled label + validation marker for the hierarchical column. */
function IndicatorInnerRenderer(params: ICellRendererParams<FinancialViewRow>) {
  const data = params.data;
  const label = (params.value as string) ?? data?.displayLabel ?? '';
  if (!data) return <span className="truncate">{label}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0 w-full">
      {data.hasValidationIssue && (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-label="Diferență validare" />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}

/**
 * Professional financial statement tree table.
 *
 * Adapts financial rows to a presentation view-model and renders them through
 * the generic {@link BaseAgGridTreeTable}. Contains only financial mapping,
 * styling and column configuration — no generic grid plumbing and no
 * calculation logic.
 */
export function FinancialTreeReportTable({
  rows,
  selectedYear,
  selectedPeriod,
  loading = false,
  debugMode = false,
  localStorageKey = DEFAULT_LAYOUT_KEY,
  onRowExpand,
  onExpandAll,
  onCollapseAll,
}: FinancialTreeReportTableProps) {
  const gridRef = useRef<BaseAgGridTreeTableHandle>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchText), 250);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const viewRows = useMemo(() => mapFinancialTreeRows(rows), [rows]);

  const hasPrevious = useMemo(() => viewRows.some((r) => r.previous != null), [viewRows]);

  const { autoGroupColumnDef, columnDefs } = useMemo(
    () =>
      buildFinancialColumns({
        selectedYear,
        selectedPeriod,
        hasPrevious,
        debugMode,
        indicatorInnerRenderer: IndicatorInnerRenderer,
      }),
    [selectedYear, selectedPeriod, hasPrevious, debugMode],
  );

  const getRowClass = useMemo(
    () => (params: RowClassParams<FinancialViewRow>) => {
      const data = params.data;
      if (!data) return undefined;
      const classes: string[] = [];
      if (data.rowType === 'section') {
        classes.push(data.level === 0 ? 'fin-row-section' : 'fin-row-section-l1');
      } else if (data.rowType === 'subtotal') {
        classes.push('fin-row-subtotal');
      } else if (data.rowType === 'account') {
        classes.push('fin-row-account');
      }
      if (data.hasValidationIssue) classes.push('fin-row-warning');
      return classes.length ? classes : undefined;
    },
    [],
  );

  const searchInput = (
    <div className="relative flex-1 min-w-[200px] max-w-sm">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder="Căutare indicator..."
        className="pl-9 h-9"
      />
    </div>
  );

  return (
    <div className={cn('financial-tree-report')}>
      <FinancialBaseGrid
        ref={gridRef}
        rowData={viewRows}
        columnDefs={columnDefs}
        autoGroupColumnDef={autoGroupColumnDef}
        treeData
        getDataPath={(data) => data.path}
        getRowId={(data) => data.id}
        groupDefaultExpanded={2}
        loading={loading}
        quickFilterText={debouncedSearch}
        localStorageKey={localStorageKey}
        toolbarLeading={searchInput}
        onExpandAll={onExpandAll}
        onCollapseAll={onCollapseAll}
        onRowGroupOpened={(e) => {
          if (e.expanded) onRowExpand?.(e.data);
        }}
        gridOptions={{ getRowClass }}
      />
    </div>
  );
}

