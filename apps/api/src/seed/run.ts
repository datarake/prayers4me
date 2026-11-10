import { connect } from "../db/client.js";
import { removeStarterContent, seedStarterContent } from "./seed.js";

/**
 * Adds (default) or removes (--remove) the starter requests. Safe to run twice.
 * Needs DATABASE_URL, like the migration and maintenance jobs.
 */
async function main() {
  const databaseUrl =
    process.env.DATABASE_URL ?? "postgres://prayers4me:prayers4me@localhost:5432/prayers4me";
  const sql = connect(databaseUrl, { max: 1, onnotice: () => undefined });
  try {
    if (process.argv.includes("--remove")) {
      const removed = await removeStarterContent(sql);
      console.log(`seed: removed ${removed.requests} requests and ${removed.users} accounts`);
    } else {
      const result = await seedStarterContent(sql);
      console.log(`seed: created ${result.created}, already there ${result.skipped}`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
