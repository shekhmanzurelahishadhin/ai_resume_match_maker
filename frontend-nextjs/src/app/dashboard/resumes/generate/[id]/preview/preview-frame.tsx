"use client";

// preview-frame.tsx — client iframe that fetches and renders the preview HTML.

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

export function PreviewFrame({ resumeId }: { resumeId: string }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/resumes/generate/${resumeId}/preview`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(json?.error?.message ?? "Failed to load preview");
        }
        const html = (json.data?.html ?? "") as string;
        const iframe = iframeRef.current;
        if (iframe) {
          const doc = iframe.contentDocument;
          if (doc) {
            doc.open();
            doc.write(html);
            doc.close();
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  return (
    <div className="relative w-full h-full bg-white">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground gap-2">
          <Loader2 className="size-4 animate-spin" /> Rendering preview…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-rose-600 gap-2 p-6 text-center">
          <AlertTriangle className="size-6" />
          <p>{error}</p>
        </div>
      )}
      <iframe
        ref={iframeRef}
        title="Resume preview"
        className="w-full h-full bg-white"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
