import { beforeEach, describe, expect, it } from "vitest";
import { client, insertRequest, makeApp, makeUser, resetDb, sql } from "./helpers.js";

const { app } = makeApp();
const call = client(app);

async function makeAdmin(name = "mod") {
  const id = await makeUser(call, name);
  await sql`UPDATE users SET role = 'admin' WHERE id = ${id}`;
  return id;
}

/** A request with `count` reports from different accounts. */
async function reported(authorName: string, count: number, reason = "spam", note?: string) {
  const author = await makeUser(call, authorName);
  const id = await insertRequest(author, { name: `${authorName}'s request` });
  for (let i = 0; i < count; i++) {
    const reporter = await makeUser(call, `${authorName}-reporter-${i}`);
    await sql`
      INSERT INTO reports (request_id, reporter_id, reason, note, ip_hash)
      VALUES (${id}, ${reporter}, ${reason}, ${i === 0 ? (note ?? null) : null}, ${`net-${i}`})
    `;
  }
  return { author, id };
}

describe("review queue", () => {
  beforeEach(resetDb);

  it("is for admins only", async () => {
    await makeUser(call, "regular");
    for (const path of ["/v1/admin/queue", "/v1/admin/hidden", "/v1/admin/actions", "/v1/admin/me"]) {
      expect((await call("GET", path, { user: "regular" })).status).toBe(403);
      expect((await call("GET", path)).status).toBe(401);
    }
  });

  it("lists a request once, with its reports counted by reason", async () => {
    await makeAdmin();
    const { id, author } = await reported("troll", 3, "spam", "selling shoes");
    const other = await makeUser(call, "late");
    await sql`INSERT INTO reports (request_id, reporter_id, reason, ip_hash) VALUES (${id}, ${other}, 'harassment', 'net-9')`;

    const res = await call("GET", "/v1/admin/queue", { user: "mod" });
    expect(res.status).toBe(200);
    expect(res.json.items).toHaveLength(1);
    expect(res.json.items[0]).toMatchObject({
      id,
      author_id: author,
      report_count: 4,
      distinct_networks: 4,
      reasons: { spam: 3, harassment: 1 },
      notes: ["selling shoes"],
      author_banned: false,
      status: "active",
    });
  });

  it("puts the most recently reported request first and leaves out unreported ones", async () => {
    await makeAdmin();
    const first = await reported("a", 1);
    await insertRequest(await makeUser(call, "quiet"), { name: "Never reported" });
    const second = await reported("b", 1);
    await sql`UPDATE reports SET created_at = now() - interval '1 day' WHERE request_id = ${first.id}`;
    const ids = (await call("GET", "/v1/admin/queue", { user: "mod" })).json.items.map((i: any) => i.id);
    expect(ids).toEqual([second.id, first.id]);
  });

  it.each(["hide", "restore", "dismiss", "remove"])("%s closes the reports and logs the action", async (action) => {
    const adminId = await makeAdmin();
    const { id } = await reported("x", 2);
    const res = await call("POST", `/v1/admin/requests/${id}/${action}`, {
      user: "mod",
      body: { note: "looked at it" },
    });
    expect(res.status).toBe(200);
    expect((await call("GET", "/v1/admin/queue", { user: "mod" })).json.items).toHaveLength(0);

    const log = (await call("GET", "/v1/admin/actions", { user: "mod" })).json.items;
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ action, request_id: id, admin_id: adminId, note: "looked at it" });
    // The log never holds request text.
    expect(JSON.stringify(log)).not.toContain("A request used by a test");
    expect(JSON.stringify(log)).not.toContain("x's request");
  });

  it("dismiss keeps the request visible", async () => {
    await makeAdmin();
    const { id } = await reported("fine", 1);
    await call("POST", `/v1/admin/requests/${id}/dismiss`, { user: "mod" });
    const feed = await call("GET", "/v1/requests?language=en", { user: "mod" });
    expect(feed.json.items.map((i: any) => i.id)).toContain(id);
  });

  it("remove takes it out of the feed and out of the hidden list for good", async () => {
    await makeAdmin();
    const { id } = await reported("bad", 1);
    await call("POST", `/v1/admin/requests/${id}/remove`, { user: "mod" });
    const [row] = await sql`SELECT status FROM prayer_requests WHERE id = ${id}`;
    expect(row!.status).toBe("removed");
    expect((await call("GET", "/v1/admin/hidden", { user: "mod" })).json.items).toHaveLength(0);
  });

  it("never brings back a request its author deleted", async () => {
    await makeAdmin();
    const author = await makeUser(call, "gone");
    const id = await insertRequest(author, { status: "removed" });
    expect((await call("POST", `/v1/admin/requests/${id}/restore`, { user: "mod" })).status).toBe(404);
    expect((await call("POST", `/v1/admin/requests/${id}/hide`, { user: "mod" })).status).toBe(404);
    const [row] = await sql`SELECT status FROM prayer_requests WHERE id = ${id}`;
    expect(row!.status).toBe("removed");
  });

  it("answers 404 for an unknown request and rejects a note that is too long", async () => {
    await makeAdmin();
    const { id } = await reported("n", 1);
    expect((await call("POST", "/v1/admin/requests/00000000-0000-0000-0000-000000000000/dismiss", { user: "mod" })).status).toBe(404);
    expect((await call("POST", `/v1/admin/requests/${id}/dismiss`, { user: "mod", body: { note: "x".repeat(501) } })).status).toBe(400);
    expect((await call("POST", `/v1/admin/requests/${id}/dismiss`, { user: "mod", rawBody: "{nope" })).status).toBe(400);
  });

  it("lists hidden requests and lets a moderator restore one", async () => {
    await makeAdmin();
    const author = await makeUser(call, "someone");
    const id = await insertRequest(author, { status: "hidden", name: "Under review" });
    const hidden = (await call("GET", "/v1/admin/hidden", { user: "mod" })).json.items;
    expect(hidden.map((i: any) => i.id)).toEqual([id]);
    await call("POST", `/v1/admin/requests/${id}/restore`, { user: "mod" });
    expect((await call("GET", "/v1/admin/hidden", { user: "mod" })).json.items).toHaveLength(0);
  });
});

