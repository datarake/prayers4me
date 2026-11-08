import postgres from "postgres";
import type { Env } from "../env.js";

export type Sql = ReturnType<typeof postgres>;

export function createDb(env: Env): Sql {
  return postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}
