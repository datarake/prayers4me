import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/env.js";

const dev = { DATABASE_URL: "postgres://x", AUTH_MODE: "dev" };
const production = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://x",
  AUTH_MODE: "firebase",
  CORS_ORIGIN: "https://prayers4me.app",
  IP_HASH_SECRET: "a-random-secret-of-sufficient-length-1234",
};

describe("configuration", () => {
  it("accepts a development setup", () => {
    expect(parseEnv(dev).AUTH_MODE).toBe("dev");
  });

  it("has no default auth mode, so a forgotten setting cannot open the API", () => {
    expect(() => parseEnv({ DATABASE_URL: "postgres://x" })).toThrow(/AUTH_MODE/);
  });

  it("turns abuse protection on unless told otherwise", () => {
    const env = parseEnv(dev);
    expect(env.IP_LIMITS).toBe("on");
    expect(env.NEW_ACCOUNT_PROBATION).toBe("on");
  });

  it("accepts a complete production setup", () => {
    expect(() => parseEnv(production)).not.toThrow();
  });

  it.each([
    ["dev auth", { AUTH_MODE: "dev" }, /AUTH_MODE/],
    ["the development hash secret", { IP_HASH_SECRET: "dev-only-change-me" }, /IP_HASH_SECRET/],
    ["a short hash secret", { IP_HASH_SECRET: "short-secret-123" }, /IP_HASH_SECRET/],
    ["any origin allowed", { CORS_ORIGIN: "*" }, /CORS_ORIGIN/],
    ["per-network limits off", { IP_LIMITS: "off" }, /IP_LIMITS/],
    ["new account limits off", { NEW_ACCOUNT_PROBATION: "off" }, /IP_LIMITS/],
  ])("refuses to start in production with %s", (_label, change, message) => {
    expect(() => parseEnv({ ...production, ...change })).toThrow(message);
  });

  it("lists every problem at once", () => {
    try {
      parseEnv({ ...production, AUTH_MODE: "dev", CORS_ORIGIN: "*" });
      expect.unreachable();
    } catch (err) {
      expect(String(err)).toMatch(/AUTH_MODE/);
      expect(String(err)).toMatch(/CORS_ORIGIN/);
    }
  });
});
