import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkPushReceipts,
  flushHeldNotifications,
  notifyPrayerReceived,
  pushCopy,
} from "../src/notifications/push.js";
import { client, createRequest, makeApp, makeUser, resetDb, sql } from "./helpers.js";

const { app, env } = makeApp();
const call = client(app);

type LogSpy = { mock: { calls: unknown[][] } };

/** The notifications that PUSH_MODE=log printed, as objects. */
function pushes(spy: LogSpy) {
  return spy.mock.calls
    .filter((args) => args[0] === "[push:log]")
    .map((args) => JSON.parse(String(args[1])) as { to: string; title: string; body: string; data: unknown });
}

describe("notifying an author", () => {
  let log: ReturnType<typeof vi.spyOn> & LogSpy;

  beforeEach(async () => {
    await resetDb();
    log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });
  afterEach(() => log.mockRestore());

  async function authorWithToken(language = "en") {
    const created = await createRequest(call, "ana", { language });
    const res = await call("PUT", "/v1/session/push-token", {
      user: "ana",
      body: { token: "ExponentPushToken[test-token]" },
    });
    expect(res.json.registered).toBe(true);
    return created.json.id as string;
  }

  it("sends the first prayer at once, in the author's language, without saying who", async () => {
    const id = await authorWithToken("ru");
    await notifyPrayerReceived(sql, env, id);

    const sent = pushes(log);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: "ExponentPushToken[test-token]",
      title: "Кто-то помолился за тебя.",
      data: { screen: "for-me" },
    });
    expect(JSON.stringify(sent[0])).not.toContain("Please pray");
  });

  it("holds later prayers back inside the window and counts them", async () => {
    const id = await authorWithToken();
    await notifyPrayerReceived(sql, env, id);
    await notifyPrayerReceived(sql, env, id);
    await notifyPrayerReceived(sql, env, id);

    expect(pushes(log)).toHaveLength(1);
    const [row] = await sql`SELECT unnotified_prayers FROM prayer_requests WHERE id = ${id}`;
    expect(row!.unnotified_prayers).toBe(2);
  });

  it("delivers the held prayers together once the window has passed", async () => {
    const id = await authorWithToken();
    await notifyPrayerReceived(sql, env, id);
    await notifyPrayerReceived(sql, env, id);
    await sql`UPDATE prayer_requests SET last_notified_at = now() - interval '4 hours' WHERE id = ${id}`;
    await notifyPrayerReceived(sql, env, id);

    const sent = pushes(log);
    expect(sent).toHaveLength(2);
    expect(sent[1]!.body).toBe("2 prayers were said for your request.");
    const [row] = await sql`SELECT unnotified_prayers FROM prayer_requests WHERE id = ${id}`;
    expect(row!.unnotified_prayers).toBe(0);
  });

  it("sends nothing to an author who has not turned notifications on", async () => {
    const created = await createRequest(call, "ana");
    await notifyPrayerReceived(sql, env, created.json.id);
    expect(pushes(log)).toHaveLength(0);
  });

  it("stops after the author turns notifications off", async () => {
    const id = await authorWithToken();
    await call("PUT", "/v1/session/push-token", { user: "ana", body: { token: null } });
    await notifyPrayerReceived(sql, env, id);
    expect(pushes(log)).toHaveLength(0);
  });

  it("sends on Android's channel with high priority", async () => {
    const id = await authorWithToken();
    await notifyPrayerReceived(sql, env, id);
    expect(pushes(log)[0]).toMatchObject({ channelId: "default", priority: "high" });
  });

  it("delivers held prayers from the scheduled job even when no new prayer arrives", async () => {
    const id = await authorWithToken();
    await notifyPrayerReceived(sql, env, id);
    await notifyPrayerReceived(sql, env, id);
    await notifyPrayerReceived(sql, env, id);

    // Still inside the window: nothing to send yet.
    expect(await flushHeldNotifications(sql, "log")).toBe(0);

    await sql`UPDATE prayer_requests SET last_notified_at = now() - interval '4 hours' WHERE id = ${id}`;
    expect(await flushHeldNotifications(sql, "log")).toBe(1);

    const sent = pushes(log);
    expect(sent).toHaveLength(2);
    expect(sent[1]!.body).toBe("2 prayers were said for your request.");
    // Nothing left: a second run sends nothing.
    expect(await flushHeldNotifications(sql, "log")).toBe(0);
  });

  it("sends one notification per person for several requests", async () => {
    const first = await authorWithToken();
    const second = (await createRequest(call, "ana", { message: "Another request for my family, please pray for us." })).json.id as string;
    await sql`
      UPDATE prayer_requests SET unnotified_prayers = 2, last_notified_at = now() - interval '5 hours'
      WHERE id IN (${first}, ${second})
    `;
    expect(await flushHeldNotifications(sql, "log")).toBe(1);
    expect(pushes(log)).toHaveLength(1);
    expect(pushes(log)[0]!.body).toBe("4 prayers were said for your request.");
  });

  it("leaves held prayers alone for a removed request", async () => {
    const id = await authorWithToken();
    await sql`
      UPDATE prayer_requests SET unnotified_prayers = 2, last_notified_at = NULL, status = 'removed'
      WHERE id = ${id}
    `;
    expect(await flushHeldNotifications(sql, "log")).toBe(0);
  });

  it("puts the prayers back when sending fails, so the next run retries", async () => {
    const id = await authorWithToken();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    try {
      await notifyPrayerReceived(sql, { PUSH_MODE: "expo" }, id);
    } finally {
      fetchSpy.mockRestore();
    }
    const [row] = await sql`SELECT unnotified_prayers, last_notified_at FROM prayer_requests WHERE id = ${id}`;
    expect(row!.unnotified_prayers).toBe(1);
    expect(row!.last_notified_at).toBeNull();

    expect(await flushHeldNotifications(sql, "log")).toBe(1);
    expect(pushes(log)).toHaveLength(1);
  });

  it("forgets the token of an uninstalled app found in a receipt", async () => {
    const id = await authorWithToken();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ data: { status: "ok", id: "ticket-1" } }))
      .mockResolvedValueOnce(
        Response.json({ data: { "ticket-1": { status: "error", details: { error: "DeviceNotRegistered" } } } }),
      );
    try {
      await notifyPrayerReceived(sql, { PUSH_MODE: "expo" }, id);
      await sql`UPDATE push_tickets SET created_at = now() - interval '1 hour'`;
      expect(await checkPushReceipts(sql, "expo")).toBe(1);
    } finally {
      fetchSpy.mockRestore();
    }
    const [user] = await sql`SELECT push_token FROM users WHERE push_token IS NOT NULL`;
    expect(user).toBeUndefined();
    const tickets = await sql`SELECT 1 FROM push_tickets`;
    expect(tickets).toHaveLength(0);
  });

  it("never lets a failure break the prayer", async () => {
    await expect(notifyPrayerReceived(sql, env, "00000000-0000-0000-0000-000000000000")).resolves.toBeUndefined();
  });
});

