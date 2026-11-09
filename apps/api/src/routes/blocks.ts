import { Hono } from "hono";
import type { AppVariables } from "../auth.js";

/** The caller's own block list. It is only ever a count: blocked people stay anonymous. */
export const blocksRoutes = new Hono<{ Variables: AppVariables }>();

blocksRoutes.get("/", async (c) => {
  const sql = c.get("sql");
  const user = c.get("user");
  const rows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM blocks WHERE blocker_id = ${user.id}
  `;
  return c.json({ count: rows[0]?.count ?? 0 });
});

/** Unblock everyone. There is no per-person unblock because the app never shows who they are. */
blocksRoutes.delete("/", async (c) => {
  const sql = c.get("sql");
  const user = c.get("user");
  const rows = await sql<{ blocked_id: string }[]>`
    DELETE FROM blocks WHERE blocker_id = ${user.id} RETURNING blocked_id
  `;
  return c.json({ unblocked: rows.length });
});
