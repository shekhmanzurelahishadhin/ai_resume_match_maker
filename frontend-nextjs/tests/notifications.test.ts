// Notifications — register-device, GET list, markAsRead, preferences GET/PUT.

import { describe, it, expect } from "vitest";

import { POST as registerDevicePost } from "@/app/api/notifications/register-device/route";
import { GET as notificationsGet } from "@/app/api/notifications/route";
import { PUT as readPost } from "@/app/api/notifications/[id]/read/route";
import {
  GET as prefsGet,
  PUT as prefsPut,
} from "@/app/api/notifications/preferences/route";
import { GET as unreadCountGet } from "@/app/api/notifications/unread-count/route";

import { db } from "@/lib/db";
import { createUser, loginAs, jsonReq, jsonBody } from "./helpers";

const DEVICE_TOKEN = "fcm-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("notifications", () => {
  it("register-device creates a DeviceToken (201) and persists", async () => {
    const u = await createUser({ role: "seeker" });
    await loginAs(u);

    const res = await registerDevicePost(
      jsonReq("POST", "http://test/api/notifications/register-device", {
        deviceToken: DEVICE_TOKEN,
        deviceType: "web",
        browserInfo: "Mozilla/5.0",
      }),
    );
    expect(res.status).toBe(201);

    const row = await db.deviceToken.findUnique({
      where: { deviceToken: DEVICE_TOKEN },
    });
    expect(row?.userId).toBe(u.id);
    expect(row?.isActive).toBe(true);
  });

  it("register-device rejects too-short tokens (422)", async () => {
    const u = await createUser({ role: "seeker" });
    await loginAs(u);
    const res = await registerDevicePost(
      jsonReq("POST", "http://test/api/notifications/register-device", {
        deviceToken: "short",
        deviceType: "web",
      }),
    );
    expect(res.status).toBe(422);
  });

  it("GET /api/notifications returns the user's notifications (paginated)", async () => {
    const u = await createUser({ role: "seeker" });
    await db.notification.create({
      data: {
        userId: u.id,
        type: "system",
        title: "Welcome",
        body: "Welcome to Resume Matchmaker!",
        isRead: false,
      },
    });
    await loginAs(u);

    const res = await notificationsGet(new Request("http://test/api/notifications"));
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.data.total).toBe(1);
    expect(body.data.items[0].title).toBe("Welcome");
    expect(body.data.items[0].isRead).toBe(false);
  });

  it("unread-count reflects unread notifications", async () => {
    const u = await createUser({ role: "seeker" });
    await db.notification.createMany({
      data: [
        {
          userId: u.id,
          type: "system",
          title: "A",
          body: "a",
          isRead: false,
        },
        {
          userId: u.id,
          type: "system",
          title: "B",
          body: "b",
          isRead: true,
        },
        {
          userId: u.id,
          type: "system",
          title: "C",
          body: "c",
          isRead: false,
        },
      ],
    });
    await loginAs(u);

    const res = await unreadCountGet();
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.data.count).toBe(2);
  });

  it("PUT /{id}/read marks a notification read and updates readAt", async () => {
    const u = await createUser({ role: "seeker" });
    const n = await db.notification.create({
      data: {
        userId: u.id,
        type: "system",
        title: "X",
        body: "x",
        isRead: false,
      },
    });
    await loginAs(u);

    const res = await readPost(
      new Request(`http://test/api/notifications/${n.id}/read`, { method: "PUT" }),
      { params: Promise.resolve({ id: n.id }) },
    );
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    expect(body.data.notification.isRead).toBe(true);
    expect(body.data.notification.readAt).not.toBeNull();
  });

  it("PUT /{id}/read returns 404 for another user's notification", async () => {
    const owner = await createUser({ role: "seeker", name: "Owner" });
    const n = await db.notification.create({
      data: {
        userId: owner.id,
        type: "system",
        title: "Private",
        body: "private",
        isRead: false,
      },
    });

    const attacker = await createUser({ role: "seeker", name: "Attacker" });
    await loginAs(attacker);

    const res = await readPost(
      new Request(`http://test/api/notifications/${n.id}/read`, { method: "PUT" }),
      { params: Promise.resolve({ id: n.id }) },
    );
    expect(res.status).toBe(404);
  });

  it("preferences GET returns the spec defaults", async () => {
    const u = await createUser({ role: "seeker" });
    await loginAs(u);
    const res = await prefsGet();
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    const p = body.data.preferences;
    expect(p.emailNotifications).toBe(true);
    expect(p.pushNotifications).toBe(true);
    expect(p.jobMatches).toBe(true);
    expect(p.resumeAnalysis).toBe(true);
    expect(p.newJobs).toBe(true);
    expect(p.dailyDigest).toBe(false);
  });

  it("preferences PUT updates only the supplied fields", async () => {
    const u = await createUser({ role: "seeker" });
    await loginAs(u);

    // Lazy-create the prefs row first (the GET endpoint does this).
    await prefsGet();

    const res = await prefsPut(
      jsonReq("PUT", "http://test/api/notifications/preferences", {
        dailyDigest: true,
      }),
    );
    expect(res.status).toBe(200);
    const body = await jsonBody(res);
    const p = body.data.preferences;
    expect(p.dailyDigest).toBe(true);
    // Untouched fields keep their defaults.
    expect(p.emailNotifications).toBe(true);
    expect(p.pushNotifications).toBe(true);
  });
});
