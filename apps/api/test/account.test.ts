import { beforeEach, describe, expect, it } from "vitest";
import { client, createRequest, makeApp, makeUser, resetDb, sql } from "./helpers.js";

const { app } = makeApp();
const call = client(app);

async function count(table: string, where = "TRUE") {
  const [row] = await sql.unsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM ${table} WHERE ${where}`);
  return row!.n;
}

describe("deleting an account", () => {
  beforeEach(resetDb);

  it("needs authentication", async () => {
    expect((await call("DELETE", "/v1/session")).status).toBe(401);
  });

  it("removes the person, their requests and everything attached to them", async () => {
    const mine = await createRequest(call, "ana");
    await call("POST", `/v1/requests/${mine.json.id}/pray`, { user: "ben" });
    await call("PATCH", `/v1/requests/${mine.json.id}`, {
      user: "ana",
      body: { displayName: "Ana", message: "Please pray for my mother, she is in the hospital now." },
    });

    const res = await call("DELETE", "/v1/session", { user: "ana" });
    expect(res.json).toEqual({ deleted: true });

    expect(await count("users", "firebase_uid = 'dev:ana'")).toBe(0);
    expect(await count("prayer_requests")).toBe(0);
    expect(await count("prayers")).toBe(0);
    expect(await count("request_edits")).toBe(0);
  });

  it("takes back the prayers they said, so counts elsewhere stay honest", async () => {
    const a = await createRequest(call, "ana");
    const b = await createRequest(call, "ben");
    await call("POST", `/v1/requests/${a.json.id}/pray`, { user: "cy" });
    await call("POST", `/v1/requests/${b.json.id}/pray`, { user: "cy" });
    await call("POST", `/v1/requests/${a.json.id}/pray`, { user: "di" });

    await call("DELETE", "/v1/session", { user: "cy" });

    const [first] = await sql`SELECT prayers_count FROM prayer_requests WHERE id = ${a.json.id}`;
    const [second] = await sql`SELECT prayers_count FROM prayer_requests WHERE id = ${b.json.id}`;
    expect(first!.prayers_count).toBe(1);
    expect(second!.prayers_count).toBe(0);
  });

  it("forgets their rate limit counters", async () => {
    await createRequest(call, "ana");
    await call("DELETE", "/v1/session", { user: "ana" });
    expect(await count("rate_limit_buckets", "subject_key LIKE 'user:%'")).toBe(0);
  });

  it("works for a moderator who has banned someone", async () => {
    await makeUser(call, "mod");
    await sql`UPDATE users SET role = 'admin' WHERE firebase_uid = 'dev:mod'`;
    const troublemaker = await makeUser(call, "troll");

    const ban = await call("POST", `/v1/admin/users/${troublemaker}/ban`, {
      user: "mod",
      body: { reason: "testing" },
    });
    expect(ban.status).toBe(200);

    expect((await call("DELETE", "/v1/session", { user: "mod" })).status).toBe(200);
    expect(await count("bans")).toBe(1);
    const [ban1] = await sql`SELECT created_by FROM bans`;
    expect(ban1!.created_by).toBeNull();
  });

  it("starts a fresh identity if the same device comes back", async () => {
    await createRequest(call, "ana");
    await call("DELETE", "/v1/session", { user: "ana" });
    const again = await call("GET", "/v1/requests/me", { user: "ana" });
    expect(again.status).toBe(200);
    expect(again.json.items).toEqual([]);
  });
});
