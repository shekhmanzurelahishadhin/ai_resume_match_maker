// Matches — given a resume + job, GET /api/matches/resume/{id} returns matches.

import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";

import { POST as uploadPost } from "@/app/api/resumes/upload/route";
import { POST as jobsPost } from "@/app/api/jobs/route";
import { GET as matchesGet } from "@/app/api/matches/resume/[resumeId]/route";

import {
  createUser,
  loginAs,
  waitForBackgroundWork,
} from "./helpers";
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

function buildMultipartUpload(url: string, file: Buffer): Request {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(file)], { type: "application/pdf" });
  form.append("file", blob, "jane-doe-resume.pdf");
  return new Request(url, { method: "POST", body: form });
}

async function waitForResumeReady(resumeId: string, maxMs = 15_000): Promise<void> {
  const { GET: statusGet } = await import("@/app/api/resumes/[id]/status/route");
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await waitForBackgroundWork();
    const res = await statusGet(
      new Request(`http://test/api/resumes/${resumeId}/status`),
      { params: Promise.resolve({ id: resumeId }) },
    );
    const body = await res.json();
    if (body.data?.status === "ready") return;
    if (body.data?.status === "failed") {
      throw new Error(`resume failed: ${body.data.parseError}`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`resume ${resumeId} did not become ready within ${maxMs}ms`);
}

describe("matches", () => {
  it("seeker uploads a resume, recruiter posts a job, matches are returned", async () => {
    // 1. Seeker uploads a resume. Drain the upload's `after()` (parsing +
    //    matching) BEFORE doing anything else — SQLite doesn't tolerate
    //    concurrent writes well, and we want the test to be deterministic.
    const seeker = await createUser({ role: "seeker" });
    await loginAs(seeker);
    const upload = await uploadPost(
      buildMultipartUpload("http://test/api/resumes/upload", fixturePdf),
    );
    const uploadBody = await upload.json();
    const resumeId = uploadBody.data.resume.id;

    await waitForBackgroundWork();
    await waitForResumeReady(resumeId);

    // 2. Recruiter posts a job that overlaps with the resume's skills.
    //    The job-post route schedules `matchJobAgainstAllResumes` via `after()`.
    const recruiter = await createUser({ role: "recruiter" });
    await loginAs(recruiter);
    const jobRes = await jobsPost(
      new Request("http://test/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Full Stack Engineer",
          description:
            "Build React + Node.js applications. GraphQL + AWS + Docker experience a plus.",
          requiredSkills: ["React", "Node.js", "GraphQL", "AWS", "Docker", "TypeScript"],
          isActive: true,
        }),
      }),
    );
    expect(jobRes.status).toBe(201);
    const jobBody = await jobRes.json();

    // Drain the job post's `after()` — `matchJobAgainstAllResumes` will
    // find the now-ready resume and create a Match row.
    await waitForBackgroundWork();

    // 3. Switch back to the seeker and fetch matches for their resume.
    await loginAs(seeker);
    const matchesRes = await matchesGet(
      new Request(`http://test/api/matches/resume/${resumeId}`),
      { params: Promise.resolve({ resumeId }) },
    );
    expect(matchesRes.status).toBe(200);
    const matchesBody = await matchesRes.json();
    expect(matchesBody.data.total).toBeGreaterThanOrEqual(1);

    const first = matchesBody.data.items[0];
    expect(first.job.id).toBe(jobBody.data.job.id);
    expect(first.matchPercentage).toBeTypeOf("number");
    expect(first.matchPercentage).toBeGreaterThanOrEqual(0);
    expect(first.matchPercentage).toBeLessThanOrEqual(100);
    expect(["ai", "fallback"]).toContain(first.matchSource);
    expect(Array.isArray(first.matchedSkills)).toBe(true);
    expect(Array.isArray(first.missingSkills)).toBe(true);
    // Sanity: with React + Node.js + TypeScript + GraphQL all present in the
    // fixture resume, at least one skill should be matched.
    expect(first.matchedSkills.length).toBeGreaterThan(0);
  });

  it("seeker can't fetch matches for someone else's resume (403)", async () => {
    const owner = await createUser({ role: "seeker", name: "Owner" });
    await loginAs(owner);
    const upload = await uploadPost(
      buildMultipartUpload("http://test/api/resumes/upload", fixturePdf),
    );
    const resumeId = (await upload.json()).data.resume.id;

    const other = await createUser({ role: "seeker", name: "Other" });
    await loginAs(other);

    const res = await matchesGet(
      new Request(`http://test/api/matches/resume/${resumeId}`),
      { params: Promise.resolve({ resumeId }) },
    );
    expect(res.status).toBe(403);
  });
});
