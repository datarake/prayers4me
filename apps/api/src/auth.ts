import type { MiddlewareHandler } from "hono";
import type { LanguageCode } from "@prayers4me/shared";
import type { Sql } from "./db/client.js";
import { ApiError } from "./errors.js";
import type { Env } from "./env.js";

export type AuthUser = {
  id: string;
  firebaseUid: string;
  language: LanguageCode;
  role: "user" | "admin";
  banned: boolean;
};

export type AppVariables = {
  user: AuthUser;
  sql: Sql;
  env: Env;
};

async function upsertDevUser(sql: Sql, firebaseUid: string): Promise<AuthUser> {
  const rows = await sql<{
    id: string;
    firebase_uid: string;
    language: LanguageCode;
    role: "user" | "admin";
    banned: boolean;
  }[]>`
    WITH upserted AS (
      INSERT INTO users (firebase_uid)
      VALUES (${firebaseUid})
      ON CONFLICT (firebase_uid) DO UPDATE
        SET updated_at = now()
      RETURNING id, firebase_uid, language, role
    )
    SELECT
      u.id,
      u.firebase_uid,
      u.language,
      u.role,
      EXISTS(SELECT 1 FROM bans b WHERE b.user_id = u.id
        AND (b.expires_at IS NULL OR b.expires_at > now())) AS banned
    FROM upserted u
  `;

  const row = rows[0];
  if (!row) throw new ApiError(500, "auth_failed", "Could not create user");

  return {
    id: row.id,
    firebaseUid: row.firebase_uid,
    language: row.language,
    role: row.role,
    banned: row.banned,
  };
}

export function createAuthMiddleware(): MiddlewareHandler<{
  Variables: AppVariables;
}> {
  return async (c, next) => {
    const env = c.get("env");
    const sql = c.get("sql");
    const header = c.req.header("authorization");

    if (!header?.startsWith("Bearer ")) {
      throw new ApiError(401, "unauthorized", "Missing bearer token");
    }

    const token = header.slice("Bearer ".length).trim();

    if (env.AUTH_MODE === "dev") {
      if (!token.startsWith("dev:")) {
        throw new ApiError(
          401,
          "unauthorized",
          "Dev auth expects Bearer dev:<user-id>",
        );
      }
      const firebaseUid = token.slice(4).trim();
      if (!firebaseUid) {
        throw new ApiError(401, "unauthorized", "Empty dev user id");
      }
      const user = await upsertDevUser(sql, `dev:${firebaseUid}`);
      c.set("user", user);
      await next();
      return;
    }

    // Firebase verification will be wired when GCP Auth is configured.
    throw new ApiError(
      501,
      "auth_not_configured",
      "Firebase auth mode is not configured yet",
    );
  };
}

export function requireNotBanned(): MiddlewareHandler<{
  Variables: AppVariables;
}> {
  return async (c, next) => {
    if (c.get("user").banned) {
      throw new ApiError(403, "banned", "This account is banned");
    }
    await next();
  };
}

export function requireAdmin(): MiddlewareHandler<{
  Variables: AppVariables;
}> {
  return async (c, next) => {
    if (c.get("user").role !== "admin") {
      throw new ApiError(403, "forbidden", "Admin only");
    }
    await next();
  };
}
