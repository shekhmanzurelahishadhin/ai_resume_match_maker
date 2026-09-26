"use client";

// Light/dark switch with an animated sun ↔ moon swap. Uses `resolvedTheme`
// so it flips correctly when the stored theme is "system".

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function ThemeToggle({
  className,
  withLabel = false,
}: {
  className?: string;
  withLabel?: boolean;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  // false during SSR and hydration, true afterwards — avoids an icon mismatch.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Light mode" : "Dark mode";

  return (
    <Button
      variant="ghost"
      size={withLabel ? "sm" : "icon"}
      aria-label={`Switch to ${label.toLowerCase()}`}
      title={`Switch to ${label.toLowerCase()}`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn("relative overflow-hidden", withLabel && "justify-start", className)}
    >
      <span className="relative inline-flex size-4 items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {isDark ? (
              <Moon className="size-4 text-sky-300" />
            ) : (
              <Sun className="size-4 text-amber-500" />
            )}
          </motion.span>
        </AnimatePresence>
      </span>
      {withLabel ? <span>{label}</span> : null}
    </Button>
  );
}
