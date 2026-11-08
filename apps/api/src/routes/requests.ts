import { Hono } from "hono";
import {
  MAX_EDITS_PER_REQUEST,
  RATE_LIMITS,
  createRequestSchema,
  feedQuerySchema,
  reportRequestSchema,
  updateRequestSchema,
  type PrayerRequestPublic,
} from "@prayers4me/shared";
import type { AppVariables } from "../auth.js";
import { requireNotBanned } from "../auth.js";
import { ApiError } from "../errors.js";
import { assertMessageLooksHuman } from "../moderation/heuristics.js";
import { consumeRateLimit } from "../moderation/rateLimit.js";
import { notifyPrayerReceived } from "../notifications/push.js";

type RequestRow = {
  id: string;
  author_id: string;
  language: PrayerRequestPublic["language"];
  display_name: string;
  message: string;
  contactable: boolean;
  phone: string | null;
  email: string | null;
  prayers_count: number;
  status: PrayerRequestPublic["status"];
  created_at: Date;
  edit_count: number;
  edited_at: Date | null;
  prayed_by_me: boolean;
};

function mapRequest(row: RequestRow, viewerId: string): PrayerRequestPublic {
  const isMine = row.author_id === viewerId;
  return {
    id: row.id,
    language: row.language,
    displayName: row.display_name,
    message: row.message,
    prayersCount: row.prayers_count,
    prayedByMe: row.prayed_by_me,
    isMine,
    contactable: isMine ? row.contactable : false,
    phone: isMine && row.contactable ? row.phone : null,
    email: isMine && row.contactable ? row.email : null,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    editedAt: row.edited_at ? row.edited_at.toISOString() : null,
    editsLeft: isMine ? Math.max(0, MAX_EDITS_PER_REQUEST - row.edit_count) : 0,
  };
}

export const requestsRoutes = new Hono<{ Variables: AppVariables }>();

requestsRoutes.get("/", async (c) => {
  const sql = c.get("sql");
  const user = c.get("user");
  const query = feedQuerySchema.parse({
    language: c.req.query("language"),
    cursor: c.req.query("cursor"),
    filter: c.req.query("filter"),
    limit: c.req.query("limit"),
  });

  const afterCursor = query.cursor
    ? sql`AND r.created_at < ${query.cursor}::timestamptz`
    : sql``;
  // "Needs prayer": still waiting for a first prayer, and not the viewer's own request.
  const onlyWaiting =
    query.filter === "waiting"
      ? sql`AND r.prayers_count = 0 AND r.author_id <> ${user.id}`
      : sql``;

  const rows = await sql<RequestRow[]>`
    SELECT
      r.*,
      EXISTS(
        SELECT 1 FROM prayers p
        WHERE p.request_id = r.id AND p.user_id = ${user.id}
      ) AS prayed_by_me
    FROM prayer_requests r
    WHERE r.language = ${query.language}
      AND r.status = 'active'
      ${onlyWaiting}
      ${afterCursor}
    ORDER BY r.created_at DESC
    LIMIT ${query.limit}
  `;

  const items = rows.map((row) => mapRequest(row, user.id));
  const last = rows[rows.length - 1];
  const nextCursor =
    rows.length === query.limit && last ? last.created_at.toISOString() : null;

  return c.json({ items, nextCursor });
});

requestsRoutes.get("/me", async (c) => {
  const sql = c.get("sql");
  const user = c.get("user");

  const rows = await sql<RequestRow[]>`
    SELECT
      r.*,
      false AS prayed_by_me
    FROM prayer_requests r
    WHERE r.author_id = ${user.id}
      AND r.status <> 'removed'
    ORDER BY r.created_at DESC
    LIMIT 50
  `;

  return c.json({
    items: rows.map((row) => mapRequest(row, user.id)),
    nextCursor: null,
  });
});

requestsRoutes.post("/", requireNotBanned(), async (c) => {
  const sql = c.get("sql");
  const user = c.get("user");
  const body = createRequestSchema.parse(await c.req.json());

  assertMessageLooksHuman(body.message);
  await consumeRateLimit(sql, user.id, "create_request");

  const rows = await sql<RequestRow[]>`
    INSERT INTO prayer_requests (
      author_id, language, display_name, message, contactable, phone, email
    ) VALUES (
      ${user.id},
      ${body.language},
      ${body.displayName},
      ${body.message},
      ${body.contactable},
      ${body.contactable ? body.phone ?? null : null},
      ${body.contactable ? body.email ?? null : null}
    )
    RETURNING *, false AS prayed_by_me
  `;

  const row = rows[0];
  if (!row) throw new ApiError(500, "create_failed", "Could not create request");

  // Keep user language preference in sync with last ask language
  await sql`
    UPDATE users SET language = ${body.language}, updated_at = now()
    WHERE id = ${user.id}
  `;

  return c.json(mapRequest(row, user.id), 201);
});

