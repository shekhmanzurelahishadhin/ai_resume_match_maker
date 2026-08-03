"use client";

import { Loader2, AlertCircle, CheckCircle2, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: "pending" | "parsing" | "ready" | "failed";
  error?: string | null;
  className?: string;
}

const META: Record<
  Props["status"],
  { label: string; className: string; icon: typeof Loader2 }
> = {
  pending: {
    label: "Pending",
    className: "bg-muted text-muted-foreground",
    icon: Clock,
  },
  parsing: {
    label: "Parsing",
    className:
      "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
    icon: Loader2,
  },
  ready: {
    label: "Ready",
    className:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
    icon: AlertCircle,
  },
};

export function ResumeStatusBadge({ status, error, className }: Props) {
  const meta = META[status];
  const Icon = meta.icon;
  return (
    <Badge
      variant="outline"
      title={error ?? undefined}
      className={cn("gap-1", meta.className, className)}
    >
      <Icon className={cn("size-3", status === "parsing" && "animate-spin")} />
      {meta.label}
    </Badge>
  );
}
