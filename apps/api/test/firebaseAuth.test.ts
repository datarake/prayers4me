import { SignJWT, generateKeyPair, type CryptoKey } from "jose";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { parseEnv } from "../src/env.js";
import { createVerifiers } from "../src/firebaseAuth.js";
import { resetDb, sql } from "./helpers.js";
import { TEST_DATABASE_URL } from "./testDb.js";

const PROJECT_ID = "prayers4me";
const PROJECT_NUMBER = "799342684788";

let idKey: CryptoKey;
let idPublic: CryptoKey;
let appKey: CryptoKey;
let appPublic: CryptoKey;
let strangerKey: CryptoKey;

beforeAll(async () => {
  ({ privateKey: idKey, publicKey: idPublic } = await generateKeyPair("RS256"));
  ({ privateKey: appKey, publicKey: appPublic } = await generateKeyPair("RS256"));
  ({ privateKey: strangerKey } = await generateKeyPair("RS256"));
});

function idToken(
  over: {
    uid?: string;
    iss?: string;
    aud?: string;
    exp?: string;
    key?: CryptoKey;
    email?: string;
    emailVerified?: boolean;
  } = {},
) {
  const claims: Record<string, unknown> = { firebase: { sign_in_provider: over.email ? "google.com" : "anonymous" } };
  if (over.email) {
    claims.email = over.email;
    claims.email_verified = over.emailVerified ?? true;
  }
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setSubject(over.uid ?? "firebase-user-1")
    .setIssuer(over.iss ?? `https://securetoken.google.com/${PROJECT_ID}`)
    .setAudience(over.aud ?? PROJECT_ID)
    .setIssuedAt()
    .setExpirationTime(over.exp ?? "1h")
    .sign(over.key ?? idKey);
}

function appCheckToken(over: { iss?: string; aud?: string; key?: CryptoKey } = {}) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: "a1" })
    .setSubject("1:799342684788:ios:abc")
    .setIssuer(over.iss ?? `https://firebaseappcheck.googleapis.com/${PROJECT_NUMBER}`)
    .setAudience(over.aud ?? `projects/${PROJECT_NUMBER}`)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(over.key ?? appKey);
}

function makeFirebaseApp(overrides: Record<string, string> = {}) {
  const env = parseEnv({
    NODE_ENV: "test",
    DATABASE_URL: TEST_DATABASE_URL,
    AUTH_MODE: "firebase",
    FIREBASE_PROJECT_ID: PROJECT_ID,
    FIREBASE_PROJECT_NUMBER: PROJECT_NUMBER,
    IP_LIMITS: "off",
    NEW_ACCOUNT_PROBATION: "off",
    ...overrides,
  });
  const verifiers = createVerifiers(env, {
    idToken: async () => idPublic,
    appCheck: async () => appPublic,
  });
  return createApp(env, sql, verifiers);
}

async function call(
  app: ReturnType<typeof makeFirebaseApp>,
  path: string,
  headers: Record<string, string>,
) {
  const res = await app.request(path, { headers });
  return { status: res.status, json: (await res.json().catch(() => null)) as any };
}

describe("Firebase sign-in tokens", () => {
  beforeEach(resetDb);

  it("accepts a valid token and ties the account to the token's user id", async () => {
    const app = makeFirebaseApp();
    const res = await call(app, "/v1/session", { Authorization: `Bearer ${await idToken()}` });
    expect(res.status).toBe(200);
    const rows = await sql`SELECT firebase_uid FROM users`;
    expect(rows.map((r) => r.firebase_uid)).toEqual(["firebase-user-1"]);
  });

  it("gives the same account back on the next call", async () => {
    const app = makeFirebaseApp();
    const first = await call(app, "/v1/session", { Authorization: `Bearer ${await idToken()}` });
    const second = await call(app, "/v1/session", { Authorization: `Bearer ${await idToken()}` });
    expect(second.json.id).toBe(first.json.id);
  });

  it("keeps two different installs apart", async () => {
    const app = makeFirebaseApp();
    const a = await call(app, "/v1/session", { Authorization: `Bearer ${await idToken({ uid: "a" })}` });
    const b = await call(app, "/v1/session", { Authorization: `Bearer ${await idToken({ uid: "b" })}` });
    expect(a.json.id).not.toBe(b.json.id);
  });

  it.each([
    ["signed with a key Google does not publish", () => idToken({ key: strangerKey })],
    ["issued for another project", () => idToken({ iss: "https://securetoken.google.com/other", aud: "other" })],
    ["with the wrong audience", () => idToken({ aud: "other" })],
    ["expired", () => idToken({ exp: "-1m" })],
  ])("rejects a token %s", async (_label, make) => {
    const app = makeFirebaseApp();
    const res = await call(app, "/v1/session", { Authorization: `Bearer ${await make()}` });
    expect(res.status).toBe(401);
    expect((await sql`SELECT 1 FROM users`).length).toBe(0);
  });

  it("rejects garbage and the old dev tokens", async () => {
    const app = makeFirebaseApp();
    for (const token of ["not-a-jwt", "dev:someone", ""]) {
      const res = await call(app, "/v1/session", { Authorization: `Bearer ${token}` });
      expect(res.status).toBe(401);
    }
    expect((await call(app, "/v1/session", {})).status).toBe(401);
  });
});

