// POST /api/login — validate email+password against the DB and return the user.
//
// Note: the actual JWT session cookie is set by NextAuth's /api/auth/callback/credentials
// route, which the browser client triggers via `signIn("credentials", ...)` from
// `next-auth/react`. This /api/login endpoint exists as a REST alias for non-browser
// clients (or for clients that prefer the JSON shape) — it returns 200 with the user
// once credentials are verified.
//
// To create a browser session, the recommended client flow is:
//   await signIn("credentials", { email, password, redirect: false })

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validators/auth";
import { ok, err, parseJson, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await parseJson<unknown>(req);
  if (!body) return err("Invalid JSON body", 400);

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return err("Validation failed", 422, "VALIDATION_ERROR", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return unauthorized("Invalid credentials");

  const okPwd = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!okPwd) return unauthorized("Invalid credentials");

  return ok({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}
