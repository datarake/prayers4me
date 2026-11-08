import { describe, expect, it, vi } from "vitest";
import { createTelemetry, EVENTS, safeScreenName, scrub, type Backend } from "./core";

function fakeBackend() {
  const calls = {
    collection: [] as boolean[],
    events: [] as Array<[string, Record<string, string>]>,
    screens: [] as string[],
    properties: [] as Array<[string, string]>,
    errors: [] as Array<{ error: Error; context: string }>,
    resets: 0,
  };
  const backend: Backend = {
    setCollectionEnabled: async (enabled) => void calls.collection.push(enabled),
    logEvent: (name, params) => void calls.events.push([name, params]),
    logScreen: (name) => void calls.screens.push(name),
    setUserProperty: (name, value) => void calls.properties.push([name, value]),
    recordError: (error, context) => void calls.errors.push({ error, context }),
    resetData: async () => void (calls.resets += 1),
  };
  return { backend, calls };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    storage: {
      get: async (key: string) => data[key] ?? null,
      set: async (key: string, value: string) => void (data[key] = value),
    },
  };
}

const KEY = "prayers4me.telemetryConsent";

async function started(initial: Record<string, string> = {}) {
  const { backend, calls } = fakeBackend();
  const store = memoryStorage(initial);
  const telemetry = createTelemetry({ loadBackend: () => backend, storage: store.storage });
  await telemetry.init();
  return { telemetry, calls, store };
}

describe("before the person agrees", () => {
  it("starts with collection switched off and sends nothing", async () => {
    const { telemetry, calls } = await started();
    expect(telemetry.getConsent()).toBe("unset");
    expect(calls.collection).toEqual([false]);

    telemetry.track("request_deleted");
    telemetry.screen("/pray");
    telemetry.setLanguage("en");
    telemetry.error(new Error("boom"), "test");

    expect(calls.events).toEqual([]);
    expect(calls.screens).toEqual([]);
    expect(calls.properties).toEqual([]);
    expect(calls.errors).toEqual([]);
  });

  it("stays silent after the person said no", async () => {
    const { telemetry, calls } = await started({ [KEY]: "denied" });
    telemetry.track("request_deleted");
    telemetry.error(new Error("boom"), "test");
    expect(calls.events).toEqual([]);
    expect(calls.errors).toEqual([]);
    expect(calls.collection).toEqual([false]);
  });
});

describe("after the person agrees", () => {
  it("switches collection on, remembers the choice and reports events and screens", async () => {
    const { telemetry, calls, store } = await started();
    await telemetry.setConsent(true);

    expect(calls.collection).toEqual([false, true]);
    expect(store.data[KEY]).toBe("granted");

    telemetry.track("prayed", { filter: "waiting" });
    telemetry.screen("/pray");
    telemetry.setLanguage("ro");
    expect(calls.events).toEqual([["prayed", { filter: "waiting" }]]);
    expect(calls.screens).toEqual(["pray"]);
    expect(calls.properties).toEqual([["language", "ro"]]);
  });

  it("restores the choice on the next launch", async () => {
    const { telemetry, calls } = await started({ [KEY]: "granted" });
    expect(telemetry.getConsent()).toBe("granted");
    expect(calls.collection).toEqual([true]);
  });

  it("stops everything and clears the data when the person changes their mind", async () => {
    const { telemetry, calls, store } = await started({ [KEY]: "granted" });
    await telemetry.setConsent(false);

    expect(calls.collection).toEqual([true, false]);
    expect(calls.resets).toBe(1);
    expect(store.data[KEY]).toBe("denied");

    telemetry.track("request_deleted");
    expect(calls.events).toEqual([]);
  });
});

