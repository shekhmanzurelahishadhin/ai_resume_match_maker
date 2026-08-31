"use client";

// Renders nothing; watches a resume that is still being parsed and refreshes
// the server-rendered page once it settles.
//
// Parsing and matching run on a queue worker, so a page rendered right after
// upload always shows "pending". Without this the user has to reload by hand to
// see the extracted skills.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 3000;
/** Give up eventually so a stuck worker doesn't leave a page polling forever. */
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export type ResumeStatus = "pending" | "parsing" | "ready" | "failed";

interface ResumeStatusWatcherProps {
  resumeId: string;
  /** Status as rendered on the server. */
  status: ResumeStatus;
}

export function ResumeStatusWatcher({
  resumeId,
  status,
}: ResumeStatusWatcherProps) {
  const router = useRouter();
  const startedAt = useRef(Date.now());
  const settling = status === "pending" || status === "parsing";

  useEffect(() => {
    if (!settling) return;

    let cancelled = false;
    startedAt.current = Date.now();

    const timer = setInterval(async () => {
      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
        clearInterval(timer);
        return;
      }
      try {
        const res = await fetch(`/api/resumes/${resumeId}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return; // transient — the next tick retries
        const json = (await res.json()) as { data?: { status?: string } };
        const next = json.data?.status;
        if (!cancelled && next && next !== status) {
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        // Network blip; try again on the next tick.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [settling, resumeId, status, router]);

  return null;
}
