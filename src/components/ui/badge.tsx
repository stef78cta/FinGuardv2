import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * NEWA Design System - Badge Component
 * 
 * Uses tokens from newa_design-tokens.jsonc:
 * - Primary: var(--newa-brand-accent-indigo)
 * - Destructive: var(--newa-brand-danger-rose)
 * - Success: var(--newa-semantic-success)
 * - Warning: var(--newa-semantic-warning)
 * - Info: var(--newa-semantic-info)
 * - Border radius: full (pill shape)
 * - Focus ring: var(--newa-focus-ring-*)
 */
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1",
    "rounded-full border",
    "px-2.5 py-0.5",
    "text-xs font-semibold",
    "transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-[var(--newa-focus-ring-color)] focus:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "border-transparent",
          "bg-[var(--newa-brand-accent-indigo)]",
          "text-[var(--newa-text-inverse)]",
          "hover:bg-[#4F46E5]",
        ].join(" "),
        secondary: [
          "border-transparent",
          "bg-[var(--newa-surface-canvas)]",
          "text-[var(--newa-text-secondary)]",
          "hover:bg-[var(--newa-border-default)]",
        ].join(" "),
        destructive: [
          "border-transparent",
          "bg-[var(--newa-brand-danger-rose)]",
          "text-[var(--newa-text-inverse)]",
          "hover:bg-[#E11D48]",
        ].join(" "),
        outline: [
          "border-[var(--newa-border-default)]",
          "text-[var(--newa-text-primary)]",
          "bg-transparent",
        ].join(" "),
        success: [
          "border-transparent",
          "bg-[var(--newa-semantic-success)]",
          "text-[var(--newa-text-inverse)]",
          "hover:bg-[#10B981]",
        ].join(" "),
        warning: [
          "border-transparent",
          "bg-[var(--newa-semantic-warning)]",
          "text-[var(--newa-text-inverse)]",
          "hover:bg-[#D97706]",
        ].join(" "),
        info: [
          "border-transparent",
          "bg-[var(--newa-semantic-info)]",
          "text-[var(--newa-text-inverse)]",
          "hover:bg-[#2563EB]",
        ].join(" "),
        /* Subtle variants with light backgrounds */
        "success-subtle": [
          "border-transparent",
          "bg-[var(--newa-alert-success-bg)]",
          "text-[#065F46]",
        ].join(" "),
        "warning-subtle": [
          "border-transparent",
          "bg-[var(--newa-alert-warning-bg)]",
          "text-[#92400E]",
        ].join(" "),
        "danger-subtle": [
          "border-transparent",
          "bg-[var(--newa-alert-danger-bg)]",
          "text-[#9F1239]",
        ].join(" "),
        "info-subtle": [
          "border-transparent",
          "bg-[var(--newa-alert-info-bg)]",
          "text-[#1E40AF]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Badge component for status indicators and labels.
 * 
 * @param variant - Visual style: default, secondary, destructive, outline, success, warning, info
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
