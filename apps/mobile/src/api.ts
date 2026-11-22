import Constants from "expo-constants";
import type {
  FeedPage,
  LanguageCode,
  PrayerRequestPublic,
  ReportReason,
} from "@prayers4me/shared";
import { AUTH_MODE, authHeaders } from "./identity";
import { telemetry } from "./telemetry";

function apiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return (
    process.env.EXPO_PUBLIC_API_URL ??
    extra?.apiUrl ??
    "http://localhost:8080"
  );
}

/** Error with a message that came from the server (safe to show). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Server message when we have one, otherwise a friendly network message. */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

const TIMEOUT_MS = 15000;

class TimeoutError extends Error {
  constructor() {
    super("Server connection timed out");
  }
}

/**
 * Rejects when the work takes too long. Signing in and the App Check token can hang on a weak
 * connection, and they cannot be aborted, so the whole call (not only the fetch) races a timer.
 */
function withDeadline<T>(work: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new TimeoutError());
    }, ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function send(path: string, init: RequestInit | undefined, forceRefresh: boolean) {
  const controller = new AbortController();
  return withDeadline(
    (async () => {
      const headers = await authHeaders(forceRefresh);
      try {
        const res = await fetch(`${apiBaseUrl()}${path}`, {
          ...init,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...headers,
            ...(init?.headers ?? {}),
          },
        });
        const body = await res.json().catch(() => ({}));
        return { res, body };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") throw new TimeoutError();
        throw err;
      }
    })(),
    TIMEOUT_MS,
    () => controller.abort(),
  );
}

const isGet = (init?: RequestInit) => !init?.method || init.method === "GET";

/** A weak connection often fails once and works a moment later. Only reads are repeated. */
async function sendWithRetry(path: string, init: RequestInit | undefined, forceRefresh: boolean) {
  const attempts = isGet(init) ? 3 : 1;
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await send(path, init, forceRefresh);
      if (attempt < attempts && [502, 503, 504].includes(result.res.status)) {
        await new Promise((r) => setTimeout(r, 700 * attempt));
        continue;
      }
      return result;
    } catch (err) {
      if (attempt >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 700 * attempt));
    }
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let { res, body } = await sendWithRetry(path, init, false);

  // An expired or revoked sign-in token: get a fresh one from Firebase and try once more.
  if (res.status === 401 && AUTH_MODE === "firebase") {
    ({ res, body } = await sendWithRetry(path, init, true));
  }

  if (!res.ok) {
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : `Request failed (${res.status})`;
    // A 5xx is the server failing, not the person making a mistake: worth knowing about.
    // The address is reduced to its shape so no id leaves the phone.
    if (res.status >= 500) {
      telemetry.error(
        new Error(`API ${init?.method ?? "GET"} ${path.split("?")[0]} answered ${res.status}`),
        "api",
      );
    }
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export const api = {
  session: () =>
    request<{ id: string; language: LanguageCode; banned: boolean }>(
      "/v1/session",
    ),

  feed: (
    language: LanguageCode,
    cursor?: string,
    filter: "newest" | "waiting" = "newest",
  ) => {
    const params = new URLSearchParams({ language, limit: "20", filter });
    if (cursor) params.set("cursor", cursor);
    return request<FeedPage>(`/v1/requests?${params.toString()}`);
  },

  myRequests: () => request<FeedPage>("/v1/requests/me"),

  /** Requests the person prayed for. Private to them. */
  prayedFor: (cursor?: string) => {
    const params = new URLSearchParams({ limit: "20" });
    if (cursor) params.set("cursor", cursor);
    return request<FeedPage>(`/v1/requests/prayed?${params.toString()}`);
  },

  createRequest: (payload: {
    language: LanguageCode;
    displayName: string;
    message: string;
  }) =>
    request<PrayerRequestPublic>("/v1/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  pray: (id: string) =>
    request<{
      requestId: string;
      prayedByMe: boolean;
      alreadyPrayed: boolean;
      prayersCount: number;
    }>(`/v1/requests/${id}/pray`, { method: "POST" }),

  updateRequest: (
    id: string,
    payload: {
      displayName: string;
      message: string;
    },
  ) =>
    request<PrayerRequestPublic>(`/v1/requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteAccount: () => request<{ deleted: boolean }>("/v1/session", { method: "DELETE" }),

  registerPushToken: (token: string | null) =>
    request<{ registered: boolean }>("/v1/session/push-token", {
      method: "PUT",
      body: JSON.stringify({ token }),
    }),

  /** The evening reminder of new requests, in one language; null turns it off. */
  setDigest: (language: LanguageCode | null, utcOffsetMinutes: number) =>
    request<{ language: LanguageCode | null }>("/v1/session/digest", {
      method: "PUT",
      body: JSON.stringify({ language, utcOffsetMinutes }),
    }),

  deleteRequest: (id: string) =>
    request<{ id: string; deleted: boolean }>(`/v1/requests/${id}`, {
      method: "DELETE",
    }),

  blockAuthor: (requestId: string) =>
    request<{ blocked: boolean }>(`/v1/requests/${requestId}/block`, { method: "POST" }),

  blockedCount: () => request<{ count: number }>("/v1/blocks"),

  unblockAll: () => request<{ unblocked: number }>("/v1/blocks", { method: "DELETE" }),

  report: (id: string, reason: ReportReason) =>
    request<{ autoHidden: boolean }>(`/v1/requests/${id}/report`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};
