"use client";

// Role-aware dashboard sidebar.
//
// Seeker nav : Overview · Find Jobs · Matches · Applications · Messages · Resumes · Builder · …
// Recruiter nav: Overview · My Jobs · Applicants · Candidates · Messages · …
//
// On mobile: rendered inside a Sheet (drawer) triggered by the header menu button.
// On desktop: a fixed 16rem column on the left.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Target,
  Settings,
  Briefcase,
  Users,
  LogOut,
  Menu,
  Wand2,
  Bell,
  Search,
  Send,
  Inbox,
  MessageSquare,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  match?: (path: string) => boolean;
  badge?: "messages";
}

const SEEKER_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, match: (p) => p === "/dashboard" },
  { label: "Find Jobs", href: "/dashboard/jobs", icon: Search, match: (p) => p.startsWith("/dashboard/jobs") },
  { label: "My Matches", href: "/dashboard/seeker/matches", icon: Target, match: (p) => p.startsWith("/dashboard/seeker/matches") },
  { label: "Applications", href: "/dashboard/seeker/applications", icon: Send, match: (p) => p.startsWith("/dashboard/seeker/applications") },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, match: (p) => p.startsWith("/dashboard/messages"), badge: "messages" },
  { label: "My Resumes", href: "/dashboard/seeker/resumes", icon: FileText, match: (p) => p.startsWith("/dashboard/seeker/resumes") },
  { label: "Resume Builder", href: "/dashboard/resumes/generate", icon: Wand2, match: (p) => p.startsWith("/dashboard/resumes/generate") },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, match: (p) => p.startsWith("/dashboard/notifications") },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, match: (p) => p.startsWith("/dashboard/settings") },
];

const RECRUITER_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, match: (p) => p === "/dashboard" },
  { label: "My Jobs", href: "/dashboard/recruiter/jobs", icon: Briefcase, match: (p) => p.startsWith("/dashboard/recruiter/jobs") },
  { label: "Applicants", href: "/dashboard/recruiter/applicants", icon: Inbox, match: (p) => p.startsWith("/dashboard/recruiter/applicants") },
  { label: "Candidates", href: "/dashboard/recruiter/candidates", icon: Users, match: (p) => p.startsWith("/dashboard/recruiter/candidates") },
  { label: "Messages", href: "/dashboard/messages", icon: MessageSquare, match: (p) => p.startsWith("/dashboard/messages"), badge: "messages" },
  { label: "Resume Builder", href: "/dashboard/resumes/generate", icon: Wand2, match: (p) => p.startsWith("/dashboard/resumes/generate") },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, match: (p) => p.startsWith("/dashboard/notifications") },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, match: (p) => p.startsWith("/dashboard/settings") },
];

/** Unread message count for the sidebar badge (polled). */
function useUnreadMessages(enabled: boolean) {
  const q = useQuery({
    queryKey: ["messages-unread"],
    queryFn: async () => {
      const res = await fetch("/api/conversations/unread-count");
      if (!res.ok) return 0;
      const json = await res.json();
      return (json?.data?.count as number) ?? 0;
    },
    enabled,
    refetchInterval: 30_000,
  });
  return q.data ?? 0;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const role = (session?.user as { role?: string } | undefined)?.role ?? "seeker";
  const nav = role === "recruiter" ? RECRUITER_NAV : SEEKER_NAV;
  const unreadMessages = useUnreadMessages(!!session);
  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Separate layoutIds so the mobile drawer and desktop column don't try to
  // animate the active pill between each other.
  const renderNav = (layoutId: string) => (
    <nav className="flex flex-col gap-0.5 px-3 py-2">
      <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        Menu
      </p>
      {nav.map((item) => {
        const isActive = item.match ? item.match(pathname) : pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "text-emerald-900 dark:text-emerald-100"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
            )}
          >
            {isActive ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-100 to-emerald-50 ring-1 ring-emerald-200/70 dark:from-emerald-500/20 dark:to-emerald-500/5 dark:ring-emerald-400/20"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            {isActive ? (
              <motion.span
                layoutId={`${layoutId}-bar`}
                className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-500"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <Icon
              className={cn(
                "relative size-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                isActive && "text-emerald-600 dark:text-emerald-300",
              )}
            />
            <span className="relative truncate">{item.label}</span>
            {item.badge === "messages" && unreadMessages > 0 ? (
              <span className="relative ml-auto flex items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/40" />
                <span className="relative rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white tabular-nums">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const Footer = (
    <div className="border-t px-3 py-3 space-y-2">
      <div className="flex items-center gap-3 rounded-xl border bg-card/60 px-2.5 py-2">
        <Avatar className="size-9 ring-2 ring-emerald-500/30">
          <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{userName}</p>
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle withLabel className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  const Brand = (
    <BrandLogo href="/dashboard" subtitle={`${role} workspace`} className="px-5 py-4" />
  );

  return (
    <>
      {/* Mobile header with menu trigger */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 border-b glass px-4 py-2.5">
        <BrandLogo href="/dashboard" compact />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SheetHeader className="text-left">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
              </SheetHeader>
              {Brand}
              <div className="flex-1 overflow-y-auto">{renderNav("nav-active-mobile")}</div>
              {Footer}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop sidebar */}
      {/*
        `self-start` + a viewport-height box is what makes `sticky` work here:
        as a stretched flex child the sidebar would be as tall as the (much
        taller) page, leaving it nothing to stick within, so it just scrolled
        away with the content.
      */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-sidebar md:backdrop-blur-xl md:text-sidebar-foreground shrink-0 md:sticky md:top-0 md:h-screen md:self-start">
        {Brand}
        <div className="flex-1 overflow-y-auto">{renderNav("nav-active")}</div>
        {Footer}
      </aside>
    </>
  );
}
