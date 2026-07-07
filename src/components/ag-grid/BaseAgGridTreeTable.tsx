import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type ColGroupDef,
  type GridApi,
  type GridReadyEvent,
  type ICellRendererParams,
} from 'ag-grid-community';
import { ChevronDown, ChevronRight, Loader2, Maximize2, RotateCcw, Save, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GridColumnChooser } from './GridColumnChooser';
import { autosizeAllColumnsWithLimits, buildColumnMainMenuItems } from './gridColumnUtils';
import type {
  BaseAgGridTreeTableHandle,
  BaseAgGridTreeTableProps,
  TreeNodeMeta,
} from './BaseAgGridTreeTable.types';
import { clearGridLayout, loadGridLayout, saveGridLayout } from './gridLayoutStorage';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const PATH_SEP = '\u0000';
const DEFAULT_INDENT = 16;

type AnyRow = Record<string, unknown>;

interface InternalNode {
  id: string;
  level: number;
  hasChildren: boolean;
  parentId: string | null;
}

interface SortState {
  colId: string;
  sort: 'asc' | 'desc';
}

/**
 * Cell renderer params injected by the Base grid into the hierarchical column.
 * @internal
 */
interface TreeCellParams extends ICellRendererParams {
  ctxGetId: (data: AnyRow) => string;
  ctxMeta: Map<string, InternalNode>;
  ctxIsExpanded: (id: string) => boolean;
  ctxToggle: (id: string) => void;
  ctxIndent: number;
  ctxInnerRenderer?: (params: ICellRendererParams) => React.ReactNode;
}

/**
 * Renders the first hierarchical column: level indentation + expand/collapse
 * chevron + the node's display content. Purely presentational; state lives in
 * the parent Base grid.
 */
function TreeGroupCellRenderer(params: TreeCellParams) {
  const data = params.data as AnyRow | undefined;
  if (!data) return null;
  const id = params.ctxGetId(data);
  const meta = params.ctxMeta.get(id);
  const level = meta?.level ?? 0;
  const hasChildren = meta?.hasChildren ?? false;
  const expanded = params.ctxIsExpanded(id);

  const content = params.ctxInnerRenderer
    ? params.ctxInnerRenderer(params)
    : (params.valueFormatted ?? (params.value as React.ReactNode) ?? null);

  return (
    <span
      className="flex items-center w-full min-w-0"
      style={{ paddingLeft: level * params.ctxIndent }}
    >
      {hasChildren ? (
        <button
          type="button"
          className="inline-flex items-center justify-center w-5 h-5 shrink-0 text-muted-foreground hover:text-foreground focus:outline-none"
          onClick={(e) => {
            e.stopPropagation();
            params.ctxToggle(id);
          }}
          aria-label={expanded ? 'Restrânge' : 'Extinde'}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      ) : (
        <span className="inline-block w-5 shrink-0" />
      )}
      <span className="truncate min-w-0">{content}</span>
    </span>
  );
}

/** Flatten column defs (including groups) to leaf ColDefs. */
function flattenColumns<T>(defs: (ColDef<T> | ColGroupDef<T>)[]): ColDef<T>[] {
  const out: ColDef<T>[] = [];
  for (const def of defs) {
    if ('children' in def && Array.isArray(def.children)) {
      out.push(...flattenColumns(def.children as (ColDef<T> | ColGroupDef<T>)[]));
    } else {
      out.push(def as ColDef<T>);
    }
  }
  return out;
}

/** Stable, type-aware comparator for manual tree sorting. */
function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'ro-RO', { numeric: true });
}

/**
 * Generic, reusable AG Grid tree table built on AG Grid **Community**.
 *
 * AG Grid's native Tree Data is an Enterprise feature, so this component
 * implements a manual tree: it derives hierarchy from {@link BaseAgGridTreeTableProps.getDataPath},
 * manages expand/collapse state, and feeds AG Grid the visible rows in
 * depth-first order. It intentionally holds NO domain knowledge.
 */
