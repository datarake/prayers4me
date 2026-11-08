import { beforeEach, describe, expect, it } from "vitest";
import { clientIp, ipFingerprint } from "../src/moderation/network.js";
import { client, createRequest, insertRequest, makeApp, makeUser, resetDb, sql } from "./helpers.js";

const { app } = makeApp({ IP_LIMITS: "on", NEW_ACCOUNT_PROBATION: "on" });
const call = client(app);

describe("limits on new accounts", () => {
  beforeEach(resetDb);

  it("let a brand new account send one request a day", async () => {
    expect((await createRequest(call, "fresh", {}, "10.0.0.1")).status).toBe(201);
    const second = await createRequest(call, "fresh", {}, "10.0.0.1");
    expect(second.status).toBe(429);
    expect(second.json.error.code).toBe("rate_limited");
  });

  it("give an established account three", async () => {
    await makeUser(call, "regular", { established: true });
    for (let i = 0; i < 3; i++) {
      expect((await createRequest(call, "regular", {}, "10.0.0.1")).status).toBe(201);
    }
    expect((await createRequest(call, "regular", {}, "10.0.0.1")).status).toBe(429);
  });
});

describe("limits per network", () => {
  beforeEach(resetDb);

  it("stop one network cycling through accounts", async () => {
    for (let i = 1; i <= 10; i++) {
      expect((await createRequest(call, `cycle${i}`, {}, "10.0.0.2")).status).toBe(201);
    }
    const blocked = await createRequest(call, "cycle11", {}, "10.0.0.2");
    expect(blocked.status).toBe(429);
    expect(blocked.json.error.message).toContain("network");
  });

  it("cannot be dodged by sending a fake address first", async () => {
    for (let i = 1; i <= 10; i++) await createRequest(call, `cycle${i}`, {}, "10.0.0.2");
    // The proxy appends the real address last. Whatever the client puts before it is ignored.
    const spoof = await createRequest(call, "spoofer", {}, "1.2.3.4, 10.0.0.2");
    expect(spoof.status).toBe(429);
  });

  it("do not affect other networks", async () => {
    for (let i = 1; i <= 10; i++) await createRequest(call, `cycle${i}`, {}, "10.0.0.2");
    expect((await createRequest(call, "elsewhere", {}, "10.0.0.9")).status).toBe(201);
  });
});

describe("reports and auto-hide", () => {
  beforeEach(resetDb);

  async function target() {
    const author = await makeUser(call, "author", { established: true });
    return insertRequest(author, { name: "Target" });
  }

  async function report(user: string, ip: string, id: string, established: boolean) {
    await makeUser(call, user, { established });
    return call("POST", `/v1/requests/${id}/report`, { user, ip, body: { reason: "spam" } });
  }

  async function status(id: string) {
    const [row] = await sql<{ status: string }[]>`SELECT status FROM prayer_requests WHERE id = ${id}`;
    return row!.status;
  }

  it("ignore brand new accounts but still record their reports", async () => {
    const id = await target();
    for (let i = 1; i <= 3; i++) await report(`new${i}`, `10.1.0.${i}`, id, false);
    expect(await status(id)).toBe("active");
    const [row] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM reports WHERE request_id = ${id}`;
    expect(row!.n).toBe(3);
  });

  it("count several accounts on one network as one voice", async () => {
    const id = await target();
    for (let i = 1; i <= 5; i++) await report(`same${i}`, "10.3.0.1", id, true);
    expect(await status(id)).toBe("active");
  });

  it("hide a request once three networks of established accounts report it", async () => {
    const id = await target();
    expect((await report("est1", "10.2.0.1", id, true)).json.autoHidden).toBe(false);
    expect((await report("est2", "10.2.0.2", id, true)).json.autoHidden).toBe(false);
    expect(await status(id)).toBe("active");
    expect((await report("est3", "10.2.0.3", id, true)).json.autoHidden).toBe(true);
    expect(await status(id)).toBe("hidden");
  });

  it("do not let people report their own request", async () => {
    const author = await makeUser(call, "author", { established: true });
    const id = await insertRequest(author);
    const res = await call("POST", `/v1/requests/${id}/report`, {
      user: "author",
      ip: "10.5.0.1",
      body: { reason: "spam" },
    });
    expect(res.status).toBe(400);
  });
});

describe("network detection", () => {
  const fake = (header: string | undefined, socket = "192.0.2.1") =>
    ({
      req: { header: (name: string) => (name.toLowerCase() === "x-forwarded-for" ? header : undefined) },
      env: { incoming: { socket: { remoteAddress: socket } } },
    }) as never;

  const envFor = (hops: number, secret = "a-long-test-secret") =>
    ({ TRUSTED_PROXY_HOPS: hops, IP_HASH_SECRET: secret }) as never;

  it("uses the socket address when no proxy is trusted, ignoring the header", () => {
    expect(clientIp(fake("6.6.6.6"), envFor(0))).toBe("192.0.2.1");
  });

  it("takes the entry the trusted proxy added, counted from the right", () => {
    expect(clientIp(fake("6.6.6.6, 203.0.113.7"), envFor(1))).toBe("203.0.113.7");
    expect(clientIp(fake("6.6.6.6, 203.0.113.7, 10.0.0.1"), envFor(2))).toBe("203.0.113.7");
  });

  it("falls back to the socket when the header is missing", () => {
    expect(clientIp(fake(undefined), envFor(1))).toBe("192.0.2.1");
  });

  it("gives the same fingerprint for the same address and a different one otherwise", () => {
    const a = ipFingerprint(fake("1.1.1.1"), envFor(1));
    expect(ipFingerprint(fake("1.1.1.1"), envFor(1))).toBe(a);
    expect(ipFingerprint(fake("2.2.2.2"), envFor(1))).not.toBe(a);
    expect(ipFingerprint(fake("1.1.1.1"), envFor(1, "another-long-secret"))).not.toBe(a);
  });

  it("never contains the address itself", () => {
    expect(ipFingerprint(fake("203.0.113.7"), envFor(1))).not.toContain("203");
  });
});
