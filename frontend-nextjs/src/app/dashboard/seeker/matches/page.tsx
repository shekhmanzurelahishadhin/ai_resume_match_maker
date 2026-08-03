// Seeker → My Matches. All matches across resumes, sortable + filterable.
//
// This is a client component so we can sort/filter without round-trips.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Target, ArrowUpDown, FileText } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SkillBadge } from "@/components/skill-badge";
import { AiSourceBadge } from "@/components/ai-source-badge";
import { EmptyState } from "@/components/empty-state";

interface MatchRow {
  id: string;
  matchPercentage: number;
  matchSource: "ai" | "fallback";
  matchedSkills: string[];
  missingSkills: string[];
  analyzedAt: string;
  resumeId?: string;
  job: {
    id: string;
    title: string;
    recruiter?: { id: string; name: string };
  };
}

type SortKey = "matchPercentage" | "analyzedAt";

export default function SeekerMatchesPage() {
  const [rows, setRows] = useState<MatchRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("matchPercentage");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [minPct, setMinPct] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch the user's resumes, then fetch matches per resume and aggregate.
        const rRes = await fetch("/api/resumes?page=1&pageSize=100");
        const rJson = await rRes.json();
        const resumes = (rJson?.data?.items ?? []) as Array<{ id: string }>;
        const allMatches: MatchRow[] = [];
        await Promise.all(
          resumes.map(async (rm) => {
            const mRes = await fetch(`/api/resumes/${rm.id}/matches?pageSize=100`);
            const mJson = await mRes.json();
            for (const m of mJson?.data?.items ?? []) {
              allMatches.push({ ...(m as MatchRow), resumeId: rm.id });
            }
          }),
        );
        if (!cancelled) setRows(allMatches);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    let out = rows.filter((r) => r.matchPercentage >= minPct);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (r) =>
          r.job.title.toLowerCase().includes(q) ||
          r.job.recruiter?.name.toLowerCase().includes(q),
      );
    }
    out.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "matchPercentage") {
        cmp = a.matchPercentage - b.matchPercentage;
      } else {
        cmp =
          new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [rows, sortKey, sortDir, search, minPct]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading matches…
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState icon={Target} title="Couldn't load matches" description={error} />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My matches</h1>
        <p className="text-sm text-muted-foreground">
          All matches across your resumes. Sort, filter, and explore.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs text-muted-foreground">Search by job/recruiter</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. Engineer, Acme"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Min match %</label>
            <Input
              type="number"
              min={0}
              max={100}
              value={minPct}
              onChange={(e) => setMinPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-24"
            />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No matches found"
          description="Upload a resume and wait for recruiters to post active jobs — your matches will appear here."
        />
      ) : (
        <Card>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Job</th>
                    <th className="px-4 py-2.5 font-medium">Recruiter</th>
                    <th
                      className="px-4 py-2.5 font-medium cursor-pointer select-none"
                      onClick={() => toggleSort("matchPercentage")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Match <ArrowUpDown className="size-3" />
                      </span>
                    </th>
                    <th className="px-4 py-2.5 font-medium">Skills</th>
                    <th
                      className="px-4 py-2.5 font-medium cursor-pointer select-none"
                      onClick={() => toggleSort("analyzedAt")}
                    >
                      <span className="inline-flex items-center gap-1">
                        Analyzed <ArrowUpDown className="size-3" />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/40 align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium">{m.job.title}</p>
                        {m.resumeId ? (
                          <Link
                            href={`/dashboard/seeker/resumes/${m.resumeId}`}
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            <FileText className="inline size-3 mr-0.5" />
                            Resume
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {m.job.recruiter?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 w-40">
                        <div className="flex items-center gap-2">
                          <Progress value={m.matchPercentage} className="h-2" />
                          <span className="text-xs font-semibold tabular-nums w-9">
                            {Math.round(m.matchPercentage)}%
                          </span>
                        </div>
                        <div className="mt-1">
                          <AiSourceBadge source={m.matchSource} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {m.matchedSkills.slice(0, 4).map((s) => (
                            <SkillBadge key={s} skill={s} variant="matched" />
                          ))}
                          {m.missingSkills.slice(0, 2).map((s) => (
                            <SkillBadge key={s} skill={s} variant="missing" />
                          ))}
                          {(m.matchedSkills.length + m.missingSkills.length) > 6 ? (
                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                              +{m.matchedSkills.length + m.missingSkills.length - 6}
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(m.analyzedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
