import type { LanguageCode } from "@prayers4me/shared";
import type { Sql } from "../db/client.js";
import { forgetToken, send, type PushMode } from "./push.js";

/** The local hour the evening reminder goes out (19:00 to 19:59 on the person's phone). */
export const DIGEST_HOUR = 19;
/** At most one reminder a day, even if the scheduled job runs twice inside the hour. */
const MIN_GAP_HOURS = 20;

type Copy = { title: string; one: string; many: (n: number) => string };

/**
 * Like the "someone prayed" notification, it never shows a name or the text of a request,
 * so a lock screen reveals nothing private. Counts avoid plural agreement for uk/ru.
 */
const COPY: Record<LanguageCode, Copy> = {
  en: {
    title: "New prayer requests",
    one: "Someone new asked for prayer today.",
    many: (n) => `${n} new requests are waiting for a prayer today.`,
  },
  es: {
    title: "Nuevas peticiones de oración",
    one: "Alguien nuevo pidió oración hoy.",
    many: (n) => `${n} peticiones nuevas esperan una oración hoy.`,
  },
  fr: {
    title: "Nouvelles demandes de prière",
    one: "Quelqu’un de nouveau a demandé une prière aujourd’hui.",
    many: (n) => `${n} nouvelles demandes attendent une prière aujourd’hui.`,
  },
  ro: {
    title: "Cereri noi de rugăciune",
    one: "Cineva nou a cerut rugăciune astăzi.",
    many: (n) => `${n} cereri noi așteaptă o rugăciune astăzi.`,
  },
  uk: {
    title: "Нові прохання про молитву",
    one: "Сьогодні хтось новий попросив про молитву.",
    many: (n) => `Нових прохань сьогодні: ${n}`,
  },
  ru: {
    title: "Новые просьбы о молитве",
    one: "Сегодня кто-то новый попросил о молитве.",
    many: (n) => `Новых просьб сегодня: ${n}`,
  },
};

export function digestCopy(language: LanguageCode, count: number) {
  const c = COPY[language] ?? COPY.en;
  return { title: c.title, body: count <= 1 ? c.one : c.many(count) };
}

/**
 * Sends the evening reminder to everyone who asked for it and whose local time is now inside
 * DIGEST_HOUR. It counts requests from the last day that this person could pray for: visible in
 * the list, not their own, not from someone they blocked, not already prayed for. Nothing new,
 * nothing sent. Run by the scheduled maintenance job; returns how many reminders went out.
 */
export async function sendDailyDigests(
  sql: Sql,
  mode: PushMode,
  options: { hour?: number; limit?: number } = {},
): Promise<number> {
  const hour = options.hour ?? DIGEST_HOUR;
  const limit = options.limit ?? 1000;

  const due = await sql<
    { id: string; push_token: string; language: LanguageCode; fresh: number }[]
  >`
    WITH due AS (
      SELECT u.id, u.push_token, u.digest_language, u.last_digest_at
      FROM users u
      WHERE u.digest_language IS NOT NULL
        AND u.push_token IS NOT NULL
        AND EXTRACT(HOUR FROM now() AT TIME ZONE 'UTC'
              + make_interval(mins => u.digest_utc_offset)) = ${hour}
        AND (u.last_digest_at IS NULL
          OR u.last_digest_at < now() - make_interval(hours => ${MIN_GAP_HOURS}))
      LIMIT ${limit}
      FOR UPDATE OF u SKIP LOCKED
    ),
    claimed AS (
      UPDATE users u SET last_digest_at = now()
      FROM due
      WHERE u.id = due.id
      RETURNING due.id, due.push_token, due.digest_language, due.last_digest_at AS previous
    )
    SELECT
      c.id,
      c.push_token,
      c.digest_language AS language,
      (
        SELECT COUNT(*)::int FROM prayer_requests r
        WHERE r.language = c.digest_language
          AND r.status = 'active'
          AND r.author_id <> c.id
          AND r.created_at > GREATEST(
            COALESCE(c.previous, now() - interval '24 hours'),
            now() - interval '24 hours'
          )
          AND NOT EXISTS (
            SELECT 1 FROM blocks b WHERE b.blocker_id = c.id AND b.blocked_id = r.author_id
          )
          AND NOT EXISTS (
            SELECT 1 FROM prayers p WHERE p.request_id = r.id AND p.user_id = c.id
          )
      ) AS fresh
    FROM claimed c
  `;

  let sent = 0;
  for (const row of due) {
    if (row.fresh === 0) continue;
    try {
      const { title, body } = digestCopy(row.language, row.fresh);
      const result = await send(mode, row.push_token, title, body, { screen: "pray" });
      if (result.kind === "sent") {
        sent += 1;
        if (result.ticketId) {
          await sql`
            INSERT INTO push_tickets (ticket_id, token) VALUES (${result.ticketId}, ${row.push_token})
            ON CONFLICT DO NOTHING
          `;
        }
      } else if (result.kind === "invalid_token") {
        await forgetToken(sql, row.push_token);
      }
      // A failed send is not retried: tomorrow evening brings the next one.
    } catch (err) {
      console.error("daily digest failed", err);
    }
  }
  return sent;
}
