import { createHash } from "node:crypto";
import type { Context } from "hono";
import type { Env } from "../env.js";

/**
 * The caller's network address. With no trusted proxy only the socket address counts.
 * Behind N proxies the client is the Nth entry from the right of X-Forwarded-For: entries
 * to its left are whatever the client chose to send, so they are never trusted.
 */
export function clientIp(c: Context, env: Env): string {
  if (env.TRUSTED_PROXY_HOPS > 0) {
    const entries = (c.req.header("x-forwarded-for") ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const ip = entries[entries.length - env.TRUSTED_PROXY_HOPS];
    if (ip) return ip;
  }
  const incoming = (c.env as { incoming?: { socket?: { remoteAddress?: string } } })
    ?.incoming;
  return incoming?.socket?.remoteAddress ?? "unknown";
}

/**
 * A salted, daily-rotating fingerprint of the address. It lets us count distinct networks
 * within one day and enforce per-network limits, but cannot follow anyone across days.
 */
export function ipFingerprint(c: Context, env: Env): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${env.IP_HASH_SECRET}:${day}:${clientIp(c, env)}`)
    .digest("hex")
    .slice(0, 32);
}
