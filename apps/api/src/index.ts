import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { createDb } from "./db/client.js";
import { loadEnv } from "./env.js";

const env = loadEnv();
const sql = createDb(env);
const app = createApp(env, sql);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Prayers4me API listening on :${info.port} (auth=${env.AUTH_MODE})`);
});
