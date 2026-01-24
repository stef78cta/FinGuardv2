import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * NEWA Design System - Input Component
 * 
 * Implements form field tokens from newa_design-tokens.jsonc:
 * - Height: var(--newa-field-height) - responds to density
 * - Padding: var(--newa-form-field-px) = 12px
 * - Border radius: var(--newa-form-field-radius) = 10px
 * - Placeholder color: var(--newa-form-placeholder)
 * - Focus ring: var(--newa-focus-ring-*)
 * - Error state: var(--newa-form-error-border)
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex w-full",
          "h-[var(--newa-field-height)]",
          "rounded-[var(--newa-form-field-radius)]",
          "border border-[var(--newa-border-default)]",
          "bg-[var(--newa-surface-light)]",
          "px-[var(--newa-form-field-px)] py-2",
          // Typography
          "text-sm text-[var(--newa-text-primary)]",
          "font-[var(--newa-font-application)]",
          // Placeholder
          "placeholder:text-[var(--newa-form-placeholder)]",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--newa-text-primary)]",
          // Focus state
          "focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-[#6366F1]",
          "focus-visible:ring-offset-2",
          "focus-visible:border-[var(--newa-border-focus)]",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-[var(--newa-disabled-opacity)]",
          "disabled:bg-[var(--newa-disabled-bg)]",
          // Transition
          "transition-colors duration-200",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
