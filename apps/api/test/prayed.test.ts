import { beforeEach, describe, expect, it } from "vitest";
import { client, insertRequest, makeApp, makeUser, resetDb, sql } from "./helpers.js";

const { app } = makeApp();
const call = client(app);

/** Records a prayer directly so tests control the exact time it happened. */
async function prayAt(userId: string, requestId: string, at: string) {
  await sql`
    INSERT INTO prayers (request_id, user_id, created_at)
    VALUES (${requestId}, ${userId}, (${at}::text)::timestamptz)
  `;
}

describe("requests I prayed for", () => {
  beforeEach(resetDb);

  it("lists only my own prayers, newest prayer first", async () => {
    const author = await makeUser(call, "author");
    const me = await makeUser(call, "me");
    const other = await makeUser(call, "other");
    const a = await insertRequest(author, { name: "A" });
    const b = await insertRequest(author, { name: "B" });
    const c = await insertRequest(author, { name: "C" });
    await prayAt(me, a, "2024-01-01 10:00:00+00");
    await prayAt(me, b, "2024-01-02 10:00:00+00");
    await prayAt(other, c, "2024-01-03 10:00:00+00");

    const res = await call("GET", "/v1/requests/prayed", { user: "me" });
    expect(res.status).toBe(200);
    expect(res.json.items.map((i: { displayName: string }) => i.displayName)).toEqual(["B", "A"]);
    expect(res.json.items.every((i: { prayedByMe: boolean }) => i.prayedByMe)).toBe(true);
    expect(res.json.nextCursor).toBeNull();
  });

  it("is empty for someone who has not prayed", async () => {
    const author = await makeUser(call, "author");
    await makeUser(call, "me");
    await insertRequest(author);
    const res = await call("GET", "/v1/requests/prayed", { user: "me" });
    expect(res.json.items).toEqual([]);
  });

  it("drops requests that were removed or are under review", async () => {
    const author = await makeUser(call, "author");
    const me = await makeUser(call, "me");
    const ok = await insertRequest(author, { name: "Visible" });
    const hidden = await insertRequest(author, { name: "Hidden", status: "hidden" });
    const removed = await insertRequest(author, { name: "Removed", status: "removed" });
    for (const id of [ok, hidden, removed]) await prayAt(me, id, "2024-01-01 10:00:00+00");

    const res = await call("GET", "/v1/requests/prayed", { user: "me" });
    expect(res.json.items.map((i: { displayName: string }) => i.displayName)).toEqual(["Visible"]);
  });

  it("pages without skipping or repeating, even when prayers share a timestamp", async () => {
    const author = await makeUser(call, "author");
    const me = await makeUser(call, "me");
    for (let i = 0; i < 5; i++) {
      const id = await insertRequest(author, { name: `R${i}` });
      await prayAt(me, id, "2024-05-05 12:00:00.5+00");
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    for (let pages = 0; pages < 10; pages++) {
      const qs: string = `limit=2${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await call("GET", `/v1/requests/prayed?${qs}`, { user: "me" });
      seen.push(...res.json.items.map((i: { displayName: string }) => i.displayName));
      cursor = res.json.nextCursor;
      if (!cursor) break;
    }
    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(5);
  });

  it("rejects a bad limit with 400", async () => {
    await makeUser(call, "me");
    const res = await call("GET", "/v1/requests/prayed?limit=0", { user: "me" });
    expect(res.status).toBe(400);
  });
});
