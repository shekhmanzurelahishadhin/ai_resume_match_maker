// Resume Builder landing page.
// Lists the user's generated resumes + "New" button + template picker preview.

import Link from "next/link";
import { ArrowLeft, FileText, Plus, Wand2 } from "lucide-react";

import { apiGetOrNull } from "@/lib/server-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { TemplateGallery } from "@/components/resume-builder/template-gallery";
import { DeleteResumeButton } from "@/components/resume-builder/delete-resume-button";

export const dynamic = "force-dynamic";

interface GeneratedResumeListItem {
  id: string;
  version: number;
  versionCount: number;
  updatedAt: string | null;
  template: { id: string; slug: string; name: string };
  originalResume: { id: string; fileName: string } | null;
  contentJson: { contact?: { name?: string; email?: string } } | null;
}

interface TemplateListItem {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export default async function GeneratedResumesPage() {
  const [generated, templateList] = await Promise.all([
    apiGetOrNull<{ items: GeneratedResumeListItem[] }>("resumes/generate"),
    apiGetOrNull<{ items: TemplateListItem[] }>("templates"),
  ]);

  const resumes = generated?.items ?? [];
  const templates = templateList?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Wand2 className="size-6 text-emerald-600" /> Resume Builder
            </h1>
            <p className="text-sm text-muted-foreground">
              Build a polished, customizable resume from a template. Export to
              PDF, DOCX, or HTML.
            </p>
          </div>
          <Button asChild className="gap-1.5">
            <Link href="/dashboard/resumes/generate/new">
              <Plus className="size-4" /> New resume
            </Link>
          </Button>
        </div>
      </div>

      {resumes.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold mb-3">Your generated resumes</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumes.map((r) => {
              const content = r.contentJson;
              const name = content?.contact?.name?.trim() || "Untitled";
              const email = content?.contact?.email?.trim() || "";
              return (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base truncate">{name}</CardTitle>
                    <CardDescription className="truncate">
                      {r.template.name}
                      {email ? ` · ${email}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-3 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>v{r.version}</span>
                      <span>·</span>
                      <span>{r.versionCount} snapshot{r.versionCount === 1 ? "" : "s"}</span>
                      {r.originalResume && (
                        <>
                          <span>·</span>
                          <span>from {r.originalResume.fileName}</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Button asChild size="sm" variant="outline" className="h-7">
                        <Link href={`/dashboard/resumes/generate/${r.id}`}>Edit</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-7">
                        <Link href={`/dashboard/resumes/generate/${r.id}/preview`}>Preview</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-7">
                        <Link href={`/dashboard/resumes/generate/${r.id}/versions`}>Versions</Link>
                      </Button>
                      <DeleteResumeButton resumeId={r.id} resumeName={name} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No generated resumes yet"
          description="Pick a template below to get started. Your first resume is just a few clicks away."
        />
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Pick a template</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {`Browse the ${templates.length} available templates. `}
          Click any card to start a new resume from that template — you can
          switch templates and colours later from the editor&apos;s Design tab.
        </p>
        <TemplateGallery />
      </div>
    </div>
  );
}
