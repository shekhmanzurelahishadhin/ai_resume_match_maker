// Rate limit — uploading 6 resumes in a row → 6th returns 429.
//
// The spec (§8) caps resume uploads at 5/hour/user. We exercise this by
// uploading 6 valid PDFs as the same seeker. The 6th must return 429 with
// a `Retry-After` header.

import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";

import { POST as uploadPost } from "@/app/api/resumes/upload/route";
import { createUser, loginAs, waitForBackgroundWork } from "./helpers";
import { generateSampleResumePdf } from "./fixtures/generate-pdf";

const FIXTURE_PATH = path.join(__dirname, "fixtures", "sample-resume.pdf");
let fixturePdf: Buffer;

beforeAll(async () => {
  try {
    await fs.access(FIXTURE_PATH);
  } catch {
    await fs.mkdir(path.dirname(FIXTURE_PATH), { recursive: true });
    const buf = await generateSampleResumePdf();
    await fs.writeFile(FIXTURE_PATH, buf);
  }
  fixturePdf = await fs.readFile(FIXTURE_PATH);
});

function buildUpload(url: string): Request {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(fixturePdf)], { type: "application/pdf" });
  form.append("file", blob, "rate-limit-test.pdf");
  return new Request(url, { method: "POST", body: form });
}

describe("resume upload rate limit (5/hour)", () => {
  it("returns 201 for uploads 1-5 and 429 for upload 6", async () => {
    const seeker = await createUser({ role: "seeker" });
    await loginAs(seeker);

    const statuses: number[] = [];
    for (let i = 1; i <= 6; i++) {
      const res = await uploadPost(buildUpload("http://test/api/resumes/upload"));
      statuses.push(res.status);
      // Drain the background parsing work between uploads so the in-memory
      // state doesn't get re-entrant weirdness. (The rate-limit check runs
      // synchronously before `after()` is scheduled, so this is just hygiene.)
      await waitForBackgroundWork().catch(() => undefined);
    }

    // Uploads 1-5 succeed (201). Upload 6 hits the rate limit (429).
    expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(statuses[5]).toBe(429);

    // Verify the 6th response included a Retry-After header.
    const sixth = await uploadPost(buildUpload("http://test/api/resumes/upload"));
    expect(sixth.status).toBe(429);
    expect(sixth.headers.get("retry-after")).not.toBeNull();
    const retryAfter = Number(sixth.headers.get("retry-after"));
    expect(Number.isFinite(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);
  }, 60_000);
});
