import { useCallback, useEffect, useState } from 'react';
import type { Column, GridApi } from 'ag-grid-community';
import { Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface GridColumnChooserProps {
  api: GridApi | null;
  /** When column visibility changes (for parent re-render if needed). */
  onVisibilityChange?: () => void;
}

interface ColumnOption {
  colId: string;
  headerName: string;
  visible: boolean;
  canHide: boolean;
}

function collectColumnOptions(api: GridApi): ColumnOption[] {
  return (api.getAllGridColumns() ?? []).map((col: Column) => {
    const def = col.getColDef();
    const colId = col.getColId();
    return {
      colId,
      headerName: def.headerName ?? colId,
      visible: col.isVisible(),
      canHide: def.lockVisible !== true && colId !== 'indicator',
    };
  });
}

/**
 * Community-compatible column visibility picker (checkbox list).
 *
 * Replaces the Enterprise Columns Tool Panel for show/hide and choose-columns
 * workflows while remaining compatible with saved columnState snapshots.
 */
export function GridColumnChooser({ api, onVisibilityChange }: GridColumnChooserProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ColumnOption[]>([]);

  const refreshOptions = useCallback(() => {
    if (!api) {
      setOptions([]);
      return;
    }
    setOptions(collectColumnOptions(api));
  }, [api]);

  useEffect(() => {
    if (!api || !open) return;
    refreshOptions();
    const onColumnEvent = () => refreshOptions();
    api.addEventListener('columnVisible', onColumnEvent);
    api.addEventListener('columnPinned', onColumnEvent);
    api.addEventListener('columnMoved', onColumnEvent);
    return () => {
      api.removeEventListener('columnVisible', onColumnEvent);
      api.removeEventListener('columnPinned', onColumnEvent);
      api.removeEventListener('columnMoved', onColumnEvent);
    };
  }, [api, open, refreshOptions]);

  const toggleColumn = (colId: string, visible: boolean) => {
    if (!api) return;
    api.applyColumnState({ state: [{ colId, hide: !visible }] });
    refreshOptions();
    onVisibilityChange?.();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={!api}>
          <Columns3 className="w-4 h-4 mr-2" />
          Coloane
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <p className="text-sm font-medium mb-2">Alege coloanele vizibile</p>
        <ScrollArea className="max-h-64 pr-2">
          <div className="space-y-2">
            {options.map((opt) => (
              <div key={opt.colId} className="flex items-center gap-2">
                <Checkbox
                  id={`col-${opt.colId}`}
                  checked={opt.visible}
                  disabled={!opt.canHide}
                  onCheckedChange={(checked) => toggleColumn(opt.colId, checked === true)}
                />
                <Label htmlFor={`col-${opt.colId}`} className="text-sm font-normal cursor-pointer truncate">
                  {opt.headerName}
                </Label>
              </div>
            ))}
            {options.length === 0 && (
              <p className="text-sm text-muted-foreground">Nicio coloană disponibilă.</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
