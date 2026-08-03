"use client";

import Link from "next/link";
import { Briefcase, Users } from "lucide-react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkillBadge } from "@/components/skill-badge";

export interface JobCardData {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  isActive: boolean;
  createdAt: string;
  matchCount?: number;
}

export function JobCard({
  job,
  variant = "recruiter",
}: {
  job: JobCardData;
  variant?: "recruiter" | "seeker";
}) {
  const href =
    variant === "recruiter"
      ? `/dashboard/recruiter/jobs/${job.id}`
      : `/dashboard/recruiter/jobs/${job.id}`;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-md bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
              <Briefcase className="size-5" />
            </div>
            <div className="min-w-0">
              <Link
                href={href}
                className="text-sm font-semibold hover:underline truncate block"
              >
                {job.title}
              </Link>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {job.description}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              job.isActive
                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
                : "bg-muted text-muted-foreground"
            }
          >
            {job.isActive ? "Active" : "Closed"}
          </Badge>
        </div>

        {job.requiredSkills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {job.requiredSkills.slice(0, 8).map((s) => (
              <SkillBadge key={s} skill={s} variant="muted" />
            ))}
            {job.requiredSkills.length > 8 ? (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                +{job.requiredSkills.length - 8}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="border-t pt-4 gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={href}>
            {variant === "recruiter" ? "View candidates" : "View details"}
          </Link>
        </Button>
        {typeof job.matchCount === "number" ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
            <Users className="size-3.5" />
            <span className="tabular-nums">{job.matchCount}</span>
          </div>
        ) : null}
      </CardFooter>
    </Card>
  );
}
