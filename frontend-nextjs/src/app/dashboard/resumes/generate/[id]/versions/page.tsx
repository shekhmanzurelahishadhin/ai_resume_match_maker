// [id]/versions/page.tsx — version history with restore buttons.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { apiGetOrNull } from "@/lib/server-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VersionHistory } from "@/components/resume-builder/version-history";

export const dynamic = "force-dynamic";

interface GeneratedResumeDetail {
  id: string;
  version: number;
  contentJson: unknown;
  customizationJson: unknown;
  template: { id: string; slug: string; name: string };
}

export default async function VersionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Ownership is enforced by the API policy; a 403/404 arrives here as null.
  const payload = await apiGetOrNull<{ resume: GeneratedResumeDetail }>(
    `resumes/generate/${id}`,
  );
  const r = payload?.resume;
  if (!r) notFound();

  const name =
    ((r.contentJson as { contact?: { name?: string } })?.contact?.name ?? "").trim() ||
    "Untitled resume";

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href={`/dashboard/resumes/generate/${r.id}`}>
            <ArrowLeft className="size-4" /> Back to editor
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight truncate">{name}</h1>
        <p className="text-sm text-muted-foreground">
          {r.template.name} · currently on v{r.version}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Version history</CardTitle>
          <CardDescription>
            Every save creates a snapshot. Restore any version to roll back —
            restoring creates a new version (history is append-only).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VersionHistory resumeId={r.id} currentVersion={r.version} />
        </CardContent>
      </Card>
    </div>
  );
}
