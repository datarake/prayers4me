import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { digestCopy, sendDailyDigests } from "../src/notifications/digest.js";
import { client, insertRequest, makeApp, makeUser, resetDb, sql } from "./helpers.js";

const { app } = makeApp();
const call = client(app);

type LogSpy = { mock: { calls: unknown[][] } };

function pushes(spy: LogSpy) {
  return spy.mock.calls
    .filter((args) => args[0] === "[push:log]")
    .map((args) => JSON.parse(String(args[1])) as { to: string; title: string; body: string; data: unknown });
}

/** The hour it is now at UTC, so a subscriber with offset 0 is "in the evening" for the test. */
const nowHour = () => new Date().getUTCHours();

describe("the evening reminder of new requests", () => {
  let log: ReturnType<typeof vi.spyOn> & LogSpy;

  beforeEach(async () => {
    await resetDb();
    log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });
  afterEach(() => log.mockRestore());

  async function subscriber(name: string, language: string | null, offset = 0) {
    const id = await makeUser(call, name);
    await call("PUT", "/v1/session/push-token", {
      user: name,
      body: { token: `ExponentPushToken[${name}]` },
    });
    const res = await call("PUT", "/v1/session/digest", {
      user: name,
      body: { language, utcOffsetMinutes: offset },
    });
    expect(res.status).toBe(200);
    return id;
  }

  it("is saved and reported back by the session", async () => {
    await subscriber("ana", "ro");
    const res = await call("GET", "/v1/session", { user: "ana" });
    expect(res.json.digestLanguage).toBe("ro");

    await call("PUT", "/v1/session/digest", {
      user: "ana",
      body: { language: null, utcOffsetMinutes: 0 },
    });
    expect((await call("GET", "/v1/session", { user: "ana" })).json.digestLanguage).toBeNull();
  });

  it("refuses an unknown language or an impossible offset", async () => {
    await makeUser(call, "ana");
    const bad = await call("PUT", "/v1/session/digest", {
      user: "ana",
      body: { language: "de", utcOffsetMinutes: 0 },
    });
    expect(bad.status).toBe(400);
    const far = await call("PUT", "/v1/session/digest", {
      user: "ana",
      body: { language: "en", utcOffsetMinutes: 2000 },
    });
    expect(far.status).toBe(400);
  });

  it("counts new requests in the chosen language, sends once a day, and opens Pray", async () => {
    await subscriber("ana", "ro");
    const author = await makeUser(call, "ion");
    await insertRequest(author, { language: "ro" });
    await insertRequest(author, { language: "ro" });
    await insertRequest(author, { language: "en" });

    expect(await sendDailyDigests(sql, "log", { hour: nowHour() })).toBe(1);
    const sent = pushes(log);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: "ExponentPushToken[ana]",
      title: digestCopy("ro", 2).title,
      body: digestCopy("ro", 2).body,
      data: { screen: "pray" },
    });

    // The job runs every 30 minutes: the second run in the same evening sends nothing.
    expect(await sendDailyDigests(sql, "log", { hour: nowHour() })).toBe(0);
  });

  it("leaves out own, hidden, blocked, already prayed and old requests", async () => {
    const ana = await subscriber("ana", "en");
    const ion = await makeUser(call, "ion");
    const eve = await makeUser(call, "eve");

    await insertRequest(ana, {});
    await insertRequest(ion, { status: "hidden" });
    await insertRequest(ion, { createdAt: new Date(Date.now() - 30 * 3600_000).toISOString() });
    await insertRequest(eve, {});
    await sql`INSERT INTO blocks (blocker_id, blocked_id) VALUES (${ana}, ${eve})`;
    const prayed = await insertRequest(ion, {});
    await call("POST", `/v1/requests/${prayed}/pray`, { user: "ana" });

    expect(await sendDailyDigests(sql, "log", { hour: nowHour() })).toBe(0);
    expect(pushes(log).filter((p) => p.to === "ExponentPushToken[ana]")).toHaveLength(0);

    await insertRequest(ion, {});
    // Still marked as handled for today: the next one comes tomorrow evening.
    expect(await sendDailyDigests(sql, "log", { hour: nowHour() })).toBe(0);
  });

  it("waits for the person's own evening and skips people who did not ask", async () => {
    await subscriber("ana", "en", 0);
    await subscriber("bob", null);
    const ion = await makeUser(call, "ion");
    await insertRequest(ion, {});

    const otherHour = (nowHour() + 6) % 24;
    expect(await sendDailyDigests(sql, "log", { hour: otherHour })).toBe(0);
    expect(await sendDailyDigests(sql, "log", { hour: nowHour() })).toBe(1);
    expect(pushes(log).map((p) => p.to)).toEqual(["ExponentPushToken[ana]"]);
  });

  it("needs a push token: turning notifications off stops the reminder too", async () => {
    await subscriber("ana", "en");
    await call("PUT", "/v1/session/push-token", { user: "ana", body: { token: null } });
    const ion = await makeUser(call, "ion");
    await insertRequest(ion, {});
    expect(await sendDailyDigests(sql, "log", { hour: nowHour() })).toBe(0);
  });

  it("uses a single sentence for one request", () => {
    expect(digestCopy("en", 1).body).toBe("Someone new asked for prayer today.");
    expect(digestCopy("en", 3).body).toContain("3 new requests");
  });
});
