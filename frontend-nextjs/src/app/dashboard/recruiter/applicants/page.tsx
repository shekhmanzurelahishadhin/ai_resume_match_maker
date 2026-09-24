// Recruiter → Applicants. Every application across all of the recruiter's
// jobs in one pipeline view.

import { ApplicantList } from "@/components/jobs/applicant-list";

export const dynamic = "force-dynamic";

export default function ApplicantsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Applicants</h1>
        <p className="text-sm text-muted-foreground">
          Everyone who applied to your jobs. Move them through your pipeline — each change notifies the candidate.
        </p>
      </div>
      <ApplicantList showJob />
    </div>
  );
}