requestsRoutes.post("/:id/pray", requireNotBanned(), async (c) => {
  const sql = c.get("sql");
  const user = c.get("user");
  const requestId = c.req.param("id");

  await consumeRateLimit(sql, user.id, "pray");

  const result = await sql.begin(async (tx) => {
    const existing = await tx<
      { id: string; author_id: string; status: string; prayers_count: number }[]
    >`
      SELECT id, author_id, status, prayers_count
      FROM prayer_requests
      WHERE id = ${requestId}
      FOR UPDATE
    `;

    const request = existing[0];
    if (!request || request.status !== "active") {
      throw new ApiError(404, "not_found", "Prayer request not found");
    }
    if (request.author_id === user.id) {
      throw new ApiError(400, "cannot_pray_own", "You cannot pray for your own request");
    }

    const inserted = await tx<{ id: string }[]>`
      INSERT INTO prayers (request_id, user_id)
      VALUES (${requestId}, ${user.id})
      ON CONFLICT (request_id, user_id) DO NOTHING
      RETURNING id
    `;

    if (inserted.length === 0) {
      return {
        alreadyPrayed: true,
        prayersCount: request.prayers_count,
      };
    }

    const updated = await tx<{ prayers_count: number }[]>`
      UPDATE prayer_requests
      SET prayers_count = prayers_count + 1, updated_at = now()
      WHERE id = ${requestId}
      RETURNING prayers_count
    `;

    return {
      alreadyPrayed: false,
      prayersCount: updated[0]?.prayers_count ?? request.prayers_count + 1,
    };
  });

  // Fire and forget: the prayer is already saved, a failed push must never fail it.
  if (!result.alreadyPrayed) {
    void notifyPrayerReceived(sql, c.get("env"), requestId);
  }

  return c.json({
    requestId,
    prayedByMe: true,
    alreadyPrayed: result.alreadyPrayed,
    prayersCount: result.prayersCount,
  });
});

requestsRoutes.post("/:id/report", requireNotBanned(), async (c) => {
  const sql = c.get("sql");
  const user = c.get("user");
  const requestId = c.req.param("id");
  const body = reportRequestSchema.parse(await c.req.json());

  await consumeRateLimit(sql, user.id, "report");

  const result = await sql.begin(async (tx) => {
    const existing = await tx<{ id: string; author_id: string; status: string }[]>`
      SELECT id, author_id, status FROM prayer_requests WHERE id = ${requestId}
    `;
    const request = existing[0];
    if (!request || request.status === "removed") {
      throw new ApiError(404, "not_found", "Prayer request not found");
    }
    if (request.author_id === user.id) {
      throw new ApiError(400, "cannot_report_own", "You cannot report your own request");
    }

    await tx`
      INSERT INTO reports (request_id, reporter_id, reason, note)
      VALUES (${requestId}, ${user.id}, ${body.reason}, ${body.note ?? null})
      ON CONFLICT (request_id, reporter_id) DO NOTHING
    `;

    const counts = await tx<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM reports WHERE request_id = ${requestId}
    `;
    const reportCount = counts[0]?.count ?? 0;
    let autoHidden = false;

    if (
      reportCount >= RATE_LIMITS.autoHideReportThreshold &&
      request.status === "active"
    ) {
      await tx`
        UPDATE prayer_requests
        SET status = 'hidden', updated_at = now()
        WHERE id = ${requestId}
      `;
      autoHidden = true;
    }

    return { reportCount, autoHidden };
  });

  return c.json({
    id: requestId,
    requestId,
    reason: body.reason,
    autoHidden: result.autoHidden,
  });
});

requestsRoutes.delete("/:id", requireNotBanned(), async (c) => {
  const sql = c.get("sql");
  const user = c.get("user");
  const requestId = c.req.param("id");
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    throw new ApiError(404, "not_found", "Prayer request not found");
  }

  // Soft delete: the row is kept for moderation audit but disappears everywhere.
  const rows = await sql<{ id: string }[]>`
    UPDATE prayer_requests
    SET status = 'removed', updated_at = now()
    WHERE id = ${requestId}
      AND author_id = ${user.id}
      AND status <> 'removed'
    RETURNING id
  `;

  if (rows.length === 0) {
    throw new ApiError(404, "not_found", "Prayer request not found");
  }

  return c.json({ id: requestId, deleted: true });
});

requestsRoutes.patch("/:id", requireNotBanned(), async (c) => {
  const sql = c.get("sql");
  const user = c.get("user");
  const requestId = c.req.param("id");
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    throw new ApiError(404, "not_found", "Prayer request not found");
  }

  const body = updateRequestSchema.parse(await c.req.json());
  // An edit must pass the same checks as a new request, or it would be a way around them.
  assertMessageLooksHuman(body.message);

  const phone = body.contactable ? body.phone ?? null : null;
  const email = body.contactable ? body.email ?? null : null;

  const row = await sql.begin(async (tx) => {
    const found = await tx<RequestRow[]>`
      SELECT *, false AS prayed_by_me
      FROM prayer_requests
      WHERE id = ${requestId} AND author_id = ${user.id} AND status <> 'removed'
      FOR UPDATE
    `;
    const current = found[0];
    if (!current) throw new ApiError(404, "not_found", "Prayer request not found");

    // A request hidden by reports is under review. Editing it would dodge that review.
    if (current.status !== "active") {
      throw new ApiError(409, "under_review", "This request is under review");
    }

    const unchanged =
      current.display_name === body.displayName &&
      current.message === body.message &&
      current.contactable === body.contactable &&
      current.phone === phone &&
      current.email === email;
    if (unchanged) return current;

    if (current.edit_count >= MAX_EDITS_PER_REQUEST) {
      throw new ApiError(429, "edit_limit", "You have used all edits for this request");
    }

    await tx`
      INSERT INTO request_edits (request_id, display_name, message, contactable, phone, email)
      VALUES (
        ${requestId}, ${current.display_name}, ${current.message},
        ${current.contactable}, ${current.phone}, ${current.email}
      )
    `;

    const updated = await tx<RequestRow[]>`
      UPDATE prayer_requests
      SET display_name = ${body.displayName},
          message = ${body.message},
          contactable = ${body.contactable},
          phone = ${phone},
          email = ${email},
          edit_count = edit_count + 1,
          edited_at = now(),
          updated_at = now()
      WHERE id = ${requestId}
      RETURNING *, false AS prayed_by_me
    `;
    const next = updated[0];
    if (!next) throw new ApiError(500, "update_failed", "Could not update request");
    return next;
  });

  return c.json(mapRequest(row, user.id));
});
