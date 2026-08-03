"use client";

// enhance-button.tsx — calls POST /api/resumes/generate/{id}/enhance,
// shows an AI source badge, and applies the improved text to the field.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EnhanceButtonProps {
  /** The generated resume id (required for the API call). */
  resumeId?: string;
  /** Which section is being enhanced. */
  section: "summary" | "experience" | "skills";
  /** Reads the current text from the field. */
  getField: () => string;
  /** Writes the improved text back to the field. */
  onApply: (improved: string) => void;
  className?: string;
  label?: string;
}

interface EnhanceResponse {
  original: string;
  improved: string;
  source: "ai" | "fallback";
  flag?: string;
  persisted?: boolean;
}

export function EnhanceButton({
  resumeId,
  section,
  getField,
  onApply,
  className,
  label = "Enhance with AI",
}: EnhanceButtonProps) {
  const [source, setSource] = useState<"ai" | "fallback" | null>(null);
  const [flag, setFlag] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async (): Promise<EnhanceResponse> => {
      if (!resumeId) {
        throw new Error("Save the resume first to enable AI enhancement.");
      }
      const text = getField();
      if (!text.trim()) {
        throw new Error("Nothing to enhance — enter some text first.");
      }
      const res = await fetch(
        `/api/resumes/generate/${resumeId}/enhance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, text }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Enhance request failed");
      }
      return json.data as EnhanceResponse;
    },
    onSuccess: (data) => {
      onApply(data.improved);
      setSource(data.source);
      setFlag(data.flag ?? null);
      if (data.source === "ai") {
        toast.success("Enhanced with AI (google/flan-t5-base).");
      } else {
        toast.info("AI unavailable — original text kept.", {
          description: data.flag ?? "Set HUGGINGFACE_API_KEY to enable AI enhancement.",
        });
      }
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("gap-1.5", className)}
        disabled={mut.isPending}
        onClick={() => mut.mutate()}
      >
        {mut.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Sparkles className="size-3.5" />
        )}
        {mut.isPending ? "Enhancing…" : label}
      </Button>
      {source === "ai" && (
        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          <Sparkles className="size-3" /> AI
        </span>
      )}
      {source === "fallback" && (
        <span
          className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
          title={flag ?? undefined}
        >
          <AlertTriangle className="size-3" /> {flag ?? "fallback"}
        </span>
      )}
    </div>
  );
}
