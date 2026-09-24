"use client";

// template-picker.tsx — card grid of available resume templates.
// Each card shows a real render of the template (see TemplateThumbnail).
// Used on the "new resume" page and in the editor's Design panel.

import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateThumbnail } from "./template-thumbnail";

export interface TemplateDefaults {
  primaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
}

export interface TemplateListItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  defaults?: TemplateDefaults;
}

export interface TemplateOptions {
  fonts: { key: string; label: string }[];
  spacings: string[];
  fontSizes: string[];
}

/** Template list plus the theme options the renderer accepts. */
export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load templates");
      return {
        items: (json.data?.items ?? []) as TemplateListItem[],
        options: (json.data?.options ?? {
          fonts: [],
          spacings: [],
          fontSizes: [],
        }) as TemplateOptions,
      };
    },
    staleTime: 60 * 60 * 1000,
  });
}

interface TemplatePickerProps {
  value?: string | null; // templateId
  onChange: (template: TemplateListItem) => void;
  /** Smaller two-column grid without descriptions — for the editor sidebar. */
  compact?: boolean;
  disabled?: boolean;
}

export function TemplatePicker({ value, onChange, compact, disabled }: TemplatePickerProps) {
  const q = useTemplates();
  const grid = compact
    ? "grid grid-cols-2 sm:grid-cols-3 gap-3"
    : "grid sm:grid-cols-2 lg:grid-cols-4 gap-4";

  if (q.isLoading) {
    return (
      <div className={grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={compact ? "h-40 rounded-lg" : "h-72 rounded-lg"} />
        ))}
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <Card className="p-6 text-sm text-rose-600">
        Failed to load templates. Please try again later.
      </Card>
    );
  }

  return (
    <div className={grid}>
      {q.data.items.map((t) => {
        const selected = value === t.id;
        return (
          <button
            type="button"
            key={t.id}
            onClick={() => onChange(t)}
            disabled={disabled}
            aria-pressed={selected}
            className={cn(
              "group relative text-left rounded-lg border-2 transition-all overflow-hidden bg-card",
              "hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
              "disabled:opacity-60 disabled:cursor-wait",
              selected
                ? "border-emerald-500 ring-2 ring-emerald-500/30"
                : "border-border hover:border-emerald-300",
            )}
          >
            <div className="border-b">
              <TemplateThumbnail slug={t.slug} />
            </div>
            {selected && (
              <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow">
                <Check className="size-3" />
              </div>
            )}
            <div className={compact ? "px-2 py-1.5" : "p-3"}>
              <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>{t.name}</p>
              {!compact && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {t.description}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
