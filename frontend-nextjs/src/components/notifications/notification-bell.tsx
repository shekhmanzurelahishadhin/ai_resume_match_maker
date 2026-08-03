"use client";

// Notification bell — dropdown in the dashboard header showing the most
// recent 5 notifications, an unread-count badge, "Mark all as read", and a
// "View all" link to the full notifications page.
//
// Polls `/api/notifications/unread-count` every 30 seconds. When the
// dropdown is opened, the latest 5 are fetched on demand.

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Loader2,
  Target,
  FileText,
  Briefcase,
  Info,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: { url?: string; [k: string]: unknown } | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, typeof Bell> = {
  job_match: Target,
  resume_analysis: FileText,
  new_job: Briefcase,
  daily_digest: Mail,
  system: Info,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      setUnreadCount(json?.data?.count ?? 0);
    } catch {
      // silent — the bell will just show 0 on network errors
    }
  }, []);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/notifications?page=1&pageSize=5",
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const json = await res.json();
      setItems((json?.data?.items ?? []) as NotificationItem[]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + 30s polling for the unread count.
  useEffect(() => {
    fetchUnread();
    timerRef.current = setInterval(fetchUnread, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchUnread]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) fetchRecent();
  };

  const markAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "PUT",
      });
      if (!res.ok) return;
      setUnreadCount(0);
      setItems((prev) =>
        prev.map((i) => ({ ...i, isRead: true })),
      );
    } catch {
      // silent
    }
  };

  const handleClickItem = async (item: NotificationItem) => {
    if (!item.isRead) {
      // Mark as read in the background; don't await — navigate immediately.
      fetch(`/api/notifications/${item.id}/read`, { method: "PUT" }).catch(
        () => undefined,
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i)),
      );
    }
    setOpen(false);
    const url = item.data?.url;
    if (url) router.push(url);
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white"
              aria-hidden="true"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={markAllRead}
            >
              <CheckCheck className="size-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Bell className="size-6 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {items.map((item) => {
              const Icon = TYPE_ICON[item.type] ?? Info;
              return (
                <button
                  key={item.id}
                  onClick={() => handleClickItem(item)}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors border-b last:border-b-0",
                    !item.isRead && "bg-emerald-50/50 dark:bg-emerald-950/20",
                  )}
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-4 text-emerald-700 dark:text-emerald-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight truncate">
                        {item.title}
                      </p>
                      {!item.isRead && (
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-emerald-600" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {item.body}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 mt-1">
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem asChild>
          <Link
            href="/dashboard/notifications"
            className="justify-center text-sm text-emerald-700 dark:text-emerald-300 font-medium"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
