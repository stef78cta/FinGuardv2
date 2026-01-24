import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * NEWA Design System - Checkbox Component
 * 
 * Uses tokens from newa_design-tokens.jsonc:
 * - Checked: var(--newa-brand-accent-indigo)
 * - Border: var(--newa-border-default)
 * - Focus ring: var(--newa-focus-ring-*)
 * - Border radius: var(--newa-radius-sm)
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // Base styles
      "peer h-4 w-4 shrink-0",
      "rounded-[var(--newa-radius-sm)]",
      "border border-[var(--newa-border-default)]",
      "bg-[var(--newa-surface-light)]",
      // Checked state
      "data-[state=checked]:bg-[var(--newa-brand-accent-indigo)]",
      "data-[state=checked]:border-[var(--newa-brand-accent-indigo)]",
      "data-[state=checked]:text-[var(--newa-text-inverse)]",
      // Focus state
      "focus-visible:outline-none",
      "focus-visible:ring-2 focus-visible:ring-[#6366F1]",
      "focus-visible:ring-offset-2",
      // Disabled state
      "disabled:cursor-not-allowed disabled:opacity-[var(--newa-disabled-opacity)]",
      // Transition
      "transition-colors duration-150",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
