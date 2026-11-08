import { RATE_LIMITS } from "@prayers4me/shared";
import type { Sql } from "../db/client.js";
import { ApiError } from "../errors.js";

type RateAction = "create_request" | "pray" | "report";

const LIMITS: Record<RateAction, number> = {
  create_request: RATE_LIMITS.createRequestPerDay,
  pray: RATE_LIMITS.prayPerDay,
  report: RATE_LIMITS.reportPerDay,
};

export async function consumeRateLimit(
  sql: Sql,
  userId: string,
  action: RateAction,
): Promise<void> {
  const limit = LIMITS[action];
  const subjectKey = `user:${userId}`;
  const rows = await sql<{ count: number }[]>`
    INSERT INTO rate_limit_buckets (subject_key, action, bucket_day, count)
    VALUES (${subjectKey}, ${action}, CURRENT_DATE, 1)
    ON CONFLICT (subject_key, action, bucket_day)
    DO UPDATE SET count = rate_limit_buckets.count + 1
    RETURNING count
  `;

  const count = rows[0]?.count ?? 0;
  if (count > limit) {
    throw new ApiError(
      429,
      "rate_limited",
      `Too many ${action.replace("_", " ")} actions today`,
    );
  }
}
