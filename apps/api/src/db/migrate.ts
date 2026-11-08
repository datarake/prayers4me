import path from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "./client.js";
import { runMigrations } from "./migrations.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://prayers4me:prayers4me@localhost:5432/prayers4me";

async function main() {
  const sql = connect(databaseUrl, { max: 1, onnotice: () => undefined });
  const dir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../infra/sql",
  );

  const applied = await runMigrations(sql, dir, console.log);
  if (applied.length === 0) console.log("Database is up to date.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
