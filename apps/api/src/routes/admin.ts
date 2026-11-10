import { Hono, type Context } from "hono";
import type { Sql } from "../db/client.js";
import { z } from "zod";
import type { AppVariables } from "../auth.js";
import { requireAdmin } from "../auth.js";
import { ApiError } from "../errors.js";
import { isLanguageCode } from "@prayers4me/shared";
import { MAX_DAILY_POSTS, autopostStatus, updateAutopostSetting } from "../seed/autopost.js";
import { readJson, requireUuid } from "../validation.js";

export const adminRoutes = new Hono<{ Variables: AppVariables }>();

adminRoutes.use("*", requireAdmin());

/**
 * Is the product working? Everything is computed from the database, so nobody is tracked
 * in the app and no request text is touched. The headline number is the share of requests,
 * old enough to have had a fair chance (24 hours or more), that got a first prayer within a day.
 */
adminRoutes.get("/metrics", async (c) => {
  const sql = c.get("sql");
  const days = z.coerce
    .number()
    .int()
    .min(1)
    .max(90)
    .default(7)
    .parse(c.req.query("days") ?? 7);

  const [m] = await sql<
    {
      matured_requests: number;
      first_prayer_within_24h: number;
      median_minutes_to_first_prayer: number | null;
      requests_created: number;
      prayers: number;
      people_who_asked: number;
      people_who_prayed: number;
      askers_who_also_prayed: number;
      reports: number;
      requests_hidden: number;
    }[]
  >`
    WITH win AS (SELECT now() - make_interval(days => ${days}) AS since),
    matured AS (
      SELECT r.id, r.created_at
      FROM prayer_requests r, win
      WHERE r.created_at >= win.since AND r.created_at <= now() - interval '24 hours'
        AND NOT r.is_seed
    ),
    first_prayer AS (
      SELECT p.request_id, MIN(p.created_at) AS at
      FROM prayers p JOIN matured m ON m.id = p.request_id
      GROUP BY p.request_id
    ),
    askers AS (
      SELECT DISTINCT author_id AS id FROM prayer_requests r, win
      WHERE r.created_at >= win.since AND NOT r.is_seed
    ),
    prayers_in_window AS (
      SELECT user_id FROM prayers p, win WHERE p.created_at >= win.since
    )
    SELECT
      (SELECT COUNT(*) FROM matured)::int AS matured_requests,
      (SELECT COUNT(*) FROM matured m JOIN first_prayer f ON f.request_id = m.id
         WHERE f.at - m.created_at <= interval '24 hours')::int AS first_prayer_within_24h,
      (SELECT percentile_cont(0.5) WITHIN GROUP (
         ORDER BY EXTRACT(EPOCH FROM (f.at - m.created_at)) / 60)
         FROM matured m JOIN first_prayer f ON f.request_id = m.id) AS median_minutes_to_first_prayer,
      (SELECT COUNT(*) FROM prayer_requests r, win
         WHERE r.created_at >= win.since AND NOT r.is_seed)::int AS requests_created,
      (SELECT COUNT(*) FROM prayers_in_window)::int AS prayers,
      (SELECT COUNT(*) FROM askers)::int AS people_who_asked,
      (SELECT COUNT(DISTINCT user_id) FROM prayers_in_window)::int AS people_who_prayed,
      (SELECT COUNT(*) FROM askers a WHERE EXISTS (
         SELECT 1 FROM prayers_in_window w WHERE w.user_id = a.id))::int AS askers_who_also_prayed,
      (SELECT COUNT(*) FROM reports rp, win WHERE rp.created_at >= win.since)::int AS reports,
      (SELECT COUNT(*) FROM prayer_requests r, win
         WHERE r.status = 'hidden' AND r.updated_at >= win.since AND NOT r.is_seed)::int AS requests_hidden
  `;
  if (!m) throw new ApiError(500, "metrics_failed", "Could not compute metrics");

  const rate = (num: number, den: number) =>
    den > 0 ? Math.round((num / den) * 1000) / 10 : null;

  return c.json({
    windowDays: days,
    firstPrayerRate24hPercent: rate(m.first_prayer_within_24h, m.matured_requests),
    requestsOldEnoughToJudge: m.matured_requests,
    medianMinutesToFirstPrayer:
      m.median_minutes_to_first_prayer === null
        ? null
        : Math.round(m.median_minutes_to_first_prayer),
    requestsCreated: m.requests_created,
    prayers: m.prayers,
    peopleWhoAsked: m.people_who_asked,
    peopleWhoPrayed: m.people_who_prayed,
    askersWhoAlsoPrayedPercent: rate(m.askers_who_also_prayed, m.people_who_asked),
    reports: m.reports,
    reportsPerRequestPercent: rate(m.reports, m.requests_created),
    requestsHidden: m.requests_hidden,
  });
});

