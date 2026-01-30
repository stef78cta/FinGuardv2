import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerSingleProps } from "react-day-picker";
import { format, setMonth, setYear, startOfMonth } from "date-fns";
import { ro, type Locale } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type ViewMode = "day" | "month" | "year" | "decade";

export interface AdvancedCalendarProps
  extends Omit<DayPickerSingleProps, "mode" | "captionLayout"> {
  /** Activează navigare ierarhică (click pe header pentru zoom out) */
  enableDrillDown?: boolean;
  /** Activează vizualizare decade */
  enableDecadeView?: boolean;
  /** View mode inițial */
  defaultViewMode?: ViewMode;
  /** Range ani disponibili pentru navigare */
  yearRange?: { from: number; to: number };
  /** Locale pentru formatare (default: ro) */
  locale?: Locale;
}

/**
 * Calendar avansat cu funcționalități de drill-down și decade view.
 * 
 * Fluxul de navigare:
 * - decade → year → month → day (drill-down prin click pe element)
 * - day → month → year → decade (zoom-out prin click pe header)
 * 
 * @example
 * ```tsx
 * <AdvancedCalendar
 *   selected={date}
 *   onSelect={setDate}
 *   enableDrillDown
 *   enableDecadeView
 *   yearRange={{ from: 2000, to: 2050 }}
 * />
 * ```
 */
