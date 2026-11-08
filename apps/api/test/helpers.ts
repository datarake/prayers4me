import postgres from "postgres";
import { createApp } from "../src/app.js";
import { parseEnv } from "../src/env.js";
import { TEST_DATABASE_URL } from "./testDb.js";

export const sql = postgres(TEST_DATABASE_URL, { max: 5, onnotice: () => undefined });

/**
 * An app wired to the test database. By default protections that need many accounts are off,
 * so a test only turns on the one it is about.
 */
export function makeApp(overrides: Record<string, string> = {}) {
  const env = parseEnv({
    NODE_ENV: "test",
    DATABASE_URL: TEST_DATABASE_URL,
    AUTH_MODE: "dev",
    IP_LIMITS: "off",
    NEW_ACCOUNT_PROBATION: "off",
    PUSH_MODE: "log",
    TRUSTED_PROXY_HOPS: "1",
    ...overrides,
  });
  return { app: createApp(env, sql), env };
}

export type Call = (
  method: string,
  path: string,
  opts?: { user?: string; body?: unknown; rawBody?: string; ip?: string },
) => Promise<{ status: number; json: any }>;

/** Calls the app in process: no server, no network. */
export function client(app: ReturnType<typeof makeApp>["app"]): Call {
  return async (method, path, opts = {}) => {
    const headers: Record<string, string> = {};
    if (opts.user) headers.Authorization = `Bearer dev:${opts.user}`;
    if (opts.ip) headers["X-Forwarded-For"] = opts.ip;
    let body: string | undefined;
    if (opts.rawBody !== undefined) {
      body = opts.rawBody;
      headers["Content-Type"] = "application/json";
    } else if (opts.body !== undefined) {
      body = JSON.stringify(opts.body);
      headers["Content-Type"] = "application/json";
    }
    const res = await app.request(path, { method, headers, body });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, json };
  };
}

/** Every test starts from an empty database. */
export async function resetDb() {
  await sql`TRUNCATE users CASCADE`;
  await sql`TRUNCATE rate_limit_buckets`;
}

/** Creates the account (the first call does) and optionally makes it older than 24 hours. */
export async function makeUser(call: Call, name: string, opts: { established?: boolean } = {}) {
  await call("GET", "/v1/session", { user: name });
  if (opts.established) {
    await sql`UPDATE users SET created_at = now() - interval '5 days' WHERE firebase_uid = ${`dev:${name}`}`;
  }
  const rows = await sql<{ id: string }[]>`SELECT id FROM users WHERE firebase_uid = ${`dev:${name}`}`;
  return rows[0]!.id;
}

export const validRequest = {
  language: "en",
  displayName: "Ana",
  message: "Please pray for my mother, she is in the hospital.",
};

export async function createRequest(
  call: Call,
  user: string,
  overrides: Record<string, unknown> = {},
  ip?: string,
) {
  return call("POST", "/v1/requests", { user, body: { ...validRequest, ...overrides }, ip });
}

/** Inserts a request directly, for tests that need exact timestamps or states. */
export async function insertRequest(
  authorId: string,
  fields: {
    name?: string;
    message?: string;
    language?: string;
    createdAt?: string;
    status?: string;
    prayersCount?: number;
  } = {},
) {
  const rows = await sql<{ id: string }[]>`
    INSERT INTO prayer_requests (author_id, language, display_name, message, status, prayers_count, created_at)
    VALUES (
      ${authorId},
      ${fields.language ?? "en"},
      ${fields.name ?? "Test"},
      ${fields.message ?? "A request used by a test, nothing more."},
      ${fields.status ?? "active"},
      ${fields.prayersCount ?? 0},
      -- Passed as text: the driver would turn a timestamptz parameter into a Date and drop microseconds.
      (${fields.createdAt ?? new Date().toISOString()}::text)::timestamptz
    )
    RETURNING id
  `;
  return rows[0]!.id;
}
