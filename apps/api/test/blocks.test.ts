import { MAX_BLOCKS_PER_USER } from "@prayers4me/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { client, insertRequest, makeApp, makeUser, resetDb, sql } from "./helpers.js";

const { app } = makeApp();
const call = client(app);

const names = (res: { json: any }) => res.json.items.map((i: { displayName: string }) => i.displayName);

describe("blocking an author", () => {
  beforeEach(resetDb);

  it("hides every request of that author from my feed, and only mine", async () => {
    const bad = await makeUser(call, "bad");
    const fine = await makeUser(call, "fine");
    await makeUser(call, "me");
    await makeUser(call, "other");
    const first = await insertRequest(bad, { name: "Bad one" });
    await insertRequest(bad, { name: "Bad two" });
    await insertRequest(fine, { name: "Fine" });

    const res = await call("POST", `/v1/requests/${first}/block`, { user: "me" });
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ blocked: true });

    expect(names(await call("GET", "/v1/requests?language=en", { user: "me" }))).toEqual(["Fine"]);
    // Someone else still sees everything.
    expect(names(await call("GET", "/v1/requests?language=en", { user: "other" }))).toHaveLength(3);
    // And the "needs prayer" list hides them too.
    expect(names(await call("GET", "/v1/requests?language=en&filter=waiting", { user: "me" }))).toEqual(["Fine"]);
  });

  it("blocking twice is harmless", async () => {
    const author = await makeUser(call, "author");
    await makeUser(call, "me");
    const id = await insertRequest(author);
    expect((await call("POST", `/v1/requests/${id}/block`, { user: "me" })).status).toBe(200);
    expect((await call("POST", `/v1/requests/${id}/block`, { user: "me" })).status).toBe(200);
    expect((await call("GET", "/v1/blocks", { user: "me" })).json).toEqual({ count: 1 });
  });

  it("cannot block yourself", async () => {
    await makeUser(call, "me");
    const me = await makeUser(call, "me");
    const id = await insertRequest(me);
    const res = await call("POST", `/v1/requests/${id}/block`, { user: "me" });
    expect(res.status).toBe(400);
    expect(res.json.error.code ?? res.json.code).toBe("cannot_block_self");
  });

  it("answers 404 for a request that is missing, removed or not a uuid", async () => {
    const author = await makeUser(call, "author");
    await makeUser(call, "me");
    const removed = await insertRequest(author, { status: "removed" });
    expect((await call("POST", `/v1/requests/${removed}/block`, { user: "me" })).status).toBe(404);
    expect(
      (await call("POST", "/v1/requests/00000000-0000-0000-0000-000000000000/block", { user: "me" })).status,
    ).toBe(404);
    expect((await call("POST", "/v1/requests/nope/block", { user: "me" })).status).toBe(404);
  });

  it("a blocked author's request can no longer be prayed for", async () => {
    const author = await makeUser(call, "author");
    await makeUser(call, "me");
    const id = await insertRequest(author);
    await call("POST", `/v1/requests/${id}/block`, { user: "me" });
    expect((await call("POST", `/v1/requests/${id}/pray`, { user: "me" })).status).toBe(404);
  });

  it("drops the author's requests from the list of requests I prayed for", async () => {
    const author = await makeUser(call, "author");
    const me = await makeUser(call, "me");
    const id = await insertRequest(author, { name: "Old" });
    await sql`INSERT INTO prayers (request_id, user_id) VALUES (${id}, ${me})`;
    expect(names(await call("GET", "/v1/requests/prayed", { user: "me" }))).toEqual(["Old"]);
    await call("POST", `/v1/requests/${id}/block`, { user: "me" });
    expect(names(await call("GET", "/v1/requests/prayed", { user: "me" }))).toEqual([]);
  });

  it("the blocked author is not affected and is told nothing", async () => {
    const author = await makeUser(call, "author");
    await makeUser(call, "me");
    const id = await insertRequest(author, { name: "Mine" });
    await call("POST", `/v1/requests/${id}/block`, { user: "me" });
    const mine = await call("GET", "/v1/requests/me", { user: "author" });
    expect(names(mine)).toEqual(["Mine"]);
    expect(mine.json.items[0].status).toBe("active");
  });

  it("unblock everyone brings requests back and reports how many", async () => {
    const a = await makeUser(call, "a");
    const b = await makeUser(call, "b");
    await makeUser(call, "me");
    const ra = await insertRequest(a, { name: "A" });
    const rb = await insertRequest(b, { name: "B" });
    await call("POST", `/v1/requests/${ra}/block`, { user: "me" });
    await call("POST", `/v1/requests/${rb}/block`, { user: "me" });
    expect((await call("GET", "/v1/blocks", { user: "me" })).json).toEqual({ count: 2 });
    expect(names(await call("GET", "/v1/requests?language=en", { user: "me" }))).toEqual([]);

    const res = await call("DELETE", "/v1/blocks", { user: "me" });
    expect(res.json).toEqual({ unblocked: 2 });
    expect(names(await call("GET", "/v1/requests?language=en", { user: "me" }))).toHaveLength(2);
    expect((await call("GET", "/v1/blocks", { user: "me" })).json).toEqual({ count: 0 });
  });

  it("stops at the limit", async () => {
    await makeUser(call, "me");
    const me = await makeUser(call, "me");
    const author = await makeUser(call, "target");
    const id = await insertRequest(author);
    // Fill the list with other accounts directly.
    const rows = Array.from({ length: MAX_BLOCKS_PER_USER }, (_, i) => `filler-${i}`);
    for (const name of rows) {
      const filler = await makeUser(call, name);
      await sql`INSERT INTO blocks (blocker_id, blocked_id) VALUES (${me}, ${filler})`;
    }
    const res = await call("POST", `/v1/requests/${id}/block`, { user: "me" });
    expect(res.status).toBe(409);
  }, 60000);

  it("deleting my account erases my blocks", async () => {
    const author = await makeUser(call, "author");
    const me = await makeUser(call, "me");
    const id = await insertRequest(author);
    await call("POST", `/v1/requests/${id}/block`, { user: "me" });
    await sql`DELETE FROM users WHERE id = ${me}`;
    const left = await sql`SELECT 1 FROM blocks`;
    expect(left).toHaveLength(0);
  });
});
