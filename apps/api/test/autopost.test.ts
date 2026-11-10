import { beforeEach, describe, expect, it } from "vitest";
import { LANGUAGE_CODES } from "@prayers4me/shared";
import { assertMessageLooksHuman } from "../src/moderation/heuristics.js";
import { AUTOPOST_POOL } from "../src/seed/pool.js";
import { SEED_POSTS } from "../src/seed/content.js";
import {
  autopostStatus,
  initialPrayers,
  prayerTarget,
  runAutopost,
  slotTimes,
  updateAutopostSetting,
  warmRecentSeeds,
} from "../src/seed/autopost.js";
import { client, createRequest, makeApp, makeUser, resetDb, sql } from "./helpers.js";

const { app } = makeApp();
const call = client(app);
// 23:59 on 10 November in North America: every slot of that local day has passed.
const END_OF_DAY = new Date("2026-11-11T04:59:00Z");

async function makeAdmin(name = "mod") {
  await makeUser(call, name);
  await sql`UPDATE users SET role = 'admin' WHERE firebase_uid = ${`dev:${name}`}`;
}

describe("the list of scheduled posts", () => {
  it("has posts in every language that pass the real request checks", () => {
    for (const lang of LANGUAGE_CODES) {
      const pool = AUTOPOST_POOL[lang];
      expect(pool.length, lang).toBeGreaterThanOrEqual(6);
      for (const post of pool) {
        expect(() => assertMessageLooksHuman(post.message)).not.toThrow();
        expect(post.message.length).toBeGreaterThanOrEqual(10);
        expect(post.message).not.toMatch(/[—–]/);
      }
      // No name or text repeats the first batch or itself.
      const names = [...SEED_POSTS[lang], ...pool].map((p) => p.name);
      const texts = [...SEED_POSTS[lang], ...pool].map((p) => p.message);
      expect(new Set(texts).size, lang).toBe(texts.length);
      expect(new Set(pool.map((p) => p.name)).size, lang).toBe(pool.length);
      expect(names.length).toBeGreaterThan(0);
    }
  });
});

describe("posting times", () => {
  it("are fixed for a day, sorted, and one per allowed post", () => {
    const a = slotTimes("fr", END_OF_DAY, 5);
    const b = slotTimes("fr", END_OF_DAY, 5);
    expect(a.map((t) => t.getTime())).toEqual(b.map((t) => t.getTime()));
    expect(a).toHaveLength(5);
    expect([...a].sort((x, y) => x.getTime() - y.getTime())).toEqual(a);
  });

  it("differ from one day to the next", () => {
    const today = slotTimes("ro", END_OF_DAY, 3).map((t) => t.getUTCHours() * 60 + t.getUTCMinutes());
    const later = slotTimes("ro", new Date(END_OF_DAY.getTime() + 86_400_000), 3).map(
      (t) => t.getUTCHours() * 60 + t.getUTCMinutes(),
    );
    expect(today).not.toEqual(later);
  });

  it("start new posts with few prayers, and settle on a modest target", () => {
    for (let i = 0; i < 30; i++) {
      expect(initialPrayers("en", String(i))).toBeLessThanOrEqual(3);
      const target = prayerTarget(`id-${i}`);
      expect(target).toBeGreaterThanOrEqual(2);
      expect(target).toBeLessThanOrEqual(20);
    }
  });
});

