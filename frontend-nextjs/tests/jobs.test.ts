// Jobs — recruiter creates, seeker can't, recruiter can't edit other's job.

import { describe, it, expect } from "vitest";

import { GET as jobsGet, POST as jobsPost } from "@/app/api/jobs/route";
import { PUT as jobPut } from "@/app/api/jobs/[id]/route";

import {
  createUser,
  loginAs,
  jsonReq,
  jsonBody,
} from "./helpers";

const JOB_BODY = {
  title: "Senior Backend Engineer",
  description:
    "Design and ship the next generation of our GraphQL APIs. Strong SQL + Node.js required.",
  requiredSkills: ["Node.js", "GraphQL", "SQL", "TypeScript"],
  isActive: true,
};

describe("jobs", () => {
  it("recruiter creates a job and sees it in their list", async () => {
    const recruiter = await createUser({ role: "recruiter" });
    await loginAs(recruiter);

    const create = await jobsPost(jsonReq("POST", "http://test/api/jobs", JOB_BODY));
    expect(create.status).toBe(201);
    const created = await jsonBody(create);
    expect(created.data.job.title).toBe(JOB_BODY.title);
    expect(created.data.job.requiredSkills).toEqual(JOB_BODY.requiredSkills);

    const list = await jobsGet(new Request("http://test/api/jobs"));
    expect(list.status).toBe(200);
    const listed = await jsonBody(list);
    expect(listed.data.total).toBeGreaterThanOrEqual(1);
    expect(listed.data.items.some((j: any) => j.id === created.data.job.id)).toBe(true);
  });

  it("seeker cannot create a job (403)", async () => {
    const seeker = await createUser({ role: "seeker" });
    await loginAs(seeker);

    const res = await jobsPost(jsonReq("POST", "http://test/api/jobs", JOB_BODY));
    expect(res.status).toBe(403);
  });

  it("recruiter cannot edit another recruiter's job (403)", async () => {
    const owner = await createUser({ role: "recruiter", name: "Owner" });
    await loginAs(owner);
    const created = await jobsPost(jsonReq("POST", "http://test/api/jobs", JOB_BODY));
    const jobId = (await jsonBody(created)).data.job.id;

    const other = await createUser({ role: "recruiter", name: "Other" });
    await loginAs(other);

    const res = await jobPut(
      jsonReq("PUT", `http://test/api/jobs/${jobId}`, { title: "Hacked Title" }),
      { params: Promise.resolve({ id: jobId }) },
    );
    expect(res.status).toBe(403);
  });

  it("unauthenticated users get 401", async () => {
    const res = await jobsPost(jsonReq("POST", "http://test/api/jobs", JOB_BODY));
    expect(res.status).toBe(401);
  });

  it("seekers see active jobs but not inactive ones", async () => {
    const recruiter = await createUser({ role: "recruiter" });
    await loginAs(recruiter);
    await jobsPost(
      jsonReq("POST", "http://test/api/jobs", {
        ...JOB_BODY,
        title: "Active Job A",
        isActive: true,
      }),
    );
    await jobsPost(
      jsonReq("POST", "http://test/api/jobs", {
        ...JOB_BODY,
        title: "Inactive Job B",
        isActive: false,
      }),
    );

    const seeker = await createUser({ role: "seeker" });
    await loginAs(seeker);
    const list = await jobsGet(new Request("http://test/api/jobs"));
    const body = await jsonBody(list);
    const titles = body.data.items.map((j: any) => j.title);
    expect(titles).toContain("Active Job A");
    expect(titles).not.toContain("Inactive Job B");
  });
});
