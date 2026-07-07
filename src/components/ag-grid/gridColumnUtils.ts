import type { Column, DefaultMenuItem, GetMainMenuItemsParams, GridApi, MenuItemDef } from 'ag-grid-community';

/**
 * Clamp column widths to each column's minWidth / maxWidth after autosize.
 */
export function clampColumnWidths(api: GridApi, colIds?: string[]): void {
  const columns: Column[] = colIds
    ? colIds.map((id) => api.getColumn(id)).filter((c): c is Column => c != null)
    : (api.getAllGridColumns() ?? []);

  const state = columns
    .map((col) => {
      const def = col.getColDef();
      let width = col.getActualWidth();
      if (def.minWidth != null && width < def.minWidth) width = def.minWidth;
      if (def.maxWidth != null && width > def.maxWidth) width = def.maxWidth;
      return { colId: col.getColId(), width };
    })
    .filter((entry) => entry.colId);

  if (state.length) {
    api.applyColumnState({ state });
  }
}

/** Autosize all columns, then enforce min/max width constraints from colDef. */
export function autosizeAllColumnsWithLimits(api: GridApi): void {
  api.autoSizeAllColumns(false);
  clampColumnWidths(api);
}

/** Autosize one column, then enforce min/max width constraints from colDef. */
export function autosizeColumnWithLimits(api: GridApi, colId: string): void {
  api.autoSizeColumns([colId], false);
  clampColumnWidths(api, [colId]);
}

/**
 * Community-compatible column header menu items (pin, hide, autosize).
 *
 * Extends AG Grid defaults with Romanian labels for custom actions while
 * keeping built-in filter / sort / pin submenu items when available.
 */
export function buildColumnMainMenuItems<TData = any>(
  params: GetMainMenuItemsParams<TData>,
): (DefaultMenuItem | MenuItemDef<TData>)[] {
  const colId = params.column?.getColId();
  const api = params.api;
  const isPinned = Boolean(params.column?.getPinned());
  const defaultItems = params.defaultItems ?? [];

  const customItems: MenuItemDef<TData>[] = [];

  if (colId && params.column) {
    customItems.push(
      {
        name: isPinned ? 'Anulează fixarea' : 'Fixează la stânga',
        action: () => {
          api.applyColumnState({
            state: [{ colId, pinned: isPinned ? null : 'left' }],
          });
        },
      },
      {
        name: 'Ascunde coloana',
        action: () => {
          api.applyColumnState({ state: [{ colId, hide: true }] });
        },
      },
      {
        name: 'Autosize coloana curentă',
        action: () => autosizeColumnWithLimits(api, colId),
      },
    );
  }

  customItems.push({
    name: 'Autosize toate coloanele',
    action: () => autosizeAllColumnsWithLimits(api),
  });

  return [...defaultItems, 'separator', ...customItems];
}
