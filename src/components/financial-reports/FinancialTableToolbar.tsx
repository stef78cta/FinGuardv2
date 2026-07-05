import { useCallback, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Columns3,
  Download,
  LayoutTemplate,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FinancialStatementType, FinancialTableLayout } from '@/types/financialTree';

export interface ColumnVisibilityOption {
  colId: string;
  label: string;
  required?: boolean;
}

interface FinancialTableToolbarProps {
  reportType: FinancialStatementType;
  layoutStorageKey: string;
  searchText: string;
  onSearchChange: (value: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  onSaveLayout: () => void;
  onRestoreLayout: () => void;
  columnOptions: ColumnVisibilityOption[];
  hiddenColumns: Set<string>;
  onToggleColumn: (colId: string, visible: boolean) => void;
  showZeroFilter: boolean;
  onShowZeroFilterChange: (value: boolean) => void;
}

/**
 * Toolbar pentru tree table financiar — search, expand/collapse, coloane, layout.
 */
export function FinancialTableToolbar({
  searchText,
  onSearchChange,
  onExpandAll,
  onCollapseAll,
  onExport,
  onPrint,
  onSaveLayout,
  onRestoreLayout,
  columnOptions,
  hiddenColumns,
  onToggleColumn,
  showZeroFilter,
  onShowZeroFilterChange,
}: FinancialTableToolbarProps) {
  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Căutare indicator..."
            className="pl-9 h-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filtru
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Afișare rânduri</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={showZeroFilter}
              onCheckedChange={(checked) => onShowZeroFilterChange(checked === true)}
            >
              Ascunde conturi fără valoare (leaf zero)
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3 className="w-4 h-4 mr-2" />
              Coloane
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Vizibilitate coloane</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columnOptions.map((col) => (
              <DropdownMenuCheckboxItem
                key={col.colId}
                checked={!hiddenColumns.has(col.colId)}
                disabled={col.required}
                onCheckedChange={(checked) => onToggleColumn(col.colId, checked === true)}
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" size="sm" onClick={onExpandAll}>
          <ChevronDown className="w-4 h-4 mr-2" />
          Expand all
        </Button>
        <Button variant="outline" size="sm" onClick={onCollapseAll}>
          <ChevronRight className="w-4 h-4 mr-2" />
          Collapse all
        </Button>

        <Button variant="outline" size="sm" onClick={onSaveLayout}>
          <Save className="w-4 h-4 mr-2" />
          Save layout
        </Button>
        <Button variant="outline" size="sm" onClick={onRestoreLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset layout
        </Button>

        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        )}
        {onPrint && (
          <Button variant="outline" size="sm" onClick={onPrint}>
            <LayoutTemplate className="w-4 h-4 mr-2" />
            Print
          </Button>
        )}
      </div>
    </div>
  );
}

export function useFinancialTableLayout(storageKey: string) {
  const [layoutVersion, setLayoutVersion] = useState(0);

  const loadLayout = useCallback((): FinancialTableLayout | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as FinancialTableLayout;
    } catch {
      return null;
    }
  }, [storageKey]);

  const saveLayout = useCallback(
    (layout: Omit<FinancialTableLayout, 'version'>) => {
      const payload: FinancialTableLayout = { version: 1, ...layout };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      setLayoutVersion((v) => v + 1);
    },
    [storageKey],
  );

  const clearLayout = useCallback(() => {
    localStorage.removeItem(storageKey);
    setLayoutVersion((v) => v + 1);
  }, [storageKey]);

  return { loadLayout, saveLayout, clearLayout, layoutVersion };
}