adminRoutes.get("/reports", async (c) => {
  const sql = c.get("sql");
  const rows = await sql`
    SELECT
      r.id,
      r.request_id,
      r.reason,
      r.note,
      r.created_at,
      pr.message,
      pr.status,
      pr.language,
      pr.display_name
    FROM reports r
    JOIN prayer_requests pr ON pr.id = r.request_id
    ORDER BY r.created_at DESC
    LIMIT 100
  `;
  return c.json({ items: rows });
});

/** Who am I? The admin page calls this first, so it can tell a moderator from a signed-in stranger. */
adminRoutes.get("/me", (c) => c.json({ id: c.get("user").id, role: "admin" }));

/**
 * The review queue: requests that still have reports nobody has looked at, one row per request
 * with the reasons counted. Reviewing a request (hide, restore, remove, dismiss, ban) clears it.
 */
adminRoutes.get("/queue", async (c) => {
  const sql = c.get("sql");
  const rows = await sql`
    SELECT
      pr.id,
      pr.author_id,
      pr.display_name,
      pr.message,
      pr.language,
      pr.status,
      pr.prayers_count,
      pr.created_at,
      COUNT(r.id)::int AS report_count,
      COUNT(DISTINCT r.ip_hash)::int AS distinct_networks,
      MAX(r.created_at) AS last_report_at,
      (SELECT jsonb_object_agg(x.reason, x.n) FROM (
         SELECT reason, COUNT(*)::int AS n FROM reports
         WHERE request_id = pr.id AND reviewed_at IS NULL GROUP BY reason) x) AS reasons,
      (SELECT COALESCE(jsonb_agg(note), '[]'::jsonb) FROM reports
         WHERE request_id = pr.id AND reviewed_at IS NULL AND note IS NOT NULL) AS notes,
      EXISTS(SELECT 1 FROM bans b WHERE b.user_id = pr.author_id
        AND (b.expires_at IS NULL OR b.expires_at > now())) AS author_banned
    FROM reports r
    JOIN prayer_requests pr ON pr.id = r.request_id
    WHERE r.reviewed_at IS NULL AND pr.status <> 'removed'
    GROUP BY pr.id
    ORDER BY MAX(r.created_at) DESC
    LIMIT 100
  `;
  return c.json({ items: rows });
});

/** Requests currently hidden (by reports or by a moderator), so a moderator can restore one. */
adminRoutes.get("/hidden", async (c) => {
  const sql = c.get("sql");
  const rows = await sql`
    SELECT
      pr.id,
      pr.author_id,
      pr.display_name,
      pr.message,
      pr.language,
      pr.updated_at AS hidden_at,
      EXISTS(SELECT 1 FROM bans b WHERE b.user_id = pr.author_id
        AND (b.expires_at IS NULL OR b.expires_at > now())) AS author_banned
    FROM prayer_requests pr
    WHERE pr.status = 'hidden'
    ORDER BY pr.updated_at DESC
    LIMIT 100
  `;
  return c.json({ items: rows });
});

/** The latest moderator actions. Ids and notes only, never request text. */
adminRoutes.get("/actions", async (c) => {
  const sql = c.get("sql");
  const rows = await sql`
    SELECT a.id, a.action, a.request_id, a.user_id, a.note, a.created_at, a.admin_id
    FROM moderation_actions a
    ORDER BY a.created_at DESC
    LIMIT 100
  `;
  return c.json({ items: rows });
});

const noteSchema = z.object({ note: z.string().trim().max(500).optional() });

/** The body is optional on these routes: a bare POST works, a note can be added. */
async function readNote(c: Context): Promise<string | null> {
  const text = await c.req.text();
  if (!text.trim()) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ApiError(400, "invalid_json", "The request body is not valid JSON");
  }
  return noteSchema.parse(json).note || null;
}

type Action = "hide" | "restore" | "dismiss" | "remove" | "ban" | "unban";

async function logAction(
  tx: Sql,
  adminId: string,
  action: Action,
  ids: { requestId?: string; userId?: string },
  note: string | null,
) {
  await tx`
    INSERT INTO moderation_actions (admin_id, action, request_id, user_id, note)
    VALUES (${adminId}, ${action}, ${ids.requestId ?? null}, ${ids.userId ?? null}, ${note})
  `;
}

/** Marks every open report of a request as reviewed. */
async function closeReports(tx: Sql, requestId: string) {
  await tx`
    UPDATE reports SET reviewed_at = now()
    WHERE request_id = ${requestId} AND reviewed_at IS NULL
  `;
}

