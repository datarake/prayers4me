import { connect } from "./client.js";
import { pruneRateLimitBuckets, purgeExpiredData } from "../maintenance.js";

/**
 * One-shot housekeeping for a scheduler (Cloud Run Job + Cloud Scheduler). On a service that
 * scales to zero the in-process timer cannot be relied on, so the schedule does this instead.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const sql = connect(databaseUrl, { max: 1, onnotice: () => undefined });
  try {
    const removed = await pruneRateLimitBuckets(sql);
    console.log(`maintenance: removed ${removed} old rate limit counters`);
    const purged = await purgeExpiredData(sql);
    console.log(`maintenance: purged ${JSON.stringify(purged)}`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
