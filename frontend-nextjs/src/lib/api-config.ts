// Laravel API base URL.
//
// The frontend is a pure client of the Laravel API (README §3, "Option A").
// Browser code still calls relative `/api/**` paths; the catch-all proxy at
// `src/app/api/[...path]/route.ts` forwards those to Laravel server-side and
// attaches the caller's Sanctum token, so the token never reaches the browser.

const RAW_BASE =
  process.env.LARAVEL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000/api";

/** Base URL with no trailing slash, e.g. "http://localhost:8000/api". */
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, "");

/** Build an absolute Laravel URL from an API-relative path. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}
