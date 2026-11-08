import postgres from "postgres";
import type { Env } from "../env.js";

export type Sql = ReturnType<typeof postgres>;

/**
 * Opens a connection from a database URL. On Cloud Run the database is reached through a unix
 * socket, written as `postgres://user:pass@localhost/db?host=/cloudsql/PROJECT:REGION:INSTANCE`.
 * The driver ignores a `host` query parameter, so the socket path is passed explicitly.
 */
export function connect(databaseUrl: string, options: postgres.Options<{}> = {}): Sql {
  const url = new URL(databaseUrl);
  const socketDir = url.searchParams.get("host");
  if (!socketDir?.startsWith("/")) return postgres(databaseUrl, options);
  // Left in the URL, the driver would send `host` to the server as a setting and be refused.
  url.searchParams.delete("host");
  return postgres(url.toString(), { ...options, path: `${socketDir}/.s.PGSQL.5432` });
}

export function createDb(env: Env): Sql {
  return connect(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}
