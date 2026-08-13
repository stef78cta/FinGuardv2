import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  /** Stare controlată: parola este vizibilă când true. */
  visible: boolean;
  /** Callback la schimbarea vizibilității; nu afectează valoarea câmpului. */
  onVisibleChange: (visible: boolean) => void;
};

/**
 * Câmp de parolă cu toggle de vizibilitate controlat din exterior.
 * Fiecare instanță primește propria stare (visible / onVisibleChange).
 */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, visible, onVisibleChange, ...props }, ref) => {
    const toggleVisibility = React.useCallback(() => {
      onVisibleChange(!visible);
    }, [onVisibleChange, visible]);

    const handleToggleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleVisibility();
      }
    };

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-10", className)}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          onKeyDown={handleToggleKeyDown}
          aria-label={visible ? "Ascunde parola" : "Afișează parola"}
          aria-pressed={visible}
          className={cn(
            "absolute right-3 top-1/2 z-10 -translate-y-1/2",
            "cursor-pointer",
            "text-muted-foreground hover:text-foreground transition-colors",
            "rounded-sm p-0.5",
            "focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-[#6366F1]",
            "focus-visible:ring-offset-2"
          )}
        >
          {visible ? (
            <EyeOff className="h-4 w-4 pointer-events-none" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4 pointer-events-none" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
