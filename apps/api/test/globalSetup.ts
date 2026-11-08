import postgres from "postgres";
import { runMigrations } from "../src/db/migrations.js";
import { MIGRATIONS_DIR, TEST_DATABASE_URL } from "./testDb.js";

/** Recreates the test database from the real migrations, so tests run against the real schema. */
export async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const name = url.pathname.slice(1);
  if (!/^[a-z0-9_]+_test$/.test(name)) {
    throw new Error(`Refusing to reset "${name}": test database names must end in _test`);
  }

  url.pathname = "/postgres";
  const admin = postgres(url.toString(), { max: 1, onnotice: () => undefined });
  await admin.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE ${name}`);
  await admin.end();

  const sql = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => undefined });
  await runMigrations(sql, MIGRATIONS_DIR);
  await sql.end();
}
