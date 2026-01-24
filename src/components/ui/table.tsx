import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * NEWA Design System - Table Component
 * 
 * Uses tokens from newa_design-tokens.jsonc:
 * - Header background: var(--newa-table-header-bg) = #F8FAFC
 * - Row hover: var(--newa-table-row-hover) = #EEF2FF
 * - Row selected: var(--newa-table-row-selected) = #E0E7FF
 * - Grid border: var(--newa-table-grid-border) = #E2E8F0
 * - Cell padding: var(--newa-table-cell-px), var(--newa-table-cell-py)
 * - Typography: text-table-header for headers, text-table-cell for cells
 */

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "[&_tr]:border-b",
      "bg-[var(--newa-table-header-bg)]",
      className
    )}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-[var(--newa-table-header-bg)] font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-[var(--newa-table-grid-border)]",
      "transition-colors duration-150",
      "hover:bg-[var(--newa-table-row-hover)]",
      "data-[state=selected]:bg-[var(--newa-table-row-selected)]",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      // Height based on density
      "h-[var(--newa-table-row-height)]",
      // Padding from table tokens
      "px-[var(--newa-table-cell-px)]",
      // Typography role: tableHeader
      "text-left align-middle",
      "font-[var(--newa-font-application)]",
      "text-[length:var(--newa-font-size-xs)]",
      "font-semibold",
      "tracking-[0.05em]",
      "uppercase",
      "text-[var(--newa-text-muted)]",
      "[&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      // Padding from table tokens
      "px-[var(--newa-table-cell-px)] py-[var(--newa-table-cell-py)]",
      // Typography role: tableCell
      "align-middle",
      "font-[var(--newa-font-application)]",
      "text-[length:var(--newa-font-size-sm)]",
      "font-medium",
      "text-[var(--newa-text-primary)]",
      "[&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      "mt-4 text-sm text-[var(--newa-text-muted)]",
      className
    )}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
