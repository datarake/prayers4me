import { beforeEach, describe, expect, it } from "vitest";
import { client, createRequest, insertRequest, makeApp, makeUser, resetDb, sql } from "./helpers.js";

const { app } = makeApp();
const call = client(app);

async function makeAdmin(name = "mod") {
  await makeUser(call, name);
  await sql`UPDATE users SET role = 'admin' WHERE firebase_uid = ${`dev:${name}`}`;
}

describe("moderation routes", () => {
  beforeEach(resetDb);

  it.each(["/v1/admin/reports", "/v1/admin/metrics"])("%s is for admins only", async (path) => {
    await makeUser(call, "regular");
    expect((await call("GET", path, { user: "regular" })).status).toBe(403);
    expect((await call("GET", path)).status).toBe(401);
  });

  it("lets an admin hide and restore a request", async () => {
    await makeAdmin();
    const created = await createRequest(call, "ana");

    await call("POST", `/v1/admin/requests/${created.json.id}/hide`, { user: "mod" });
    expect((await call("GET", "/v1/requests?language=en", { user: "ben" })).json.items).toHaveLength(0);

    await call("POST", `/v1/admin/requests/${created.json.id}/restore`, { user: "mod" });
    expect((await call("GET", "/v1/requests?language=en", { user: "ben" })).json.items).toHaveLength(1);
  });

  it("bans a person: their requests are hidden and they cannot post again", async () => {
    await makeAdmin();
    await createRequest(call, "troll");
    const [troll] = await sql<{ id: string }[]>`SELECT id FROM users WHERE firebase_uid = 'dev:troll'`;

    const ban = await call("POST", `/v1/admin/users/${troll!.id}/ban`, {
      user: "mod",
      body: { reason: "flooding the feed" },
    });
    expect(ban.status).toBe(200);

    expect((await call("GET", "/v1/requests?language=en", { user: "ben" })).json.items).toHaveLength(0);
    const again = await createRequest(call, "troll");
    expect(again.status).toBe(403);
    expect(again.json.error.code).toBe("banned");
  });

  it("asks for a reason and a valid id", async () => {
    await makeAdmin();
    const [mod] = await sql<{ id: string }[]>`SELECT id FROM users WHERE firebase_uid = 'dev:mod'`;
    expect((await call("POST", `/v1/admin/users/${mod!.id}/ban`, { user: "mod", body: { reason: "x" } })).status).toBe(400);
    expect((await call("POST", "/v1/admin/users/nope/ban", { user: "mod", body: { reason: "long enough" } })).status).toBe(404);
    expect((await call("POST", "/v1/admin/requests/nope/hide", { user: "mod" })).status).toBe(404);
  });
});

describe("metrics", () => {
  beforeEach(resetDb);

  const daysAgo = (days: number, extraMinutes = 0) =>
    new Date(Date.now() - days * 86_400_000 + extraMinutes * 60_000).toISOString();

  it("reports no numbers rather than invented ones when there is no data", async () => {
    await makeAdmin();
    const res = await call("GET", "/v1/admin/metrics", { user: "mod" });
    expect(res.json).toMatchObject({
      firstPrayerRate24hPercent: null,
      medianMinutesToFirstPrayer: null,
      requestsCreated: 0,
      prayers: 0,
    });
  });

  it("measures how many old enough requests got a first prayer within a day", async () => {
    await makeAdmin();
    const asker = await makeUser(call, "asker");
    const prayer = await makeUser(call, "prayer");

    // Two requests old enough to judge: one prayed for after 90 minutes, one never.
    const prayed = await insertRequest(asker, { name: "Prayed", createdAt: daysAgo(2) });
    await insertRequest(asker, { name: "Alone", createdAt: daysAgo(2) });
    // A fresh request must not count against the rate: it has not had a fair chance yet.
    await insertRequest(asker, { name: "Fresh", createdAt: daysAgo(0) });
    await sql`
      INSERT INTO prayers (request_id, user_id, created_at)
      VALUES (${prayed}, ${prayer}, ${daysAgo(2, 90)}::text::timestamptz)
    `;

    const { json } = await call("GET", "/v1/admin/metrics?days=7", { user: "mod" });
    expect(json.requestsOldEnoughToJudge).toBe(2);
    expect(json.firstPrayerRate24hPercent).toBe(50);
    expect(json.medianMinutesToFirstPrayer).toBe(90);
    expect(json.requestsCreated).toBe(3);
    expect(json.peopleWhoAsked).toBe(1);
    expect(json.peopleWhoPrayed).toBe(1);
  });

  it("does not count a prayer that came after the first day as a quick one", async () => {
    await makeAdmin();
    const asker = await makeUser(call, "asker");
    const prayer = await makeUser(call, "prayer");
    const id = await insertRequest(asker, { createdAt: daysAgo(3) });
    await sql`
      INSERT INTO prayers (request_id, user_id, created_at)
      VALUES (${id}, ${prayer}, ${daysAgo(3, 60 * 30)}::text::timestamptz)
    `;
    const { json } = await call("GET", "/v1/admin/metrics", { user: "mod" });
    expect(json.firstPrayerRate24hPercent).toBe(0);
  });

  it("measures how many people who asked also prayed", async () => {
    await makeAdmin();
    const ana = await makeUser(call, "ana");
    const ben = await makeUser(call, "ben");
    const forAna = await insertRequest(ana, { createdAt: daysAgo(1, -60) });
    await insertRequest(ben, { createdAt: daysAgo(1, -60) });
    // Ben asked, and Ben also prayed for Ana.
    await sql`INSERT INTO prayers (request_id, user_id) VALUES (${forAna}, ${ben})`;

    const { json } = await call("GET", "/v1/admin/metrics", { user: "mod" });
    expect(json.peopleWhoAsked).toBe(2);
    expect(json.askersWhoAlsoPrayedPercent).toBe(50);
  });

  it("validates the window", async () => {
    await makeAdmin();
    expect((await call("GET", "/v1/admin/metrics?days=0", { user: "mod" })).status).toBe(400);
    expect((await call("GET", "/v1/admin/metrics?days=999", { user: "mod" })).status).toBe(400);
  });
});
