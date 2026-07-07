import type {
  CellClassParams,
  ColDef,
  ColGroupDef,
  ICellRendererParams,
} from 'ag-grid-community';
import { createNumberValueFormatter, coerceNumericValue } from '@/components/ag-grid/formatters';
import type { FinancialViewRow } from './financialTreeMapper';

const financialValueFormatter = createNumberValueFormatter({
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Shared numeric column sizing — indicator column absorbs extra horizontal space. */
const NUMERIC_COLUMN_DEFAULTS: Pick<
  ColDef<FinancialViewRow>,
  'type' | 'minWidth' | 'width' | 'maxWidth' | 'flex' | 'cellClass' | 'headerClass' | 'filter'
> = {
  type: 'numericColumn',
  minWidth: 200,
  width: 260,
  maxWidth: 320,
  flex: 0.35,
  cellClass: 'fin-value-cell ag-cell-numeric',
  headerClass: 'ag-header-numeric',
  filter: 'agNumberColumnFilter',
};
const amountCellClassRules = {
  'ag-cell-negative fin-value-negative': (p: CellClassParams<FinancialViewRow>) => {
    const value = coerceNumericValue(p.value);
    return value != null && value < 0;
  },
  'fin-value-zero': (p: CellClassParams<FinancialViewRow>) => {
    const value = coerceNumericValue(p.value);
    return value === 0;
  },
};

export interface BuildFinancialColumnsParams {
  selectedYear?: number | string;
  selectedPeriod?: string;
  hasPrevious?: boolean;
  debugMode?: boolean;
  /** Inner renderer for the hierarchical column (styled label + validation icon). */
  indicatorInnerRenderer: (params: ICellRendererParams<FinancialViewRow>) => React.ReactNode;
}

export interface FinancialColumnsResult {
  autoGroupColumnDef: ColDef<FinancialViewRow>;
  columnDefs: (ColDef<FinancialViewRow> | ColGroupDef<FinancialViewRow>)[];
}

/**
 * Build the financial report column configuration.
 *
 * The hierarchical "Indicator" column is returned as `autoGroupColumnDef` (the
 * Base grid turns it into the pinned tree column). The current value lives in a
 * year column group, ready to grow with YTD / month / comparative / budget
 * columns without structural changes.
 *
 * @param params - Selected period metadata, comparison flag, debug toggle and
 *   the indicator inner renderer.
 * @returns Column definitions plus the hierarchical column definition.
 */
export function buildFinancialColumns(params: BuildFinancialColumnsParams): FinancialColumnsResult {
  const { selectedYear, selectedPeriod, hasPrevious = false, debugMode = false, indicatorInnerRenderer } = params;

  const autoGroupColumnDef: ColDef<FinancialViewRow> = {
    colId: 'indicator',
    headerName: 'Indicator',
    field: 'displayLabel',
    minWidth: 520,
    width: 580,
    flex: 1,
    pinned: 'left',
    lockVisible: true,
    tooltipField: 'displayLabel',
    filter: 'agTextColumnFilter',
    cellRendererParams: { innerRenderer: indicatorInnerRenderer },
  };

  const valueHeader = selectedPeriod
    ? selectedPeriod
    : selectedYear
      ? `Total ${selectedYear}`
      : 'Valoare';

  const currentYearGroup: ColGroupDef<FinancialViewRow> = {
    headerName: selectedYear != null ? String(selectedYear) : 'Perioadă curentă',
    groupId: 'currentPeriod',
    marryChildren: true,
    children: [
      {
        colId: 'value',
        field: 'value',
        headerName: valueHeader,
        ...NUMERIC_COLUMN_DEFAULTS,
        minWidth: 240,
        width: 300,
        maxWidth: 360,
        flex: 0.4,
        headerClass: 'ag-header-numeric-centered',
        cellClassRules: amountCellClassRules,
        valueFormatter: financialValueFormatter,
      },
    ],
  };

  const columnDefs: (ColDef<FinancialViewRow> | ColGroupDef<FinancialViewRow>)[] = [currentYearGroup];

  if (hasPrevious) {
    columnDefs.push({
      colId: 'previous',
      field: 'previous',
      headerName: 'Perioadă anterioară',
      ...NUMERIC_COLUMN_DEFAULTS,
      cellClassRules: amountCellClassRules,
      valueFormatter: financialValueFormatter,
    });
    columnDefs.push({
      colId: 'delta',
      field: 'delta',
      headerName: 'Δ',
      ...NUMERIC_COLUMN_DEFAULTS,
      cellClassRules: amountCellClassRules,
      valueFormatter: financialValueFormatter,
    });
  }

  if (debugMode) {
    columnDefs.push(
      { colId: 'dbg-level', field: 'level', headerName: 'Nivel', type: 'numericColumn', width: 90 },
      { colId: 'dbg-status', field: 'status', headerName: 'Status', width: 110 },
      { colId: 'dbg-code', field: 'code', headerName: 'Cod', width: 100 },
      { colId: 'dbg-rowType', field: 'rowType', headerName: 'Tip rând', width: 120 },
      {
        colId: 'dbg-path',
        headerName: 'Path',
        minWidth: 200,
        valueGetter: (p) => (p.data as FinancialViewRow | undefined)?.path.join(' / '),
      },
    );
  }

  return { autoGroupColumnDef, columnDefs };
}
