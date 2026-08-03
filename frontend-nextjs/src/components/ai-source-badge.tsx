import { Sparkles, Cpu } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AiSourceBadgeProps {
  source: "ai" | "fallback" | string;
  className?: string;
}

export function AiSourceBadge({ source, className }: AiSourceBadgeProps) {
  const isAi = source === "ai";
  return (
    <Badge
      variant="outline"
      title={
        isAi
          ? "Result produced by an AI model (Hugging Face inference)"
          : "Estimated via fallback heuristics (no AI model was reachable)"
      }
      className={cn(
        "gap-1 font-medium",
        isAi
          ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800"
          : "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {isAi ? <Sparkles className="size-3" /> : <Cpu className="size-3" />}
      {isAi ? "AI-verified" : "Estimated"}
    </Badge>
  );
}