describe("push token registration", () => {
  beforeEach(resetDb);

  it("moves a phone's token to the account that registers it last", async () => {
    await makeUser(call, "old");
    await makeUser(call, "new");
    const token = "ExponentPushToken[same-phone]";
    await call("PUT", "/v1/session/push-token", { user: "old", body: { token } });
    await call("PUT", "/v1/session/push-token", { user: "new", body: { token } });
    const rows = await sql`SELECT id FROM users WHERE push_token = ${token}`;
    expect(rows).toHaveLength(1);
  });

  it.each(["not-a-token", "ExponentPushToken[]", "x".repeat(300)])("rejects %s", async (token) => {
    await makeUser(call, "ana");
    const res = await call("PUT", "/v1/session/push-token", { user: "ana", body: { token } });
    expect(res.status).toBe(400);
  });
});

describe("notification wording", () => {
  it("uses the singular for one prayer and a count for more", () => {
    expect(pushCopy("en", 1).body).toBe("A prayer was said for your request.");
    expect(pushCopy("en", 4).body).toBe("4 prayers were said for your request.");
  });

  it("avoids plural agreement in Ukrainian and Russian", () => {
    expect(pushCopy("uk", 21).body).toBe("Нових молитов: 21");
    expect(pushCopy("ru", 22).body).toBe("Новых молитв: 22");
  });

  it("has a title and both forms for every language", () => {
    for (const lang of ["en", "es", "fr", "ro", "uk", "ru"] as const) {
      const one = pushCopy(lang, 1);
      const many = pushCopy(lang, 3);
      expect(one.title.length).toBeGreaterThan(5);
      expect(one.body.length).toBeGreaterThan(5);
      expect(many.body).not.toBe(one.body);
      expect(`${one.title}${one.body}${many.body}`).not.toMatch(/[—–]/);
    }
  });
});
