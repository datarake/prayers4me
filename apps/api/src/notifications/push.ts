import type { LanguageCode } from "@prayers4me/shared";
import type { Sql } from "../db/client.js";
import type { Env } from "../env.js";

/** One notification per request per window. Later prayers are counted and sent together. */
const THROTTLE_HOURS = 3;

type Copy = { title: string; one: string; many: (n: number) => string };

/**
 * Notifications never say who prayed and never repeat the request text, so a lock
 * screen reveals nothing private. Counts avoid plural agreement for uk/ru.
 */
const COPY: Record<LanguageCode, Copy> = {
  en: {
    title: "Someone prayed for you.",
    one: "A prayer was said for your request.",
    many: (n) => `${n} prayers were said for your request.`,
  },
  es: {
    title: "Alguien oró por ti.",
    one: "Se dijo una oración por tu petición.",
    many: (n) => `${n} oraciones por tu petición.`,
  },
  fr: {
    title: "Quelqu’un a prié pour toi.",
    one: "Une prière a été dite pour ta demande.",
    many: (n) => `${n} prières pour ta demande.`,
  },
  ro: {
    title: "Cineva s-a rugat pentru tine.",
    one: "S-a spus o rugăciune pentru cererea ta.",
    many: (n) => `${n} rugăciuni pentru cererea ta.`,
  },
  uk: {
    title: "Хтось помолився за тебе.",
    one: "За твоє прохання промовили молитву.",
    many: (n) => `Нових молитов: ${n}`,
  },
  ru: {
    title: "Кто-то помолился за тебя.",
    one: "За твою просьбу произнесли молитву.",
    many: (n) => `Новых молитв: ${n}`,
  },
};

export function pushCopy(language: LanguageCode, pending: number) {
  const c = COPY[language] ?? COPY.en;
  return { title: c.title, body: pending <= 1 ? c.one : c.many(pending) };
}

export const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

type Ticket = { status: "ok" | "error"; details?: { error?: string } };

async function send(
  env: Env,
  token: string,
  title: string,
  body: string,
): Promise<"sent" | "invalid_token" | "failed"> {
  const message = {
    to: token,
    title,
    body,
    sound: "default",
    data: { screen: "for-me" },
  };

  if (env.PUSH_MODE === "log") {
    console.log("[push:log]", JSON.stringify(message));
    return "sent";
  }

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(message),
  });
  if (!res.ok) return "failed";
  const json = (await res.json()) as { data?: Ticket | Ticket[] };
  const ticket = Array.isArray(json.data) ? json.data[0] : json.data;
  if (ticket?.status === "error") {
    return ticket.details?.error === "DeviceNotRegistered"
      ? "invalid_token"
      : "failed";
  }
  return "sent";
}

/**
 * Called after a new prayer is recorded. Safe to call without awaiting: it never throws.
 * Counts the prayer, and sends a push when the throttle window allows it.
 */
export async function notifyPrayerReceived(
  sql: Sql,
  env: Env,
  requestId: string,
): Promise<void> {
  try {
    const claimed = await sql.begin(async (tx) => {
      const rows = await tx<
        {
          author_id: string;
          pending: number;
          can_send: boolean;
          push_token: string | null;
          language: LanguageCode;
        }[]
      >`
        UPDATE prayer_requests r
        SET unnotified_prayers = r.unnotified_prayers + 1
        FROM users u
        WHERE r.id = ${requestId} AND u.id = r.author_id
        RETURNING
          r.author_id,
          r.unnotified_prayers AS pending,
          (r.last_notified_at IS NULL
            OR r.last_notified_at < now() - make_interval(hours => ${THROTTLE_HOURS})
          ) AS can_send,
          u.push_token,
          u.language
      `;
      const row = rows[0];
      // Without a token or inside the window, the prayer simply stays counted.
      if (!row || !row.push_token || !row.can_send) return null;

      await tx`
        UPDATE prayer_requests
        SET unnotified_prayers = 0, last_notified_at = now()
        WHERE id = ${requestId}
      `;
      return row;
    });

    if (!claimed || !claimed.push_token) return;

    const { title, body } = pushCopy(claimed.language, claimed.pending);
    const result = await send(env, claimed.push_token, title, body);

    if (result === "invalid_token") {
      await sql`
        UPDATE users SET push_token = NULL, updated_at = now()
        WHERE id = ${claimed.author_id} AND push_token = ${claimed.push_token}
      `;
    }
  } catch (err) {
    console.error("push notification failed", err);
  }
}
