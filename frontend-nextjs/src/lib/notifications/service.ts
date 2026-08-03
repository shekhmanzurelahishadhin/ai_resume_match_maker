// Notification service — the orchestration layer above FCM + email + DB.
//
// Responsibilities:
//   - Persist every notification in the Notification table (single source of
//     truth for the notification center UI).
//   - Decide *whether* to fan out to push / email based on the user's
//     NotificationPreference row.
//   - Mark device tokens inactive when FCM returns "UNREGISTERED".
//
// This module is server-only — never import from client components.

import { db } from "@/lib/db";
import {
  sendBatchNotifications,
  type SendPushResult,
} from "@/lib/notifications/fcm";
import { sendEmail, renderNotificationEmail } from "@/lib/notifications/email";

// ---------- types ----------

export type NotificationType =
  | "job_match"
  | "resume_analysis"
  | "new_job"
  | "system"
  | "daily_digest";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface NotificationListRow {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationListResult {
  items: NotificationListRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ---------- preferences ----------

/**
 * Returns the user's NotificationPreference row, creating it with the spec
 * defaults if it doesn't exist yet.
 *
 * Defaults (per §7 of spec):
 *   emailNotifications: true, pushNotifications: true, jobMatches: true,
 *   resumeAnalysis: true, newJobs: true, dailyDigest: false
 */
export async function getOrCreatePreferences(userId: string) {
  const existing = await db.notificationPreference.findUnique({
    where: { userId },
  });
  if (existing) return existing;
  return db.notificationPreference.create({
    data: { userId },
  });
}

// ---------- core CRUD ----------

/**
 * Insert a Notification row + fan out to push/email based on the user's
 * preferences. Always persists (even if the user has disabled both push
 * and email) so the notification center shows the full history.
 */
export async function createNotification(
  input: CreateNotificationInput,
) {
  const prefs = await getOrCreatePreferences(input.userId);

  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      dataJson: (input.data ?? {}) as never,
    },
  });

  // Fan out — never let delivery errors crash the surrounding flow.
  // We wrap in a try/catch so that even if push + email both fail, the
  // notification row (the single source of truth) stays intact.
  try {
    // Is this notification type enabled for the user?
    const typeEnabled = isTypeEnabled(prefs, input.type);
    if (!typeEnabled) {
      return notification;
    }

    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { email: true, name: true },
    });

    // Push fan-out.
    if (prefs.pushNotifications) {
      const tokens = await db.deviceToken.findMany({
        where: { userId: input.userId, isActive: true },
        select: { deviceToken: true },
      });
      if (tokens.length > 0) {
        const tokenList = tokens.map((t) => t.deviceToken);
        const batch = await sendBatchNotifications({
          tokens: tokenList,
          title: input.title,
          body: input.body,
          data: input.data,
        });
        // Mark UNREGISTERED tokens inactive + update lastUsedAt for all.
        const deadTokens = Object.entries(batch.results)
          .filter(([, r]) => (r as SendPushResult).unregistered)
          .map(([t]) => t);
        if (deadTokens.length > 0) {
          await db.deviceToken.updateMany({
            where: { deviceToken: { in: deadTokens } },
            data: { isActive: false },
          });
        }
        await db.deviceToken.updateMany({
          where: { deviceToken: { in: tokenList } },
          data: { lastUsedAt: new Date() },
        });
      }
    }

    // Email fan-out.
    if (prefs.emailNotifications && user?.email) {
      const { html, text } = renderNotificationEmail({
        name: user.name ?? undefined,
        title: input.title,
        body: input.body,
        url: input.data?.url,
      });
      await sendEmail({
        to: user.email,
        subject: input.title,
        html,
        text,
      });
    }
  } catch (e) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "notification_fanout_failed",
        type: input.type,
        userId: input.userId,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
  }

  return notification;
}

/**
 * Decide whether a notification type is enabled for the user based on their
 * prefs. Each NotificationType maps to one of the per-type toggles; `system`
 * and `daily_digest` bypass the per-type gate (system is always allowed;
 * daily_digest is gated by dailyDigest itself in the digest sender).
 */
function isTypeEnabled(
  prefs: {
    jobMatches: boolean;
    resumeAnalysis: boolean;
    newJobs: boolean;
  },
  type: NotificationType,
): boolean {
  switch (type) {
    case "job_match":
      return prefs.jobMatches;
    case "resume_analysis":
      return prefs.resumeAnalysis;
    case "new_job":
      return prefs.newJobs;
    case "system":
      return true;
    case "daily_digest":
      return true;
    default:
      return true;
  }
}

/**
 * Paginated list of the user's notifications (newest first).
 */
export async function getUserNotifications(
  userId: string,
  opts: { page: number; pageSize: number; unreadOnly?: boolean },
): Promise<NotificationListResult> {
  const { page, pageSize, unreadOnly } = opts;
  const skip = (page - 1) * pageSize;
  const where = unreadOnly ? { userId, isRead: false } : { userId };

  const [items, total] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.notification.count({ where }),
  ]);

  return {
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.dataJson as Record<string, unknown> | null,
      isRead: n.isRead,
      readAt: n.readAt,
      createdAt: n.createdAt,
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Mark a single notification as read. Privacy-checked: the row must belong
 * to `userId`. Returns the updated row (or null if not found / not owned).
 */
export async function markAsRead(
  notificationId: string,
  userId: string,
) {
  const owned = await db.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true },
  });
  if (!owned) return null;
  return db.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}

/**
 * Mark all of the user's unread notifications as read. Returns the count.
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const res = await db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return res.count;
}

/**
 * Unread count for the bell badge.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return db.notification.count({
    where: { userId, isRead: false },
  });
}

// ---------- device tokens ----------

/**
 * Register or refresh a device token for the user. If the token already
 * exists (any user), update its `userId` + `lastUsedAt` (this handles
 * the case where a browser signs in as a different user).
 */
export async function registerDeviceToken(params: {
  userId: string;
  deviceToken: string;
  deviceType: string;
  browserInfo?: string;
}) {
  // Validate format: non-empty, reasonable length (FCM tokens are ~150-200 chars).
  const token = params.deviceToken?.trim() ?? "";
  if (!token || token.length < 16 || token.length > 4096) {
    throw new Error("Invalid device token");
  }
  const allowedTypes = new Set(["web", "ios", "android"]);
  const deviceType = allowedTypes.has(params.deviceType)
    ? params.deviceType
    : "web";

  return db.deviceToken.upsert({
    where: { deviceToken: token },
    create: {
      userId: params.userId,
      deviceToken: token,
      deviceType,
      browserInfo: params.browserInfo?.slice(0, 512) ?? null,
      isActive: true,
      lastUsedAt: new Date(),
    },
    update: {
      userId: params.userId,
      deviceType,
      browserInfo: params.browserInfo?.slice(0, 512) ?? null,
      isActive: true,
      lastUsedAt: new Date(),
    },
  });
}

/**
 * Deactivate a device token (soft delete). Used when the user signs out of
 * a device or revokes notification permission.
 */
export async function deactivateDeviceToken(
  token: string,
  userId: string,
): Promise<number> {
  const res = await db.deviceToken.updateMany({
    where: { deviceToken: token, userId },
    data: { isActive: false },
  });
  return res.count;
}