describe("device attestation (App Check)", () => {
  beforeEach(resetDb);

  async function headers(extra: Record<string, string> = {}) {
    return { Authorization: `Bearer ${await idToken()}`, ...extra };
  }

  it("is ignored when off", async () => {
    const app = makeFirebaseApp({ APP_CHECK: "off" });
    expect((await call(app, "/v1/session", await headers())).status).toBe(200);
  });

  it("lets a genuine app through when enforced", async () => {
    const app = makeFirebaseApp({ APP_CHECK: "enforce" });
    const res = await call(app, "/v1/session", await headers({ "X-Firebase-AppCheck": await appCheckToken() }));
    expect(res.status).toBe(200);
  });

  it("refuses a call with no attestation when enforced, before creating an account", async () => {
    const app = makeFirebaseApp({ APP_CHECK: "enforce" });
    const res = await call(app, "/v1/session", await headers());
    expect(res.status).toBe(401);
    expect(res.json.error.code).toBe("app_check_failed");
    expect((await sql`SELECT 1 FROM users`).length).toBe(0);
  });

  it.each([
    ["a forged signature", () => appCheckToken({ key: strangerKey })],
    ["another project", () => appCheckToken({ iss: "https://firebaseappcheck.googleapis.com/1", aud: "projects/1" })],
    ["a sign-in token used as attestation", () => idToken()],
  ])("refuses %s when enforced", async (_label, make) => {
    const app = makeFirebaseApp({ APP_CHECK: "enforce" });
    const res = await call(app, "/v1/session", await headers({ "X-Firebase-AppCheck": await make() }));
    expect(res.status).toBe(401);
    expect(res.json.error.code).toBe("app_check_failed");
  });

  it("only logs in log mode, and still serves the call", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const app = makeFirebaseApp({ APP_CHECK: "log" });
    expect((await call(app, "/v1/session", await headers())).status).toBe(200);
    expect(
      (await call(app, "/v1/session", await headers({ "X-Firebase-AppCheck": "garbage" }))).status,
    ).toBe(200);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not require a valid sign-in token to be skipped: attestation never replaces login", async () => {
    const app = makeFirebaseApp({ APP_CHECK: "enforce" });
    const res = await call(app, "/v1/session", { "X-Firebase-AppCheck": await appCheckToken() });
    expect(res.status).toBe(401);
  });
});

describe("admin access from a Google sign-in", () => {
  beforeEach(resetDb);

  const admin = { ADMIN_EMAILS: "Boss@Example.com, second@example.com" };

  async function role(app: ReturnType<typeof makeFirebaseApp>, token: Promise<string>) {
    return (await call(app, "/v1/admin/me", { Authorization: `Bearer ${await token}` })).status;
  }

  it("lets a verified email on the allowlist in, whatever its case", async () => {
    const app = makeFirebaseApp(admin);
    expect(await role(app, idToken({ uid: "g1", email: "boss@example.com" }))).toBe(200);
    expect(await role(app, idToken({ uid: "g2", email: "SECOND@example.com" }))).toBe(200);
  });

  it("refuses an email that is not on the list", async () => {
    const app = makeFirebaseApp(admin);
    expect(await role(app, idToken({ uid: "g3", email: "someone@example.com" }))).toBe(403);
  });

  it("refuses an allowlisted address whose email is not verified", async () => {
    const app = makeFirebaseApp(admin);
    expect(await role(app, idToken({ uid: "g4", email: "boss@example.com", emailVerified: false }))).toBe(403);
  });

  it("refuses an anonymous app user, even if the database says admin", async () => {
    const app = makeFirebaseApp(admin);
    await call(app, "/v1/session", { Authorization: `Bearer ${await idToken({ uid: "anon" })}` });
    await sql`UPDATE users SET role = 'admin' WHERE firebase_uid = 'anon'`;
    expect(await role(app, idToken({ uid: "anon" }))).toBe(403);
  });

  it("refuses everyone when the allowlist is empty", async () => {
    const app = makeFirebaseApp();
    expect(await role(app, idToken({ uid: "g5", email: "boss@example.com" }))).toBe(403);
  });

  it("does not need App Check for the admin page, but the app routes still do", async () => {
    const app = makeFirebaseApp({ ...admin, APP_CHECK: "enforce" });
    expect(await role(app, idToken({ uid: "g6", email: "boss@example.com" }))).toBe(200);
    const feed = await call(app, "/v1/requests?language=en", {
      Authorization: `Bearer ${await idToken({ uid: "g6", email: "boss@example.com" })}`,
    });
    expect(feed.status).toBe(401);
  });
});
