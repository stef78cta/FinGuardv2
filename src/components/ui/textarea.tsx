import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * NEWA Design System - Textarea Component
 * 
 * Uses tokens from newa_design-tokens.jsonc:
 * - Padding: var(--newa-form-field-px)
 * - Border: var(--newa-border-default)
 * - Border radius: var(--newa-form-field-radius)
 * - Focus ring: var(--newa-focus-ring-*)
 * - Placeholder: var(--newa-form-placeholder)
 */
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base styles
          "flex w-full min-h-[80px]",
          "rounded-[var(--newa-form-field-radius)]",
          "border border-[var(--newa-border-default)]",
          "bg-[var(--newa-surface-light)]",
          "px-[var(--newa-form-field-px)] py-2",
          // Typography
          "text-sm text-[var(--newa-text-primary)]",
          "font-[var(--newa-font-application)]",
          // Placeholder
          "placeholder:text-[var(--newa-form-placeholder)]",
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
          // Resize
          "resize-y",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
