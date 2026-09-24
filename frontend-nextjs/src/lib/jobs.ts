// Shared job / application types and display labels (mirrors the Laravel
// JobResource, ApplicationResource and ApplicationStatus enum).

export type EmploymentType = "full_time" | "part_time" | "contract" | "internship";
export type WorkMode = "onsite" | "remote" | "hybrid";
export type ExperienceLevel = "entry" | "mid" | "senior" | "lead";

export type ApplicationStatus =
  | "applied"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "offered"
  | "hired"
  | "rejected"
  | "withdrawn";

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  onsite: "On-site",
  remote: "Remote",
  hybrid: "Hybrid",
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  entry: "Entry level",
  mid: "Mid level",
  senior: "Senior",
  lead: "Lead / Manager",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Applied",
  reviewing: "Under review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offered: "Offer made",
  hired: "Hired",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

/** Stages a recruiter can move an application to, in pipeline order. */
export const RECRUITER_STATUSES: ApplicationStatus[] = [
  "applied",
  "reviewing",
  "shortlisted",
  "interview",
  "offered",
  "hired",
  "rejected",
];

export const APPLICATION_STATUS_STYLES: Record<ApplicationStatus, string> = {
  applied: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
  reviewing: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200",
  shortlisted: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200",
  interview: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  offered: "bg-teal-100 text-teal-900 dark:bg-teal-900/40 dark:text-teal-200",
  hired: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  rejected: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
  withdrawn: "bg-muted text-muted-foreground",
};

export interface JobListing {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  employmentType: EmploymentType | null;
  workMode: WorkMode | null;
  experienceLevel: ExperienceLevel | null;
  salaryRange: string | null;
  description: string;
  requiredSkills: string[];
  isActive: boolean;
  recruiter?: { id: string; name: string };
  matchCount?: number;
  applicationCount?: number;
  newApplicationCount?: number;
  myMatch?: {
    matchPercentage: number;
    resumeId: string;
    resumeName?: string;
    matchedSkills?: string[];
    missingSkills?: string[];
  } | null;
  myApplication?: {
    id: string;
    status: ApplicationStatus;
    statusLabel: string;
    appliedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  status: ApplicationStatus;
  statusLabel: string;
  coverLetter: string | null;
  matchPercentage: number | null;
  appliedAt: string;
  statusChangedAt: string | null;
  resume: { kind: "upload" | "builder" | null; name: string | null; available: boolean };
  job: { id: string; title: string; company: string | null; location: string | null; isActive: boolean } | null;
  candidate?: { id: string; name: string; email: string };
  conversationId: string | null;
}

export function pctColor(pct: number) {
  if (pct >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Save a binary API response (e.g. a resume) through an object URL. */
export async function downloadFrom(url: string, fallbackName: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error?.message ?? "Download failed");
  }
  const cd = res.headers.get("content-disposition") ?? "";
  const name = cd.match(/filename="?([^";]+)"?/)?.[1] ?? fallbackName;
  const href = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/** The most useful message from a Laravel error envelope (first field error wins). */
export function apiErrorMessage(json: unknown, fallback: string): string {
  const err = (json as { error?: { message?: string; fieldErrors?: Record<string, string[]> } } | null)?.error;
  const first = err?.fieldErrors ? Object.values(err.fieldErrors)[0]?.[0] : undefined;
  return first ?? err?.message ?? fallback;
}
