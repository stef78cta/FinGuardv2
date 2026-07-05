import type { ColumnState } from 'ag-grid-community';

const INDICATOR_COL_IDS = new Set(['ag-Grid-AutoColumn', 'indicator']);

/**
 * Asigură că coloana Indicator rămâne vizibilă după restore layout.
 */
export function sanitizeFinancialGridColumnState(
  state: ColumnState[] | undefined,
): ColumnState[] | undefined {
  if (!state?.length) return state;
  return state.map((col) => {
    const colId = col.colId ?? '';
    if (INDICATOR_COL_IDS.has(colId)) {
      return {
        ...col,
        hide: false,
        pinned: 'left',
        width: Math.max(col.width ?? 320, 280),
      };
    }
    return col;
  });
}

export function isIndicatorColumn(colId: string | undefined): boolean {
  return INDICATOR_COL_IDS.has(colId ?? '');
}
