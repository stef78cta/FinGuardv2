import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * NEWA Design System - Label Component
 * 
 * Uses typography role "formLabel" from newa_design-tokens.jsonc:
 * - Font family: Inter (application)
 * - Font size: 12px
 * - Font weight: 600 (semibold)
 * - Line height: 1.25 (tight)
 */
const labelVariants = cva([
  "font-[var(--newa-font-application)]",
  "text-[length:var(--newa-font-size-xs)]",
  "font-semibold",
  "leading-[var(--newa-line-height-tight)]",
  "text-[var(--newa-text-primary)]",
  "peer-disabled:cursor-not-allowed peer-disabled:opacity-[var(--newa-disabled-opacity)]",
].join(" "));

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
