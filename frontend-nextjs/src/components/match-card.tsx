"use client";

import Link from "next/link";
import { Briefcase } from "lucide-react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkillBadge } from "@/components/skill-badge";

export interface MatchCardData {
  id: string;
  matchPercentage: number;
  matchSource: "ai" | "fallback";
  matchedSkills: string[];
  missingSkills: string[];
  analyzedAt: string;
  job: {
    id: string;
    title: string;
    recruiter?: { id: string; name: string };
  };
  hrefBase: "/dashboard/seeker" | "/dashboard/recruiter";
}

function pctColor(pct: number) {
  if (pct >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function MatchCard({ match, hrefBase }: { match: MatchCardData; hrefBase: MatchCardData["hrefBase"] }) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-md bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 shrink-0">
              <Briefcase className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{match.job.title}</p>
              {match.job.recruiter ? (
                <p className="text-xs text-muted-foreground truncate">
                  {match.job.recruiter.name}
                </p>
              ) : null}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-2xl font-bold tabular-nums ${pctColor(match.matchPercentage)}`}>
              {Math.round(match.matchPercentage)}%
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              match
            </p>
          </div>
        </div>

        {match.matchedSkills.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
              Matched skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {match.matchedSkills.slice(0, 8).map((s) => (
                <SkillBadge key={s} skill={s} variant="matched" />
              ))}
              {match.matchedSkills.length > 8 ? (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  +{match.matchedSkills.length - 8}
                </Badge>
              ) : null}
            </div>
          </div>
        ) : null}

        {match.missingSkills.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-rose-700 dark:text-rose-300 mb-1">
              Missing skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {match.missingSkills.slice(0, 5).map((s) => (
                <SkillBadge key={s} skill={s} variant="missing" />
              ))}
              {match.missingSkills.length > 5 ? (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  +{match.missingSkills.length - 5}
                </Badge>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="border-t pt-4">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={`${hrefBase}/matches`}>View matches</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