function AdvancedCalendar({
  className,
  classNames,
  showOutsideDays = true,
  enableDrillDown = true,
  enableDecadeView = true,
  defaultViewMode = "day",
  yearRange = { from: 1950, to: 2100 },
  selected,
  onSelect,
  locale = ro,
  ...props
}: AdvancedCalendarProps) {
  // State pentru view mode și navigare
  const [viewMode, setViewMode] = React.useState<ViewMode>(defaultViewMode);
  const [displayMonth, setDisplayMonth] = React.useState<Date>(() => {
    if (selected instanceof Date) return startOfMonth(selected);
    return startOfMonth(new Date());
  });
  const [displayYear, setDisplayYear] = React.useState<number>(() => {
    if (selected instanceof Date) return selected.getFullYear();
    return new Date().getFullYear();
  });
  const [displayDecade, setDisplayDecade] = React.useState<number>(() => {
    const year = selected instanceof Date ? selected.getFullYear() : new Date().getFullYear();
    return Math.floor(year / 10) * 10;
  });

  // Sync display state when selected changes externally
  React.useEffect(() => {
    if (selected instanceof Date) {
      setDisplayMonth(startOfMonth(selected));
      setDisplayYear(selected.getFullYear());
      setDisplayDecade(Math.floor(selected.getFullYear() / 10) * 10);
    }
  }, [selected]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Handlers pentru zoom out (click pe header)
  const handleZoomOut = () => {
    if (!enableDrillDown) return;
    
    switch (viewMode) {
      case "day":
        setViewMode("month");
        break;
      case "month":
        setViewMode("year");
        break;
      case "year":
        if (enableDecadeView) {
          setViewMode("decade");
        }
        break;
      default:
        break;
    }
  };

  // Handlers pentru drill-down (click pe element în grid)
  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(setYear(new Date(), displayYear), monthIndex);
    setDisplayMonth(startOfMonth(newDate));
    setViewMode("day");
  };

  const handleYearSelect = (year: number) => {
    setDisplayYear(year);
    setDisplayDecade(Math.floor(year / 10) * 10);
    setViewMode("month");
  };

  const handleDecadeSelect = (decade: number) => {
    setDisplayDecade(decade);
    setDisplayYear(decade);
    setViewMode("year");
  };

  // Navigare pentru year/decade views
  const handlePrevDecade = () => {
    if (viewMode === "year") {
      setDisplayDecade((prev) => Math.max(yearRange.from, prev - 10));
    } else if (viewMode === "decade") {
      setDisplayDecade((prev) => Math.max(yearRange.from, prev - 100));
    }
  };

  const handleNextDecade = () => {
    if (viewMode === "year") {
      setDisplayDecade((prev) => Math.min(yearRange.to - 9, prev + 10));
    } else if (viewMode === "decade") {
      setDisplayDecade((prev) => Math.min(yearRange.to - 99, prev + 100));
    }
  };

  const handlePrevYear = () => {
    setDisplayYear((prev) => Math.max(yearRange.from, prev - 1));
  };

  const handleNextYear = () => {
    setDisplayYear((prev) => Math.min(yearRange.to, prev + 1));
  };

  // Get caption text based on view mode
  const getCaptionText = (): string => {
    switch (viewMode) {
      case "day":
        return format(displayMonth, "LLLL yyyy", { locale });
      case "month":
        return String(displayYear);
      case "year":
        return `${displayDecade} - ${displayDecade + 9}`;
      case "decade":
        const baseDecade = Math.floor(displayDecade / 100) * 100;
        return `${baseDecade} - ${baseDecade + 99}`;
      default:
        return "";
    }
  };

  // Month grid component
  const MonthGrid = () => {
    const months = Array.from({ length: 12 }, (_, i) => i);
    const selectedMonth = selected instanceof Date ? selected.getMonth() : -1;
    const selectedYear = selected instanceof Date ? selected.getFullYear() : -1;

    return (
      <div className="calendar-view-month-grid grid grid-cols-3 gap-2 p-3">
        {months.map((monthIndex) => {
          const isSelected = selectedMonth === monthIndex && selectedYear === displayYear;
          const isCurrent = currentMonth === monthIndex && currentYear === displayYear;
          const monthDate = setMonth(new Date(displayYear, 0, 1), monthIndex);

          return (
            <button
              key={monthIndex}
              onClick={() => handleMonthSelect(monthIndex)}
              className={cn(
                "calendar-grid-item",
                "py-3 px-2 rounded-[var(--newa-radius-md)]",
                "text-sm font-medium transition-all duration-150",
                "hover:bg-[var(--newa-state-hover)]",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-[var(--newa-focus-ring-color)]",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                isCurrent && !isSelected && "ring-2 ring-primary ring-inset"
              )}
            >
              {format(monthDate, "MMM", { locale })}
            </button>
          );
        })}
      </div>
    );
  };

  // Year grid component
  const YearGrid = () => {
    const years = Array.from({ length: 12 }, (_, i) => displayDecade - 1 + i);
    const selectedYear = selected instanceof Date ? selected.getFullYear() : -1;

    return (
      <div className="calendar-view-year-grid grid grid-cols-4 gap-2 p-3">
        {years.map((year) => {
          const isSelected = selectedYear === year;
          const isCurrent = currentYear === year;
          const isInRange = year >= yearRange.from && year <= yearRange.to;
          const isInDecade = year >= displayDecade && year < displayDecade + 10;

          return (
            <button
              key={year}
              onClick={() => isInRange && handleYearSelect(year)}
              disabled={!isInRange}
              className={cn(
                "calendar-grid-item",
                "py-3 px-2 rounded-[var(--newa-radius-md)]",
                "text-sm font-medium transition-all duration-150",
                "hover:bg-[var(--newa-state-hover)]",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-[var(--newa-focus-ring-color)]",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                isCurrent && !isSelected && "ring-2 ring-primary ring-inset",
                !isInDecade && isInRange && "text-muted-foreground"
              )}
            >
              {year}
            </button>
          );
        })}
      </div>
    );
  };

  // Decade grid component
  const DecadeGrid = () => {
    const baseDecade = Math.floor(displayDecade / 100) * 100;
    const decades = Array.from({ length: 12 }, (_, i) => baseDecade - 10 + i * 10);
    const selectedDecade = selected instanceof Date 
      ? Math.floor(selected.getFullYear() / 10) * 10 
      : -1;
    const currentDecade = Math.floor(currentYear / 10) * 10;

    return (
      <div className="calendar-view-decade-grid grid grid-cols-4 gap-2 p-3">
        {decades.map((decade) => {
          const isSelected = selectedDecade === decade;
          const isCurrent = currentDecade === decade;
          const isInRange = decade >= yearRange.from && decade + 9 <= yearRange.to;
          const isInCentury = decade >= baseDecade && decade < baseDecade + 100;

          return (
            <button
              key={decade}
              onClick={() => isInRange && handleDecadeSelect(decade)}
              disabled={!isInRange}
              className={cn(
                "calendar-grid-item",
                "py-3 px-2 rounded-[var(--newa-radius-md)]",
                "text-sm font-medium transition-all duration-150",
                "hover:bg-[var(--newa-state-hover)]",
                "focus-visible:outline-none focus-visible:ring-2",
                "focus-visible:ring-[var(--newa-focus-ring-color)]",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                isCurrent && !isSelected && "ring-2 ring-primary ring-inset",
                !isInCentury && isInRange && "text-muted-foreground"
              )}
            >
              {decade}s
            </button>
          );
        })}
      </div>
    );
  };

  // Custom header for month/year/decade views
  const CustomHeader = () => {
    const showPrev = viewMode !== "day";
    const showNext = viewMode !== "day";

    return (
      <div className="flex items-center justify-between px-3 pt-3">
        <button
          onClick={viewMode === "month" ? handlePrevYear : handlePrevDecade}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            !showPrev && "invisible"
          )}
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          onClick={handleZoomOut}
          disabled={viewMode === "decade" || !enableDrillDown}
          className={cn(
            "calendar-caption-button",
            "text-sm font-semibold px-2 py-1 rounded-[var(--newa-radius-sm)]",
            "transition-colors",
            enableDrillDown && viewMode !== "decade" && "hover:bg-[var(--newa-state-hover)] cursor-pointer",
            (!enableDrillDown || viewMode === "decade") && "cursor-default"
          )}
        >
          {getCaptionText()}
        </button>

        <button
          onClick={viewMode === "month" ? handleNextYear : handleNextDecade}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            !showNext && "invisible"
          )}
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  };

  // Render based on view mode
  if (viewMode === "decade") {
    return (
      <div className={cn("advanced-calendar p-1 pointer-events-auto", className)}>
        <CustomHeader />
        <DecadeGrid />
      </div>
    );
  }

  if (viewMode === "year") {
    return (
      <div className={cn("advanced-calendar p-1 pointer-events-auto", className)}>
        <CustomHeader />
        <YearGrid />
      </div>
    );
  }

  if (viewMode === "month") {
    return (
      <div className={cn("advanced-calendar p-1 pointer-events-auto", className)}>
        <CustomHeader />
        <MonthGrid />
      </div>
    );
  }

  // Day view - use DayPicker with custom caption
  return (
    <DayPicker
      mode="single"
      showOutsideDays={showOutsideDays}
      month={displayMonth}
      onMonthChange={setDisplayMonth}
      selected={selected}
      onSelect={onSelect}
      locale={locale}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: cn(
          "text-sm font-semibold",
          enableDrillDown && "cursor-pointer hover:bg-[var(--newa-state-hover)] px-2 py-1 rounded-[var(--newa-radius-sm)] transition-colors"
        ),
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        CaptionLabel: ({ displayMonth: captionMonth }) => (
          <button
            onClick={handleZoomOut}
            disabled={!enableDrillDown}
            className={cn(
              "text-sm font-semibold",
              enableDrillDown && "cursor-pointer hover:bg-[var(--newa-state-hover)] px-2 py-1 rounded-[var(--newa-radius-sm)] transition-colors"
            )}
          >
            {format(captionMonth, "LLLL yyyy", { locale })}
          </button>
        ),
      }}
      {...props}
    />
  );
}

AdvancedCalendar.displayName = "AdvancedCalendar";

export { AdvancedCalendar };