/** A moderator's decision about one request: change its status (or leave it) and close its reports. */
async function reviewRequest(
  c: Context<{ Variables: AppVariables }>,
  action: "hide" | "restore" | "dismiss" | "remove",
) {
  const sql = c.get("sql");
  const admin = c.get("user");
  const requestId = requireUuid(c.req.param("id"));
  const note = await readNote(c);
  const newStatus = { hide: "hidden", restore: "active", remove: "removed", dismiss: null }[action];

  const result = await sql.begin(async (tx) => {
    const rows = newStatus
      ? await tx<{ id: string; status: string }[]>`
          UPDATE prayer_requests SET status = ${newStatus}, updated_at = now()
          WHERE id = ${requestId}
            -- A request its author deleted (or a moderator removed) never comes back.
            AND (${action === "remove"} OR status <> 'removed')
          RETURNING id, status`
      : await tx<{ id: string; status: string }[]>`
          SELECT id, status FROM prayer_requests WHERE id = ${requestId}`;
    const row = rows[0];
    if (!row) throw new ApiError(404, "not_found", "Request not found");
    await closeReports(tx as unknown as Sql, requestId);
    await logAction(tx as unknown as Sql, admin.id, action, { requestId }, note);
    return row;
  });
  return c.json(result);
}

adminRoutes.post("/requests/:id/hide", (c) => reviewRequest(c, "hide"));
adminRoutes.post("/requests/:id/restore", (c) => reviewRequest(c, "restore"));
/** Keep it visible and close the reports: the moderator looked and found nothing wrong. */
adminRoutes.post("/requests/:id/dismiss", (c) => reviewRequest(c, "dismiss"));
/** Take it down for good. The housekeeping job erases removed requests after 30 days. */
adminRoutes.post("/requests/:id/remove", (c) => reviewRequest(c, "remove"));

const banSchema = z.object({
  reason: z.string().trim().min(3).max(500),
  expiresAt: z.string().datetime().optional().nullable(),
});

adminRoutes.post("/users/:id/ban", async (c) => {
  const sql = c.get("sql");
  const admin = c.get("user");
  const userId = requireUuid(c.req.param("id"));
  const body = banSchema.parse(await readJson(c));

  await sql.begin(async (tx) => {
    const exists = await tx`SELECT 1 FROM users WHERE id = ${userId}`;
    if (exists.length === 0) throw new ApiError(404, "not_found", "User not found");

    await tx`
      INSERT INTO bans (user_id, reason, created_by, expires_at)
      VALUES (
        ${userId},
        ${body.reason},
        ${admin.id},
        ${body.expiresAt ?? null}
      )
      ON CONFLICT (user_id) DO UPDATE
        SET reason = EXCLUDED.reason,
            created_by = EXCLUDED.created_by,
            expires_at = EXCLUDED.expires_at,
            created_at = now()
    `;

    await tx`
      UPDATE prayer_requests
      SET status = 'hidden', updated_at = now()
      WHERE author_id = ${userId} AND status = 'active'
    `;
    // Their requests are dealt with, so the reports about them are too.
    await tx`
      UPDATE reports SET reviewed_at = now()
      WHERE reviewed_at IS NULL
        AND request_id IN (SELECT id FROM prayer_requests WHERE author_id = ${userId})
    `;
    await logAction(tx as unknown as Sql, admin.id, "ban", { userId }, body.reason);
  });

  return c.json({ userId, banned: true });
});

/** Lifts a ban. Hidden requests stay hidden: a moderator restores them one by one. */
adminRoutes.delete("/users/:id/ban", async (c) => {
  const sql = c.get("sql");
  const admin = c.get("user");
  const userId = requireUuid(c.req.param("id"));
  const note = await readNote(c);

  await sql.begin(async (tx) => {
    const removed = await tx`DELETE FROM bans WHERE user_id = ${userId} RETURNING user_id`;
    if (removed.length === 0) throw new ApiError(404, "not_found", "This person is not banned");
    await logAction(tx as unknown as Sql, admin.id, "unban", { userId }, note);
  });

  return c.json({ userId, banned: false });
});

// ---- scheduled starter posts -------------------------------------------------------------
// A switch and a daily limit for each language. Posts are published by the scheduled job.

adminRoutes.get("/autopost", async (c) => {
  return c.json({ maxDailyPosts: MAX_DAILY_POSTS, items: await autopostStatus(c.get("sql")) });
});

const autopostSchema = z.object({
  enabled: z.boolean(),
  dailyMax: z.number().int().min(0).max(MAX_DAILY_POSTS),
});

adminRoutes.put("/autopost/:language", async (c) => {
  const language = c.req.param("language");
  if (!isLanguageCode(language)) throw new ApiError(404, "not_found", "Not found");
  const parsed = autopostSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    throw new ApiError(400, "invalid_body", `Use enabled (true or false) and dailyMax (0 to ${MAX_DAILY_POSTS})`);
  }
  const sql = c.get("sql");
  await updateAutopostSetting(sql, language, parsed.data);
  const items = await autopostStatus(sql);
  return c.json({ item: items.find((i) => i.language === language) });
});
