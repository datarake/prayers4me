import { LANGUAGE_CODES, type LanguageCode } from "@prayers4me/shared";
import type { Sql } from "../db/client.js";
import { AUTOPOST_POOL } from "./pool.js";
import { LOCAL_UTC_OFFSET_HOURS, hashString, mulberry32, pickHour } from "./seed.js";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export const MAX_DAILY_POSTS = 20;

/** The local calendar day (in the language's main region) that contains `now`. */
function localDay(language: LanguageCode, now: Date) {
  const local = new Date(now.getTime() + LOCAL_UTC_OFFSET_HOURS[language] * HOUR_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const startUtc = Date.UTC(y, m, d) - LOCAL_UTC_OFFSET_HOURS[language] * HOUR_MS;
  return { key: `${y}-${m + 1}-${d}`, y, m, d, start: new Date(startUtc) };
}

/**
 * The moments today when this language should get a new post. They are fixed for the day (the
 * same inputs always give the same times), fall at plausible local hours, and differ from day
 * to day, so the feed gets posts at an irregular but believable rhythm.
 */
export function slotTimes(language: LanguageCode, now: Date, dailyMax: number): Date[] {
  const day = localDay(language, now);
  const times: number[] = [];
  for (let k = 0; k < dailyMax; k++) {
    const rand = mulberry32(hashString(`slot:${language}:${day.key}:${k}`));
    const hour = pickHour(rand);
    const at = Date.UTC(day.y, day.m, day.d, hour, Math.floor(rand() * 60), Math.floor(rand() * 60));
    times.push(at - LOCAL_UTC_OFFSET_HOURS[language] * HOUR_MS);
  }
  return times.sort((a, b) => a - b).map((t) => new Date(t));
}

/** Prayers a new post starts with: none about half the time, otherwise one to three. */
export function initialPrayers(language: LanguageCode, key: string): number {
  const rand = mulberry32(hashString(`start:${language}:${key}`));
  if (rand() < 0.5) return 0;
  return 1 + Math.floor(rand() * 3);
}

/** Where a post's prayer count will settle while it is new. Fixed per post. */
export function prayerTarget(requestId: string): number {
  return 2 + (hashString(`target:${requestId}`) % 19);
}

export type AutopostSetting = { language: LanguageCode; enabled: boolean; dailyMax: number };

export type AutopostStatus = AutopostSetting & {
  postedToday: number;
  queueLeft: number;
  lastPostedAt: string | null;
};

export async function autopostStatus(sql: Sql, now = new Date()): Promise<AutopostStatus[]> {
  const settings = await sql<{ language: LanguageCode; enabled: boolean; daily_max: number }[]>`
    SELECT language, enabled, daily_max FROM autopost_settings
  `;
  const byLang = new Map(settings.map((s) => [s.language, s]));
  const out: AutopostStatus[] = [];
  for (const language of LANGUAGE_CODES) {
    const row = byLang.get(language);
    const since = localDay(language, now).start.toISOString();
    const [counts] = await sql<{ today: number; used: number; last: Date | null }[]>`
      SELECT
        COUNT(*) FILTER (WHERE r.created_at >= ${since})::int AS today,
        COUNT(*)::int AS used,
        MAX(r.created_at) AS last
      FROM prayer_requests r
      WHERE r.language = ${language} AND r.autoposted
    `;
    out.push({
      language,
      enabled: row?.enabled ?? false,
      dailyMax: row?.daily_max ?? 2,
      postedToday: counts?.today ?? 0,
      queueLeft: Math.max(0, AUTOPOST_POOL[language].length - (counts?.used ?? 0)),
      lastPostedAt: counts?.last ? counts.last.toISOString() : null,
    });
  }
  return out;
}

export async function updateAutopostSetting(
  sql: Sql,
  language: LanguageCode,
  change: { enabled: boolean; dailyMax: number },
): Promise<void> {
  await sql`
    INSERT INTO autopost_settings (language, enabled, daily_max)
    VALUES (${language}, ${change.enabled}, ${change.dailyMax})
    ON CONFLICT (language) DO UPDATE
      SET enabled = EXCLUDED.enabled, daily_max = EXCLUDED.daily_max, updated_at = now()
  `;
}

/**
 * Publishes at most one post per language per run: when the language is on, a slot for today
 * has passed, and today's limit is not yet reached. Run it every half hour.
 */
export async function runAutopost(sql: Sql, now = new Date()): Promise<Record<string, number>> {
  const posted: Record<string, number> = {};
  const status = await autopostStatus(sql, now);

  for (const s of status) {
    posted[s.language] = 0;
    if (!s.enabled || s.dailyMax <= 0 || s.queueLeft <= 0) continue;
    const due = slotTimes(s.language, now, s.dailyMax).filter((t) => t <= now).length;
    if (due <= s.postedToday) continue;

    const pool = AUTOPOST_POOL[s.language];
    const usedRows = await sql<{ firebase_uid: string }[]>`
      SELECT firebase_uid FROM users WHERE is_seed AND firebase_uid LIKE ${`seed:${s.language}:p%`}
    `;
    const used = new Set(usedRows.map((r) => r.firebase_uid));
    const index = pool.findIndex((_, i) => !used.has(`seed:${s.language}:p${i}`));
    const post = pool[index];
    if (index < 0 || !post) continue;

    const created = await sql.begin(async (tx) => {
      const users = await tx<{ id: string }[]>`
        INSERT INTO users (firebase_uid, language, display_name, is_seed)
        VALUES (${`seed:${s.language}:p${index}`}, ${s.language}, ${post.name}, true)
        ON CONFLICT (firebase_uid) DO NOTHING
        RETURNING id
      `;
      const author = users[0];
      if (!author) return false;
      await tx`
        INSERT INTO prayer_requests
          (author_id, language, display_name, message, prayers_count, status, is_seed, autoposted,
           created_at, updated_at)
        VALUES (${author.id}, ${s.language}, ${post.name}, ${post.message},
                ${initialPrayers(s.language, String(index))}, 'active', true, true, ${now.toISOString()}, ${now.toISOString()})
      `;
      return true;
    });
    if (created) posted[s.language] = 1;
  }
  return posted;
}

/**
 * Lets the prayer count of a recent starter post creep up toward its target over a day or two,
 * a little each run, instead of arriving all at once. Real prayers still add to it.
 */
export async function warmRecentSeeds(sql: Sql, now = new Date()): Promise<number> {
  const rows = await sql<{ id: string; prayers_count: number }[]>`
    SELECT id, prayers_count FROM prayer_requests
    WHERE is_seed AND status = 'active' AND created_at >= ${new Date(now.getTime() - 2 * DAY_MS).toISOString()}
  `;
  const tick = Math.floor(now.getTime() / (30 * 60_000));
  let bumped = 0;
  for (const row of rows) {
    if (row.prayers_count >= prayerTarget(row.id)) continue;
    if (mulberry32(hashString(`warm:${row.id}:${tick}`))() > 0.22) continue;
    await sql`UPDATE prayer_requests SET prayers_count = prayers_count + 1 WHERE id = ${row.id}`;
    bumped++;
  }
  return bumped;
}
