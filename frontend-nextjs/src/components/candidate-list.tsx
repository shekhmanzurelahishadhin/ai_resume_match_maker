"use client";

// Recruiter candidate list — table of matches for a job.
// Each row shows match %, candidate name, experience, matched/missing skills,
// and a "View profile" button that opens a privacy-respecting modal.

import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AiSourceBadge } from "@/components/ai-source-badge";
import { SkillBadge } from "@/components/skill-badge";
import { EmptyState } from "@/components/empty-state";

interface CandidateRow {
  matchId: string;
  matchPercentage: number;
  matchSource: "ai" | "fallback";
  matchedSkills: string[];
  missingSkills: string[];
  analyzedAt: string;
  resume: {
    id: string;
    fileName: string;
    experienceYears: number | null;
    skills: string[];
    status: string;
    candidate: { id: string; name: string };
  };
}

export function CandidateList({ jobId }: { jobId: string }) {
  const [rows, setRows] = useState<CandidateRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CandidateRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/jobs/${jobId}/candidates?pageSize=100`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error?.message ?? "Failed to load candidates");
        return j.data.items as CandidateRow[];
      })
      .then((items) => {
        if (!cancelled) setRows(items);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading candidates…
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={Users}
        title="Couldn't load candidates"
        description={error}
      />
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No candidates yet"
        description="When seekers upload resumes that match this job, they'll appear here."
      />
    );
  }

  return (
    <>
      <Card>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Candidate</th>
                  <th className="px-4 py-2.5 font-medium">Experience</th>
                  <th className="px-4 py-2.5 font-medium">Match</th>
                  <th className="px-4 py-2.5 font-medium">Skills</th>
                  <th className="px-4 py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.matchId} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.resume.candidate.name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {row.resume.fileName}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {row.resume.experienceYears != null
                        ? `${row.resume.experienceYears} yr`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 w-40">
                      <div className="flex items-center gap-2">
                        <Progress value={row.matchPercentage} className="h-2" />
                        <span className="text-xs font-semibold tabular-nums w-9">
                          {Math.round(row.matchPercentage)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                          {row.matchedSkills.length} matched
                        </Badge>
                        <Badge variant="outline" className="bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200">
                          {row.missingSkills.length} missing
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(row)}
                      >
                        View profile
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.resume.candidate.name}</DialogTitle>
            <DialogDescription>
              Match summary · resume: {selected?.resume.fileName}
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {Math.round(selected.matchPercentage)}%
                  </p>
                  <p className="text-xs text-muted-foreground">overall match</p>
                </div>
                <AiSourceBadge source={selected.matchSource} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Experience</p>
                  <p className="text-sm font-semibold">
                    {selected.resume.experienceYears != null
                      ? `${selected.resume.experienceYears} years`
                      : "Not specified"}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Analyzed</p>
                  <p className="text-sm font-semibold">
                    {new Date(selected.analyzedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-1">
                  Matched skills ({selected.matchedSkills.length})
                </p>
                {selected.matchedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.matchedSkills.map((s) => (
                      <SkillBadge key={s} skill={s} variant="matched" />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">None</p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-rose-700 dark:text-rose-300 mb-1">
                  Missing skills ({selected.missingSkills.length})
                </p>
                {selected.missingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.missingSkills.map((s) => (
                      <SkillBadge key={s} skill={s} variant="missing" />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    All required skills matched!
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  All extracted skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.resume.skills.length > 0 ? (
                    selected.resume.skills.map((s) => (
                      <SkillBadge key={s} skill={s} variant="muted" />
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Skills not yet extracted
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                For privacy, the full resume text is not shared with recruiters.
                Only extracted skills and experience are shown.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
