// Recruiter → New Job. Renders the JobForm in create mode.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JobForm } from "@/components/job-form";

export const dynamic = "force-dynamic";

export default function NewJobPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/dashboard/recruiter/jobs">
            <ArrowLeft className="size-4" /> Back to jobs
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Post a new job</h1>
        <p className="text-sm text-muted-foreground">
          Match against every ready resume will start automatically once saved.
        </p>
      </div>
      <JobForm mode="create" />
    </div>
  );
}
