import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

/**
 * NEWA Design System - Tabs Component
 * 
 * Uses tokens from newa_design-tokens.jsonc:
 * - Active indicator: var(--newa-brand-accent-indigo)
 * - Text: var(--newa-text-secondary) default, var(--newa-brand-accent-indigo) active
 * - Background: var(--newa-table-header-bg) for list
 * - Border: var(--newa-border-default)
 */

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center w-full justify-start",
      "rounded-none p-0 h-auto",
      "border-b border-[var(--newa-border-default)]",
      "bg-[var(--newa-table-header-bg)]",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap",
      "px-[var(--newa-spacing-6)] py-3",
      "text-sm font-medium",
      "text-[var(--newa-text-secondary)]",
      // Underline indicator
      "rounded-none border-b-2 border-transparent -mb-px",
      // Transition
      "transition-all duration-200",
      // Hover state
      "hover:text-[var(--newa-text-primary)] hover:border-[var(--newa-text-muted)]",
      // Focus state
      "focus-visible:outline-none",
      "focus-visible:ring-2 focus-visible:ring-[#6366F1]",
      "focus-visible:ring-offset-2",
      // Disabled state
      "disabled:pointer-events-none disabled:opacity-[var(--newa-disabled-opacity)]",
      // Active state
      "data-[state=active]:text-[var(--newa-brand-accent-indigo)]",
      "data-[state=active]:border-[var(--newa-brand-accent-indigo)]",
      "data-[state=active]:bg-transparent",
      "data-[state=active]:font-semibold",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-[var(--newa-spacing-4)]",
      "focus-visible:outline-none",
      "focus-visible:ring-2 focus-visible:ring-[#6366F1]",
      "focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
