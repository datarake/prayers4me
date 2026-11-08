import { beforeEach, describe, expect, it } from "vitest";
import { client, createRequest, insertRequest, makeApp, makeUser, resetDb, sql } from "./helpers.js";

const { app } = makeApp();
const call = client(app);

describe("creating a request", () => {
  beforeEach(resetDb);

  it("stores it with sensible defaults", async () => {
    const res = await createRequest(call, "ana");
    expect(res.status).toBe(201);
    expect(res.json).toMatchObject({
      displayName: "Ana",
      prayersCount: 0,
      isMine: true,
      status: "active",
      editedAt: null,
      editsLeft: 3,
    });
  });

  it("needs authentication", async () => {
    const res = await call("POST", "/v1/requests", { body: {} });
    expect(res.status).toBe(401);
  });

  it.each([
    ["a message that is too short", { message: "short" }],
    ["no name", { displayName: "  " }],
    ["an unknown language", { language: "xx" }],
    ["contact enabled without a phone or email", { contactable: true }],
  ])("rejects %s", async (_label, change) => {
    const res = await createRequest(call, "ana", change);
    expect(res.status).toBe(400);
  });

  it("hides contact details from everyone but the author", async () => {
    const created = await createRequest(call, "ana", { contactable: true, email: "ana@example.com" });
    expect(created.json.email).toBe("ana@example.com");

    await makeUser(call, "reader");
    const feed = await call("GET", "/v1/requests?language=en", { user: "reader" });
    expect(feed.json.items[0]).toMatchObject({ contactable: false, email: null, phone: null });
  });

  describe("content checks", () => {
    it("rejects a message with too many lines", async () => {
      const message = Array.from({ length: 12 }, (_, i) => `Line number ${i} of the text`).join("\n");
      const res = await createRequest(call, "ana", { message });
      expect(res.json.error.code).toBe("message_rejected");
    });

    it("rejects one huge unbroken paste", async () => {
      const res = await createRequest(call, "ana", { message: "word ".repeat(250) });
      expect(res.json.error.code).toBe("message_rejected");
    });

    it("rejects link spam", async () => {
      const res = await createRequest(call, "ana", {
        message: "Pray for me, see https://a.example and also https://b.example please",
      });
      expect(res.json.error.code).toBe("message_rejected");
    });
  });
});