function BaseAgGridTreeTableInner<TData extends AnyRow = AnyRow>(
  props: BaseAgGridTreeTableProps<TData>,
  ref: React.Ref<BaseAgGridTreeTableHandle>,
) {
  const {
    rowData,
    columnDefs,
    defaultColDef,
    autoGroupColumnDef,
    treeData = false,
    getDataPath,
    getRowId,
    groupDefaultExpanded = 1,
    loading = false,
    height = 'min(70vh, 720px)',
    className,
    themeClassName = 'ag-theme-quartz',
    localStorageKey,
    enableLayoutPersistence = true,
    showToolbar = true,
    enableColumnToolbar = true,
    toolbarActions,
    toolbarLeading,
    quickFilterText,
    indentSize = DEFAULT_INDENT,
    gridOptions,
    onGridReady,
    onRowGroupOpened,
    onExpandAll,
    onCollapseAll,
    onSaveLayout,
    onRestoreLayout,
    onResetLayout,
  } = props;

  const gridApiRef = useRef<GridApi<TData> | null>(null);
  const [gridApi, setGridApi] = useState<GridApi<TData> | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortState, setSortState] = useState<SortState | null>(null);
  const expandedRef = useRef(expandedIds);
  expandedRef.current = expandedIds;

  const resolveId = useCallback(
    (data: TData): string => {
      if (getRowId) return getRowId(data);
      if (getDataPath) return getDataPath(data).join(PATH_SEP);
      return String((data as AnyRow).id ?? '');
    },
    [getRowId, getDataPath],
  );

  /** Node metadata + children index derived from the data paths. */
  const treeIndex = useMemo(() => {
    const meta = new Map<string, InternalNode>();
    const childrenByParent = new Map<string | null, TData[]>();
    const roots: TData[] = [];

    if (!treeData || !getDataPath) {
      return { meta, childrenByParent, roots };
    }

    const idByPathKey = new Map<string, string>();
    for (const row of rowData) {
      const path = getDataPath(row);
      idByPathKey.set(path.join(PATH_SEP), resolveId(row));
    }

    const parentHasChild = new Set<string>();
    for (const row of rowData) {
      const path = getDataPath(row);
      const id = resolveId(row);
      const parentKey = path.slice(0, -1).join(PATH_SEP);
      const parentId = path.length > 1 ? (idByPathKey.get(parentKey) ?? null) : null;
      meta.set(id, { id, level: path.length - 1, hasChildren: false, parentId });
      if (parentId) parentHasChild.add(parentId);

      const list = childrenByParent.get(parentId) ?? [];
      list.push(row);
      childrenByParent.set(parentId, list);
      if (parentId === null) roots.push(row);
    }

    for (const [id, node] of meta) {
      if (parentHasChild.has(id)) node.hasChildren = true;
    }

    return { meta, childrenByParent, roots };
  }, [rowData, treeData, getDataPath, resolveId]);

  const isExpanded = useCallback((id: string) => expandedRef.current.has(id), []);

  /** Visible rows in depth-first order, honoring expansion and manual sort. */
  const visibleRowData = useMemo(() => {
    if (!treeData || !getDataPath) return rowData;

    const { childrenByParent } = treeIndex;
    const searchActive = Boolean(quickFilterText?.trim());

    const sortChildren = (rows: TData[]): TData[] => {
      if (!sortState) return rows;
      const leaf = flattenColumns(columnDefs).find((c) => c.colId === sortState.colId);
      const field = (leaf?.field ?? autoGroupColumnDef?.field) as string | undefined;
      if (!field) return rows;
      const dir = sortState.sort === 'asc' ? 1 : -1;
      return [...rows].sort(
        (a, b) => dir * compareValues((a as AnyRow)[field], (b as AnyRow)[field]),
      );
    };

    const out: TData[] = [];
    const walk = (parentId: string | null) => {
      const children = sortChildren(childrenByParent.get(parentId) ?? []);
      for (const row of children) {
        out.push(row);
        const id = resolveId(row);
        const node = treeIndex.meta.get(id);
        if (node?.hasChildren && (searchActive || expandedIds.has(id))) {
          walk(id);
        }
      }
    };
    walk(null);
    return out;
  }, [rowData, treeData, getDataPath, treeIndex, expandedIds, sortState, columnDefs, autoGroupColumnDef, resolveId, quickFilterText]);

  const toggleNode = useCallback(
    (id: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        const willExpand = !next.has(id);
        if (willExpand) next.add(id);
        else next.delete(id);
        const row = rowData.find((r) => resolveId(r) === id);
        if (row) onRowGroupOpened?.({ id, expanded: willExpand, data: row });
        return next;
      });
    },
    [rowData, resolveId, onRowGroupOpened],
  );

  const collectParentIds = useCallback(() => {
    const ids: string[] = [];
    for (const [id, node] of treeIndex.meta) if (node.hasChildren) ids.push(id);
    return ids;
  }, [treeIndex]);

  const computeDefaultExpanded = useCallback((): Set<string> => {
    const set = new Set<string>();
    for (const [id, node] of treeIndex.meta) {
      if (node.hasChildren && node.level < groupDefaultExpanded) set.add(id);
    }
    return set;
  }, [treeIndex, groupDefaultExpanded]);

  const rowDataRef = useRef<TData[] | null>(null);
  const layoutAppliedRef = useRef(false);

  useEffect(() => {
    if (!treeData) return;
    if (rowDataRef.current === rowData) return;
    rowDataRef.current = rowData;
    const saved = enableLayoutPersistence ? loadGridLayout(localStorageKey) : null;
    if (saved?.expandedIds && !layoutAppliedRef.current) {
      const valid = new Set(saved.expandedIds.filter((id) => treeIndex.meta.get(id)?.hasChildren));
      setExpandedIds(valid);
    } else {
      setExpandedIds(computeDefaultExpanded());
    }
    layoutAppliedRef.current = true;
  }, [rowData, treeData, treeIndex, computeDefaultExpanded, enableLayoutPersistence, localStorageKey]);

  const mergedDefaultColDef = useMemo<ColDef<TData>>(() => {
    const base: ColDef<TData> = {
      sortable: true,
      resizable: true,
      filter: true,
      // Legacy tabbed menu is available in Community; the new column menu is Enterprise-only.
      menuTabs: ['generalMenuTab', 'filterMenuTab'],
      mainMenuItems: buildColumnMainMenuItems<TData>,
      ...defaultColDef,
    };
    // In manual tree mode AG Grid's own sort would flatten the hierarchy, so we
    // neutralise it (returns 0 -> stable) and reorder rows ourselves via DFS.
    if (treeData) base.comparator = () => 0;
    return base;
  }, [defaultColDef, treeData]);

  const effectiveColumnDefs = useMemo(() => {
    if (!treeData) return columnDefs;
    const groupColId = autoGroupColumnDef?.colId ?? 'ag-tree-group';
    const treeCol: ColDef<TData> = {
      minWidth: 520,
      width: 580,
      flex: 1,
      pinned: 'left',
      ...autoGroupColumnDef,
      colId: groupColId,
      cellRenderer: TreeGroupCellRenderer,
      cellRendererParams: {
        ctxGetId: resolveId,
        ctxMeta: treeIndex.meta,
        ctxIsExpanded: isExpanded,
        ctxToggle: toggleNode,
        ctxIndent: indentSize,
        ctxInnerRenderer: (autoGroupColumnDef?.cellRendererParams as { innerRenderer?: (p: ICellRendererParams) => React.ReactNode })?.innerRenderer,
      } as TreeCellParams,
    };
    return [treeCol, ...columnDefs];
  }, [columnDefs, treeData, autoGroupColumnDef, resolveId, treeIndex, isExpanded, toggleNode, indentSize]);

  const applySavedLayout = useCallback(
    (api: GridApi<TData>) => {
      if (!enableLayoutPersistence) return;
      const saved = loadGridLayout(localStorageKey);
      if (!saved) return;
      if (saved.columnState) {
        api.applyColumnState({ state: saved.columnState as never, applyOrder: true });
      }
      if (saved.columnGroupState) {
        api.setColumnGroupState(saved.columnGroupState as never);
      }
      if (saved.filterModel) {
        api.setFilterModel(saved.filterModel as never);
      }
    },
    [enableLayoutPersistence, localStorageKey],
  );

  const handleGridReady = useCallback(
    (event: GridReadyEvent<TData>) => {
      gridApiRef.current = event.api;
      setGridApi(event.api);
      applySavedLayout(event.api);
      onGridReady?.(event);
    },
    [applySavedLayout, onGridReady],
  );

  const handleAutosizeAll = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) return;
    autosizeAllColumnsWithLimits(api);
  }, []);

  const handleSortChanged = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) return;
    const state = api.getColumnState().find((c) => c.sort);
    setSortState(state?.sort ? { colId: state.colId, sort: state.sort } : null);
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(collectParentIds()));
    onExpandAll?.();
  }, [collectParentIds, onExpandAll]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
    onCollapseAll?.();
  }, [onCollapseAll]);

  const saveLayout = useCallback(() => {
    const api = gridApiRef.current;
    if (!api || !enableLayoutPersistence) return;
    saveGridLayout(localStorageKey, {
      columnState: api.getColumnState(),
      columnGroupState: api.getColumnGroupState(),
      filterModel: api.getFilterModel(),
      expandedIds: Array.from(expandedRef.current),
    });
    onSaveLayout?.();
  }, [enableLayoutPersistence, localStorageKey, onSaveLayout]);

  const restoreLayout = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) return;
    applySavedLayout(api);
    const saved = loadGridLayout(localStorageKey);
    if (saved?.expandedIds) {
      setExpandedIds(new Set(saved.expandedIds.filter((id) => treeIndex.meta.get(id)?.hasChildren)));
    }
    onRestoreLayout?.();
  }, [applySavedLayout, localStorageKey, treeIndex, onRestoreLayout]);

  const resetLayout = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) return;
    clearGridLayout(localStorageKey);
    api.resetColumnState();
    api.setFilterModel(null);
    setSortState(null);
    setExpandedIds(computeDefaultExpanded());
    onResetLayout?.();
  }, [localStorageKey, computeDefaultExpanded, onResetLayout]);

  useImperativeHandle(
    ref,
    () => ({
      expandAll,
      collapseAll,
      saveLayout,
      restoreLayout,
      resetLayout,
      getApi: () => gridApiRef.current,
    }),
    [expandAll, collapseAll, saveLayout, restoreLayout, resetLayout],
  );

  return (
    <div className={cn('base-ag-grid-tree', className)}>
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {toolbarLeading}
          {treeData && (
            <>
              <Button variant="outline" size="sm" onClick={expandAll}>
                <ChevronDown className="w-4 h-4 mr-2" />
                Extinde tot
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                <ChevronRight className="w-4 h-4 mr-2" />
                Restrânge tot
              </Button>
            </>
          )}
          {enableLayoutPersistence && (
            <>
              <Button variant="outline" size="sm" onClick={saveLayout}>
                <Save className="w-4 h-4 mr-2" />
                Salvează layout
              </Button>
              <Button variant="outline" size="sm" onClick={restoreLayout}>
                <Undo2 className="w-4 h-4 mr-2" />
                Restaurează layout
              </Button>
              <Button variant="outline" size="sm" onClick={resetLayout}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Layout implicit
              </Button>
            </>
          )}
          {enableColumnToolbar && (
            <>
              <GridColumnChooser api={gridApi} />
              <Button variant="outline" size="sm" onClick={handleAutosizeAll} disabled={!gridApi}>
                <Maximize2 className="w-4 h-4 mr-2" />
                Autosize coloane
              </Button>
            </>
          )}
          {toolbarActions}
        </div>
      )}

      <div
        className={cn(themeClassName, 'base-ag-grid rounded-lg border overflow-hidden relative')}
        style={{ height, width: '100%' }}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        <AgGridReact
          theme="legacy"
          rowData={visibleRowData}
          columnDefs={effectiveColumnDefs}
          defaultColDef={mergedDefaultColDef}
          getRowId={(params) => resolveId(params.data)}
          quickFilterText={quickFilterText}
          animateRows={false}
          headerHeight={38}
          rowHeight={34}
          suppressRowClickSelection
          enableCellTextSelection
          maintainColumnOrder
          includeHiddenColumnsInQuickFilter
          tooltipShowDelay={400}
          columnMenu="legacy"
          suppressMenuHide
          onGridReady={handleGridReady}
          onSortChanged={handleSortChanged}
          {...gridOptions}
        />
      </div>
    </div>
  );
}

/**
 * Generic reusable AG Grid tree table (Community-compatible manual tree).
 * See {@link BaseAgGridTreeTableProps}.
 */
export const BaseAgGridTreeTable = forwardRef(BaseAgGridTreeTableInner) as <
  TData extends AnyRow = AnyRow,
>(
  props: BaseAgGridTreeTableProps<TData> & { ref?: React.Ref<BaseAgGridTreeTableHandle> },
) => ReturnType<typeof BaseAgGridTreeTableInner>;
