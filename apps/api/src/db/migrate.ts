import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://prayers4me:prayers4me@localhost:5432/prayers4me";

async function main() {
  const sql = postgres(databaseUrl, { max: 1 });
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../infra/sql",
  );
  const migrationPath = path.join(root, "001_init.sql");
  const ddl = await readFile(migrationPath, "utf8");

  await sql.unsafe(ddl);
  console.log("Applied migration:", migrationPath);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
