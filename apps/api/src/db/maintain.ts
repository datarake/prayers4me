import { connect } from "./client.js";
import { pruneRateLimitBuckets, purgeExpiredData } from "../maintenance.js";
import { checkPushReceipts, flushHeldNotifications } from "../notifications/push.js";

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
    // Run often (every 15 to 30 minutes) so held "someone prayed" notifications are not late.
    const mode = process.env.PUSH_MODE === "expo" ? "expo" : "log";
    const flushed = await flushHeldNotifications(sql, mode);
    console.log(`maintenance: sent ${flushed} held notifications (${mode})`);
    const dropped = await checkPushReceipts(sql, mode).catch((err: unknown) => {
      console.error("push receipts failed", err);
      return 0;
    });
    console.log(`maintenance: forgot ${dropped} dead push tokens`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
