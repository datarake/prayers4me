import { ApiError } from "./errors.js";

/**
 * Keyset cursor for the feed. It carries the last row's full-precision timestamp (Postgres
 * keeps microseconds, JavaScript dates only milliseconds) and its id, so rows that share a
 * moment are never skipped or repeated. Clients treat it as an opaque string.
 */
export type FeedCursor = { t: string; id: string };

const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:?\d{2})?)?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCursor(raw: string): FeedCursor {
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown;
    if (
      typeof value === "object" &&
      value !== null &&
      typeof (value as FeedCursor).t === "string" &&
      typeof (value as FeedCursor).id === "string" &&
      TIMESTAMP_RE.test((value as FeedCursor).t) &&
      UUID_RE.test((value as FeedCursor).id)
    ) {
      return value as FeedCursor;
    }
  } catch {
    // fall through
  }
  throw new ApiError(400, "invalid_cursor", "The cursor is not valid");
}
