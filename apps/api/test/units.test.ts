import { describe, expect, it } from "vitest";
import { ApiError } from "../src/errors.js";
import { assertMessageLooksHuman } from "../src/moderation/heuristics.js";
import { pruneRateLimitBuckets } from "../src/maintenance.js";
import { requireUuid } from "../src/validation.js";
import { resetDb, sql } from "./helpers.js";

describe("message checks", () => {
  const rejects = (message: string) => {
    try {
      assertMessageLooksHuman(message);
      return null;
    } catch (err) {
      return err instanceof ApiError ? err.code : "other";
    }
  };

  it("accepts an ordinary request, including a few paragraphs", () => {
    expect(rejects("Please pray for my father.\n\nHe has a long recovery ahead.")).toBeNull();
    expect(rejects("Один абзац на русском языке, без ссылок и лишнего.")).toBeNull();
  });

  it("accepts a single link", () => {
    expect(rejects("My church page is https://example.org if you want to see it")).toBeNull();
  });

  it("rejects twelve or more lines", () => {
    expect(rejects(Array(12).fill("a short line of text").join("\n"))).toBe("message_rejected");
    expect(rejects(Array(11).fill("a short line of text").join("\n"))).toBeNull();
  });

  it("rejects a line longer than 900 characters", () => {
    expect(rejects("a".repeat(901))).toBe("message_rejected");
    expect(rejects("a".repeat(900))).toBeNull();
  });

  it("rejects two or more links", () => {
    expect(rejects("http://a.example and https://b.example")).toBe("message_rejected");
  });
});

describe("id validation", () => {
  it("accepts a uuid in either case", () => {
    const id = "8083dda2-ad22-4cce-b9ca-826714335590";
    expect(requireUuid(id)).toBe(id);
    expect(requireUuid(id.toUpperCase())).toBe(id.toUpperCase());
  });

  it.each(["", "nope", "8083dda2ad224cceb9ca826714335590", "8083dda2-ad22-4cce-b9ca-82671433559", "'; DROP TABLE users;--"])(
    "treats %j as not found",
    (value) => {
      expect(() => requireUuid(value)).toThrow(ApiError);
    },
  );

  it("treats a missing id as not found", () => {
    expect(() => requireUuid(undefined)).toThrow(ApiError);
  });
});

describe("rate limit cleanup", () => {
  it("removes old daily counters and keeps recent ones", async () => {
    await resetDb();
    await sql`
      INSERT INTO rate_limit_buckets (subject_key, action, bucket_day, count) VALUES
        ('user:a', 'pray', CURRENT_DATE - 30, 5),
        ('user:a', 'pray', CURRENT_DATE - 8, 5),
        ('user:a', 'pray', CURRENT_DATE - 3, 5),
        ('user:a', 'pray', CURRENT_DATE, 5)
    `;
    expect(await pruneRateLimitBuckets(sql)).toBe(2);
    const rows = await sql`SELECT COUNT(*)::int AS n FROM rate_limit_buckets`;
    expect(rows[0]!.n).toBe(2);
  });
});
