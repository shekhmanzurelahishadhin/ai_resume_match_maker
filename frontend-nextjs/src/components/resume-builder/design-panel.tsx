"use client";

// design-panel.tsx — template + theme controls for a generated resume.
//
// Template switches save immediately; theme tweaks (colours, fonts, spacing,
// text size) are debounced so dragging a colour picker doesn't fire a request
// per pixel. Both only send what they change, so they never clobber the
// content the form is autosaving.

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { ResumeCustomization } from "@/lib/validators/resume-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TemplatePicker,
  useTemplates,
  type TemplateListItem,
} from "./template-picker";

/** Curated colour pairs that stay readable on every template. */
const COLOR_THEMES: { name: string; primary: string; accent: string }[] = [
  { name: "Emerald", primary: "#059669", accent: "#34d399" },
  { name: "Ocean", primary: "#1d4ed8", accent: "#60a5fa" },
  { name: "Indigo", primary: "#4338ca", accent: "#a5b4fc" },
  { name: "Plum", primary: "#7e22ce", accent: "#e879f9" },
  { name: "Rose", primary: "#be123c", accent: "#fb7185" },
  { name: "Amber", primary: "#b45309", accent: "#f59e0b" },
  { name: "Teal", primary: "#0f766e", accent: "#2dd4bf" },
  { name: "Graphite", primary: "#1f2937", accent: "#9ca3af" },
];

const DEFAULT = "__default__";
const SAVE_DELAY_MS = 500;

export interface ActiveTemplate {
  id: string;
  slug: string;
  name: string;
}

interface DesignPanelProps {
  resumeId: string;
  template: ActiveTemplate;
  customization: ResumeCustomization;
  onTemplateChange: (template: ActiveTemplate) => void;
  onCustomizationChange: (customization: ResumeCustomization) => void;
  /** Called after any successful save so the preview can refresh. */
  onSaved: () => void;
}

