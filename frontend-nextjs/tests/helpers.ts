// Test helpers — user creation, session injection, request builders,
// background-work draining.

import { vi } from "vitest";
import bcrypt from "bcryptjs";
import type { Session } from "next-auth";

import { db } from "@/lib/db";
import { pendingAfterPromises } from "./setup";

export interface TestUser {
  id: string;
  name: string;
  email: string;
  role: "seeker" | "recruiter";
  password: string;
}

let userCounter = 0;

/**
 * Create a real user row in the test DB. Returns the user + the plaintext
 * password (useful for testing the login endpoint).
 */
export async function createUser(opts: {
  role: "seeker" | "recruiter";
  name?: string;
  email?: string;
  password?: string;
}): Promise<TestUser> {
  userCounter += 1;
  const email =
    opts.email ??
    `${opts.role}-${userCounter}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const password = opts.password ?? "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      name: opts.name ?? (opts.role === "seeker" ? "Test Seeker" : "Test Recruiter"),
      email,
      passwordHash,
      role: opts.role,
    },
    select: { id: true, name: true, email: true, role: true },
  });
  return { ...user, password, role: user.role as "seeker" | "recruiter" };
}

/**
 * Inject a session for the given user so `getCurrentUser()` (which calls
 * `getServerSession(authOptions)`) returns them as the authenticated user.
 */
export async function loginAs(user: TestUser): Promise<void> {
  const { getServerSession } = await import("next-auth");
  const session: Session = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      // `image` is part of the DefaultSession user type but optional.
    } as Session["user"],
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
  vi.mocked(getServerSession).mockImplementation(async () => session);
}

/**
 * Clear the session so subsequent requests appear unauthenticated.
 */
export async function logout(): Promise<void> {
  const { getServerSession } = await import("next-auth");
  vi.mocked(getServerSession).mockImplementation(async () => null);
}

/**
 * Drain all promises passed to `after()` since the last drain. Use this
 * between route-handler calls to make background work (resume parsing,
 * match computation, notification fanout) deterministic in tests.
 */
export async function waitForBackgroundWork(): Promise<void> {
  await Promise.all(pendingAfterPromises.splice(0));
}

/** Build a JSON Request for a route handler. */
export function jsonReq(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
): Request {
  const init: RequestInit = {
    method,
    headers: { "content-type": "application/json" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

/** Read the JSON body of a Response (typed loosely). */
export async function jsonBody<T = any>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
