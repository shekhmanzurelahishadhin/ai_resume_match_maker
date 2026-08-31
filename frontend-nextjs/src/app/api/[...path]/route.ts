// Catch-all proxy: browser `/api/**` → Laravel API.
//
// Why a proxy rather than pointing the browser straight at Laravel:
//   1. The Sanctum token lives in the NextAuth JWT cookie and is attached here,
//      server-side. It is never readable by browser JavaScript.
//   2. Same-origin requests, so there is no CORS configuration to maintain.
//   3. Existing client code keeps calling relative `/api/...` paths unchanged.
//
// `/api/auth/**` is served by NextAuth itself — that route is more specific
// than this catch-all, so Next.js matches it first.

import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { apiUrl } from "@/lib/api-config";

export const dynamic = "force-dynamic";

/** Hop-by-hop and origin-specific headers that must not be forwarded. */
const STRIPPED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
  "te",
  "trailer",
  "content-length", // recomputed by fetch from the body we pass
  "cookie", // Laravel auth is the bearer token, not our session cookie
  "authorization", // set from the session below; never trust the client's
  // Sanctum's EnsureFrontendRequestsAreStateful treats a request whose Origin
  // or Referer is a `sanctum.stateful` domain as a first-party SPA call and
  // switches it to session auth, which then demands a CSRF token. This proxy
  // is a server-side client authenticating with a bearer token, so these are
  // dropped to keep it on the stateless token guard.
  "origin",
  "referer",
]);

const STRIPPED_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "content-encoding", // fetch already decoded the body
  "content-length",
]);

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const target = apiUrl(path.join("/")) + (req.nextUrl.search || "");

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  // A wildcard Accept makes Laravel treat the call as a browser navigation and
  // answer auth failures with an HTML redirect instead of a JSON 401.
  const accept = req.headers.get("accept");
  headers.set(
    "Accept",
    !accept || accept === "*/*" ? "application/json" : accept,
  );
  // Belt and braces: this makes Laravel's handler render JSON errors even when
  // a client sends an unhelpful Accept header.
  headers.set("X-Requested-With", "XMLHttpRequest");

  // Attach the Laravel token stashed in the JWT at sign-in.
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const apiToken = token?.apiToken;
  if (typeof apiToken === "string" && apiToken.length > 0) {
    headers.set("Authorization", `Bearer ${apiToken}`);
  }

  // Buffer the body: multipart uploads need a concrete body, and streaming
  // request bodies through fetch needs half-duplex support we cannot rely on.
  const method = req.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (e) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "api_proxy_unreachable",
        target,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return NextResponse.json(
      {
        error: {
          message: "The API is unreachable. Is the Laravel server running?",
          code: "UPSTREAM_UNAVAILABLE",
          status: 502,
        },
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function HEAD(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
