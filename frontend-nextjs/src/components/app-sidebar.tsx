"use client";

// Role-aware dashboard sidebar.
//
// Seeker nav : Overview · My Resumes · My Matches · Settings
// Recruiter nav: Overview · My Jobs · Candidates · Settings
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
  FileSearch,
  Sun,
  Moon,
  Wand2,
  Bell,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";

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

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  match?: (path: string) => boolean;
}

const SEEKER_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, match: (p) => p === "/dashboard" },
  { label: "My Resumes", href: "/dashboard/seeker/resumes", icon: FileText, match: (p) => p.startsWith("/dashboard/seeker/resumes") && !p.startsWith("/dashboard/resumes/generate") },
  { label: "Resume Builder", href: "/dashboard/resumes/generate", icon: Wand2, match: (p) => p.startsWith("/dashboard/resumes/generate") },
  { label: "My Matches", href: "/dashboard/seeker/matches", icon: Target, match: (p) => p.startsWith("/dashboard/seeker/matches") },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, match: (p) => p.startsWith("/dashboard/notifications") },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, match: (p) => p.startsWith("/dashboard/settings") },
];

const RECRUITER_NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, match: (p) => p === "/dashboard" },
  { label: "My Jobs", href: "/dashboard/recruiter/jobs", icon: Briefcase, match: (p) => p.startsWith("/dashboard/recruiter/jobs") },
  { label: "Candidates", href: "/dashboard/recruiter/candidates", icon: Users, match: (p) => p.startsWith("/dashboard/recruiter/candidates") },
  { label: "Resume Builder", href: "/dashboard/resumes/generate", icon: Wand2, match: (p) => p.startsWith("/dashboard/resumes/generate") },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, match: (p) => p.startsWith("/dashboard/notifications") },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, match: (p) => p.startsWith("/dashboard/settings") },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const role = (session?.user as { role?: string } | undefined)?.role ?? "seeker";
  const nav = role === "recruiter" ? RECRUITER_NAV : SEEKER_NAV;
  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const NavList = (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {nav.map((item) => {
        const isActive = item.match ? item.match(pathname) : pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const Footer = (
    <div className="border-t px-3 py-3 space-y-2">
      <div className="flex items-center gap-3 px-2 py-1.5">
        <Avatar className="size-8">
          <AvatarFallback className="bg-emerald-100 text-emerald-900 text-xs dark:bg-emerald-900/40 dark:text-emerald-200">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{userName}</p>
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 dark:hidden" />
          <Moon className="size-4 hidden dark:block" />
          Toggle theme
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  const Brand = (
    <Link href="/dashboard" className="flex items-center gap-2 px-5 py-4">
      <div className="size-8 rounded-md bg-emerald-600 flex items-center justify-center text-white">
        <FileSearch className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold">Resume Matchmaker</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {role} workspace
        </p>
      </div>
    </Link>
  );

  return (
    <>
      {/* Mobile header with menu trigger */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 border-b bg-background px-4 py-2.5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-emerald-600 flex items-center justify-center text-white">
            <FileSearch className="size-4" />
          </div>
          <span className="text-sm font-semibold">Matchmaker</span>
        </Link>
        <div className="flex items-center gap-1">
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
              <div className="flex-1 overflow-y-auto">{NavList}</div>
              {Footer}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-sidebar md:text-sidebar-foreground shrink-0">
        {Brand}
        <div className="flex-1 overflow-y-auto">{NavList}</div>
        {Footer}
      </aside>
    </>
  );
}
