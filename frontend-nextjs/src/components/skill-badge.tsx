import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SkillBadgeProps {
  skill: string;
  variant?: "default" | "matched" | "missing" | "muted";
  className?: string;
}

const variantStyles: Record<NonNullable<SkillBadgeProps["variant"]>, string> = {
  default: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800",
  matched: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800",
  missing: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-800",
  muted: "bg-muted text-muted-foreground border-border",
};

export function SkillBadge({ skill, variant = "default", className }: SkillBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {skill}
    </Badge>
  );
}
