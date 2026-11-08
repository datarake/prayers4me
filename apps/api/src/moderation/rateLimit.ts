import { RATE_LIMITS } from "@prayers4me/shared";
import type { Sql } from "../db/client.js";
import { ApiError } from "../errors.js";

type RateAction = "create_request" | "pray" | "report";

/** Established accounts, per day. */
const USER_LIMITS: Record<RateAction, number> = {
  create_request: RATE_LIMITS.createRequestPerDay,
  pray: RATE_LIMITS.prayPerDay,
  report: RATE_LIMITS.reportPerDay,
};

/** Accounts under 24 hours old. A fresh install is free, so it starts with less. */
const NEW_ACCOUNT_LIMITS: Record<RateAction, number> = {
  create_request: 1,
  pray: 60,
  report: 5,
};

/**
 * Per network, per day, across every account. Generous enough for a household, a church
 * wifi or a mobile carrier sharing one address, but it stops one person cycling accounts.
 */
const NETWORK_LIMITS: Record<RateAction, number> = {
  create_request: 10,
  pray: 600,
  report: 60,
};

async function bump(
  sql: Sql,
  subjectKey: string,
  action: RateAction,
): Promise<number> {
  const rows = await sql<{ count: number }[]>`
    INSERT INTO rate_limit_buckets (subject_key, action, bucket_day, count)
    VALUES (${subjectKey}, ${action}, CURRENT_DATE, 1)
    ON CONFLICT (subject_key, action, bucket_day)
    DO UPDATE SET count = rate_limit_buckets.count + 1
    RETURNING count
  `;
  return rows[0]?.count ?? 0;
}

export async function consumeRateLimit(
  sql: Sql,
  userId: string,
  action: RateAction,
  opts: { isNewAccount?: boolean; networkKey?: string | null } = {},
): Promise<void> {
  const userLimit = opts.isNewAccount
    ? NEW_ACCOUNT_LIMITS[action]
    : USER_LIMITS[action];

  if ((await bump(sql, `user:${userId}`, action)) > userLimit) {
    throw new ApiError(
      429,
      "rate_limited",
      `Too many ${action.replace("_", " ")} actions today`,
    );
  }

  if (opts.networkKey) {
    if ((await bump(sql, `net:${opts.networkKey}`, action)) > NETWORK_LIMITS[action]) {
      throw new ApiError(
        429,
        "rate_limited",
        `Too many ${action.replace("_", " ")} actions from this network today`,
      );
    }
  }
}
