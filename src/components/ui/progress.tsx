import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

/**
 * NEWA Design System - Progress Component
 * 
 * Uses tokens from newa_design-tokens.jsonc:
 * - Track: var(--newa-surface-canvas)
 * - Indicator: var(--newa-brand-accent-indigo)
 * - Border radius: var(--newa-radius-sm) for rounded ends
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden",
      "rounded-full",
      "bg-[var(--newa-surface-canvas)]",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-[var(--newa-brand-accent-indigo)] transition-all duration-300"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
