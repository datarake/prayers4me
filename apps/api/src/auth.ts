import type { MiddlewareHandler } from "hono";
import type { LanguageCode } from "@prayers4me/shared";
import type { Sql } from "./db/client.js";
import { ApiError } from "./errors.js";
import type { Env } from "./env.js";
import { createVerifiers, type Verifiers } from "./firebaseAuth.js";

export type AuthUser = {
  id: string;
  firebaseUid: string;
  language: LanguageCode;
  role: "user" | "admin";
  banned: boolean;
  /** Under 24 hours old: stricter limits and reports that do not count toward auto-hide. */
  isNewAccount: boolean;
};

export type AppVariables = {
  user: AuthUser;
  sql: Sql;
  env: Env;
};

async function upsertUser(sql: Sql, firebaseUid: string): Promise<AuthUser> {
  const rows = await sql<{
    id: string;
    firebase_uid: string;
    language: LanguageCode;
    role: "user" | "admin";
    banned: boolean;
    is_new: boolean;
  }[]>`
    WITH upserted AS (
      INSERT INTO users (firebase_uid)
      VALUES (${firebaseUid})
      ON CONFLICT (firebase_uid) DO UPDATE
        SET updated_at = now()
      RETURNING id, firebase_uid, language, role, created_at
    )
    SELECT
      u.id,
      u.firebase_uid,
      u.language,
      u.role,
      EXISTS(SELECT 1 FROM bans b WHERE b.user_id = u.id
        AND (b.expires_at IS NULL OR b.expires_at > now())) AS banned,
      (u.created_at > now() - interval '24 hours') AS is_new
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
    isNewAccount: row.is_new,
  };
}

/** Admin calls come from a browser, which cannot attest, so they rely on the admin role instead. */
const APP_CHECK_EXEMPT = /^\/v1\/admin(\/|$)/;

export function createAuthMiddleware(
  verifiers?: Verifiers,
): MiddlewareHandler<{
  Variables: AppVariables;
}> {
  let shared: Verifiers | undefined = verifiers;
  return async (c, next) => {
    const env = c.get("env");
    const sql = c.get("sql");
    const header = c.req.header("authorization");

    if (!header?.startsWith("Bearer ")) {
      throw new ApiError(401, "unauthorized", "Missing bearer token");
    }

    const token = header.slice("Bearer ".length).trim();

    // Is the caller a genuine copy of the app? Checked before anything touches the database.
    if (env.APP_CHECK !== "off" && !APP_CHECK_EXEMPT.test(c.req.path)) {
      shared ??= createVerifiers(env);
      const appCheckToken = c.req.header("x-firebase-appcheck");
      if (appCheckToken) {
        try {
          await shared.verifyAppCheck(appCheckToken);
        } catch (err) {
          if (env.APP_CHECK === "enforce") throw err;
          console.warn("App Check token rejected (log mode):", (err as Error).message);
        }
      } else if (env.APP_CHECK === "enforce") {
        throw new ApiError(401, "app_check_failed", "This app could not be verified");
      } else {
        console.warn("App Check token missing (log mode)");
      }
    }

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
      const user = await upsertUser(sql, `dev:${firebaseUid}`);
      c.set("user", user);
      await next();
      return;
    }

    // A Firebase ID token proves which install is calling. The uid is stable per install.
    shared ??= createVerifiers(env);
    const { uid } = await shared.verifyIdToken(token);
    const user = await upsertUser(sql, uid);
    c.set("user", user);
    await next();
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
