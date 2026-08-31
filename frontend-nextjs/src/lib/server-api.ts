// Server-side Laravel API client for React Server Components.
//
// Route handlers proxy the browser's `/api/**` calls (see
// `src/app/api/[...path]/route.ts`); this module is the equivalent for server
// components, which render before any browser request is made and therefore
// call Laravel directly.
//
// The Sanctum token lives in the encrypted NextAuth JWT cookie. We decode it
// here rather than putting it on the session object, so it is never serialised
// into the HTML sent to the browser.

import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

import { apiUrl } from "@/lib/api-config";

/**
 * NextAuth names the cookie differently depending on whether the deployment is
 * secure; check both rather than guessing from NODE_ENV.
 */
const SESSION_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

async function getApiToken(): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const jar = await cookies();
  for (const name of SESSION_COOKIE_NAMES) {
    const raw = jar.get(name)?.value;
    if (!raw) continue;
    try {
      const decoded = await decode({ token: raw, secret });
      const apiToken = decoded?.apiToken;
      if (typeof apiToken === "string" && apiToken.length > 0) {
        return apiToken;
      }
    } catch {
      // Malformed or rotated-secret cookie — treat as signed out.
    }
  }
  return null;
}

/** Envelope every Laravel list endpoint returns. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * GET an API path and return the unwrapped `data` payload.
 *
 * Throws ApiError on a non-2xx response so pages can decide between showing an
 * error state and rethrowing; use `apiGetOrNull` when "not available" is a
 * perfectly good outcome for the page.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const token = await getApiToken();

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
  } catch (e) {
    throw new ApiError(
      `Could not reach the API: ${e instanceof Error ? e.message : String(e)}`,
      502,
      "UPSTREAM_UNAVAILABLE",
    );
  }

  const payload = (await res.json().catch(() => null)) as
    | { data?: T; error?: { message?: string; code?: string } }
    | null;

  if (!res.ok) {
    throw new ApiError(
      payload?.error?.message ?? `Request failed (${res.status})`,
      res.status,
      payload?.error?.code,
    );
  }

  return payload?.data as T;
}

/** As `apiGet`, but returns null instead of throwing. */
export async function apiGetOrNull<T>(path: string): Promise<T | null> {
  try {
    return await apiGet<T>(path);
  } catch (e) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "server_api_get_failed",
        path,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return null;
  }
}
