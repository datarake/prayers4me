import { Hono } from "hono";
import { cors } from "hono/cors";
import { APP_NAME } from "@prayers4me/shared";
import {
  createAuthMiddleware,
  type AppVariables,
} from "./auth.js";
import type { Sql } from "./db/client.js";
import type { Env } from "./env.js";
import { ApiError, jsonError } from "./errors.js";
import { adminRoutes } from "./routes/admin.js";
import { requestsRoutes } from "./routes/requests.js";

export function createApp(env: Env, sql: Sql) {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use(
    "*",
    cors({
      origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(","),
      allowHeaders: ["Authorization", "Content-Type"],
    }),
  );

  app.use("*", async (c, next) => {
    c.set("env", env);
    c.set("sql", sql);
    await next();
  });

  app.onError((err, c) => jsonError(c, err));

  app.get("/health", (c) =>
    c.json({ ok: true, service: APP_NAME, authMode: env.AUTH_MODE }),
  );

  const auth = createAuthMiddleware();

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

  app.route("/v1/requests", requestsRoutes);
  app.route("/v1/admin", adminRoutes);

  app.notFound(() => {
    throw new ApiError(404, "not_found", "Route not found");
  });

  return app;
}
