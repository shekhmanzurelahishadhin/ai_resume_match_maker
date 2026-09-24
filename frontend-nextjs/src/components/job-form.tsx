"use client";

// Job create/edit form.
// Sections: the role (title, company, description), where & how (location,
// work mode, type, level, salary), required skills, and visibility.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  apiErrorMessage,
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  WORK_MODE_LABELS,
  type EmploymentType,
  type ExperienceLevel,
  type JobListing,
  type WorkMode,
} from "@/lib/jobs";

const NONE = "none";

interface JobFormValues {
  title: string;
  company: string;
  location: string;
  workMode: WorkMode | null;
  employmentType: EmploymentType | null;
  experienceLevel: ExperienceLevel | null;
  salaryRange: string;
  description: string;
  requiredSkills: string[];
  isActive: boolean;
}

interface JobFormProps {
  mode: "create" | "edit";
  initial?: Partial<JobListing> & { id: string };
}

export function JobForm({ mode, initial }: JobFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [v, setV] = useState<JobFormValues>({
    title: initial?.title ?? "",
    // The API falls back to the recruiter's name when a job has no company;
    // only prefill a company the recruiter actually set.
    company: initial?.company && initial.company !== initial.recruiter?.name ? initial.company : "",
    location: initial?.location ?? "",
    workMode: initial?.workMode ?? null,
    employmentType: initial?.employmentType ?? "full_time",
    experienceLevel: initial?.experienceLevel ?? null,
    salaryRange: initial?.salaryRange ?? "",
    description: initial?.description ?? "",
    requiredSkills: initial?.requiredSkills ?? [],
    isActive: initial?.isActive ?? true,
  });
  const [skillInput, setSkillInput] = useState("");
  const set = <K extends keyof JobFormValues>(k: K, val: JobFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  const mutation = useMutation({
    mutationFn: async (data: JobFormValues) => {
      const res = await fetch(mode === "create" ? "/api/jobs" : `/api/jobs/${initial?.id}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(json, "Save failed"));
      return json.data.job as { id: string };
    },
    onSuccess: (job) => {
      toast.success(mode === "create" ? "Job posted! Matching candidates in the background." : "Job updated.");
      qc.invalidateQueries({ queryKey: ["recruiter-jobs"] });
      qc.invalidateQueries({ queryKey: ["recruiter-job", job.id] });
      router.push(`/dashboard/recruiter/jobs/${job.id}`);
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addSkill = () => {
    const parts = skillInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    set("requiredSkills", Array.from(new Set([...v.requiredSkills, ...parts])));
    setSkillInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (v.title.trim().length < 3) return toast.error("The job title needs at least 3 characters.");
    if (v.description.trim().length < 10) return toast.error("The description needs at least 10 characters.");
    if (v.requiredSkills.length === 0) {
      return toast.error("Add at least one required skill — it's what candidates are matched on.");
    }
    mutation.mutate({ ...v, title: v.title.trim(), description: v.description.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">The role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Job title *</Label>
              <Input
                id="title"
                value={v.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={v.company}
                onChange={(e) => set("company", e.target.value)}
                placeholder="Defaults to your account name"
                maxLength={160}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder={"What the role involves, the team, and what a great candidate looks like.\n\nTip: short paragraphs or bullet lines read best."}
              rows={9}
              maxLength={8000}
              required
            />
            <p className="text-xs text-muted-foreground text-right">{v.description.length}/8000</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where & how</CardTitle>
          <CardDescription>Shown on the listing and used by seekers&apos; filters.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={v.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Dhaka, Bangladesh"
              maxLength={160}
            />
          </div>
          <EnumSelect label="Work mode" value={v.workMode} options={WORK_MODE_LABELS} onChange={(x) => set("workMode", x as WorkMode | null)} />
          <EnumSelect
            label="Job type"
            value={v.employmentType}
            options={EMPLOYMENT_TYPE_LABELS}
            onChange={(x) => set("employmentType", x as EmploymentType | null)}
          />
          <EnumSelect
            label="Experience level"
            value={v.experienceLevel}
            options={EXPERIENCE_LEVEL_LABELS}
            onChange={(x) => set("experienceLevel", x as ExperienceLevel | null)}
          />
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="salary">Salary range</Label>
            <Input
              id="salary"
              value={v.salaryRange}
              onChange={(e) => set("salaryRange", e.target.value)}
              placeholder="e.g. $2,000 – $3,000 / month"
              maxLength={80}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Required skills *</CardTitle>
          <CardDescription>Candidates are scored against these. Press Enter or comma to add; paste a list to add several.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              id="skills"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="e.g. React, TypeScript, AWS"
              aria-label="Add skill"
            />
            <Button type="button" variant="outline" onClick={addSkill}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
          {v.requiredSkills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {v.requiredSkills.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("requiredSkills", v.requiredSkills.filter((x) => x !== s))}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900",
                    "hover:bg-rose-100 hover:text-rose-900 hover:border-rose-300 transition-colors",
                    "dark:bg-emerald-900/40 dark:text-emerald-200 dark:hover:bg-rose-900/40 dark:hover:text-rose-200",
                  )}
                  aria-label={`Remove ${s}`}
                >
                  {s}
                  <X className="size-3" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No skills added yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="active" className="cursor-pointer">
              Open for applications
            </Label>
            <p className="text-xs text-muted-foreground">
              Open jobs are visible to seekers and matched against new resumes.
            </p>
          </div>
          <Switch id="active" checked={v.isActive} onCheckedChange={(c) => set("isActive", c)} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "create" ? "Post job" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function EnumSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: Record<string, string>;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value ?? NONE} onValueChange={(x) => onChange(x === NONE ? null : x)}>
        <SelectTrigger className="w-full" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Not specified</SelectItem>
          {Object.entries(options).map(([k, l]) => (
            <SelectItem key={k} value={k}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
