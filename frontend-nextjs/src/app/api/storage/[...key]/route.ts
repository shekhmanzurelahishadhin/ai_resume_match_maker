// GET /api/storage/<key> — stream a stored file to the authenticated owner.
//
// Path format: /api/storage/<userId>/<ownerId>/<filename>
// Privacy: the first segment of the key must equal the current user's id,
// OR the user must own the GeneratedResume/Resume referenced by the second segment.
//
// This route is intentionally NOT in the middleware's PUBLIC_API_PATHS list —
// middleware enforces "must have a session token", and this handler additionally
// enforces "must own the file" before serving bytes.

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { db } from "@/lib/db";
import { unauthorized, forbidden, notFound, ok } from "@/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIME_FALLBACK = "application/octet-stream";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return unauthorized();

  // The key is everything after /api/storage/ (URL-decoded).
  const url = new URL(req.url);
  const rawPath = decodeURIComponent(url.pathname.replace(/^\/api\/storage\/?/, ""));
  if (!rawPath) return notFound("Missing storage key");

  // Reject path traversal outright.
  if (rawPath.includes("..")) {
    return forbidden("Invalid key");
  }

  const segments = rawPath.split("/").filter(Boolean);
  if (segments.length < 3) {
    return forbidden("Invalid key");
  }
  const [keyUserId, keyOwnerId, ...rest] = segments;
  if (!keyUserId || !keyOwnerId || rest.length === 0) {
    return forbidden("Invalid key");
  }

  // Fast path: key's first segment IS the current user.
  let allow = keyUserId === userId;
  if (!allow) {
    // Slow path: the file may belong to a generated resume / uploaded resume
    // owned by the user even though the path prefix is the user's id (it always
    // should be — but verify defensively).
    const generated = await db.generatedResume.findUnique({
      where: { id: keyOwnerId },
      select: { userId: true },
    });
    if (generated && generated.userId === userId) allow = true;
    if (!allow) {
      const uploaded = await db.resume.findUnique({
        where: { id: keyOwnerId },
        select: { userId: true },
      });
      if (uploaded && uploaded.userId === userId) allow = true;
    }
  }
  if (!allow) return forbidden("You do not have access to this file");

  const buffer = await storage.getFile(rawPath);
  if (!buffer) return notFound("File not found on disk");

  // Best-effort MIME guess from extension.
  const ext = rawPath.split(".").pop()?.toLowerCase() ?? "";
  const mime =
    ext === "pdf"
      ? "application/pdf"
      : ext === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : ext === "html"
          ? "text/html; charset=utf-8"
          : ext === "json"
            ? "application/json"
            : MIME_FALLBACK;

  // Inline so the browser previews PDFs/HTML; for downloads the client can
  // add `?download=1` to force attachment.
  const isDownload = url.searchParams.has("download");
  const disposition = isDownload
    ? `attachment; filename="${rest[rest.length - 1] ?? "file"}"`
    : "inline";

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(buffer.length),
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=0, no-cache",
    },
  });
}

export async function POST() {
  return ok({ endpoint: "storage", method: "GET" });
}
