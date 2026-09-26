import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedValue } from "@/components/animated-value";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  accent?: "emerald" | "amber" | "teal" | "rose" | "default";
  className?: string;
}

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, { icon: string; glow: string }> = {
  emerald: {
    icon: "from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30",
    glow: "bg-emerald-500/10",
  },
  amber: {
    icon: "from-amber-400 to-orange-500 text-white shadow-amber-500/30",
    glow: "bg-amber-500/10",
  },
  teal: {
    icon: "from-teal-400 to-cyan-600 text-white shadow-teal-500/30",
    glow: "bg-teal-500/10",
  },
  rose: {
    icon: "from-rose-400 to-rose-600 text-white shadow-rose-500/30",
    glow: "bg-rose-500/10",
  },
  default: {
    icon: "from-muted to-muted text-muted-foreground shadow-transparent",
    glow: "bg-muted/40",
  },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "default",
  className,
}: StatCardProps) {
  const styles = accentClasses[accent];
  return (
    <Card className={cn("card-hover relative overflow-hidden", className)}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 size-28 rounded-full blur-2xl",
          styles.glow,
        )}
      />
      <CardContent className="relative flex items-start justify-between gap-3 px-4 sm:px-6">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums">
            <AnimatedValue value={value} />
          </p>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "shrink-0 rounded-xl bg-gradient-to-br p-2 sm:p-2.5 shadow-lg",
            styles.icon,
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