/** Drop empty keys so "template default" is stored as an absent key. */
function compact(c: ResumeCustomization): ResumeCustomization {
  return Object.fromEntries(
    Object.entries(c ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  ) as ResumeCustomization;
}

export function DesignPanel({
  resumeId,
  template,
  customization,
  onTemplateChange,
  onCustomizationChange,
  onSaved,
}: DesignPanelProps) {
  const templatesQ = useTemplates();
  const [switching, setSwitching] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const put = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/resumes/generate/${resumeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message ?? "Save failed");
    return json;
  };

  const switchTemplate = async (next: TemplateListItem) => {
    if (next.id === template.id || switching) return;
    setSwitching(true);
    const previous = template;
    onTemplateChange({ id: next.id, slug: next.slug, name: next.name });
    try {
      await put({ templateId: next.id });
      toast.success(`Switched to ${next.name}.`);
      onSaved();
    } catch (e) {
      onTemplateChange(previous);
      toast.error(e instanceof Error ? e.message : "Could not switch template");
    } finally {
      setSwitching(false);
    }
  };

  const updateTheme = (patch: Partial<ResumeCustomization>) => {
    const next = compact({ ...customization, ...patch });
    onCustomizationChange(next);
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await put({ customizationJson: next });
        setSaveState("saved");
        onSaved();
      } catch (e) {
        setSaveState("idle");
        toast.error(e instanceof Error ? e.message : "Could not save theme");
      }
    }, SAVE_DELAY_MS);
  };

  const defaults = templatesQ.data?.items.find((t) => t.id === template.id)?.defaults;
  const fonts = templatesQ.data?.options.fonts ?? [];
  const primary = customization.primaryColor ?? defaults?.primaryColor ?? "#059669";
  const accent = customization.accentColor ?? defaults?.accentColor ?? "#34d399";
  const usingTemplateColors = !customization.primaryColor && !customization.accentColor;
  const hasOverrides = Object.keys(compact(customization)).length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Template</CardTitle>
          <CardDescription>
            Your content stays the same — only the layout changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplatePicker
            compact
            value={template.id}
            onChange={switchTemplate}
            disabled={switching}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Theme</CardTitle>
              <CardDescription>Colours, fonts and spacing for this resume.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1 min-w-16 justify-end">
                {saveState === "saving" && (
                  <>
                    <Loader2 className="size-3 animate-spin" /> Saving
                  </>
                )}
                {saveState === "saved" && (
                  <>
                    <Check className="size-3" /> Saved
                  </>
                )}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!hasOverrides}
                onClick={() => {
                  // Replace, don't merge: clear every override.
                  onCustomizationChange({});
                  setSaveState("saving");
                  if (saveTimer.current) clearTimeout(saveTimer.current);
                  put({ customizationJson: {} })
                    .then(() => {
                      setSaveState("saved");
                      onSaved();
                    })
                    .catch((e) => {
                      setSaveState("idle");
                      toast.error(e instanceof Error ? e.message : "Could not reset theme");
                    });
                }}
              >
                <RotateCcw className="size-3.5" /> Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Colours */}
          <div className="space-y-2">
            <Label className="text-xs">Colour theme</Label>
            <div className="flex flex-wrap gap-2">
              <Swatch
                label="Template default"
                selected={usingTemplateColors}
                primary={defaults?.primaryColor ?? "#e5e7eb"}
                accent={defaults?.accentColor ?? "#f3f4f6"}
                onClick={() => updateTheme({ primaryColor: undefined, accentColor: undefined })}
              />
              {COLOR_THEMES.map((t) => (
                <Swatch
                  key={t.name}
                  label={t.name}
                  selected={
                    customization.primaryColor?.toLowerCase() === t.primary &&
                    customization.accentColor?.toLowerCase() === t.accent
                  }
                  primary={t.primary}
                  accent={t.accent}
                  onClick={() => updateTheme({ primaryColor: t.primary, accentColor: t.accent })}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <ColorInput
                label="Primary"
                value={primary}
                onChange={(v) => updateTheme({ primaryColor: v })}
              />
              <ColorInput
                label="Accent"
                value={accent}
                onChange={(v) => updateTheme({ accentColor: v })}
              />
            </div>
          </div>

          {/* Fonts */}
          <div className="grid grid-cols-2 gap-3">
            <FontSelect
              label="Heading font"
              value={customization.headingFont}
              defaultKey={defaults?.headingFont}
              fonts={fonts}
              onChange={(v) => updateTheme({ headingFont: v as ResumeCustomization["headingFont"] })}
            />
            <FontSelect
              label="Body font"
              value={customization.bodyFont}
              defaultKey={defaults?.bodyFont}
              fonts={fonts}
              onChange={(v) => updateTheme({ bodyFont: v as ResumeCustomization["bodyFont"] })}
            />
          </div>

          {/* Layout */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Segmented
              label="Spacing"
              value={customization.spacing ?? "normal"}
              options={["compact", "normal", "relaxed"]}
              onChange={(v) =>
                updateTheme({ spacing: v === "normal" ? undefined : (v as ResumeCustomization["spacing"]) })
              }
            />
            <Segmented
              label="Text size"
              value={customization.fontSize ?? "medium"}
              options={["small", "medium", "large"]}
              onChange={(v) =>
                updateTheme({ fontSize: v === "medium" ? undefined : (v as ResumeCustomization["fontSize"]) })
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Swatch({
  label,
  selected,
  primary,
  accent,
  onClick,
}: {
  label: string;
  selected: boolean;
  primary: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        "size-9 rounded-full border-2 overflow-hidden transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
        selected ? "border-foreground scale-110" : "border-transparent hover:scale-105",
      )}
    >
      <span className="flex h-full w-full">
        <span className="h-full w-1/2" style={{ background: primary }} />
        <span className="h-full w-1/2" style={{ background: accent }} />
      </span>
    </button>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs cursor-pointer">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase())}
        className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
        aria-label={`${label} colour`}
      />
      <span className="font-medium">{label}</span>
      <span className="ml-auto font-mono text-muted-foreground">{value}</span>
    </label>
  );
}

function FontSelect({
  label,
  value,
  defaultKey,
  fonts,
  onChange,
}: {
  label: string;
  value?: string;
  defaultKey?: string;
  fonts: { key: string; label: string }[];
  onChange: (v: string | undefined) => void;
}) {
  const defaultLabel = fonts.find((f) => f.key === defaultKey)?.label;
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select
        value={value ?? DEFAULT}
        onValueChange={(v) => onChange(v === DEFAULT ? undefined : v)}
      >
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT}>
            Template default{defaultLabel ? ` (${defaultLabel})` : ""}
          </SelectItem>
          {fonts.map((f) => (
            <SelectItem key={f.key} value={f.key}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="grid grid-cols-3 rounded-md border p-0.5 text-xs">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={cn(
              "rounded px-2 py-1 capitalize transition-colors",
              value === o
                ? "bg-emerald-600 text-white"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
