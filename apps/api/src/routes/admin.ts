import { Hono } from "hono";
import { z } from "zod";
import type { AppVariables } from "../auth.js";
import { requireAdmin } from "../auth.js";
import { ApiError } from "../errors.js";
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
    ),
    first_prayer AS (
      SELECT p.request_id, MIN(p.created_at) AS at
      FROM prayers p JOIN matured m ON m.id = p.request_id
      GROUP BY p.request_id
    ),
    askers AS (
      SELECT DISTINCT author_id AS id FROM prayer_requests r, win WHERE r.created_at >= win.since
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
      (SELECT COUNT(*) FROM prayer_requests r, win WHERE r.created_at >= win.since)::int AS requests_created,
      (SELECT COUNT(*) FROM prayers_in_window)::int AS prayers,
      (SELECT COUNT(*) FROM askers)::int AS people_who_asked,
      (SELECT COUNT(DISTINCT user_id) FROM prayers_in_window)::int AS people_who_prayed,
      (SELECT COUNT(*) FROM askers a WHERE EXISTS (
         SELECT 1 FROM prayers_in_window w WHERE w.user_id = a.id))::int AS askers_who_also_prayed,
      (SELECT COUNT(*) FROM reports rp, win WHERE rp.created_at >= win.since)::int AS reports,
      (SELECT COUNT(*) FROM prayer_requests r, win
         WHERE r.status = 'hidden' AND r.updated_at >= win.since)::int AS requests_hidden
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

adminRoutes.post("/requests/:id/hide", async (c) => {
  const sql = c.get("sql");
  const requestId = requireUuid(c.req.param("id"));
  const updated = await sql`
    UPDATE prayer_requests
    SET status = 'hidden', updated_at = now()
    WHERE id = ${requestId}
    RETURNING id, status
  `;
  if (!updated[0]) throw new ApiError(404, "not_found", "Request not found");
  return c.json(updated[0]);
});

adminRoutes.post("/requests/:id/restore", async (c) => {
  const sql = c.get("sql");
  const requestId = requireUuid(c.req.param("id"));
  const updated = await sql`
    UPDATE prayer_requests
    SET status = 'active', updated_at = now()
    WHERE id = ${requestId}
    RETURNING id, status
  `;
  if (!updated[0]) throw new ApiError(404, "not_found", "Request not found");
  return c.json(updated[0]);
});

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
  });

  return c.json({ userId, banned: true });
});
