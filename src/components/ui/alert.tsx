import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * NEWA Design System - Alert Component
 * 
 * Uses tokens from newa_design-tokens.jsonc:
 * - Default: var(--newa-surface-light) background
 * - Success: var(--newa-alert-success-bg) with var(--newa-alert-success-border)
 * - Warning: var(--newa-alert-warning-bg) with var(--newa-alert-warning-border)
 * - Info: var(--newa-alert-info-bg) with var(--newa-alert-info-border)
 * - Destructive/Danger: var(--newa-alert-danger-bg) with var(--newa-alert-danger-border)
 * - Border radius: var(--newa-radius-md) = 10px
 */
const alertVariants = cva(
  [
    "relative w-full",
    "rounded-[var(--newa-radius-md)]",
    "border-l-4",
    "p-[var(--newa-spacing-4)]",
    "[&>svg~*]:pl-7",
    "[&>svg+div]:translate-y-[-3px]",
    "[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-[var(--newa-surface-light)]",
          "border-[var(--newa-border-default)]",
          "text-[var(--newa-text-primary)]",
          "[&>svg]:text-[var(--newa-text-secondary)]",
        ].join(" "),
        destructive: [
          "bg-[var(--newa-alert-danger-bg)]",
          "border-[var(--newa-alert-danger-border)]",
          "text-[#9F1239]",
          "[&>svg]:text-[var(--newa-semantic-danger)]",
        ].join(" "),
        success: [
          "bg-[var(--newa-alert-success-bg)]",
          "border-[var(--newa-alert-success-border)]",
          "text-[#065F46]",
          "[&>svg]:text-[var(--newa-semantic-success)]",
        ].join(" "),
        warning: [
          "bg-[var(--newa-alert-warning-bg)]",
          "border-[var(--newa-alert-warning-border)]",
          "text-[#92400E]",
          "[&>svg]:text-[var(--newa-semantic-warning)]",
        ].join(" "),
        info: [
          "bg-[var(--newa-alert-info-bg)]",
          "border-[var(--newa-alert-info-border)]",
          "text-[#1E40AF]",
          "[&>svg]:text-[var(--newa-semantic-info)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "mb-1 font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
