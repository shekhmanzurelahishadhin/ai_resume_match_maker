// Helpers for consistent API responses + current-user extraction.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export interface ApiError {
  message: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function err(message: string, status = 400, code?: string, extra?: ApiError) {
  return NextResponse.json(
    { error: { message, code, ...(extra ?? {}) } },
    { status },
  );
}

export function unauthorized(message = "Unauthorized") {
  return err(message, 401, "UNAUTHORIZED");
}

export function forbidden(message = "Forbidden") {
  return err(message, 403, "FORBIDDEN");
}

export function notFound(message = "Not found") {
  return err(message, 404, "NOT_FOUND");
}

export function tooManyRequests(retryAfterSeconds: number, message = "Rate limit exceeded") {
  return NextResponse.json(
    { error: { message, code: "RATE_LIMITED" } },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "seeker" | "recruiter";
}

/**
 * Returns the authenticated user (full DB row) or null.
 * Use this in route handlers when you need the user's role / id.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const u = session.user as { id?: string; name?: string; email?: string; role?: string };
  if (!u.id || !u.role) return null;
  // Verify the user still exists in the DB (catches deleted-user tokens).
  const dbUser = await db.user.findUnique({
    where: { id: u.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!dbUser) return null;
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role as "seeker" | "recruiter",
  };
}

/** Throws nothing — returns a 401 NextResponse via `unauthorized()` if missing. */
export async function requireUser(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { response: unauthorized() };
  return { user };
}

export async function requireRole(role: "seeker" | "recruiter"): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const got = await requireUser();
  if ("response" in got) return got;
  if (got.user.role !== role) return { response: forbidden("Insufficient role") };
  return got;
}

/** Parse JSON body with safe error handling. */
export async function parseJson<T = unknown>(req: Request): Promise<T | null> {
  try {
    const text = await req.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Parse ?page=N&pageSize=N from the URL search params with sane defaults. */
export function parsePagination(req: Request, defaultSize = 15) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("pageSize") ?? String(defaultSize)) || defaultSize),
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