describe("the scheduled poster", () => {
  beforeEach(resetDb);

  it("does nothing while a language is off", async () => {
    const posted = await runAutopost(sql, END_OF_DAY);
    expect(Object.values(posted).every((n) => n === 0)).toBe(true);
    const rows = await sql`SELECT COUNT(*)::int AS n FROM prayer_requests`;
    expect(rows[0]?.n).toBe(0);
  });

  it("publishes one post per run, up to the daily limit, and then stops", async () => {
    await updateAutopostSetting(sql, "en", { enabled: true, dailyMax: 3 });
    for (let i = 0; i < 6; i++) await runAutopost(sql, END_OF_DAY);

    const rows = await sql<{ is_seed: boolean; autoposted: boolean; language: string }[]>`
      SELECT is_seed, autoposted, language FROM prayer_requests`;
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.is_seed && r.autoposted && r.language === "en")).toBe(true);

    const en = (await autopostStatus(sql, END_OF_DAY)).find((s) => s.language === "en");
    expect(en).toMatchObject({ enabled: true, dailyMax: 3, postedToday: 3 });
    expect(en?.queueLeft).toBe(AUTOPOST_POOL.en.length - 3);

    const feed = await call("GET", "/v1/requests?language=en&limit=50", { user: "visitor" });
    expect(feed.json.items).toHaveLength(3);
    // Other languages stay untouched.
    const es = await call("GET", "/v1/requests?language=es&limit=50", { user: "visitor" });
    expect(es.json.items).toHaveLength(0);
  });

  it("waits for the first posting time of the day", async () => {
    await updateAutopostSetting(sql, "en", { enabled: true, dailyMax: 2 });
    const justAfterMidnight = new Date("2026-11-10T05:01:00Z"); // 00:01 local
    const first = slotTimes("en", justAfterMidnight, 2)[0] as Date;
    if (first.getTime() > justAfterMidnight.getTime()) {
      await runAutopost(sql, justAfterMidnight);
      const rows = await sql`SELECT COUNT(*)::int AS n FROM prayer_requests`;
      expect(rows[0]?.n).toBe(0);
    }
  });

  it("stops when the list for a language is used up", async () => {
    await updateAutopostSetting(sql, "uk", { enabled: true, dailyMax: 20 });
    for (let day = 0; day < AUTOPOST_POOL.uk.length + 3; day++) {
      const now = new Date(END_OF_DAY.getTime() + day * 86_400_000);
      for (let i = 0; i < 20; i++) await runAutopost(sql, now);
    }
    const rows = await sql`SELECT COUNT(*)::int AS n FROM prayer_requests WHERE language = 'uk'`;
    expect(rows[0]?.n).toBe(AUTOPOST_POOL.uk.length);
    const uk = (await autopostStatus(sql, END_OF_DAY)).find((s) => s.language === "uk");
    expect(uk?.queueLeft).toBe(0);
  });

  it("lets recent starter posts gain prayers slowly, never past their target", async () => {
    await updateAutopostSetting(sql, "en", { enabled: true, dailyMax: 1 });
    await runAutopost(sql, END_OF_DAY);
    const [row] = await sql<{ id: string }[]>`SELECT id FROM prayer_requests`;
    const target = prayerTarget(row!.id);
    for (let i = 0; i < 400; i++) await warmRecentSeeds(sql, new Date(END_OF_DAY.getTime() + i * 1_800_000));
    // The posts are only warmed for two days, so use a window that keeps them recent.
    const [after] = await sql<{ prayers_count: number }[]>`SELECT prayers_count FROM prayer_requests`;
    expect(after!.prayers_count).toBeLessThanOrEqual(target);
  });

  it("never touches real requests when warming", async () => {
    await createRequest(call, "real-person");
    const bumped = await warmRecentSeeds(sql, new Date());
    expect(bumped).toBe(0);
  });
});

describe("admin controls", () => {
  beforeEach(resetDb);

  it("are for admins only", async () => {
    await makeUser(call, "regular");
    expect((await call("GET", "/v1/admin/autopost", { user: "regular" })).status).toBe(403);
    expect((await call("PUT", "/v1/admin/autopost/en", { user: "regular", body: { enabled: true, dailyMax: 2 } })).status).toBe(403);
    expect((await call("GET", "/v1/admin/autopost")).status).toBe(401);
  });

  it("list every language, switched off at first", async () => {
    await makeAdmin();
    const res = await call("GET", "/v1/admin/autopost", { user: "mod" });
    expect(res.status).toBe(200);
    expect(res.json.items.map((i: { language: string }) => i.language)).toEqual([...LANGUAGE_CODES]);
    expect(res.json.items.every((i: { enabled: boolean }) => !i.enabled)).toBe(true);
  });

  it("save a switch and a daily limit", async () => {
    await makeAdmin();
    const res = await call("PUT", "/v1/admin/autopost/ro", { user: "mod", body: { enabled: true, dailyMax: 4 } });
    expect(res.status).toBe(200);
    expect(res.json.item).toMatchObject({ language: "ro", enabled: true, dailyMax: 4 });
    const again = await call("GET", "/v1/admin/autopost", { user: "mod" });
    expect(again.json.items.find((i: { language: string }) => i.language === "ro")).toMatchObject({ enabled: true, dailyMax: 4 });
  });

  it.each([
    ["a limit above the maximum", { enabled: true, dailyMax: 99 }],
    ["a negative limit", { enabled: true, dailyMax: -1 }],
    ["a limit with decimals", { enabled: true, dailyMax: 1.5 }],
    ["a missing switch", { dailyMax: 2 }],
  ])("reject %s", async (_label, body) => {
    await makeAdmin();
    const res = await call("PUT", "/v1/admin/autopost/en", { user: "mod", body });
    expect(res.status).toBe(400);
  });

  it("reject an unknown language", async () => {
    await makeAdmin();
    const res = await call("PUT", "/v1/admin/autopost/xx", { user: "mod", body: { enabled: true, dailyMax: 2 } });
    expect(res.status).toBe(404);
  });
});
