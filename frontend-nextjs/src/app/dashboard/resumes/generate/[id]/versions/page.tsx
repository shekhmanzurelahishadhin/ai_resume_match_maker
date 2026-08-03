// [id]/versions/page.tsx — version history with restore buttons.

import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VersionHistory } from "@/components/resume-builder/version-history";

export const dynamic = "force-dynamic";

export default async function VersionsPage({
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
      version: true,
      template: { select: { name: true } },
      contentJson: true,
    },
  });
  if (!r) notFound();
  if (r.userId !== user.id) notFound();

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
