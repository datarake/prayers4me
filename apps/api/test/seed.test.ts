import { beforeEach, describe, expect, it } from "vitest";
import { LANGUAGE_CODES } from "@prayers4me/shared";
import { assertMessageLooksHuman } from "../src/moderation/heuristics.js";
import { SEED_POSTS } from "../src/seed/content.js";
import {
  removeStarterContent,
  seedPostTime,
  seedPrayerCount,
  seedStarterContent,
} from "../src/seed/seed.js";
import { client, createRequest, makeApp, makeUser, resetDb, sql } from "./helpers.js";

const { app } = makeApp();
const call = client(app);
const NOW = new Date("2026-11-10T12:00:00Z");

describe("seed content", () => {
  it("has a set of posts in every language, with varied lengths", () => {
    for (const lang of LANGUAGE_CODES) {
      const posts = SEED_POSTS[lang];
      expect(posts.length, lang).toBeGreaterThanOrEqual(8);
      const lengths = posts.map((p) => p.message.length);
      expect(Math.max(...lengths) - Math.min(...lengths), lang).toBeGreaterThan(80);
      expect(new Set(posts.map((p) => p.name)).size, lang).toBe(posts.length);
    }
  });

  it("passes the same checks as a real request", () => {
    for (const lang of LANGUAGE_CODES) {
      for (const post of SEED_POSTS[lang]) {
        expect(() => assertMessageLooksHuman(post.message)).not.toThrow();
        expect(post.message.trim().length).toBeGreaterThanOrEqual(10);
        expect(post.message).not.toMatch(/[—–]/);
        expect(post.name.length).toBeLessThanOrEqual(80);
      }
    }
  });

  it("writes Ukrainian and Russian in Cyrillic and the others in Latin", () => {
    for (const lang of ["uk", "ru"] as const) {
      for (const p of SEED_POSTS[lang]) expect(p.message + p.name).toMatch(/[а-яіїєґё]/i);
    }
    for (const lang of ["en", "es", "fr", "ro"] as const) {
      for (const p of SEED_POSTS[lang]) expect(p.message + p.name).not.toMatch(/[а-яё]/i);
    }
  });

  it("gives every post a believable time and count", () => {
    for (const lang of LANGUAGE_CODES) {
      const times = SEED_POSTS[lang].map((_, i) => seedPostTime(lang, i, NOW));
      for (const t of times) {
        expect(t.getTime()).toBeLessThanOrEqual(NOW.getTime() - 25 * 60_000);
        expect(NOW.getTime() - t.getTime()).toBeLessThan(11 * 86_400_000);
      }
      expect(new Set(times.map((t) => t.getTime())).size).toBe(times.length);
      const counts = times.map((t, i) =>
        seedPrayerCount(lang, i, (NOW.getTime() - t.getTime()) / 86_400_000),
      );
      for (const n of counts) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(32);
      }
    }
    // Same input, same result.
    expect(seedPostTime("ro", 3, NOW).getTime()).toBe(seedPostTime("ro", 3, NOW).getTime());
  });
});

describe("seeding the database", () => {
  beforeEach(resetDb);

  it("adds the posts, marked as seed, and shows them in each language's feed", async () => {
    const result = await seedStarterContent(sql, NOW);
    const total = LANGUAGE_CODES.reduce((n, l) => n + SEED_POSTS[l].length, 0);
    expect(result).toEqual({ created: total, skipped: 0 });

    const rows = await sql`SELECT COUNT(*)::int AS n FROM prayer_requests WHERE is_seed`;
    expect(rows[0]?.n).toBe(total);

    for (const lang of LANGUAGE_CODES) {
      const feed = await call("GET", `/v1/requests?language=${lang}&limit=50`, { user: "visitor" });
      expect(feed.status).toBe(200);
      expect(feed.json.items).toHaveLength(SEED_POSTS[lang].length);
      expect(feed.json.items.every((r: { isMine: boolean }) => !r.isMine)).toBe(true);
    }
  });

  it("is safe to run twice", async () => {
    await seedStarterContent(sql, NOW);
    const again = await seedStarterContent(sql, NOW);
    expect(again.created).toBe(0);
    const rows = await sql`SELECT COUNT(*)::int AS n FROM prayer_requests`;
    expect(rows[0]?.n).toBe(LANGUAGE_CODES.reduce((n, l) => n + SEED_POSTS[l].length, 0));
  });

  it("lets a real person pray for a seed post, and counts it", async () => {
    await seedStarterContent(sql, NOW);
    const feed = await call("GET", "/v1/requests?language=en&limit=50", { user: "visitor" });
    const target = feed.json.items[0];
    const res = await call("POST", `/v1/requests/${target.id}/pray`, { user: "visitor" });
    expect(res.status).toBeLessThan(300);
    expect(res.json.prayersCount).toBe(target.prayersCount + 1);
  });

  it("keeps seed posts out of the admin metrics", async () => {
    await seedStarterContent(sql, NOW);
    await makeUser(call, "mod");
    await sql`UPDATE users SET role = 'admin' WHERE firebase_uid = 'dev:mod'`;
    await createRequest(call, "real-person");
    const res = await call("GET", "/v1/admin/metrics?days=30", { user: "mod" });
    expect(res.status).toBe(200);
    expect(res.json.requestsCreated).toBe(1);
    expect(res.json.peopleWhoAsked).toBe(1);
  });

  it("removes only the seed content", async () => {
    await seedStarterContent(sql, NOW);
    await createRequest(call, "real-person");
    const removed = await removeStarterContent(sql);
    expect(removed.requests).toBe(LANGUAGE_CODES.reduce((n, l) => n + SEED_POSTS[l].length, 0));
    const rows = await sql`SELECT COUNT(*)::int AS n FROM prayer_requests`;
    expect(rows[0]?.n).toBe(1);
  });
});
