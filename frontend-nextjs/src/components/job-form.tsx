"use client";

// Job create/edit form.
// Fields: title, description (textarea), required skills (tag input).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { X, Plus, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface JobFormProps {
  mode: "create" | "edit";
  initial?: {
    id: string;
    title: string;
    description: string;
    requiredSkills: string[];
    isActive: boolean;
  };
}

async function submitJob(
  mode: "create" | "edit",
  data: {
    title: string;
    description: string;
    requiredSkills: string[];
    isActive: boolean;
  },
  id?: string,
) {
  const url = mode === "create" ? "/api/jobs" : `/api/jobs/${id}`;
  const method = mode === "create" ? "POST" : "PUT";
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message ?? "Save failed");
  }
  return json.data.job as { id: string };
}

export function JobForm({ mode, initial }: JobFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [skills, setSkills] = useState<string[]>(initial?.requiredSkills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const mutation = useMutation({
    mutationFn: (data: { title: string; description: string; requiredSkills: string[]; isActive: boolean }) =>
      submitJob(mode, data, initial?.id),
    onSuccess: (job) => {
      toast({
        title: mode === "create" ? "Job created" : "Job updated",
        description: "Matching is running in the background.",
      });
      router.push(`/dashboard/recruiter/jobs/${job.id}`);
      router.refresh();
    },
    onError: (err: Error) => {
      toast({
        title: "Save failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const addSkill = () => {
    const raw = skillInput.trim();
    if (!raw) return;
    // Allow comma-separated paste, e.g. "React, Node.js, AWS"
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const next = new Set([...skills, ...parts]);
    setSkills(Array.from(next));
    setSkillInput("");
  };

  const removeSkill = (s: string) => {
    setSkills(skills.filter((x) => x !== s));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast({ title: "Title is too short", variant: "destructive" });
      return;
    }
    if (description.trim().length < 10) {
      toast({ title: "Description is too short", variant: "destructive" });
      return;
    }
    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      requiredSkills: skills,
      isActive,
    });
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Job title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Job description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the role, responsibilities, and what makes a great candidate."
              rows={8}
              maxLength={8000}
              required
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/8000 characters
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skills">Required skills</Label>
            <p className="text-xs text-muted-foreground">
              Add the skills a candidate should have. Used for matching.
            </p>
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
                placeholder="Type a skill and press Enter"
              />
              <Button type="button" variant="outline" onClick={addSkill}>
                <Plus className="size-4" /> Add
              </Button>
            </div>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {skills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => removeSkill(s)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900",
                      "hover:bg-rose-100 hover:text-rose-900 hover:border-rose-300 transition-colors",
                      "dark:bg-emerald-900/40 dark:text-emerald-200 dark:hover:bg-rose-900/40 dark:hover:text-rose-200",
                    )}
                  >
                    {s}
                    <X className="size-3" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No skills added yet.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="active" className="cursor-pointer">
                Active
              </Label>
              <p className="text-xs text-muted-foreground">
                Active jobs are visible to seekers and matched against new resumes.
              </p>
            </div>
            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving…
                </>
              ) : mode === "create" ? (
                "Create job"
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
