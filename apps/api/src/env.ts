import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  AUTH_MODE: z.enum(["dev", "firebase"]).default("dev"),
  CORS_ORIGIN: z.string().default("*"),
  FIREBASE_PROJECT_ID: z.string().optional(),
  /** "log" prints notifications instead of sending them (safe default for development). */
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
