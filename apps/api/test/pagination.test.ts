import { beforeEach, describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "../src/pagination.js";
import { client, insertRequest, makeApp, makeUser, resetDb, sql } from "./helpers.js";

const { app } = makeApp();
const call = client(app);

/** Walks the whole feed with a small page size and returns every name in the order served. */
async function walkFeed(user: string, query = "", limit = 7) {
  const names: string[] = [];
  let cursor: string | null = null;
  for (let pages = 0; pages < 200; pages++) {
    const qs: string = `language=en&limit=${limit}${query}${cursor ? `&cursor=${cursor}` : ""}`;
    const res = await call("GET", `/v1/requests?${qs}`, { user });
    expect(res.status).toBe(200);
    names.push(...res.json.items.map((i: { displayName: string }) => i.displayName));
    cursor = res.json.nextCursor;
    if (!cursor) break;
  }
  return names;
}

describe("feed pagination", () => {
  beforeEach(resetDb);

  it("does not skip requests created less than a millisecond apart", async () => {
    // Regression: the cursor used to be a JavaScript date, which has milliseconds only,
    // so the second row below was silently never shown.
    const author = await makeUser(call, "author");
    await makeUser(call, "reader");
    await insertRequest(author, { name: "A", createdAt: "2020-01-01 00:00:00.123900+00" });
    await insertRequest(author, { name: "B", createdAt: "2020-01-01 00:00:00.123100+00" });

    expect(await walkFeed("reader", "", 1)).toEqual(["A", "B"]);
  });

  it("serves requests that share the exact same timestamp once each", async () => {
    const author = await makeUser(call, "author");
    await makeUser(call, "reader");
    for (const name of ["T1", "T2", "T3", "T4", "T5"]) {
      await insertRequest(author, { name, createdAt: "2021-06-01 12:00:00.5+00" });
    }

    const seen = await walkFeed("reader", "", 2);
    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(5);
  });

  it("returns every request exactly once, newest first, across many pages", async () => {
    const author = await makeUser(call, "author");
    await makeUser(call, "reader");
    for (let i = 0; i < 45; i++) {
      await insertRequest(author, {
        name: `R${String(i).padStart(2, "0")}`,
        createdAt: new Date(Date.UTC(2022, 0, 1, 0, 0, i)).toISOString(),
      });
    }

    const seen = await walkFeed("reader", "", 10);
    const expected = Array.from({ length: 45 }, (_, i) => `R${String(44 - i).padStart(2, "0")}`);
    expect(seen).toEqual(expected);
  });

  it("pages through the 'waiting' filter without losing rows", async () => {
    const author = await makeUser(call, "author");
    await makeUser(call, "reader");
    for (let i = 0; i < 9; i++) {
      await insertRequest(author, {
        name: `W${i}`,
        prayersCount: i % 3 === 0 ? 1 : 0,
        createdAt: new Date(Date.UTC(2022, 0, 1, 0, 0, i)).toISOString(),
      });
    }

    const seen = await walkFeed("reader", "&filter=waiting", 2);
    expect(seen.sort()).toEqual(["W1", "W2", "W4", "W5", "W7", "W8"]);
  });

  it("ignores hidden and removed requests", async () => {
    const author = await makeUser(call, "author");
    await makeUser(call, "reader");
    await insertRequest(author, { name: "Shown" });
    await insertRequest(author, { name: "Hidden", status: "hidden" });
    await insertRequest(author, { name: "Removed", status: "removed" });

    expect(await walkFeed("reader")).toEqual(["Shown"]);
  });

  it("rejects a cursor it did not issue", async () => {
    await makeUser(call, "reader");
    for (const bad of ["garbage", "2020-01-01T00:00:00.000Z", encodeCursor({ t: "not a date", id: "x" })]) {
      const res = await call("GET", `/v1/requests?language=en&cursor=${bad}`, { user: "reader" });
      expect(res.status).toBe(400);
      expect(res.json.error.code).toBe("invalid_cursor");
    }
  });
});

describe("cursor encoding", () => {
  it("round trips and keeps microsecond precision", () => {
    const cursor = { t: "2020-01-01 00:00:00.123456+00", id: "8083dda2-ad22-4cce-b9ca-826714335590" };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it("is url safe", () => {
    expect(encodeCursor({ t: "2020-01-01 00:00:00.1+00", id: "8083dda2-ad22-4cce-b9ca-826714335590" })).toMatch(
      /^[A-Za-z0-9_-]+$/,
    );
  });
});

describe("the database really keeps microseconds", () => {
  it("(guards the premise of the cursor)", async () => {
    await resetDb();
    const author = await makeUser(call, "author");
    const id = await insertRequest(author, { createdAt: "2020-01-01 00:00:00.123456+00" });
    const [row] = await sql<{ t: string }[]>`SELECT created_at::text AS t FROM prayer_requests WHERE id = ${id}`;
    expect(row!.t).toContain(".123456");
  });
});
