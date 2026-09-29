"use client";

// match-apply-action.tsx — the apply control for one row of a match list:
// the application status if already applied, otherwise an Apply button that
// opens the apply dialog with this resume pre-selected.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApplyDialog } from "@/components/jobs/apply-dialog";
import { APPLICATION_STATUS_STYLES, type ApplicationStatus } from "@/lib/jobs";

export function MatchApplyAction({
  jobId,
  jobTitle,
  resumeId,
  isActive,
  application,
}: {
  jobId: string;
  jobTitle: string;
  resumeId: string;
  /** null when unknown; treated as open. */
  isActive: boolean | null;
  application: { status: ApplicationStatus; statusLabel: string } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (application && application.status !== "withdrawn") {
    return (
      <Link href="/dashboard/seeker/applications" title="View my applications">
        <Badge variant="outline" className={APPLICATION_STATUS_STYLES[application.status]}>
          {application.statusLabel}
        </Badge>
      </Link>
    );
  }

  if (isActive === false) {
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground">
        Closed
      </Badge>
    );
  }

  return (
    <>
      <Button
        size="sm"
        className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
        onClick={() => setOpen(true)}
      >
        <Send className="size-3.5" /> Apply
      </Button>
      <ApplyDialog
        jobId={jobId}
        jobTitle={jobTitle}
        preferredResumeId={resumeId}
        open={open}
        onOpenChange={setOpen}
        // This list is server-rendered; refresh it to show the new status.
        onApplied={() => router.refresh()}
      />
    </>
  );
}
