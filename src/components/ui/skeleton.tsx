import { cn } from "@/lib/utils";

/**
 * NEWA Design System - Skeleton Component
 * 
 * Uses tokens from newa_design-tokens.jsonc:
 * - Background: var(--newa-surface-canvas)
 * - Border radius: var(--newa-radius-md)
 * - Animation: pulse
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse",
        "rounded-[var(--newa-radius-md)]",
        "bg-[var(--newa-surface-canvas)]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
