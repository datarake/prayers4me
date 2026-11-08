import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Sql } from "./client.js";

/** Applies every `NNN_*.sql` file in `dir` once, in order, and records it. Returns what it applied. */
export async function runMigrations(
  sql: Sql,
  dir: string,
  log: (message: string) => void = () => undefined,
): Promise<string[]> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const files = (await readdir(dir)).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();

  // Databases created before this table existed already contain migration 001.
  const usersRows = await sql<{ has_users: boolean }[]>`
    SELECT to_regclass('public.users') IS NOT NULL AS has_users
  `;
  const countRows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM schema_migrations
  `;
  if (usersRows[0]?.has_users && countRows[0]?.count === 0 && files[0]) {
    await sql`INSERT INTO schema_migrations (name) VALUES (${files[0]})`;
    log(`Baseline: ${files[0]} (already present)`);
  }

  const done = new Set(
    (await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map((r) => r.name),
  );

  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const ddl = await readFile(path.join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(ddl);
      await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
    });
    log(`Applied: ${file}`);
    applied.push(file);
  }
  return applied;
}
