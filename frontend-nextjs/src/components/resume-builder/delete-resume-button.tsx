"use client";

// Delete control for a generated resume, used from the (server-rendered)
// Resume Builder list. The editor has its own copy of this action in its
// toolbar; this one refreshes the list in place instead of navigating.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeleteResumeButtonProps {
  resumeId: string;
  /** Shown in the confirmation copy so the user knows which one they picked. */
  resumeName: string;
}

export function DeleteResumeButton({
  resumeId,
  resumeName,
}: DeleteResumeButtonProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const deleteMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/resumes/generate/${resumeId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Delete failed");
      }
      return json?.data;
    },
    onSuccess: () => {
      toast.success("Resume deleted.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["generated"] });
      // The list is a server component, so re-render it on the server.
      router.refresh();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setOpen(false);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-rose-600 hover:text-rose-700"
          aria-label={`Delete ${resumeName}`}
        >
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{resumeName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete the resume and all its versions, plus any exported
            files. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMut.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 hover:bg-rose-700"
            disabled={deleteMut.isPending}
            onClick={(e) => {
              // Keep the dialog open while the request is in flight so the
              // pending state is visible.
              e.preventDefault();
              deleteMut.mutate();
            }}
          >
            {deleteMut.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Deleting…
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