describe("malformed input is a 4xx, never a 500", () => {
  beforeEach(resetDb);

  it("answers 400 for a body that is not JSON", async () => {
    const res = await call("POST", "/v1/requests", { user: "ana", rawBody: "{not json" });
    expect(res.status).toBe(400);
    expect(res.json.error.code).toBe("invalid_json");
  });

  it("answers 413 for a body over the size limit", async () => {
    const res = await call("POST", "/v1/requests", {
      user: "ana",
      body: { ...{ language: "en", displayName: "x" }, message: "a".repeat(40_000) },
    });
    expect(res.status).toBe(413);
    expect(res.json.error.code).toBe("payload_too_large");
  });

  it.each([
    ["POST", "/v1/requests/not-a-uuid/pray", undefined],
    ["POST", "/v1/requests/not-a-uuid/report", { reason: "spam" }],
    ["PATCH", "/v1/requests/not-a-uuid", { displayName: "A", message: "Some valid message here" }],
    ["DELETE", "/v1/requests/not-a-uuid", undefined],
  ])("answers 404 for %s %s", async (method, path, body) => {
    const res = await call(method, path, { user: "ana", body });
    expect(res.status).toBe(404);
  });

  it("sends security headers and no server details", async () => {
    const res = await app.request("/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await res.json()).toEqual({ ok: true, service: "Prayers4me", db: "up" });
  });
});

describe("praying", () => {
  beforeEach(resetDb);

  it("counts each person once", async () => {
    const created = await createRequest(call, "ana");
    const id = created.json.id;

    const first = await call("POST", `/v1/requests/${id}/pray`, { user: "ben" });
    expect(first.json).toMatchObject({ alreadyPrayed: false, prayersCount: 1, prayedByMe: true });

    const again = await call("POST", `/v1/requests/${id}/pray`, { user: "ben" });
    expect(again.json).toMatchObject({ alreadyPrayed: true, prayersCount: 1 });

    const other = await call("POST", `/v1/requests/${id}/pray`, { user: "cy" });
    expect(other.json.prayersCount).toBe(2);
  });

  it("shows the person that they prayed", async () => {
    const created = await createRequest(call, "ana");
    await call("POST", `/v1/requests/${created.json.id}/pray`, { user: "ben" });
    const feed = await call("GET", "/v1/requests?language=en", { user: "ben" });
    expect(feed.json.items[0].prayedByMe).toBe(true);
    const other = await call("GET", "/v1/requests?language=en", { user: "cy" });
    expect(other.json.items[0].prayedByMe).toBe(false);
  });

  it("does not let anyone pray for their own request", async () => {
    const created = await createRequest(call, "ana");
    const res = await call("POST", `/v1/requests/${created.json.id}/pray`, { user: "ana" });
    expect(res.status).toBe(400);
    expect(res.json.error.code).toBe("cannot_pray_own");
  });

  it("cannot pray for a hidden request", async () => {
    const author = await makeUser(call, "ana");
    const id = await insertRequest(author, { status: "hidden" });
    const res = await call("POST", `/v1/requests/${id}/pray`, { user: "ben" });
    expect(res.status).toBe(404);
  });
});

describe("editing a request", () => {
  beforeEach(resetDb);

  const fix = { displayName: "Ana", message: "Please pray for my mother, she is in the hospital now." };

  it("fixes a typo, marks it edited and keeps the earlier text", async () => {
    const created = await createRequest(call, "ana", { message: "Please pray for my mohter, she is ill." });
    const res = await call("PATCH", `/v1/requests/${created.json.id}`, {
      user: "ana",
      body: { displayName: "Ana", message: "Please pray for my mother, she is ill." },
    });

    expect(res.status).toBe(200);
    expect(res.json.message).toBe("Please pray for my mother, she is ill.");
    expect(res.json.editedAt).not.toBeNull();
    expect(res.json.editsLeft).toBe(2);

    const history = await sql`SELECT message FROM request_edits WHERE request_id = ${created.json.id}`;
    expect(history.map((r) => r.message)).toEqual(["Please pray for my mohter, she is ill."]);
  });

  it("does not use up an edit when nothing changed", async () => {
    const created = await createRequest(call, "ana");
    const res = await call("PATCH", `/v1/requests/${created.json.id}`, {
      user: "ana",
      body: { displayName: "Ana", message: created.json.message },
    });
    expect(res.json.editsLeft).toBe(3);
    expect(res.json.editedAt).toBeNull();
  });

  it("allows three edits and refuses the fourth", async () => {
    const created = await createRequest(call, "ana");
    for (let i = 1; i <= 3; i++) {
      const ok = await call("PATCH", `/v1/requests/${created.json.id}`, {
        user: "ana",
        body: { displayName: "Ana", message: `${fix.message} Edit ${i}.` },
      });
      expect(ok.status).toBe(200);
    }
    const refused = await call("PATCH", `/v1/requests/${created.json.id}`, {
      user: "ana",
      body: { displayName: "Ana", message: `${fix.message} Edit 4.` },
    });
    expect(refused.status).toBe(429);
    expect(refused.json.error.code).toBe("edit_limit");
  });

  it("runs the same content checks as a new request", async () => {
    const created = await createRequest(call, "ana");
    const res = await call("PATCH", `/v1/requests/${created.json.id}`, {
      user: "ana",
      body: { displayName: "Ana", message: "word ".repeat(250) },
    });
    expect(res.json.error.code).toBe("message_rejected");
  });

  it("is only possible for the author", async () => {
    const created = await createRequest(call, "ana");
    const res = await call("PATCH", `/v1/requests/${created.json.id}`, { user: "ben", body: fix });
    expect(res.status).toBe(404);
  });

  it("is refused while the request is under review", async () => {
    const created = await createRequest(call, "ana");
    await sql`UPDATE prayer_requests SET status = 'hidden' WHERE id = ${created.json.id}`;
    const res = await call("PATCH", `/v1/requests/${created.json.id}`, {
      user: "ana",
      body: { displayName: "Ana", message: `${fix.message} Changed.` },
    });
    expect(res.status).toBe(409);
    expect(res.json.error.code).toBe("under_review");
  });

  it("cannot change the language", async () => {
    const created = await createRequest(call, "ana");
    await call("PATCH", `/v1/requests/${created.json.id}`, {
      user: "ana",
      body: { displayName: "Ana", message: `${fix.message} Changed.`, language: "ru" },
    });
    const [row] = await sql`SELECT language FROM prayer_requests WHERE id = ${created.json.id}`;
    expect(row!.language).toBe("en");
  });
});

describe("deleting a request", () => {
  beforeEach(resetDb);

  it("removes it from the feed and from my requests", async () => {
    const created = await createRequest(call, "ana");
    const res = await call("DELETE", `/v1/requests/${created.json.id}`, { user: "ana" });
    expect(res.json).toMatchObject({ deleted: true });

    const feed = await call("GET", "/v1/requests?language=en", { user: "ben" });
    expect(feed.json.items).toHaveLength(0);
    const mine = await call("GET", "/v1/requests/me", { user: "ana" });
    expect(mine.json.items).toHaveLength(0);
  });

  it("answers the same for someone else's request as for one that does not exist", async () => {
    const created = await createRequest(call, "ana");
    const res = await call("DELETE", `/v1/requests/${created.json.id}`, { user: "ben" });
    expect(res.status).toBe(404);
  });

  it("is safe to repeat", async () => {
    const created = await createRequest(call, "ana");
    await call("DELETE", `/v1/requests/${created.json.id}`, { user: "ana" });
    const again = await call("DELETE", `/v1/requests/${created.json.id}`, { user: "ana" });
    expect(again.status).toBe(404);
  });
});
