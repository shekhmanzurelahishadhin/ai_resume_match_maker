// Auth flow — register → login → GET /api/user.
// Also covers: duplicate email → 409, bad password → 401, no session → 401.

import { describe, it, expect } from "vitest";

import { POST as registerPost } from "@/app/api/register/route";
import { POST as loginPost } from "@/app/api/login/route";
import { GET as userGet } from "@/app/api/user/route";

import { createUser, loginAs, logout, jsonReq, jsonBody } from "./helpers";

describe("auth flow", () => {
  it("registers a new user with 201", async () => {
    const res = await registerPost(
      jsonReq("POST", "http://test/api/register", {
        name: "Auth Seeker",
        email: "auth-seeker@test.local",
        password: "Password123!",
        role: "seeker",
      }),
    );
    expect(res.status).toBe(201);
    const body = await jsonBody(res);
    expect(body.data.user.email).toBe("auth-seeker@test.local");
    expect(body.data.user.role).toBe("seeker");
    // Password hash must never leak.
    expect(JSON.stringify(body)).not.toMatch(/passwordHash/i);
  });

  it("rejects duplicate emails with 409", async () => {
    await createUser({
      role: "seeker",
      email: "dup@test.local",
      password: "Password123!",
    });

    const res = await registerPost(
      jsonReq("POST", "http://test/api/register", {
        name: "Dup Seeker",
        email: "dup@test.local",
        password: "Password123!",
        role: "seeker",
      }),
    );
    expect(res.status).toBe(409);
  });

  it("rejects short passwords with 422", async () => {
    const res = await registerPost(
      jsonReq("POST", "http://test/api/register", {
        name: "Short Pwd",
        email: "short@test.local",
        password: "short",
        role: "seeker",
      }),
    );
    expect(res.status).toBe(422);
  });

  it("logs in with valid credentials (200) and rejects bad password (401)", async () => {
    const u = await createUser({
      role: "seeker",
      email: "login@test.local",
      password: "Password123!",
    });

    const bad = await loginPost(
      jsonReq("POST", "http://test/api/login", {
        email: u.email,
        password: "wrong-password",
      }),
    );
    expect(bad.status).toBe(401);

    const good = await loginPost(
      jsonReq("POST", "http://test/api/login", {
        email: u.email,
        password: "Password123!",
      }),
    );
    expect(good.status).toBe(200);
    const goodBody = await jsonBody(good);
    expect(goodBody.data.user.id).toBe(u.id);
    expect(goodBody.data.user.email).toBe(u.email);
  });

  it("returns 401 for unknown email", async () => {
    const res = await loginPost(
      jsonReq("POST", "http://test/api/login", {
        email: "nobody@test.local",
        password: "Password123!",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("GET /api/user returns the logged-in user; 401 without session", async () => {
    const u = await createUser({ role: "recruiter" });
    await loginAs(u);
    const authed = await userGet();
    expect(authed.status).toBe(200);
    const body = await jsonBody(authed);
    expect(body.data.user.id).toBe(u.id);
    expect(body.data.user.role).toBe("recruiter");

    await logout();
    const unauthed = await userGet();
    expect(unauthed.status).toBe(401);
  });
});
