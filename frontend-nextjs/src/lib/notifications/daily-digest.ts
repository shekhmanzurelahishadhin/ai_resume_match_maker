// Daily digest sender.
//
// Queries every user with `dailyDigest=true`, compiles a summary of their
// notifications from the last 24h, and sends an email via the email module.
//
// In production this should be called by a cron job (see README — recommend
// 09:00 user-local-time). In the sandbox, an admin-only HTTP endpoint
// (`POST /api/notifications/digest/run` with `x-admin-secret` header)
// triggers it manually.

import { db } from "@/lib/db";
import { sendEmail, renderNotificationEmail } from "@/lib/notifications/email";

export interface DigestResult {
  processedUsers: number;
  emailsSent: number;
  devModeSkips: number;
  errors: number;
  startedAt: Date;
  finishedAt: Date;
}

/**
 * Run the daily digest. Safe to call repeatedly — each user only receives
 * one digest per call (no idempotency tokens needed since this is a daily
 * summary, not a per-event notification).
 */
export async function sendDailyDigest(): Promise<DigestResult> {
  const startedAt = new Date();

  const subscribers = await db.notificationPreference.findMany({
    where: { dailyDigest: true, emailNotifications: true },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  let emailsSent = 0;
  let devModeSkips = 0;
  let errors = 0;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const sub of subscribers) {
    if (!sub.user?.email) continue;
    try {
      const recent = await db.notification.findMany({
        where: { userId: sub.user.id, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 25,
      });

      const unreadCount = await db.notification.count({
        where: { userId: sub.user.id, isRead: false },
      });

      if (recent.length === 0 && unreadCount === 0) {
        // Nothing to report — skip silently so we don't spam quiet users.
        continue;
      }

      const title =
        recent.length === 0
          ? `Daily digest — ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
          : `Daily digest — ${recent.length} notification${recent.length === 1 ? "" : "s"} in the last 24h`;

      const lines: string[] = [];
      if (recent.length > 0) {
        for (const n of recent.slice(0, 10)) {
          const time = n.createdAt.toLocaleString();
          lines.push(`• [${n.type}] ${n.title} — ${n.body} (${time})`);
        }
        if (recent.length > 10) {
          lines.push(`• ... and ${recent.length - 10} more.`);
        }
      } else {
        lines.push("No new notifications in the last 24 hours.");
      }
      if (unreadCount > 0) {
        lines.push(`\nYou have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"} waiting in your inbox.`);
      }
      lines.push("\nView all notifications in your dashboard.");
      const bodyText = lines.join("\n");

      const { html, text } = renderNotificationEmail({
        name: sub.user.name ?? undefined,
        title,
        body: bodyText,
        url: "/dashboard/notifications",
      });

      const res = await sendEmail({
        to: sub.user.email,
        subject: title,
        html,
        text,
      });

      if (res.sent) {
        emailsSent++;
      } else if (res.devMode) {
        devModeSkips++;
      } else if (res.error) {
        errors++;
      }
    } catch (e) {
      errors++;
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "digest_user_failed",
          userId: sub.user.id,
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  }

  return {
    processedUsers: subscribers.length,
    emailsSent,
    devModeSkips,
    errors,
    startedAt,
    finishedAt: new Date(),
  };
}
