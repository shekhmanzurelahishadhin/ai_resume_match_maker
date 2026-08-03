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
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        {Icon ? (
          <div className="rounded-full bg-muted p-3 text-muted-foreground">
            <Icon className="size-6" />
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
