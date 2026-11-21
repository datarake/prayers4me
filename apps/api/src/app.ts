import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { APP_NAME } from "@prayers4me/shared";
import {
  createAuthMiddleware,
  type AppVariables,
} from "./auth.js";
import type { Sql } from "./db/client.js";
import type { Env } from "./env.js";
import type { Verifiers } from "./firebaseAuth.js";
import { z } from "zod";
import { ApiError, jsonError } from "./errors.js";
import { readJson } from "./validation.js";
import { EXPO_TOKEN_RE } from "./notifications/push.js";
import { adminRoutes } from "./routes/admin.js";
import { blocksRoutes } from "./routes/blocks.js";
import { requestsRoutes } from "./routes/requests.js";

export function createApp(env: Env, sql: Sql, verifiers?: Verifiers) {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use(
    "*",
    cors({
      origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(","),
      allowHeaders: ["Authorization", "Content-Type", "X-Firebase-AppCheck"],
    }),
  );

  app.use("*", secureHeaders());

  // The largest legitimate body is a request of about 2 KB. Anything bigger is refused
  // before it is read into memory.
  app.use(
    "/v1/*",
    bodyLimit({
      maxSize: 16 * 1024,
      onError: (c) =>
        c.json(
          { error: { code: "payload_too_large", message: "The request is too large" } },
          413,
        ),
    }),
  );

  app.use("*", async (c, next) => {
    c.set("env", env);
    c.set("sql", sql);
    await next();
  });

  app.onError((err, c) => jsonError(c, err));

  // A health check that cannot see the database would report "ok" while the service is down.
  app.get("/health", async (c) => {
    try {
      await Promise.race([
        sql`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
      ]);
      return c.json({ ok: true, service: APP_NAME, db: "up" });
    } catch {
      return c.json({ ok: false, service: APP_NAME, db: "down" }, 503);
    }
  });

  const auth = createAuthMiddleware(verifiers);

  app.use("/v1/*", auth);

  app.get("/v1/session", async (c) => {
    const user = c.get("user");
    return c.json({
      id: user.id,
      language: user.language,
      role: user.role,
      banned: user.banned,
    });
  });

  // The device registers (or clears, with null) the token used for "someone prayed" pushes.
  app.put("/v1/session/push-token", async (c) => {
    const user = c.get("user");
    const body = z
      .object({
        token: z.string().regex(EXPO_TOKEN_RE).max(200).nullable(),
      })
      .parse(await readJson(c));

    await sql.begin(async (tx) => {
      // One phone, one owner. After a reinstall the app signs in as a new person, and the
      // old account must not keep sending this phone pushes for requests it can no longer see.
      if (body.token) {
        await tx`
          UPDATE users SET push_token = NULL, updated_at = now()
          WHERE push_token = ${body.token} AND id <> ${user.id}
        `;
      }
      await tx`
        UPDATE users SET push_token = ${body.token}, updated_at = now()
        WHERE id = ${user.id}
      `;
    });
    return c.json({ registered: body.token !== null });
  });

  // Delete everything this account ever did. Required by app stores and by GDPR.
  app.delete("/v1/session", async (c) => {
    const user = c.get("user");

    await sql.begin(async (tx) => {
      // Prayers this person said for others disappear with them, so the counts shown
      // on those requests go down by one to stay honest.
      await tx`
        UPDATE prayer_requests r
        SET prayers_count = GREATEST(r.prayers_count - 1, 0)
        FROM prayers p
        WHERE p.request_id = r.id
          AND p.user_id = ${user.id}
          AND r.author_id <> ${user.id}
      `;
      // Their own requests go, and with them every prayer, report and earlier version.
      await tx`DELETE FROM prayer_requests WHERE author_id = ${user.id}`;
      await tx`DELETE FROM rate_limit_buckets WHERE subject_key = ${`user:${user.id}`}`;
      // Removes their prayers, reports and any ban record through ON DELETE CASCADE.
      await tx`DELETE FROM users WHERE id = ${user.id}`;
    });

    return c.json({ deleted: true });
  });

  app.route("/v1/requests", requestsRoutes);
  app.route("/v1/blocks", blocksRoutes);
  app.route("/v1/admin", adminRoutes);

  app.notFound(() => {
    throw new ApiError(404, "not_found", "Route not found");
  });

  return app;
}
