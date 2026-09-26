import Link from "next/link";
import { FileSearch } from "lucide-react";

import { cn } from "@/lib/utils";

/** Gradient logo mark + wordmark, shared by the marketing, auth and app shells. */
export function BrandLogo({
  href = "/",
  subtitle,
  compact = false,
  className,
}: {
  href?: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25 transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105",
          compact ? "size-7" : "size-9",
        )}
      >
        <FileSearch className={compact ? "size-4" : "size-5"} />
      </div>
      <div className="leading-tight">
        <p className={cn("font-semibold tracking-tight", compact ? "text-sm" : "text-[15px]")}>
          {compact ? "Matchmaker" : "Resume Matchmaker"}
        </p>
        {subtitle ? (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
