// Recruiter → Edit job. Loads the job and renders the JobForm in edit mode.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { apiGetOrNull } from "@/lib/server-api";
import { Button } from "@/components/ui/button";
import { JobForm } from "@/components/job-form";
import type { JobListing } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await apiGetOrNull<{ job: JobListing }>(`jobs/${id}`);
  if (!payload?.job) notFound();
  const job = payload.job;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href={`/dashboard/recruiter/jobs/${job.id}`}>
            <ArrowLeft className="size-4" /> Back to job
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Edit job</h1>
        <p className="text-sm text-muted-foreground">Changing the required skills re-runs candidate matching.</p>
      </div>
      <JobForm mode="edit" initial={job} />
    </div>
  );
}
