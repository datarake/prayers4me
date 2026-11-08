import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  AUTH_MODE: z.enum(["dev", "firebase"]).default("dev"),
  CORS_ORIGIN: z.string().default("*"),
  FIREBASE_PROJECT_ID: z.string().optional(),
  /** "log" prints notifications instead of sending them (safe default for development). */
  /**
   * How many reverse proxies sit in front of the API. 0 uses the socket address (safe when
   * the API is reached directly). With N hops, the client is the Nth entry from the right of
   * X-Forwarded-For, so a header the client supplies can never choose its own address.
   */
  TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  /** Per-network limits next to the per-account ones. Turn off only for local development. */
  IP_LIMITS: z.enum(["on", "off"]).default("on"),
  /** Stricter limits and low-weight reports for accounts under 24 hours old. Off only for local development. */
  NEW_ACCOUNT_PROBATION: z.enum(["on", "off"]).default("on"),
  /** Salt for network fingerprints. Set a long random value in production. */
  IP_HASH_SECRET: z.string().min(8).default("dev-only-change-me"),
  PUSH_MODE: z.enum(["log", "expo"]).default("log"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}
