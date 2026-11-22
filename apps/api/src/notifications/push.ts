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

/** "log" prints notifications instead of sending them (development and tests). */
export type PushMode = Env["PUSH_MODE"];

/** How long one call to Expo may take. The "prayed" answer waits for it, so keep it short. */
const SEND_TIMEOUT_MS = 5000;
/** Expo keeps receipts for about a day and has them ready within minutes. */
const RECEIPT_DELAY_MINUTES = 15;
const RECEIPT_MAX_AGE_HOURS = 24;

type Ticket = { status: "ok" | "error"; id?: string; details?: { error?: string } };
type Receipt = { status: "ok" | "error"; details?: { error?: string } };
export type SendResult =
  | { kind: "sent"; ticketId?: string }
  | { kind: "invalid_token" }
  | { kind: "failed" };

export async function send(
  mode: PushMode,
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = { screen: "for-me" },
): Promise<SendResult> {
  const message = {
    to: token,
    title,
    body,
    sound: "default",
    // Android: the channel the app creates, and delivered even when the phone is dozing.
    channelId: "default",
    priority: "high",
    data,
  };

  if (mode === "log") {
    console.log("[push:log]", JSON.stringify(message));
    return { kind: "sent" };
  }

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!res.ok) return { kind: "failed" };
    const json = (await res.json()) as { data?: Ticket | Ticket[] };
    const ticket = Array.isArray(json.data) ? json.data[0] : json.data;
    if (ticket?.status === "error") {
      return ticket.details?.error === "DeviceNotRegistered"
        ? { kind: "invalid_token" }
        : { kind: "failed" };
    }
    return { kind: "sent", ticketId: ticket?.id };
  } catch {
    return { kind: "failed" };
  }
}

/** Requests whose held prayers were taken for one notification. */
type Claimed = {
  token: string;
  language: LanguageCode;
  requests: { id: string; pending: number; previous: Date | null }[];
};

/**
 * Sends one notification for the claimed prayers. A failed send puts them back, so the next
 * run of the scheduled job tries again; an uninstalled app's token is forgotten.
 */
async function deliver(sql: Sql, mode: PushMode, claimed: Claimed): Promise<void> {
  const total = claimed.requests.reduce((sum, r) => sum + r.pending, 0);
  const { title, body } = pushCopy(claimed.language, total);
  const result = await send(mode, claimed.token, title, body);

  if (result.kind === "sent") {
    if (result.ticketId) {
      await sql`
        INSERT INTO push_tickets (ticket_id, token) VALUES (${result.ticketId}, ${claimed.token})
        ON CONFLICT DO NOTHING
      `;
    }
    return;
  }

  if (result.kind === "invalid_token") {
    await forgetToken(sql, claimed.token);
    return;
  }

  for (const r of claimed.requests) {
    await sql`
      UPDATE prayer_requests
      SET unnotified_prayers = unnotified_prayers + ${r.pending}, last_notified_at = ${r.previous}
      WHERE id = ${r.id}
    `;
  }
}

export async function forgetToken(sql: Sql, token: string): Promise<void> {
  await sql`UPDATE users SET push_token = NULL, updated_at = now() WHERE push_token = ${token}`;
}

/**
 * Called after a new prayer is recorded. Never throws. Counts the prayer, and sends a push
 * when the throttle window allows it. The caller awaits it: on Cloud Run, work left running
 * after the response may be paused and never finish.
 */
