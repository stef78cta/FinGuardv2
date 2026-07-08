import { useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { ro } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';

import { AdvancedCalendar } from '@/components/ui/advanced-calendar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface BalanceMonthPickerProps {
  /** Luna selectată (prima zi a lunii). */
  value?: Date;
  /** Callback la schimbarea lunii. */
  onChange: (date: Date | undefined) => void;
  /** ID pentru input trigger (accesibilitate). */
  id?: string;
  /** Marchează câmpul ca obligatoriu (afișează asterisc). */
  required?: boolean;
  /** Stare de eroare vizuală pe trigger. */
  error?: boolean;
  /** Mesaj de eroare afișat sub selector. */
  errorMessage?: string;
  /** Text auxiliar afișat sub selector (ex. perioada contabilă calculată). */
  helperText?: React.ReactNode;
  /** Lățimea containerului — identică cu pagina Încărcare balanță. */
  containerClassName?: string;
  /** Clase suplimentare pe trigger. */
  className?: string;
  /** Control extern al stării deschis/închis al popover-ului. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DEFAULT_CONTAINER_CLASS = 'max-w-xs 2xl:max-w-sm';

/**
 * Selector uniform pentru „Luna balanței”, folosit în paginile care referă o balanță
 * contabilă pe lună. Reproduce UI-ul din pagina Încărcare balanță.
 */
export function BalanceMonthPicker({
  value,
  onChange,
  id = 'balance-month',
  required = false,
  error = false,
  errorMessage,
  helperText,
  containerClassName = DEFAULT_CONTAINER_CLASS,
  className,
  open: controlledOpen,
  onOpenChange,
}: BalanceMonthPickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <div className={containerClassName}>
      <Label htmlFor={id} className="text-sm font-semibold mb-2 block">
        Luna balanței
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              error && 'border-destructive',
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value
              ? format(value, 'MMMM yyyy', {
                  locale: ro,
                })
              : 'Selectează luna'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <AdvancedCalendar
            selected={value}
            onSelect={(date) => {
              const normalizedMonth = date ? startOfMonth(date) : undefined;
              onChange(normalizedMonth);
              handleOpenChange(false);
            }}
            monthPickerOnly
            defaultViewMode="month"
            enableDrillDown
            enableDecadeView
            yearRange={{ from: 2000, to: 2050 }}
            locale={ro}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      {errorMessage && <p className="text-xs text-destructive mt-1">{errorMessage}</p>}
      {helperText && <div className="text-xs text-muted-foreground mt-1">{helperText}</div>}
    </div>
  );
}
