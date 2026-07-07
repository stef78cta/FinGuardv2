import type { ReactNode } from 'react';
import type {
  ColDef,
  ColGroupDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
} from 'ag-grid-community';

/**
 * Persisted layout snapshot for a Base grid instance.
 *
 * Stored under a caller-provided `localStorageKey`. Structured so it can later
 * be synced per-user to a backend without changing the storage contract.
 */
export interface GridLayoutSnapshot {
  version: 1;
  /** AG Grid column state: order, width, pinned, hide, sort. */
  columnState?: unknown;
  /** AG Grid column group open/closed state. */
  columnGroupState?: unknown;
  /** AG Grid filter model. */
  filterModel?: unknown;
  /** Stable ids of expanded tree nodes (manual tree mode). */
  expandedIds?: string[];
}

/**
 * Metadata derived for a single row when the Base grid runs in manual tree mode.
 * Exposed to the group cell renderer via `cellRendererParams`.
 */
export interface TreeNodeMeta {
  id: string;
  level: number;
  hasChildren: boolean;
  expanded: boolean;
}

/**
 * Params passed to a caller-provided inner renderer for the hierarchical column.
 * Mirrors AG Grid's `ICellRendererParams` plus the resolved tree node meta.
 */
export type TreeInnerRendererParams<TData = unknown> = ICellRendererParams<TData> & {
  node: TreeNodeMeta;
};

/**
 * Imperative handle exposed by {@link BaseAgGridTreeTable} for parent control.
 */
export interface BaseAgGridTreeTableHandle {
  expandAll: () => void;
  collapseAll: () => void;
  saveLayout: () => void;
  restoreLayout: () => void;
  resetLayout: () => void;
  getApi: () => GridApi | null;
}

/**
 * Props for the generic, reusable AG Grid tree table.
 *
 * This component contains NO domain logic (financial or otherwise). It provides
 * a manual tree implementation compatible with AG Grid Community (Tree Data is
 * an Enterprise feature), plus layout persistence, expand/collapse, sorting,
 * filtering, resizing, reordering, pinning and column show/hide.
 */
export interface BaseAgGridTreeTableProps<TData = Record<string, unknown>> {
  rowData: TData[];
  columnDefs: (ColDef<TData> | ColGroupDef<TData>)[];
  defaultColDef?: ColDef<TData>;
  /**
   * Definition for the first hierarchical column. When `treeData` is enabled the
   * Base component turns this into a real pinned column with an expand/collapse
   * chevron and level indentation. Supports `field`, `valueGetter`, `pinned`,
   * `minWidth`, `flex` and `cellRendererParams.innerRenderer`.
   */
  autoGroupColumnDef?: ColDef<TData>;
  /** Enable the manual tree mode (requires {@link getDataPath}). */
  treeData?: boolean;
  /** Returns the hierarchical path for a row (array of stable segment keys). */
  getDataPath?: (data: TData) => string[];
  /** Returns a stable id for a row. Falls back to the joined data path. */
  getRowId?: (data: TData) => string;
  /** Number of levels expanded by default (level < value). Defaults to 1. */
  groupDefaultExpanded?: number;
  loading?: boolean;
  height?: string | number;
  className?: string;
  /** Grid wrapper theme class. Defaults to `ag-theme-quartz`. */
  themeClassName?: string;
  /** localStorage key for layout persistence. */
  localStorageKey?: string;
  /** Enable save/restore of layout to localStorage. Defaults to true. */
  enableLayoutPersistence?: boolean;
  /** Show the built-in toolbar (expand/collapse/save/restore/reset). Defaults to true. */
  showToolbar?: boolean;
  /** Show column visibility picker and autosize controls. Defaults to true. */
  enableColumnToolbar?: boolean;
  /** Extra toolbar content rendered on the right side. */
  toolbarActions?: ReactNode;
  /** Left-aligned toolbar content (e.g. a search input). */
  toolbarLeading?: ReactNode;
  /** Quick filter text applied to the grid (also auto-expands the tree). */
  quickFilterText?: string;
  /** Indentation in pixels applied per tree level. Defaults to 16. */
  indentSize?: number;
  /** Expose technical/all columns; caller decides which. Base does not force it. */
  debugMode?: boolean;
  /** Escape hatch for additional AG Grid options. */
  gridOptions?: Record<string, unknown>;
  onGridReady?: (params: GridReadyEvent<TData>) => void;
  /** Fired when a tree node is expanded or collapsed (manual tree mode). */
  onRowGroupOpened?: (event: { id: string; expanded: boolean; data: TData }) => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onSaveLayout?: () => void;
  onRestoreLayout?: () => void;
  onResetLayout?: () => void;
}
