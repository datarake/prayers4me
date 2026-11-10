import { LANGUAGE_CODES, type LanguageCode } from "@prayers4me/shared";
import type { Sql } from "../db/client.js";
import { SEED_POSTS } from "./content.js";

/** Hours from UTC for the main region of each language, used to make posting times look local. */
const LOCAL_UTC_OFFSET_HOURS: Record<LanguageCode, number> = {
  en: -5,
  es: -5,
  fr: 1,
  ro: 2,
  uk: 2,
  ru: 3,
};

/** Local hours people tend to post: early morning, lunch, and a long evening. Weights are relative. */
const HOUR_WEIGHTS: Array<[hour: number, weight: number]> = [
  [6, 2], [7, 5], [8, 6], [9, 4], [10, 3], [11, 3], [12, 5], [13, 5], [14, 3], [15, 3],
  [16, 3], [17, 4], [18, 5], [19, 7], [20, 9], [21, 10], [22, 8], [23, 5], [0, 2], [1, 1],
];

const MAX_AGE_DAYS = 9;
const MIN_AGE_MINUTES = 25;

/** Small deterministic generator, so the same post always gets the same shape. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickHour(rand: () => number): number {
  const total = HOUR_WEIGHTS.reduce((sum, [, w]) => sum + w, 0);
  let roll = rand() * total;
  for (const [hour, weight] of HOUR_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return hour;
  }
  return 21;
}

/** When a seed post was "written": a past day, at a plausible local hour, never in the last 25 minutes. */
export function seedPostTime(language: LanguageCode, index: number, now: Date): Date {
  const rand = mulberry32(hashString(`time:${language}:${index}`));
  // Spread the posts across the window, one slot per post, with some jitter inside the slot.
  const slot = (index + rand()) / SEED_POSTS[language].length;
  const dayOffset = Math.floor(slot * MAX_AGE_DAYS);
  const hour = pickHour(rand);
  const minute = Math.floor(rand() * 60);
  const second = Math.floor(rand() * 60);

  const local = new Date(now.getTime() + LOCAL_UTC_OFFSET_HOURS[language] * 3_600_000);
  const at = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - dayOffset,
    hour,
    minute,
    second,
  );
  let time = at - LOCAL_UTC_OFFSET_HOURS[language] * 3_600_000;
  // Late-night hours belong to the evening before, so they land after the day's other posts.
  if (hour < 6) time += 24 * 3_600_000;
  const latest = now.getTime() - MIN_AGE_MINUTES * 60_000;
  while (time > latest) time -= 24 * 3_600_000;
  return new Date(time);
}

/** How many prayers a seed post already has: older posts have more, some have none. */
export function seedPrayerCount(language: LanguageCode, index: number, ageDays: number): number {
  const rand = mulberry32(hashString(`count:${language}:${index}`));
  if (rand() < 0.15) return 0;
  const reach = 2 + ageDays * (1.2 + rand() * 2.2);
  return Math.max(1, Math.min(32, Math.round(reach * (0.4 + rand() * 0.9))));
}

export type SeedResult = { created: number; skipped: number };

/**
 * Adds the starter requests. Safe to run again: a post that already exists is left alone.
 * Each post has its own author account, so blocking one does not hide the others.
 */
export async function seedStarterContent(sql: Sql, now = new Date()): Promise<SeedResult> {
  const result: SeedResult = { created: 0, skipped: 0 };

  for (const language of LANGUAGE_CODES) {
    const posts = SEED_POSTS[language];
    for (let index = 0; index < posts.length; index++) {
      const post = posts[index];
      if (!post) continue;
      const createdAt = seedPostTime(language, index, now);
      const ageDays = (now.getTime() - createdAt.getTime()) / 86_400_000;
      const prayers = seedPrayerCount(language, index, ageDays);

      await sql.begin(async (tx) => {
        const users = await tx<{ id: string }[]>`
          INSERT INTO users (firebase_uid, language, display_name, is_seed, created_at, updated_at)
          VALUES (${`seed:${language}:${index}`}, ${language}, ${post.name}, true,
                  ${createdAt.toISOString()}, ${createdAt.toISOString()})
          ON CONFLICT (firebase_uid) DO NOTHING
          RETURNING id
        `;
        const author = users[0];
        if (!author) {
          result.skipped++;
          return;
        }
        await tx`
          INSERT INTO prayer_requests
            (author_id, language, display_name, message, prayers_count, status, is_seed,
             created_at, updated_at)
          VALUES (${author.id}, ${language}, ${post.name}, ${post.message}, ${prayers}, 'active',
                  true, ${createdAt.toISOString()}, ${createdAt.toISOString()})
        `;
        result.created++;
      });
    }
  }
  return result;
}

/** Removes every seeded request and its author account. Real content is never touched. */
export async function removeStarterContent(sql: Sql): Promise<{ requests: number; users: number }> {
  return sql.begin(async (tx) => {
    const requests = await tx`DELETE FROM prayer_requests WHERE is_seed RETURNING id`;
    const users = await tx`DELETE FROM users WHERE is_seed RETURNING id`;
    return { requests: requests.length, users: users.length };
  });
}
