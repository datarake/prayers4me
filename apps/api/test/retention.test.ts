import { beforeEach, describe, expect, it } from "vitest";
import { purgeExpiredData, RETENTION } from "../src/maintenance.js";
import { client, insertRequest, makeApp, makeUser, resetDb, sql } from "./helpers.js";

const { app } = makeApp();
const call = client(app);

const daysAgo = (n: number) => sql`now() - make_interval(days => ${n}::int)`;

describe("retention", () => {
  beforeEach(resetDb);

  it("erases a deleted request after the retention period, with its prayers and reports", async () => {
    const author = await makeUser(call, "author");
    const reader = await makeUser(call, "reader");
    const old = await insertRequest(author, { name: "Old", status: "removed" });
    const fresh = await insertRequest(author, { name: "Fresh", status: "removed" });
    const alive = await insertRequest(author, { name: "Alive" });
    await sql`UPDATE prayer_requests SET updated_at = ${daysAgo(RETENTION.removedRequestDays + 1)} WHERE id = ${old}`;
    await sql`UPDATE prayer_requests SET updated_at = ${daysAgo(RETENTION.removedRequestDays - 1)} WHERE id = ${fresh}`;
    await sql`UPDATE prayer_requests SET updated_at = ${daysAgo(400)} WHERE id = ${alive}`;
    await sql`INSERT INTO prayers (request_id, user_id) VALUES (${old}, ${reader})`;
    await sql`INSERT INTO reports (request_id, reporter_id, reason) VALUES (${old}, ${reader}, 'spam')`;

    const result = await purgeExpiredData(sql);

    expect(result.removedRequests).toBe(1);
    const left = await sql`SELECT display_name FROM prayer_requests ORDER BY display_name`;
    expect(left.map((r) => r.display_name)).toEqual(["Alive", "Fresh"]);
    expect((await sql`SELECT 1 FROM prayers`).length).toBe(0);
    expect((await sql`SELECT 1 FROM reports`).length).toBe(0);
  });

  it("never erases an active request, however old", async () => {
    const author = await makeUser(call, "author");
    const id = await insertRequest(author);
    await sql`UPDATE prayer_requests SET updated_at = ${daysAgo(2000)}, created_at = ${daysAgo(2000)} WHERE id = ${id}`;
    expect((await purgeExpiredData(sql)).removedRequests).toBe(0);
    expect((await sql`SELECT 1 FROM prayer_requests`).length).toBe(1);
  });

  it("erases earlier versions of an edited request after the retention period", async () => {
    const author = await makeUser(call, "author");
    const id = await insertRequest(author);
    await sql`INSERT INTO request_edits (request_id, display_name, message, replaced_at) VALUES
      (${id}, 'a', 'old text', ${daysAgo(RETENTION.editHistoryDays + 1)}),
      (${id}, 'b', 'recent text', ${daysAgo(RETENTION.editHistoryDays - 1)})`;

    expect((await purgeExpiredData(sql)).editHistory).toBe(1);
    const left = await sql`SELECT message FROM request_edits`;
    expect(left.map((r) => r.message)).toEqual(["recent text"]);
  });

  it("keeps a ban that is in force, and erases one that ended long ago", async () => {
    const a = await makeUser(call, "a");
    const b = await makeUser(call, "b");
    const c = await makeUser(call, "c");
    await sql`INSERT INTO bans (user_id, reason, expires_at) VALUES
      (${a}, 'permanent', NULL),
      (${b}, 'ended long ago', ${daysAgo(RETENTION.endedBanDays + 1)}),
      (${c}, 'ended recently', ${daysAgo(10)})`;

    expect((await purgeExpiredData(sql)).endedBans).toBe(1);
    const left = await sql`SELECT reason FROM bans ORDER BY reason`;
    expect(left.map((r) => r.reason)).toEqual(["ended recently", "permanent"]);
  });

  it("does nothing on an empty database", async () => {
    expect(await purgeExpiredData(sql)).toEqual({ editHistory: 0, removedRequests: 0, endedBans: 0 });
  });
});
