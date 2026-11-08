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

/** How long data is kept. These numbers are the ones promised in docs/legal/privacy-policy.md. */
export const RETENTION = {
  /** Earlier versions of an edited request, kept so moderators can review reports. */
  editHistoryDays: 90,
  /** A request its author deleted (or a moderator removed) leaves view at once and is erased after this. */
  removedRequestDays: 30,
  /** A ban stays on record this long after it ends. A ban still in force is never erased. */
  endedBanDays: 365,
} as const;

export type PurgeResult = { editHistory: number; removedRequests: number; endedBans: number };

/** Erases what the retention periods no longer allow us to keep. Safe to run as often as wanted. */
export async function purgeExpiredData(sql: Sql, retention = RETENTION): Promise<PurgeResult> {
  const editHistory = await sql<{ id: string }[]>`
    DELETE FROM request_edits
    WHERE replaced_at < now() - make_interval(days => ${retention.editHistoryDays}::int)
    RETURNING id
  `;
  // Reports, prayers and edit history of the request go with it (they reference it with ON DELETE CASCADE).
  const removedRequests = await sql<{ id: string }[]>`
    DELETE FROM prayer_requests
    WHERE status = 'removed'
      AND updated_at < now() - make_interval(days => ${retention.removedRequestDays}::int)
    RETURNING id
  `;
  const endedBans = await sql<{ id: string }[]>`
    DELETE FROM bans
    WHERE expires_at IS NOT NULL
      AND expires_at < now() - make_interval(days => ${retention.endedBanDays}::int)
    RETURNING id
  `;
  return {
    editHistory: editHistory.length,
    removedRequests: removedRequests.length,
    endedBans: endedBans.length,
  };
}

/** Runs housekeeping now and every few hours. The timer never keeps the process alive. */
export function startMaintenance(sql: Sql): void {
  const run = () => {
    Promise.all([pruneRateLimitBuckets(sql), purgeExpiredData(sql)])
      .then(([counters, purged]) => {
        if (counters > 0) console.log(`maintenance: removed ${counters} old rate limit counters`);
        const total = purged.editHistory + purged.removedRequests + purged.endedBans;
        if (total > 0) console.log(`maintenance: purged ${JSON.stringify(purged)}`);
      })
      .catch((err) => console.error("maintenance failed", err));
  };
  run();
  setInterval(run, SIX_HOURS).unref();
}
