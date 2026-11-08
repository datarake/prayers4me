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

async function send(path: string, init: RequestInit | undefined, forceRefresh: boolean) {
  const headers = await authHeaders(forceRefresh);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
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
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Server connection timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let { res, body } = await send(path, init, false);

  // An expired or revoked sign-in token: get a fresh one from Firebase and try once more.
  if (res.status === 401 && AUTH_MODE === "firebase") {
    ({ res, body } = await send(path, init, true));
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
    contactable: boolean;
    phone?: string | null;
    email?: string | null;
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
      contactable: boolean;
      phone?: string | null;
      email?: string | null;
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

  deleteRequest: (id: string) =>
    request<{ id: string; deleted: boolean }>(`/v1/requests/${id}`, {
      method: "DELETE",
    }),

  report: (id: string, reason: ReportReason) =>
    request<{ autoHidden: boolean }>(`/v1/requests/${id}/report`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};
