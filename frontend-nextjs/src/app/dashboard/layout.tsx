// Dashboard layout — sidebar + main content area.
// Auth is enforced by middleware (see src/middleware.ts); this layout just renders
// the chrome. A server-side check is also included as defense-in-depth.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <main className="flex-1 min-w-0 flex flex-col bg-muted/20">
        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-end gap-2 border-b bg-background px-6 py-2 h-12">
          <NotificationBell />
        </div>
        <div className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
