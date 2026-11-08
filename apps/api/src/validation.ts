import type { Context } from "hono";
import { ApiError } from "./errors.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ids come from the URL, so anything can arrive. A value that is not a UUID cannot name a
 * row, so it is simply "not found" and never reaches the database as an invalid input error.
 */
export function requireUuid(value: string | undefined): string {
  if (!value || !UUID_RE.test(value)) {
    throw new ApiError(404, "not_found", "Not found");
  }
  return value;
}

/** Reads a JSON body. Malformed JSON is the caller's mistake (400), not a server error. */
export async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new ApiError(400, "invalid_json", "The request body is not valid JSON");
  }
}