describe("bans", () => {
  beforeEach(resetDb);

  it("a ban closes the reports about that person's requests and is logged", async () => {
    await makeAdmin();
    const { id, author } = await reported("troll", 2);
    await call("POST", `/v1/admin/users/${author}/ban`, { user: "mod", body: { reason: "spam accounts" } });
    expect((await call("GET", "/v1/admin/queue", { user: "mod" })).json.items).toHaveLength(0);
    const log = (await call("GET", "/v1/admin/actions", { user: "mod" })).json.items;
    expect(log[0]).toMatchObject({ action: "ban", user_id: author, note: "spam accounts" });
    const [row] = await sql`SELECT status FROM prayer_requests WHERE id = ${id}`;
    expect(row!.status).toBe("hidden");
  });

  it("the queue shows when the author is already banned", async () => {
    await makeAdmin();
    const { author } = await reported("troll", 1);
    await sql`INSERT INTO bans (user_id, reason) VALUES (${author}, 'earlier')`;
    await sql`UPDATE reports SET reviewed_at = NULL`;
    expect((await call("GET", "/v1/admin/queue", { user: "mod" })).json.items[0].author_banned).toBe(true);
  });

  it("answers 404 when banning someone who does not exist", async () => {
    await makeAdmin();
    const res = await call("POST", "/v1/admin/users/00000000-0000-0000-0000-000000000000/ban", {
      user: "mod",
      body: { reason: "no such person" },
    });
    expect(res.status).toBe(404);
  });

  it("lifts a ban: they can post again, hidden requests stay hidden, and it is logged", async () => {
    await makeAdmin();
    const { id, author } = await reported("troll", 1);
    await call("POST", `/v1/admin/users/${author}/ban`, { user: "mod", body: { reason: "flooding" } });
    const res = await call("DELETE", `/v1/admin/users/${author}/ban`, { user: "mod", body: { note: "apologised" } });
    expect(res.json).toEqual({ userId: author, banned: false });

    const again = await call("POST", "/v1/requests", {
      user: "troll",
      body: { language: "en", displayName: "Troll", message: "A new and perfectly fine request here." },
    });
    expect(again.status).toBe(201);
    const [row] = await sql`SELECT status FROM prayer_requests WHERE id = ${id}`;
    expect(row!.status).toBe("hidden");
    const log = (await call("GET", "/v1/admin/actions", { user: "mod" })).json.items;
    expect(log[0]).toMatchObject({ action: "unban", user_id: author, note: "apologised" });
  });

  it("unbanning someone who is not banned is a 404", async () => {
    await makeAdmin();
    const other = await makeUser(call, "fine");
    expect((await call("DELETE", `/v1/admin/users/${other}/ban`, { user: "mod" })).status).toBe(404);
  });
});