describe("what an event may contain", () => {
  it("drops any parameter that is not on the list, and any value that is not an allowed choice", async () => {
    const { telemetry, calls } = await started({ [KEY]: "granted" });
    telemetry.track("request_sent", {
      language: "en",
      contact: "yes",
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
      { language: "en", contact: "yes", length: "short", support_card: "no" },
    ]);
    expect(calls.events[1]).toEqual(["report_sent", {}]);
  });

  it("ignores an event that is not in the catalogue", async () => {
    const { telemetry, calls } = await started({ [KEY]: "granted" });
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
    const { telemetry, calls } = await started({ [KEY]: "granted" });
    telemetry.setLanguage("klingon");
    expect(calls.properties).toEqual([]);
  });
});

describe("errors", () => {
  it("scrubs ids, emails and phone numbers but keeps the shape of the error", async () => {
    const { telemetry, calls } = await started({ [KEY]: "granted" });
    const err = new TypeError("failed for ana@example.com on 8083dda2-ad22-4cce-b9ca-826714335590 call +40 700 123 456");
    telemetry.error(err, "api");

    const sent = calls.errors[0]!;
    expect(sent.error.name).toBe("TypeError");
    expect(sent.error.message).toBe("failed for <email> on <id> call <number>");
    expect(sent.context).toBe("api");
  });

  it("accepts things that are not Error objects", async () => {
    const { telemetry, calls } = await started({ [KEY]: "granted" });
    telemetry.error("just a string", "boundary");
    expect(calls.errors[0]!.error.message).toBe("just a string");
  });
});

describe("when monitoring is not available or fails", () => {
  it("does nothing, quietly, in a build without the native module", async () => {
    const store = memoryStorage({ [KEY]: "granted" });
    const telemetry = createTelemetry({ loadBackend: () => null, storage: store.storage });
    await expect(telemetry.init()).resolves.toBe("granted");
    expect(telemetry.isAvailable()).toBe(false);
    expect(() => {
      telemetry.track("request_deleted");
      telemetry.screen("/pray");
      telemetry.error(new Error("x"), "t");
    }).not.toThrow();
    await expect(telemetry.setConsent(false)).resolves.toBeUndefined();
  });

  it("never lets a failing backend reach the person", async () => {
    const { backend } = fakeBackend();
    const failing: Backend = {
      ...backend,
      logEvent: vi.fn(() => {
        throw new Error("native crash");
      }),
      logScreen: vi.fn(() => {
        throw new Error("native crash");
      }),
      recordError: vi.fn(() => {
        throw new Error("native crash");
      }),
      setCollectionEnabled: vi.fn(async () => {
        throw new Error("native crash");
      }),
    };
    const store = memoryStorage({ [KEY]: "granted" });
    const telemetry = createTelemetry({ loadBackend: () => failing, storage: store.storage });
    await expect(telemetry.init()).resolves.toBe("granted");
    expect(() => {
      telemetry.track("request_deleted");
      telemetry.screen("/pray");
      telemetry.error(new Error("x"), "t");
    }).not.toThrow();
    await expect(telemetry.setConsent(true)).resolves.toBeUndefined();
  });

  it("copes with unreadable storage", async () => {
    const { backend } = fakeBackend();
    const telemetry = createTelemetry({
      loadBackend: () => backend,
      storage: {
        get: async () => {
          throw new Error("disk");
        },
        set: async () => {
          throw new Error("disk");
        },
      },
    });
    await expect(telemetry.init()).resolves.toBe("unset");
    await expect(telemetry.setConsent(true)).resolves.toBeUndefined();
    expect(telemetry.getConsent()).toBe("granted");
  });
});

describe("helpers", () => {
  it("scrub shortens long text", () => {
    expect(scrub("x".repeat(500), 50)).toHaveLength(50);
  });

  it.each([
    ["/pray", "pray"],
    ["/mine", "mine"],
    ["/for-me/compose", "for-me/compose"],
    ["/", "welcome"],
    ["/pray?filter=waiting", "pray"],
  ])("names the screen for %s", (path, name) => {
    expect(safeScreenName(path)).toBe(name);
  });

  it.each(["/a b", "/ünïcode", "/" + "x".repeat(60), "/a<script>"])("refuses to report %j", (path) => {
    expect(safeScreenName(path)).toBeNull();
  });
});
