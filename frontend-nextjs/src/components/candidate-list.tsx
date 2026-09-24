"use client";

// Recruiter candidate list — ranked matches for one job.
// Search by name, filter by minimum match, see who already applied, open a
// privacy-respecting profile, and contact a candidate directly.

import { useEffect, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Loader2, Mail, MessageSquare, Search, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ContactDialog, type ContactTarget } from "@/components/jobs/contact-dialog";
import { APPLICATION_STATUS_STYLES, pctColor, type ApplicationStatus } from "@/lib/jobs";

interface CandidateRow {
  matchId: string;
  matchPercentage: number;
  matchSource: "ai" | "fallback";
  matchedSkills: string[];
  missingSkills: string[];
  analyzedAt: string;
  application: { id: string; status: ApplicationStatus; statusLabel: string } | null;
  conversationId: string | null;
  resume: {
    id: string;
    fileName: string;
    experienceYears: number | null;
    skills: string[];
    status: string;
    candidate: { id: string; name: string };
  };
}

export function CandidateList({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [minMatch, setMinMatch] = useState("0");
  const [selected, setSelected] = useState<CandidateRow | null>(null);
  const [contact, setContact] = useState<ContactTarget | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams({ pageSize: "100", minMatch });
  if (q) params.set("q", q);

  const list = useQuery({
    queryKey: ["candidates", jobId, params.toString()],
    queryFn: async () => {
      const r = await fetch(`/api/jobs/${jobId}/candidates?${params.toString()}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message ?? "Failed to load candidates");
      return j.data as { items: CandidateRow[]; total: number };
    },
    placeholderData: keepPreviousData,
  });

  const openContact = (row: CandidateRow) =>
    setContact({
      seekerId: row.resume.candidate.id,
      name: row.resume.candidate.name,
      jobId,
      jobTitle,
    });

  const rows = list.data?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates by name"
            className="pl-8"
            aria-label="Search candidates"
          />
        </div>
        <Select value={minMatch} onValueChange={setMinMatch}>
          <SelectTrigger className="w-[160px]" aria-label="Minimum match">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any match</SelectItem>
            <SelectItem value="50">50%+ match</SelectItem>
            <SelectItem value="70">70%+ match</SelectItem>
            <SelectItem value="85">85%+ match</SelectItem>
          </SelectContent>
        </Select>
        {list.isFetching && !list.isLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>

      {list.isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Loading candidates…
        </div>
      ) : list.isError ? (
        <EmptyState icon={Users} title="Couldn't load candidates" description={(list.error as Error).message} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q || minMatch !== "0" ? "No candidates match these filters" : "No candidates yet"}
          description={
            q || minMatch !== "0"
              ? "Try lowering the minimum match or clearing the search."
              : "When seekers upload resumes that match this job, they'll appear here."
          }
        />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Candidate</th>
                    <th className="px-4 py-2.5 font-medium">Match</th>
                    <th className="px-4 py-2.5 font-medium hidden lg:table-cell">Top skills</th>
                    <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Experience</th>
                    <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => (
                    <tr key={row.matchId} className="hover:bg-muted/40 align-middle">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelected(row)}
                          className="font-medium hover:underline text-left"
                        >
                          {row.resume.candidate.name}
                        </button>
                        <div className="mt-0.5">
                          {row.application ? (
                            <Badge variant="outline" className={APPLICATION_STATUS_STYLES[row.application.status]}>
                              {row.application.statusLabel}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not applied</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 w-40">
                        <div className="flex items-center gap-2">
                          <Progress value={row.matchPercentage} className="h-2" />
                          <span className={`text-xs font-semibold tabular-nums w-9 ${pctColor(row.matchPercentage)}`}>
                            {Math.round(row.matchPercentage)}%
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {row.matchedSkills.length} matched · {row.missingSkills.length} missing
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {row.matchedSkills.slice(0, 3).map((s) => (
                            <SkillBadge key={s} skill={s} variant="matched" />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums hidden sm:table-cell">
                        {row.resume.experienceYears != null ? `${row.resume.experienceYears} yr` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setSelected(row)}>
                            Profile
                          </Button>
                          {row.conversationId ? (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/messages?c=${row.conversationId}`}>
                                <MessageSquare className="size-4" /> Chat
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => openContact(row)}
                            >
                              <Mail className="size-4" /> Contact
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.resume.candidate.name}</DialogTitle>
            <DialogDescription>Match summary for {jobTitle}</DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-3xl font-bold ${pctColor(selected.matchPercentage)}`}>
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
                  <p className="text-xs text-muted-foreground">Application</p>
                  <p className="text-sm font-semibold">
                    {selected.application ? selected.application.statusLabel : "Not applied yet"}
                  </p>
                </div>
              </div>

              <SkillSection title={`Matched skills (${selected.matchedSkills.length})`} tone="matched" skills={selected.matchedSkills} empty="None" />
              <SkillSection
                title={`Missing skills (${selected.missingSkills.length})`}
                tone="missing"
                skills={selected.missingSkills}
                empty="All required skills matched!"
              />
              <SkillSection title="All extracted skills" tone="muted" skills={selected.resume.skills} empty="Skills not yet extracted" />

              <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
                {selected.conversationId ? (
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/messages?c=${selected.conversationId}`}>
                      <MessageSquare className="size-4" /> Open chat
                    </Link>
                  </Button>
                ) : (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      openContact(selected);
                      setSelected(null);
                    }}
                  >
                    <Mail className="size-4" /> Contact candidate
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                For privacy, the full resume and email are shared only when a candidate applies. Until then you can
                reach them through in-app messages.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ContactDialog
        target={contact}
        onOpenChange={(o) => !o && setContact(null)}
        onSent={() => list.refetch()}
      />
    </div>
  );
}

function SkillSection({
  title,
  tone,
  skills,
  empty,
}: {
  title: string;
  tone: "matched" | "missing" | "muted";
  skills: string[];
  empty: string;
}) {
  const color =
    tone === "matched"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "missing"
        ? "text-rose-700 dark:text-rose-300"
        : "text-muted-foreground";
  return (
    <div>
      <p className={`text-xs font-medium mb-1 ${color}`}>{title}</p>
      {skills.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <SkillBadge key={s} skill={s} variant={tone} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">{empty}</p>
      )}
    </div>
  );
}
