"use client";

// template-gallery.tsx — browsable template cards that start a new resume.
// Same thumbnails as the picker, but each card is a link to the "new resume"
// page with the template pre-selected.

import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { useTemplates } from "./template-picker";
import { TemplateThumbnail } from "./template-thumbnail";

export function TemplateGallery() {
  const q = useTemplates();

  if (q.isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-lg" />
        ))}
      </div>
    );
  }

  if (q.isError || !q.data) {
    return <p className="text-sm text-rose-600">Failed to load templates.</p>;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {q.data.items.map((t) => (
        <Link
          key={t.id}
          href={`/dashboard/resumes/generate/new?templateId=${t.id}`}
          className="group rounded-lg border-2 border-border overflow-hidden bg-card transition-all hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <div className="border-b">
            <TemplateThumbnail slug={t.slug} />
          </div>
          <div className="p-3">
            <p className="text-sm font-semibold">{t.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</p>
            <p className="text-xs text-emerald-600 mt-2 font-medium group-hover:underline">
              Start with this template →
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
