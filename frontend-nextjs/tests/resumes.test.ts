// Resume upload + parse + skill extraction.

import { describe, it, expect, beforeAll } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";

import { POST as uploadPost } from "@/app/api/resumes/upload/route";
import { GET as statusGet } from "@/app/api/resumes/[id]/status/route";
import { GET as resumeGet } from "@/app/api/resumes/[id]/route";

import {
  createUser,
  loginAs,
  waitForBackgroundWork,
} from "./helpers";
import { generateSampleResumePdf } from "./fixtures/generate-pdf";

const FIXTURE_PATH = path.join(__dirname, "fixtures", "sample-resume.pdf");

let fixturePdf: Buffer;

beforeAll(async () => {
  // Ensure the fixture exists. The generate-pdf.ts script writes it; if the
  // operator didn't run it manually we generate inline so the test is
  // self-contained.
  try {
    await fs.access(FIXTURE_PATH);
  } catch {
    await fs.mkdir(path.dirname(FIXTURE_PATH), { recursive: true });
    const buf = await generateSampleResumePdf();
    await fs.writeFile(FIXTURE_PATH, buf);
  }
  fixturePdf = await fs.readFile(FIXTURE_PATH);
});

function buildMultipartUpload(
  url: string,
  file: Buffer,
  filename = "jane-doe-resume.pdf",
): Request {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(file)], { type: "application/pdf" });
  form.append("file", blob, filename);
  return new Request(url, { method: "POST", body: form });
}

async function pollStatus(id: string, maxMs = 15_000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    await waitForBackgroundWork();
    const res = await statusGet(
      new Request(`http://test/api/resumes/${id}/status`),
      { params: Promise.resolve({ id }) },
    );
    const body = await res.json();
    if (body.data?.status === "ready" || body.data?.status === "failed") {
      return body.data;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`resume ${id} did not reach a terminal status within ${maxMs}ms`);
}

describe("resume upload + parse", () => {
  it("seeker uploads a PDF and it ends in 'ready' with skills extracted", async () => {
    const seeker = await createUser({ role: "seeker" });
    await loginAs(seeker);

    const upload = await uploadPost(
      buildMultipartUpload("http://test/api/resumes/upload", fixturePdf),
    );
    expect(upload.status).toBe(201);
    const ub = await upload.json();
    expect(ub.data.resume.status).toBe("pending");
    const resumeId = ub.data.resume.id;

    const final = await pollStatus(resumeId);
    expect(["ready", "failed"]).toContain(final.status);
    if (final.status === "failed") {
      // If parsing failed in this environment (e.g. pdf-parse quirk), surface
      // the error so the test runner shows the root cause.
      throw new Error(`resume parsing failed: ${final.parseError}`);
    }
    expect(final.status).toBe("ready");

    // Skills should be present (fallback dictionary extracts JavaScript,
    // TypeScript, React, Node.js, Python, SQL, AWS, Docker, GraphQL).
    const detail = await resumeGet(
      new Request(`http://test/api/resumes/${resumeId}`),
      { params: Promise.resolve({ id: resumeId }) },
    );
    expect(detail.status).toBe(200);
    const detailBody = await detail.json();
    const skills = detailBody.data.resume.skills as string[];
    expect(skills.length).toBeGreaterThan(0);
    // Sanity: the fallback dictionary should pick up at least 3 of the
    // well-known skills present in the fixture.
    const expected = ["JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL"];
    const overlap = expected.filter((s) => skills.includes(s));
    expect(overlap.length).toBeGreaterThanOrEqual(3);

    // Experience-years heuristic should find the 2020-Present + 2017-2020 ranges.
    expect(detailBody.data.resume.experienceYears).toBeGreaterThan(0);
  });

  it("recruiter cannot upload (403)", async () => {
    const recruiter = await createUser({ role: "recruiter" });
    await loginAs(recruiter);
    const res = await uploadPost(
      buildMultipartUpload("http://test/api/resumes/upload", fixturePdf),
    );
    expect(res.status).toBe(403);
  });

  it("rejects non-PDF content (415)", async () => {
    const seeker = await createUser({ role: "seeker" });
    await loginAs(seeker);
    const form = new FormData();
    const blob = new Blob([new Uint8Array(Buffer.from("not a pdf"))], {
      type: "text/plain",
    });
    form.append("file", blob, "evil.txt");
    const res = await uploadPost(
      new Request("http://test/api/resumes/upload", { method: "POST", body: form }),
    );
    expect(res.status).toBe(415);
  });
});
