/**
 * Privacy-first telemetry. Three rules, enforced here rather than left to each call site:
 *
 * 1. Collection is switched off in the native config and switched on here at start-up, for
 *    everyone. There is no opt-in or opt-out in the app.
 * 2. Events come from a fixed list and their values from fixed choices. There is no free text,
 *    so a name, a request or an id can never end up in a report by accident.
 * 3. Errors are scrubbed of anything that looks like an id, an email or a phone number.
 */

/** What a monitoring service must be able to do. Firebase is one implementation. */
export interface Backend {
  setCollectionEnabled(enabled: boolean): Promise<void>;
  logEvent(name: string, params: Record<string, string>): void;
  logScreen(name: string): void;
  setUserProperty(name: string, value: string): void;
  recordError(error: Error, context: string): void;
}

const LANGUAGES = ["en", "es", "fr", "ro", "uk", "ru"] as const;
const FEED_FILTERS = ["newest", "waiting"] as const;
const YES_NO = ["yes", "no"] as const;

/** Every event, and the only values each of its parameters may take. */
export const EVENTS = {
  welcome_choice: { choice: ["ask", "pray"] },
  request_sent: {
    language: LANGUAGES,
    length: ["short", "medium", "long"],
    support_card: YES_NO,
  },
  request_edited: {},
  request_deleted: {},
  prayed: { filter: FEED_FILTERS },
  filter_changed: { filter: FEED_FILTERS },
  read_more: {},
  report_sent: { reason: ["spam", "scripture_dump", "harassment", "off_topic", "other"] },
  language_changed: { language: LANGUAGES },
  notifications_changed: { enabled: YES_NO },
  digest_changed: { enabled: YES_NO, source: ["settings", "offer"] },
  account_deleted: {},
  app_shared: { outcome: ["shared", "dismissed"] },
  theme_changed: { theme: ["system", "light", "dark"] },
  prayed_history_opened: {},
  author_blocked: {},
  authors_unblocked: {},
} as const satisfies Record<string, Record<string, readonly string[]>>;

export type EventName = keyof typeof EVENTS;
export type EventParams<E extends EventName> = {
  [K in keyof (typeof EVENTS)[E]]?: (typeof EVENTS)[E][K] extends readonly (infer V)[] ? V : never;
};

/** Removes what could identify a person or a request from text that leaves the device. */
export function scrub(text: string, max = 300): string {
  return text
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "<email>")
    .replace(/\+?\d[\d\s().-]{5,}\d/g, "<number>")
    .slice(0, max);
}

/** Only plain route names: letters, digits, slashes, dashes. Anything else is not reported. */
export function safeScreenName(path: string): string | null {
  const name = path.split("?")[0]?.replace(/^\//, "") || "welcome";
  return /^[a-z0-9/_-]{1,40}$/i.test(name) ? name : null;
}

export function createTelemetry(deps: { loadBackend: () => Backend | null }) {
  let backend: Backend | null = null;
  let started = false;

  const active = () => backend !== null;

  async function init(): Promise<void> {
    if (started) return;
    started = true;
    backend = deps.loadBackend();
    // Collection is off in the native config. Switch it on for everyone.
    await backend?.setCollectionEnabled(true).catch(() => undefined);
  }

  function track<E extends EventName>(event: E, params?: EventParams<E>): void {
    if (!active() || !Object.hasOwn(EVENTS, event)) return;
    const allowed = EVENTS[event] as Record<string, readonly string[]>;
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(params ?? {})) {
      if (allowed[key]?.includes(String(value))) clean[key] = String(value);
    }
    try {
      backend!.logEvent(event, clean);
    } catch {
      // ignore
    }
  }

  function screen(path: string): void {
    if (!active()) return;
    const name = safeScreenName(path);
    if (!name) return;
    try {
      backend!.logScreen(name);
    } catch {
      // ignore
    }
  }

  function setLanguage(language: string): void {
    if (!active() || !(LANGUAGES as readonly string[]).includes(language)) return;
    try {
      backend!.setUserProperty("language", language);
    } catch {
      // ignore
    }
  }

  function error(err: unknown, context: string): void {
    if (!active()) return;
    const source = err instanceof Error ? err : new Error(String(err));
    const clean = new Error(scrub(source.message));
    clean.name = source.name;
    clean.stack = source.stack ? scrub(source.stack, 4000) : undefined;
    try {
      backend!.recordError(clean, scrub(context, 60));
    } catch {
      // ignore
    }
  }

  return {
    init,
    /** True when this build can report at all (not Expo Go, not the web). */
    isAvailable: () => backend !== null,
    track,
    screen,
    setLanguage,
    error,
  };
}
