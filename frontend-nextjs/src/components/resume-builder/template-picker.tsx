"use client";

// template-picker.tsx — card grid of available resume templates.
// Each card shows a CSS-rendered mini preview and the template's name/description.
// Used on the "new generated resume" page.

import { useQuery } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface TemplateListItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  colors: { primary: string; accent: string; text: string } | null;
  fonts: { heading: string; body: string } | null;
}

interface TemplatePickerProps {
  value?: string | null; // templateId
  onChange: (templateId: string) => void;
}

export function TemplatePicker({ value, onChange }: TemplatePickerProps) {
  const q = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      const json = await res.json();
      return (json.data?.items ?? []) as TemplateListItem[];
    },
    staleTime: 60 * 60 * 1000,
  });

  if (q.isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
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
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {q.data.map((t) => {
        const selected = value === t.id;
        const primary = t.colors?.primary ?? "#059669";
        const accent = t.colors?.accent ?? "#34d399";
        return (
          <button
            type="button"
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-pressed={selected}
            className={cn(
              "group text-left rounded-lg border-2 transition-all overflow-hidden",
              "hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
              selected
                ? "border-emerald-500 ring-2 ring-emerald-500/30"
                : "border-border hover:border-emerald-300",
            )}
          >
            {/* Mini CSS-rendered preview */}
            <div className="h-44 bg-white p-3 relative">
              <MiniPreview slug={t.slug} primary={primary} accent={accent} />
              {selected && (
                <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow">
                  <Check className="size-3" />
                </div>
              )}
            </div>
            <div className="p-3 bg-card">
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {t.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Tiny CSS-only preview of each template — gives the user a hint of the
 * layout style without rendering the full Handlebars template.
 */
function MiniPreview({
  slug,
  primary,
  accent,
}: {
  slug: string;
  primary: string;
  accent: string;
}) {
  // Shared bits: name + contact line + 3 section bars + bullets.
  const header = (
    <div>
      <div
        className="text-[10px] font-bold leading-tight"
        style={{ color: primary }}
      >
        Alex Sample
      </div>
      <div className="text-[6px] text-gray-500 mt-0.5">
        alex@example.com · SF, CA
      </div>
    </div>
  );

  const section = (label: string, _bars = 2) => (
    <div className="mt-2">
      <div
        className="text-[6px] font-semibold uppercase tracking-wider"
        style={{ color: primary, borderBottom: `1px solid ${primary}`, paddingBottom: "1px" }}
      >
        {label}
      </div>
      <div className="mt-1 space-y-0.5">
        {Array.from({ length: _bars }).map((_, i) => (
          <div
            key={i}
            className="h-[3px] rounded bg-gray-200"
            style={{ width: `${90 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );

  if (slug === "professional-classic") {
    return (
      <div className="flex gap-2 h-full text-[6px]">
        <div className="w-1/3 bg-gray-50 p-1.5 rounded-l">
          {header}
          {section("Skills")}
        </div>
        <div className="flex-1 p-1.5">
          {section("Summary")}
          {section("Experience", 3)}
        </div>
      </div>
    );
  }
  if (slug === "creative") {
    return (
      <div className="h-full flex flex-col">
        <div className="p-1.5 rounded" style={{ background: primary, color: "white" }}>
          {header}
        </div>
        <div className="flex gap-2 flex-1 p-1.5">
          <div className="flex-1">
            {section("Summary")}
            {section("Experience", 2)}
          </div>
          <div className="w-1/3" style={{ borderLeft: `2px solid ${accent}` }}>
            <div className="pl-1.5">{section("Skills")}</div>
          </div>
        </div>
      </div>
    );
  }
  if (slug === "executive") {
    return (
      <div className="h-full p-1.5">
        {header}
        <div
          className="text-[10px] font-bold mt-1"
          style={{ borderBottom: `2px solid ${primary}`, color: primary }}
        >
          {""}
        </div>
        {section("Summary")}
        {section("Experience", 3)}
        {section("Education")}
      </div>
    );
  }
  if (slug === "technical") {
    return (
      <div className="h-full p-1.5">
        {header}
        <div
          className="mt-1.5 p-1 rounded"
          style={{ background: `${accent}33`, borderLeft: `2px solid ${primary}` }}
        >
          <div className="text-[6px] font-bold" style={{ color: primary }}>
            LANGUAGES
          </div>
          <div className="text-[6px] font-mono text-gray-700">
            TS · Python · Go
          </div>
          <div className="text-[6px] font-bold mt-1" style={{ color: primary }}>
            TOOLS
          </div>
          <div className="text-[6px] font-mono text-gray-700">
            React · Next.js · Docker
          </div>
        </div>
        {section("Experience", 2)}
      </div>
    );
  }
  if (slug === "academic") {
    return (
      <div className="h-full p-1.5 text-center">
        <div
          className="text-[10px] font-bold uppercase tracking-wide mx-auto"
          style={{ color: primary, borderBottom: "1px solid #999", display: "inline-block", paddingBottom: "1px" }}
        >
          Alex Sample
        </div>
        <div className="text-[6px] text-gray-500 mt-0.5">alex@example.com</div>
        <div className="text-left mt-2">
          {section("Education")}
          {section("Experience", 2)}
        </div>
      </div>
    );
  }
  // modern-clean (default)
  return (
    <div className="h-full p-1.5">
      {header}
      {section("Summary")}
      {section("Experience", 2)}
      {section("Skills")}
    </div>
  );
}

export function TemplatePickerLoading() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-lg" />
      ))}
    </div>
  );
}

export function TemplatePickerSpinner() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Loading templates…
    </div>
  );
}
