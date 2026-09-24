"use client";

// Messages — recruiter ↔ candidate threads. Conversation list on the left, the
// open thread on the right (one pane at a time on mobile). Polls for new
// messages while open.

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { timeAgo } from "@/lib/jobs";

interface ConversationSummary {
  id: string;
  otherParty: { id: string; name: string; role: "seeker" | "recruiter" };
  job: { id: string; title: string; company: string | null } | null;
  lastMessage: { body: string; mine: boolean; createdAt: string } | null;
  unreadCount: number;
  lastMessageAt: string | null;
}

interface ChatMessage {
  id: string;
  body: string;
  mine: boolean;
  readAt: string | null;
  createdAt: string;
}

const POLL_MS = 8000;

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[70vh] w-full rounded-xl" />}>
      <Messages />
    </Suspense>
  );
}

function Messages() {
  const router = useRouter();
  const params = useSearchParams();
  const activeId = params.get("c");

  const list = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to load messages");
      return json.data.items as ConversationSummary[];
    },
    refetchInterval: POLL_MS,
  });

  const open = (id: string | null) =>
    router.replace(id ? `/dashboard/messages?c=${id}` : "/dashboard/messages", { scroll: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">Conversations between recruiters and candidates.</p>
      </div>

      <Card className="grid h-[calc(100vh-11rem)] min-h-[480px] overflow-hidden p-0 gap-0 md:grid-cols-[300px_1fr]">
        {/* Conversation list */}
        <div className={cn("border-r flex-col min-h-0", activeId ? "hidden md:flex" : "flex")}>
          <div className="flex-1 overflow-y-auto">
            {list.isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : list.data && list.data.length > 0 ? (
              <ul className="divide-y">
                {list.data.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => open(c.id)}
                      className={cn(
                        "w-full flex gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/60",
                        c.id === activeId && "bg-emerald-50 dark:bg-emerald-900/20",
                      )}
                    >
                      <Avatar className="size-9 shrink-0">
                        <AvatarFallback className="bg-emerald-100 text-emerald-900 text-xs dark:bg-emerald-900/40 dark:text-emerald-200">
                          {initials(c.otherParty.name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className={cn("text-sm truncate", c.unreadCount > 0 ? "font-semibold" : "font-medium")}>
                            {c.otherParty.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(c.lastMessageAt)}</span>
                        </span>
                        {c.job ? (
                          <span className="block text-xs text-emerald-700 dark:text-emerald-300 truncate">{c.job.title}</span>
                        ) : null}
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground truncate">
                            {c.lastMessage ? `${c.lastMessage.mine ? "You: " : ""}${c.lastMessage.body}` : ""}
                          </span>
                          {c.unreadCount > 0 ? (
                            <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white tabular-nums">
                              {c.unreadCount}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <MessageSquare className="size-6 mx-auto mb-2" />
                No conversations yet.
              </div>
            )}
          </div>
        </div>

        {/* Thread */}
        <div className={cn("min-h-0 flex-col", activeId ? "flex" : "hidden md:flex")}>
          {activeId ? (
            <Thread key={activeId} id={activeId} onBack={() => open(null)} />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Pick a thread on the left to read and reply."
                className="border-0"
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Thread({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const thread = useQuery({
    queryKey: ["conversation", id],
    queryFn: async () => {
      const res = await fetch(`/api/conversations/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Conversation not found");
      return json.data as { conversation: ConversationSummary; messages: ChatMessage[] };
    },
    refetchInterval: POLL_MS,
  });

  // Opening a thread marks it read on the server; refresh the list + badges.
  const loaded = thread.isSuccess;
  useEffect(() => {
    if (loaded) {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["messages-unread"] });
    }
  }, [loaded, qc]);

  const count = thread.data?.messages.length ?? 0;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [count]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Message not sent");
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["conversation", id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    const body = draft.trim();
    if (body && !send.isPending) send.mutate(body);
  };

  if (thread.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  if (thread.isError || !thread.data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        This conversation isn&apos;t available.
      </div>
    );
  }

  const { conversation: c, messages } = thread.data;
  const jobHref = c.job
    ? c.otherParty.role === "seeker"
      ? `/dashboard/recruiter/jobs/${c.job.id}`
      : `/dashboard/jobs/${c.job.id}`
    : null;

  return (
    <>
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={onBack} aria-label="Back">
          <ArrowLeft className="size-4" />
        </Button>
        <Avatar className="size-9">
          <AvatarFallback className="bg-emerald-100 text-emerald-900 text-xs dark:bg-emerald-900/40 dark:text-emerald-200">
            {initials(c.otherParty.name ?? "?")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold truncate">{c.otherParty.name}</p>
          {c.job && jobHref ? (
            <Link href={jobHref} className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1">
              <Briefcase className="size-3" /> {c.job.title}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                m.mine
                  ? "rounded-br-sm bg-emerald-600 text-white"
                  : "rounded-bl-sm bg-background border",
              )}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={cn("mt-1 text-[10px]", m.mine ? "text-emerald-100" : "text-muted-foreground")}>
                {new Date(m.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                {m.mine && m.readAt ? " · Seen" : ""}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          maxLength={5000}
          placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
          className="min-h-10 max-h-40 resize-none"
          aria-label="Message"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!draft.trim() || send.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          aria-label="Send"
        >
          {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </>
  );
}
