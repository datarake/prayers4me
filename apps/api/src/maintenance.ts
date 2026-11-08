import type { Sql } from "./db/client.js";

/** Daily counters older than this are useless: limits only look at today. */
const KEEP_DAYS = 7;
const SIX_HOURS = 6 * 60 * 60 * 1000;

export async function pruneRateLimitBuckets(
  sql: Sql,
  keepDays = KEEP_DAYS,
): Promise<number> {
  const rows = await sql<{ subject_key: string }[]>`
    DELETE FROM rate_limit_buckets
    WHERE bucket_day < CURRENT_DATE - ${keepDays}::int
    RETURNING subject_key
  `;
  return rows.length;
}

/** Runs housekeeping now and every few hours. The timer never keeps the process alive. */
export function startMaintenance(sql: Sql): void {
  const run = () => {
    pruneRateLimitBuckets(sql)
      .then((n) => {
        if (n > 0) console.log(`maintenance: removed ${n} old rate limit counters`);
      })
      .catch((err) => console.error("maintenance failed", err));
  };
  run();
  setInterval(run, SIX_HOURS).unref();
}
