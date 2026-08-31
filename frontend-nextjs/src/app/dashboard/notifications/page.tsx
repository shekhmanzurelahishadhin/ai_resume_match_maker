"use client";

// Notifications page — full list with filters (all/unread), pagination
// (15/page), click-to-mark-as-read, "data" payload includes a link to
// navigate to (e.g., to the matched resume/job).

import { Suspense, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Target,
  FileText,
  Briefcase,
  Info,
  Mail,
  Loader2,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: { url?: string; [k: string]: unknown } | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface ListResult {
  items: NotificationItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const PAGE_SIZE = 15;

const TYPE_META: Record<
  string,
  { icon: typeof Bell; label: string; color: string }
> = {
  job_match: {
    icon: Target,
    label: "Job match",
    color: "text-emerald-700 dark:text-emerald-300",
  },
  resume_analysis: {
    icon: FileText,
    label: "Resume",
    color: "text-sky-700 dark:text-sky-300",
  },
  new_job: {
    icon: Briefcase,
    label: "New job",
    color: "text-amber-700 dark:text-amber-300",
  },
  daily_digest: {
    icon: Mail,
    label: "Digest",
    color: "text-violet-700 dark:text-violet-300",
  },
  system: {
    icon: Info,
    label: "System",
    color: "text-muted-foreground",
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function NotificationsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const filter = searchParams.get("filter") === "unread" ? "unread" : "all";

  const [data, setData] = useState<ListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/notifications?page=${page}&pageSize=${PAGE_SIZE}&unreadOnly=${
        filter === "unread"
      }`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json?.data ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const setFilter = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", next);
    params.set("page", "1");
    router.push(`/dashboard/notifications?${params.toString()}`);
  };

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    router.push(`/dashboard/notifications?${params.toString()}`);
  };

  const handleClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      // Optimistic update
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((i) =>
                i.id === item.id ? { ...i, isRead: true, readAt: new Date().toISOString() } : i,
              ),
              total: filter === "unread" ? Math.max(0, prev.total - 1) : prev.total,
            }
          : prev,
      );
      try {
        await fetch(`/api/notifications/${item.id}/read`, { method: "PUT" });
      } catch {
        // ignore — next visit will re-mark
      }
    }
    const url = item.data?.url;
    if (url) router.push(url);
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications/read-all", { method: "PUT" });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "All notifications marked as read" });
      await fetchList();
    } catch {
      toast({ title: "Failed to mark all read", variant: "destructive" });
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = data?.items.filter((i) => !i.isRead).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Your activity feed — new matches, job posts, and resume updates.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={markAllRead}
          disabled={markingAll || unreadCount === 0}
        >
          {markingAll ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCheck className="size-4" />
          )}
          Mark all as read
        </Button>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            {loading
              ? "Loading…"
              : `${data?.total ?? 0} notification${(data?.total ?? 0) === 1 ? "" : "s"}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 pb-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState
                icon={Inbox}
                title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
                description={
                  filter === "unread"
                    ? "You're all caught up. Switch to 'All' to see your full history."
                    : "When matches, jobs, or resume events happen, they'll show up here."
                }
              />
            </div>
          ) : (
            <>
              <ul className="divide-y max-h-[36rem] overflow-y-auto">
                {data.items.map((item) => {
                  const meta = TYPE_META[item.type] ?? TYPE_META.system;
                  const Icon = meta.icon;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => handleClick(item)}
                        className={cn(
                          "flex w-full items-start gap-3 px-6 py-3 text-left hover:bg-accent transition-colors",
                          !item.isRead && "bg-emerald-50/40 dark:bg-emerald-950/20",
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-muted",
                            meta.color,
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium leading-snug">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant="outline"
                                className="bg-muted/60 text-[10px] uppercase tracking-wide"
                              >
                                {meta.label}
                              </Badge>
                              {!item.isRead && (
                                <span
                                  className="size-2 rounded-full bg-emerald-600"
                                  aria-label="unread"
                                />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 leading-snug">
                            {item.body}
                          </p>
                          <div className="flex items-center justify-between mt-1.5 gap-2">
                            <p className="text-xs text-muted-foreground/80">
                              {formatDate(item.createdAt)}
                            </p>
                            {item.data?.url && (
                              <Link
                                href={item.data.url}
                                onClick={(e) => {
                                  // Let the parent button handle it (so we mark as read once).
                                  e.preventDefault();
                                }}
                                className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
                              >
                                Open →
                              </Link>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {data.totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-3">
                  <p className="text-xs text-muted-foreground">
                    Page {data.page} of {data.totalPages} · {data.total} total
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.page <= 1}
                      onClick={() => setPage(data.page - 1)}
                    >
                      <ChevronLeft className="size-4" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.page >= data.totalPages}
                      onClick={() => setPage(data.page + 1)}
                    >
                      Next <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// useSearchParams() opts the subtree into client-side rendering, so it has to
// sit inside a Suspense boundary or the static prerender of this route fails.
export default function NotificationsPage() {
  return (
    <Suspense fallback={null}>
      <NotificationsView />
    </Suspense>
  );
}
