import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed shadow-none bg-card/60 animate-fade-up", className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        {Icon ? (
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-xl" aria-hidden />
            <div className="relative animate-float rounded-2xl border bg-gradient-to-br from-emerald-50 to-teal-50 p-3.5 text-emerald-600 dark:from-emerald-500/15 dark:to-teal-500/5 dark:text-emerald-300">
              <Icon className="size-6" />
            </div>
          </div>
        ) : null}
        <div className="space-y-1">
          <p className="text-base font-semibold">{title}</p>
          {description ? (
            <p className="text-sm text-muted-foreground max-w-md">{description}</p>
          ) : null}
        </div>
        {actionLabel && onAction ? (
          <Button onClick={onAction} size="sm" className="mt-2">
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
