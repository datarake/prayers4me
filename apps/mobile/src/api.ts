import Constants from "expo-constants";
import type {
  FeedPage,
  LanguageCode,
  PrayerRequestPublic,
  ReportReason,
} from "@prayers4me/shared";
import { getDeviceId } from "./session";

function apiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return (
    process.env.EXPO_PUBLIC_API_URL ??
    extra?.apiUrl ??
    "http://localhost:8080"
  );
}

async function authHeaders(): Promise<HeadersInit> {
  const deviceId = await getDeviceId();
  return {
    Authorization: `Bearer dev:${deviceId}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...headers,
        ...(init?.headers ?? {}),
      },
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof body?.error?.message === "string"
          ? body.error.message
          : `Request failed (${res.status})`;
      throw new Error(message);
    }
    return body as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Server connection timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  session: () =>
    request<{ id: string; language: LanguageCode; banned: boolean }>(
      "/v1/session",
    ),

  feed: (language: LanguageCode, cursor?: string) => {
    const params = new URLSearchParams({ language, limit: "20" });
    if (cursor) params.set("cursor", cursor);
    return request<FeedPage>(`/v1/requests?${params.toString()}`);
  },

  myRequests: () => request<FeedPage>("/v1/requests/me"),

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

  report: (id: string, reason: ReportReason) =>
    request<{ autoHidden: boolean }>(`/v1/requests/${id}/report`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};
