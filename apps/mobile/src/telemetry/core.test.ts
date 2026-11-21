import { describe, expect, it, vi } from "vitest";
import { createTelemetry, EVENTS, safeScreenName, scrub, type Backend } from "./core";

function fakeBackend() {
  const calls = {
    collection: [] as boolean[],
    events: [] as Array<[string, Record<string, string>]>,
    screens: [] as string[],
    properties: [] as Array<[string, string]>,
    errors: [] as Array<{ error: Error; context: string }>,
  };
  const backend: Backend = {
    setCollectionEnabled: async (enabled) => void calls.collection.push(enabled),
    logEvent: (name, params) => void calls.events.push([name, params]),
    logScreen: (name) => void calls.screens.push(name),
    setUserProperty: (name, value) => void calls.properties.push([name, value]),
    recordError: (error, context) => void calls.errors.push({ error, context }),
  };
  return { backend, calls };
}

async function started() {
  const { backend, calls } = fakeBackend();
  const telemetry = createTelemetry({ loadBackend: () => backend });
  await telemetry.init();
  return { telemetry, calls };
}

describe("at start-up", () => {
  it("switches collection on and reports events, screens and the language", async () => {
    const { telemetry, calls } = await started();
    expect(calls.collection).toEqual([true]);

    telemetry.track("prayed", { filter: "waiting" });
    telemetry.screen("/pray");
    telemetry.setLanguage("ro");
    expect(calls.events).toEqual([["prayed", { filter: "waiting" }]]);
    expect(calls.screens).toEqual(["pray"]);
    expect(calls.properties).toEqual([["language", "ro"]]);
  });
});

describe("what an event may contain", () => {
  it("drops any parameter that is not on the list, and any value that is not an allowed choice", async () => {
    const { telemetry, calls } = await started();
    telemetry.track("request_sent", {
      language: "en",
      length: "short",
      support_card: "no",
      // Things a careless call site might add. None may get through.
      message: "Please pray for my mother Ana Popescu",
      name: "Ana",
      id: "8083dda2-ad22-4cce-b9ca-826714335590",
    } as never);
    telemetry.track("report_sent", { reason: "my neighbour John" } as never);

    expect(calls.events[0]).toEqual([
      "request_sent",
      { language: "en", length: "short", support_card: "no" },
    ]);
    expect(calls.events[1]).toEqual(["report_sent", {}]);
  });

  it("ignores an event that is not in the catalogue", async () => {
    const { telemetry, calls } = await started();
    telemetry.track("typed_the_whole_request" as never, { text: "hello" } as never);
    expect(calls.events).toEqual([]);
  });

  it("has no event that could carry free text or an identifier", () => {
    const forbidden = /name|message|text|email|phone|contact_|user|device|^id$|_id$|ip/i;
    for (const [event, params] of Object.entries(EVENTS)) {
      for (const [key, values] of Object.entries(params as Record<string, readonly string[]>)) {
        expect(key, `${event}.${key}`).not.toMatch(forbidden);
        expect(values.length, `${event}.${key}`).toBeLessThanOrEqual(6);
        for (const value of values) expect(value.length).toBeLessThan(20);
      }
    }
  });

  it("only reports a language it knows", async () => {
    const { telemetry, calls } = await started();
    telemetry.setLanguage("klingon");
    expect(calls.properties).toEqual([]);
  });
});

describe("errors", () => {
  it("scrubs ids, emails and phone numbers but keeps the shape of the error", async () => {
    const { telemetry, calls } = await started();
    const err = new TypeError("failed for ana@example.com on 8083dda2-ad22-4cce-b9ca-826714335590 call +40 700 123 456");
    telemetry.error(err, "api");

    const sent = calls.errors[0]!;
    expect(sent.error.name).toBe("TypeError");
    expect(sent.error.message).toBe("failed for <email> on <id> call <number>");
    expect(sent.context).toBe("api");
  });

  it("accepts things that are not Error objects", async () => {
    const { telemetry, calls } = await started();
    telemetry.error("just a string", "boundary");
    expect(calls.errors[0]!.error.message).toBe("just a string");
  });
});

describe("when monitoring is not available or fails", () => {
  it("does nothing, quietly, in a build without the native module", async () => {
    const telemetry = createTelemetry({ loadBackend: () => null });
    await expect(telemetry.init()).resolves.toBeUndefined();
    expect(telemetry.isAvailable()).toBe(false);
    expect(() => {
      telemetry.track("request_deleted");
      telemetry.screen("/pray");
      telemetry.error(new Error("x"), "t");
    }).not.toThrow();
  });

  it("never lets a failing backend reach the person", async () => {
    const { backend } = fakeBackend();
    const boom = () => {
      throw new Error("native crash");
    };
    const failing: Backend = {
      ...backend,
      logEvent: vi.fn(boom),
      logScreen: vi.fn(boom),
      recordError: vi.fn(boom),
      setCollectionEnabled: vi.fn(async () => boom()),
    };
    const telemetry = createTelemetry({ loadBackend: () => failing });
    await expect(telemetry.init()).resolves.toBeUndefined();
    expect(() => {
      telemetry.track("request_deleted");
      telemetry.screen("/pray");
      telemetry.error(new Error("x"), "t");
    }).not.toThrow();
  });
});

describe("helpers", () => {
  it("scrub shortens long text", () => {
    expect(scrub("x".repeat(500), 50)).toHaveLength(50);
  });

  it.each([
    ["/pray", "pray"],
    ["/mine", "mine"],
    ["/mine/compose", "mine/compose"],
    ["/", "welcome"],
    ["/pray?filter=waiting", "pray"],
  ])("names the screen for %s", (path, name) => {
    expect(safeScreenName(path)).toBe(name);
  });

  it.each(["/a b", "/ünïcode", "/" + "x".repeat(60), "/a<script>"])("refuses to report %j", (path) => {
    expect(safeScreenName(path)).toBeNull();
  });
});
