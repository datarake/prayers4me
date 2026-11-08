import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://prayers4me:prayers4me@localhost:5432/prayers4me";

/** Applies every `infra/sql/NNN_*.sql` file once, in order, and records it. */
async function main() {
  const sql = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../infra/sql",
  );

  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const files = (await readdir(root)).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();

  // Databases created before this table existed already contain migration 001.
  const usersRows = await sql<{ has_users: boolean }[]>`
    SELECT to_regclass('public.users') IS NOT NULL AS has_users
  `;
  const countRows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM schema_migrations
  `;
  if (usersRows[0]?.has_users && countRows[0]?.count === 0 && files[0]) {
    await sql`INSERT INTO schema_migrations (name) VALUES (${files[0]})`;
    console.log("Baseline:", files[0], "(already present)");
  }

  const done = new Set(
    (await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map(
      (r) => r.name,
    ),
  );

  let applied = 0;
  for (const file of files) {
    if (done.has(file)) continue;
    const ddl = await readFile(path.join(root, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(ddl);
      await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
    });
    console.log("Applied:", file);
    applied += 1;
  }

  if (applied === 0) console.log("Database is up to date.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
