// Seeker → My Resumes. Lists all of the user's resumes + an upload card.

import { FileText } from "lucide-react";

import { apiGetOrNull, type Paginated } from "@/lib/server-api";
import { ResumeUpload } from "@/components/resume-upload";
import { ResumeCard, type ResumeCardData } from "@/components/resume-card";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SeekerResumesPage() {
  const page = await apiGetOrNull<Paginated<ResumeCardData>>(
    "resumes?pageSize=100",
  );
  const resumes = page?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My resumes</h1>
        <p className="text-sm text-muted-foreground">
          Upload PDF resumes. We&apos;ll extract skills and match you to active jobs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload a resume</CardTitle>
          <CardDescription>
            PDF only, up to 5 MB. Limited to 5 uploads per hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResumeUpload />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">
          {resumes.length > 0
            ? `All resumes (${resumes.length})`
            : "Your resumes"}
        </h2>
        {resumes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No resumes uploaded"
            description="Upload your first PDF above to start matching against active jobs."
          />
        ) : (
          <div className="stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumes.map((r) => (
              <ResumeCard key={r.id} resume={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
