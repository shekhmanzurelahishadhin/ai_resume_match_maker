"use client";

// template-thumbnail.tsx — a scaled-down render of a template filled with
// sample content.
//
// The HTML comes from the same Laravel renderer that produces previews and
// exports (GET /api/templates/{slug}/sample), so a thumbnail can never drift
// from what the user actually gets.

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** Width the templates are designed at (matches `.rm-page { max-width }`). */
const PAGE_WIDTH = 820;
/** A4 portrait. */
const PAGE_HEIGHT = Math.round(PAGE_WIDTH * (297 / 210));

export function useTemplateSample(slug: string) {
  return useQuery({
    queryKey: ["template-sample", slug],
    queryFn: async () => {
      const res = await fetch(`/api/templates/${encodeURIComponent(slug)}/sample`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load template");
      return json.data.html as string;
    },
    // The sample only changes when a template is redesigned.
    staleTime: Infinity,
  });
}

export function TemplateThumbnail({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const { data: html, isLoading, isError } = useTemplateSample(slug);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.25);

  // Scale the full-size page down to whatever width the card gives us.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / PAGE_WIDTH);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      className={cn("relative w-full overflow-hidden bg-white", className)}
      style={{ aspectRatio: `${PAGE_WIDTH} / ${PAGE_HEIGHT}` }}
    >
      {isLoading && <Skeleton className="absolute inset-0 rounded-none" />}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          Preview unavailable
        </div>
      )}
      {html && (
        <iframe
          title={`${slug} template preview`}
          srcDoc={html}
          // Static markup only: no scripts, no same-origin access, and links
          // inside the sample are not clickable.
          sandbox=""
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
          style={{
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            transform: `scale(${scale})`,
          }}
        />
      )}
    </div>
  );
}
