// job-meta.tsx — the compact facts row of a job listing (company, location,
// work mode, type, level, salary). Missing facts are simply left out.

import { Banknote, Briefcase, Building2, Clock, GraduationCap, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  WORK_MODE_LABELS,
  type JobListing,
} from "@/lib/jobs";

type MetaJob = Pick<
  JobListing,
  "company" | "location" | "workMode" | "employmentType" | "experienceLevel" | "salaryRange"
>;

export function JobMeta({
  job,
  className,
  showCompany = true,
  showSalary = true,
}: {
  job: MetaJob;
  className?: string;
  showCompany?: boolean;
  showSalary?: boolean;
}) {
  const items = [
    showCompany && job.company ? { icon: Building2, text: job.company } : null,
    job.location ? { icon: MapPin, text: job.location } : null,
    job.workMode ? { icon: Briefcase, text: WORK_MODE_LABELS[job.workMode] } : null,
    job.employmentType ? { icon: Clock, text: EMPLOYMENT_TYPE_LABELS[job.employmentType] } : null,
    job.experienceLevel ? { icon: GraduationCap, text: EXPERIENCE_LEVEL_LABELS[job.experienceLevel] } : null,
    showSalary && job.salaryRange ? { icon: Banknote, text: job.salaryRange } : null,
  ].filter((x): x is { icon: typeof MapPin; text: string } => x !== null);

  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      {items.map(({ icon: Icon, text }) => (
        <span key={text} className="inline-flex items-center gap-1">
          <Icon className="size-3.5 shrink-0" />
          {text}
        </span>
      ))}
    </div>
  );
}
