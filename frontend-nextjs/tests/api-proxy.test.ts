// Tests for the pieces the frontend still owns after moving to the Laravel API:
// the URL builder and the catch-all proxy route.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

async function loadProxy() {
  // Re-import per test so module-level env reads pick up the current values.
  vi.resetModules();
  return import("@/app/api/[...path]/route");
}

/** Minimal NextRequest stand-in — the proxy only uses these members. */
function makeRequest(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
) {
  const parsed = new URL(url);
  return {
    method: init.method ?? "GET",
    headers: new Headers(init.headers ?? {}),
    nextUrl: { search: parsed.search },
    arrayBuffer: async () => new TextEncoder().encode(init.body ?? "").buffer,
  } as never;
}

const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) });

beforeEach(() => {
  process.env.LARAVEL_API_URL = "http://api.test/api";
  process.env.NEXTAUTH_SECRET = "test-secret-value-at-least-32-chars-long";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("apiUrl", () => {
  it("joins the base and path without doubling slashes", async () => {
    vi.resetModules();
    const { apiUrl, API_BASE_URL } = await import("@/lib/api-config");
    expect(API_BASE_URL).toBe("http://api.test/api");
    expect(apiUrl("jobs")).toBe("http://api.test/api/jobs");
    expect(apiUrl("/jobs")).toBe("http://api.test/api/jobs");
  });

  it("falls back to localhost when nothing is configured", async () => {
    delete process.env.LARAVEL_API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.resetModules();
    const { API_BASE_URL } = await import("@/lib/api-config");
    expect(API_BASE_URL).toBe("http://localhost:8000/api");
  });
});

describe("API proxy", () => {
  it("forwards the path and query string to Laravel", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response('{"data":{}}', { status: 200 }));

    const { GET } = await loadProxy();
    await GET(makeRequest("http://localhost:3000/api/jobs?perPage=2"), ctx(["jobs"]));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/api/jobs?perPage=2");
  });

  it("never forwards a client-supplied Authorization header", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const { GET } = await loadProxy();
    await GET(
      makeRequest("http://localhost:3000/api/jobs", {
        headers: { authorization: "Bearer forged-token", cookie: "a=b" },
      }),
      ctx(["jobs"]),
    );

    const sent = new Headers(
      (fetchMock.mock.calls[0][1] as RequestInit).headers as HeadersInit,
    );
    // No session cookie present, so no Authorization should be attached at all.
    expect(sent.get("authorization")).toBeNull();
    expect(sent.get("cookie")).toBeNull();
  });

  it("asks for JSON so Laravel does not answer 401s with an HTML redirect", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const { GET } = await loadProxy();
    await GET(
      makeRequest("http://localhost:3000/api/dashboard", {
        headers: { accept: "*/*" },
      }),
      ctx(["dashboard"]),
    );

    const sent = new Headers(
      (fetchMock.mock.calls[0][1] as RequestInit).headers as HeadersInit,
    );
    expect(sent.get("accept")).toBe("application/json");
    expect(sent.get("x-requested-with")).toBe("XMLHttpRequest");
  });

  it("preserves the upstream status code", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"error":{"message":"Unauthenticated."}}', { status: 401 }),
    );

    const { GET } = await loadProxy();
    const res = await GET(
      makeRequest("http://localhost:3000/api/dashboard"),
      ctx(["dashboard"]),
    );
    expect(res.status).toBe(401);
  });

  it("returns 502 with a readable message when the API is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { GET } = await loadProxy();
    const res = await GET(makeRequest("http://localhost:3000/api/jobs"), ctx(["jobs"]));

    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UPSTREAM_UNAVAILABLE");
  });

  it("sends a body for POST but not for GET", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    const { POST, GET } = await loadProxy();

    await POST(
      makeRequest("http://localhost:3000/api/jobs", {
        method: "POST",
        body: '{"title":"x"}',
      }),
      ctx(["jobs"]),
    );
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBeDefined();

    await GET(makeRequest("http://localhost:3000/api/jobs"), ctx(["jobs"]));
    expect((fetchMock.mock.calls[1][1] as RequestInit).body).toBeUndefined();
  });
});
