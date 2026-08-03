// Resume Builder landing page.
// Lists the user's generated resumes + "New" button + template picker preview.

import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft, FileText, Plus, Wand2 } from "lucide-react";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { TemplatePicker } from "@/components/resume-builder/template-picker";

export const dynamic = "force-dynamic";

export default async function GeneratedResumesPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) return null;

  const [resumes, templates] = await Promise.all([
    db.generatedResume.findMany({
      where: { userId: user.id, isCurrent: true },
      orderBy: { updatedAt: "desc" },
      include: {
        template: { select: { id: true, slug: true, name: true } },
        originalResume: { select: { id: true, fileName: true } },
        _count: { select: { versions: true } },
      },
    }),
    db.resumeTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true, description: true },
    }),
  ]);

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
              const content = r.contentJson as {
                contact?: { name?: string; email?: string };
              };
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
                      <span>{r._count.versions} snapshot{r._count.versions === 1 ? "" : "s"}</span>
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
          Browse the 6 available templates. Click any card to start a new resume
          from that template.
        </p>
        <TemplatePickerForNew templates={templates} />
      </div>
    </div>
  );
}

/**
 * Server-side wrapper that turns the picked template id into a link to the
 * "new resume" page with `?templateId=...` prefilled.
 * (The interactive TemplatePicker is a client component — we just give it
 *  a `onChange` that navigates.)
 */
function TemplatePickerForNew({
  templates,
}: {
  templates: { id: string; slug: string; name: string; description: string }[];
}) {
  // Use a client-side picker, but route on click. Since TemplatePicker is a
  // controlled client component, we wrap it in a tiny client wrapper that
  // handles the navigation. For simplicity here, we render clickable cards.
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((t) => (
        <Button
          key={t.id}
          asChild
          variant="outline"
          className="h-auto p-0 text-left overflow-hidden border-2 hover:border-emerald-300 hover:shadow-md transition-all"
        >
          <Link href={`/dashboard/resumes/generate/new?templateId=${t.id}`}>
            <div className="w-full p-3 bg-card">
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {t.description}
              </p>
              <p className="text-xs text-emerald-600 mt-2 font-medium">
                Start with this template →
              </p>
            </div>
          </Link>
        </Button>
      ))}
    </div>
  );
}
