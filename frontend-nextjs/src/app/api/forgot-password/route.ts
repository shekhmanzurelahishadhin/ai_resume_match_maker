// POST /api/forgot-password — generate a reset token and (in dev) return it.
//
// In production this would email the token to the user. In the sandbox we have no
// SMTP, so we:
//   1. Log the token to the console (structured log).
//   2. Return the token in the JSON response — clearly marked `devOnly`.
//
// The token is stored in the in-memory cache with a 1-hour TTL, keyed by email.

import crypto from "node:crypto";

import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { PASSWORD_RESET_TTL_SECONDS } from "@/lib/constants";
import { ok, err, parseJson } from "@/lib/api";
import { notifications } from "@/lib/notifications/fcm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await parseJson<unknown>(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation failed", 422, "VALIDATION_ERROR", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const email = parsed.data.email.trim().toLowerCase();
  // Always return 200 to avoid leaking which emails are registered.
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return ok({ accepted: true, devOnly: { token: null, note: "If the email exists, a reset link has been sent." } });
  }

  // Generate a 32-byte token, base64url-encoded.
  const token = cryptoRandomToken();
  await cache.set(
    `pwdreset:${token}`,
    { userId: user.id, email },
    PASSWORD_RESET_TTL_SECONDS,
  );

  // Phase 3 stub: this logs to console + returns the token in dev mode.
  console.info(
    JSON.stringify({
      level: "info",
      event: "password_reset_token_issued",
      userId: user.id,
      email,
      token, // in prod: do NOT log this
      ttlSeconds: PASSWORD_RESET_TTL_SECONDS,
    }),
  );
  await notifications.sendEmail(
    email,
    "Resume Matchmaker — reset your password",
    `<p>We received a request to reset your password.</p>
     <p>Your token (dev mode): <code>${token}</code></p>
     <p>It expires in 1 hour. If you did not request this, ignore this email.</p>`,
  );

  return ok({
    accepted: true,
    devOnly: {
      token,
      note: "Sandbox mode: SMTP not configured. Use this token with POST /api/reset-password.",
    },
  });
}

function cryptoRandomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