export async function notifyPrayerReceived(
  sql: Sql,
  env: Pick<Env, "PUSH_MODE">,
  requestId: string,
): Promise<void> {
  try {
    const claimed = await sql.begin(async (tx) => {
      const rows = await tx<
        {
          pending: number;
          previous: Date | null;
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
          r.unnotified_prayers AS pending,
          r.last_notified_at AS previous,
          (r.last_notified_at IS NULL
            OR r.last_notified_at < now() - make_interval(hours => ${THROTTLE_HOURS})
          ) AS can_send,
          u.push_token,
          u.language
      `;
      const row = rows[0];
      // Without a token or inside the window, the prayer stays counted for the scheduled job.
      if (!row || !row.push_token || !row.can_send) return null;

      await tx`
        UPDATE prayer_requests
        SET unnotified_prayers = 0, last_notified_at = now()
        WHERE id = ${requestId}
      `;
      return {
        token: row.push_token,
        language: row.language,
        requests: [{ id: requestId, pending: row.pending, previous: row.previous }],
      } satisfies Claimed;
    });

    if (claimed) await deliver(sql, env.PUSH_MODE, claimed);
  } catch (err) {
    console.error("push notification failed", err);
  }
}

/**
 * Sends the prayers held back by the throttle once their window has passed, even when no new
 * prayer arrives to trigger it. One notification per person, however many requests. Run by
 * the scheduled maintenance job.
 */
export async function flushHeldNotifications(sql: Sql, mode: PushMode, limit = 500): Promise<number> {
  const rows = await sql<
    {
      id: string;
      pending: number;
      previous: Date | null;
      author_id: string;
      push_token: string;
      language: LanguageCode;
    }[]
  >`
    WITH due AS (
      SELECT r.id, r.unnotified_prayers AS pending, r.last_notified_at AS previous,
             u.id AS author_id, u.push_token, u.language
      FROM prayer_requests r
      JOIN users u ON u.id = r.author_id
      WHERE r.unnotified_prayers > 0
        AND r.status = 'active'
        AND u.push_token IS NOT NULL
        AND (r.last_notified_at IS NULL
          OR r.last_notified_at < now() - make_interval(hours => ${THROTTLE_HOURS}))
      ORDER BY r.last_notified_at NULLS FIRST
      LIMIT ${limit}
      FOR UPDATE OF r SKIP LOCKED
    )
    UPDATE prayer_requests r
    SET unnotified_prayers = 0, last_notified_at = now()
    FROM due
    WHERE r.id = due.id
    RETURNING due.id, due.pending, due.previous, due.author_id, due.push_token, due.language
  `;

  const byAuthor = new Map<string, Claimed>();
  for (const row of rows) {
    const claimed = byAuthor.get(row.author_id) ?? {
      token: row.push_token,
      language: row.language,
      requests: [],
    };
    claimed.requests.push({ id: row.id, pending: row.pending, previous: row.previous });
    byAuthor.set(row.author_id, claimed);
  }

  for (const claimed of byAuthor.values()) {
    try {
      await deliver(sql, mode, claimed);
    } catch (err) {
      console.error("held notification failed", err);
    }
  }
  return byAuthor.size;
}

/**
 * Reads Expo's receipts for earlier sends. FCM and APNs report an uninstalled app only here,
 * so this is where dead tokens are found and forgotten. Returns how many tokens were dropped.
 */
export async function checkPushReceipts(sql: Sql, mode: PushMode): Promise<number> {
  if (mode === "log") {
    await sql`DELETE FROM push_tickets`;
    return 0;
  }

  const tickets = await sql<{ ticket_id: string; token: string }[]>`
    SELECT ticket_id, token FROM push_tickets
    WHERE created_at < now() - make_interval(mins => ${RECEIPT_DELAY_MINUTES})
    ORDER BY created_at
    LIMIT 1000
  `;

  let dropped = 0;
  if (tickets.length > 0) {
    const res = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ids: tickets.map((t) => t.ticket_id) }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Expo receipts answered ${res.status}`);
    const receipts = ((await res.json()) as { data?: Record<string, Receipt> }).data ?? {};

    const checked: string[] = [];
    for (const ticket of tickets) {
      const receipt = receipts[ticket.ticket_id];
      if (!receipt) continue;
      checked.push(ticket.ticket_id);
      if (receipt.status === "error" && receipt.details?.error === "DeviceNotRegistered") {
        await forgetToken(sql, ticket.token);
        dropped += 1;
      } else if (receipt.status === "error") {
        console.error("push receipt error", receipt.details?.error ?? "unknown");
      }
    }
    if (checked.length > 0) await sql`DELETE FROM push_tickets WHERE ticket_id IN ${sql(checked)}`;
  }

  // A receipt that never came will not come any more.
  await sql`
    DELETE FROM push_tickets
    WHERE created_at < now() - make_interval(hours => ${RECEIPT_MAX_AGE_HOURS})
  `;
  return dropped;
}
