"use client";

// version-history.tsx — list versions with restore buttons.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { History, Loader2, RotateCcw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface VersionItem {
  id: string;
  versionNumber: number;
  createdAt: string;
  isCurrent: boolean;
}

interface Props {
  resumeId: string;
  currentVersion: number;
}

export function VersionHistory({ resumeId, currentVersion }: Props) {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["generated", resumeId, "versions"],
    queryFn: async () => {
      const res = await fetch(`/api/resumes/generate/${resumeId}/versions`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load versions");
      return (json.data?.items ?? []) as VersionItem[];
    },
  });

  const restoreMut = useMutation({
    mutationFn: async (version: number) => {
      const res = await fetch(
        `/api/resumes/generate/${resumeId}/versions/${version}/restore`,
        { method: "POST" },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Restore failed");
      return json.data;
    },
    onSuccess: (data) => {
      toast.success(`Restored from v${data.fromVersion} (now v${data.newVersion}).`);
      qc.invalidateQueries({ queryKey: ["generated", resumeId, "versions"] });
      qc.invalidateQueries({ queryKey: ["generated", resumeId] });
      // Also nudge the editor to reload.
      window.dispatchEvent(new CustomEvent("resume:restored", { detail: { resumeId, version: data.newVersion } }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="size-4" /> Version history
        </CardTitle>
        <CardDescription>
          Every save creates a snapshot. Restore any version to roll back —
          restoring creates a new version (the history is append-only).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded" />
            ))}
          </div>
        ) : q.isError ? (
          <p className="text-sm text-rose-600">
            {(q.error as Error)?.message ?? "Failed to load versions."}
          </p>
        ) : q.data && q.data.length > 0 ? (
          <ul className="divide-y max-h-96 overflow-y-auto">
            {q.data.map((v) => (
              <li key={v.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">v{v.versionNumber}</span>
                    {v.isCurrent ? (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" variant="secondary">
                        <CheckCircle2 className="size-3 mr-1" /> Current
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={v.isCurrent || restoreMut.isPending}
                  onClick={() => restoreMut.mutate(v.versionNumber)}
                  className="gap-1.5"
                >
                  {restoreMut.isPending && restoreMut.variables === v.versionNumber ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="size-3.5" />
                  )}
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No versions yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
