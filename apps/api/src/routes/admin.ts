import { Hono } from "hono";
import { z } from "zod";
import type { AppVariables } from "../auth.js";
import { requireAdmin } from "../auth.js";
import { ApiError } from "../errors.js";

export const adminRoutes = new Hono<{ Variables: AppVariables }>();

adminRoutes.use("*", requireAdmin());

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
  const requestId = c.req.param("id");
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
  const requestId = c.req.param("id");
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
  const userId = c.req.param("id");
  const body = banSchema.parse(await c.req.json());

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
