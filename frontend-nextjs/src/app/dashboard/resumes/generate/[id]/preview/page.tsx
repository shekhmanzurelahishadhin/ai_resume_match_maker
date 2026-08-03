// [id]/preview/page.tsx — full-screen HTML preview of a generated resume.
//
// Fetches the rendered HTML from /api/resumes/generate/{id}/preview and
// injects it into an iframe that fills the viewport.

import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PreviewFrame } from "./preview-frame";

export const dynamic = "force-dynamic";

export default async function FullScreenPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) notFound();

  const r = await db.generatedResume.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      template: { select: { name: true } },
    },
  });
  if (!r) notFound();
  if (r.userId !== user.id) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/dashboard/resumes/generate/${r.id}`}>
            <ArrowLeft className="size-4" /> Back to editor
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          {r.template.name} · live preview
        </p>
      </div>
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="h-[80vh]">
          <PreviewFrame resumeId={r.id} />
        </div>
      </div>
      <div className="flex items-center justify-end">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/dashboard/resumes/generate/${r.id}?tab=versions`}>
            <ExternalLink className="size-4" /> View version history
          </Link>
        </Button>
      </div>
    </div>
  );
}
