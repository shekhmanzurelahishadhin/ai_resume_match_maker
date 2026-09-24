"use client";

// contact-dialog.tsx — recruiter writes to a matched or applied candidate.
// Starts (or continues) the in-app thread; the candidate gets a notification.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiErrorMessage } from "@/lib/jobs";

export interface ContactTarget {
  seekerId: string;
  name: string;
  jobId: string;
  jobTitle: string;
}

const TEMPLATES = [
  {
    label: "Invite to apply",
    text: (t: ContactTarget) =>
      `Hi ${t.name.split(" ")[0]},\n\nYour profile is a strong match for our ${t.jobTitle} role. Would you be interested in applying? Happy to answer any questions.\n\nBest regards`,
  },
  {
    label: "Schedule a call",
    text: (t: ContactTarget) =>
      `Hi ${t.name.split(" ")[0]},\n\nThanks for your interest in the ${t.jobTitle} position. I'd like to set up a short intro call. What times work for you this week?\n\nBest regards`,
  },
  {
    label: "Ask a question",
    text: (t: ContactTarget) =>
      `Hi ${t.name.split(" ")[0]},\n\nI'm reviewing candidates for ${t.jobTitle} and had a quick question about your experience: `,
  },
];

export function ContactDialog({
  target,
  onOpenChange,
  onSent,
}: {
  target: ContactTarget | null;
  onOpenChange: (open: boolean) => void;
  onSent?: (conversationId: string) => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const send = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error("No candidate selected");
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seekerId: target.seekerId, jobId: target.jobId, body: body.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(json, "Message not sent"));
      return json.data.conversation.id as string;
    },
    onSuccess: (conversationId) => {
      toast.success(`Message sent to ${target?.name}.`, {
        action: {
          label: "Open chat",
          onClick: () => router.push(`/dashboard/messages?c=${conversationId}`),
        },
      });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setBody("");
      onOpenChange(false);
      onSent?.(conversationId);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contact {target?.name}</DialogTitle>
          <DialogDescription>
            About <span className="font-medium text-foreground">{target?.jobTitle}</span>. They&apos;ll be notified and can reply in Messages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {target
              ? TEMPLATES.map((t) => (
                  <Button key={t.label} type="button" size="sm" variant="outline" onClick={() => setBody(t.text(target))}>
                    {t.label}
                  </Button>
                ))
              : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-body">Message</Label>
            <Textarea
              id="contact-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              maxLength={5000}
              placeholder="Write your message, or start from a template above."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => send.mutate()}
            disabled={!body.trim() || send.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
