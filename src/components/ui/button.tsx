import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * NEWA Design System - Button Component
 * 
 * Implements button variants according to newa_design-tokens.jsonc:
 * - Uses --newa-brand-accent-indigo for primary
 * - Uses --newa-brand-danger-rose for destructive
 * - Uses --newa-radius-xl (20px) for pill shape on most variants
 * - Uses --newa-focus-ring-* for focus states
 * - Disabled state with --newa-disabled-opacity
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium",
    "transition-colors duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--newa-focus-ring-color)] focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-[var(--newa-disabled-opacity)]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-[var(--newa-brand-accent-indigo)] text-[var(--newa-text-inverse)]",
          "hover:bg-[#4F46E5]", // slightly darker indigo on hover
          "rounded-[40px]", // pill shape for primary buttons
        ].join(" "),
        destructive: [
          "bg-[var(--newa-brand-danger-rose)] text-[var(--newa-text-inverse)]",
          "hover:bg-[#E11D48]", // slightly darker rose on hover
          "rounded-[40px]",
        ].join(" "),
        outline: [
          "border border-[var(--newa-border-default)] bg-[var(--newa-surface-light)]",
          "text-[var(--newa-text-primary)]",
          "hover:bg-[var(--newa-state-hover)] hover:border-[var(--newa-text-muted)]",
          "rounded-[var(--newa-radius-md)]",
        ].join(" "),
        secondary: [
          "bg-[var(--newa-surface-canvas)] text-[var(--newa-text-primary)]",
          "hover:bg-[var(--newa-border-default)]",
          "rounded-[var(--newa-radius-md)]",
        ].join(" "),
        ghost: [
          "text-[var(--newa-text-secondary)]",
          "hover:bg-[var(--newa-state-hover)] hover:text-[var(--newa-text-primary)]",
          "rounded-[var(--newa-radius-md)]",
        ].join(" "),
        link: [
          "text-[var(--newa-brand-accent-indigo)] underline-offset-4",
          "hover:underline",
        ].join(" "),
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-11 px-8 text-base",
        icon: "h-10 w-10 rounded-[var(--newa-radius-md)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * Button component implementing NEWA design system.
 * 
 * @param variant - Visual style: default, destructive, outline, secondary, ghost, link
 * @param size - Size: default, sm, lg, icon
 * @param asChild - If true, renders as Slot for composition
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
