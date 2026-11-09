import { z } from "zod";

const DEV_HASH_SECRET = "dev-only-change-me";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(8080),
    DATABASE_URL: z.string().min(1),
    /** Required on purpose: there is no safe default. `dev` accepts `Bearer dev:<any id>`. */
    AUTH_MODE: z.enum(["dev", "firebase"]),
    CORS_ORIGIN: z.string().default("*"),
    /** Needed when AUTH_MODE is firebase: ID tokens must be issued for this project. */
    FIREBASE_PROJECT_ID: z.string().optional(),
    /** Needed when APP_CHECK is not off: the numeric id of the same project. */
    FIREBASE_PROJECT_NUMBER: z.string().regex(/^\d+$/).optional(),
    /**
     * Device attestation. `off` ignores it, `log` checks the token when one is sent and logs
     * failures without blocking, `enforce` refuses calls without a valid App Check token.
     */
    APP_CHECK: z.enum(["off", "log", "enforce"]).default("off"),
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
    IP_HASH_SECRET: z.string().min(8).default(DEV_HASH_SECRET),
    /**
     * Comma separated emails allowed to use the admin page. Only a verified Google sign-in with
     * one of these addresses is an admin; the database role is ignored in firebase mode.
     */
    ADMIN_EMAILS: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    /** "log" prints notifications instead of sending them (safe default for development). */
    PUSH_MODE: z.enum(["log", "expo"]).default("log"),
  })
  .superRefine((env, ctx) => {
    const missing = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (env.AUTH_MODE === "firebase" && !env.FIREBASE_PROJECT_ID) {
      missing("FIREBASE_PROJECT_ID", "required when AUTH_MODE is firebase");
    }
    if (env.APP_CHECK !== "off" && !env.FIREBASE_PROJECT_NUMBER) {
      missing("FIREBASE_PROJECT_NUMBER", "required when APP_CHECK is log or enforce");
    }
    if (env.NODE_ENV !== "production") return;
    // A production deploy that forgets one setting must not start in a weak configuration.
    const problem = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (env.AUTH_MODE === "dev") {
      problem("AUTH_MODE", "dev auth lets anyone act as any user and cannot run in production");
    }
    if (env.IP_HASH_SECRET === DEV_HASH_SECRET || env.IP_HASH_SECRET.length < 24) {
      problem("IP_HASH_SECRET", "set a random secret of at least 24 characters");
    }
    if (env.APP_CHECK !== "enforce") {
      problem("APP_CHECK", "device attestation must be enforced in production");
    }
    if (env.CORS_ORIGIN === "*") {
      problem("CORS_ORIGIN", "list the allowed origins instead of *");
    }
    if (env.IP_LIMITS === "off" || env.NEW_ACCOUNT_PROBATION === "off") {
      problem("IP_LIMITS", "abuse protection cannot be turned off in production");
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Validates a raw environment. Throws a readable error listing every problem. */
export function parseEnv(raw: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (i) => `  ${i.path.join(".") || "env"}: ${i.message}`,
    );
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  return parsed.data;
}

export function loadEnv(): Env {
  return parseEnv(process.env);
}
