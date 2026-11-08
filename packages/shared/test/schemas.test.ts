import { describe, expect, it } from "vitest";
import {
  LANGUAGES,
  MAX_EDITS_PER_REQUEST,
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  NAME_MAX_LENGTH,
  createRequestSchema,
  feedQuerySchema,
  isLanguageCode,
  reportRequestSchema,
  updateRequestSchema,
} from "../src/index.js";

const valid = {
  language: "en",
  displayName: "Ana",
  message: "Please pray for my mother, she is in the hospital.",
};

describe("createRequestSchema", () => {
  it("accepts a normal request and keeps only a name, a message and a language", () => {
    const parsed = createRequestSchema.parse({ ...valid, phone: "+40 700 000 000", email: "a@b.co", contactable: true });
    expect(Object.keys(parsed).sort()).toEqual(["displayName", "language", "message"]);
  });

  it("trims whitespace", () => {
    const parsed = createRequestSchema.parse({ ...valid, displayName: "  Ana  ", message: `  ${valid.message}  ` });
    expect(parsed.displayName).toBe("Ana");
    expect(parsed.message).toBe(valid.message);
  });

  it("enforces the message length limits", () => {
    expect(createRequestSchema.safeParse({ ...valid, message: "x".repeat(MESSAGE_MIN_LENGTH - 1) }).success).toBe(false);
    expect(createRequestSchema.safeParse({ ...valid, message: "x".repeat(MESSAGE_MIN_LENGTH) }).success).toBe(true);
    expect(createRequestSchema.safeParse({ ...valid, message: "x".repeat(MESSAGE_MAX_LENGTH) }).success).toBe(true);
    expect(createRequestSchema.safeParse({ ...valid, message: "x".repeat(MESSAGE_MAX_LENGTH + 1) }).success).toBe(false);
  });

  it("enforces the name limits", () => {
    expect(createRequestSchema.safeParse({ ...valid, displayName: "" }).success).toBe(false);
    expect(createRequestSchema.safeParse({ ...valid, displayName: "x".repeat(NAME_MAX_LENGTH + 1) }).success).toBe(false);
  });

  it("rejects an unknown language", () => {
    expect(createRequestSchema.safeParse({ ...valid, language: "de" }).success).toBe(false);
  });
});

describe("updateRequestSchema", () => {
  it("does not take a language, because that decides which feed the request is in", () => {
    const parsed = updateRequestSchema.parse({ displayName: "Ana", message: valid.message, language: "ru" });
    expect(parsed).not.toHaveProperty("language");
  });

  it("drops any contact details sent by an older app", () => {
    const parsed = updateRequestSchema.parse({ displayName: "Ana", message: valid.message, email: "a@b.co", phone: "1" });
    expect(Object.keys(parsed).sort()).toEqual(["displayName", "message"]);
  });

  it("allows a small, fixed number of edits", () => {
    expect(MAX_EDITS_PER_REQUEST).toBe(3);
  });
});

describe("feedQuerySchema", () => {
  it("defaults to newest, 20 per page", () => {
    expect(feedQuerySchema.parse({ language: "en" })).toMatchObject({ filter: "newest", limit: 20 });
  });

  it("limits the page size and the filter values", () => {
    expect(feedQuerySchema.safeParse({ language: "en", limit: "0" }).success).toBe(false);
    expect(feedQuerySchema.safeParse({ language: "en", limit: "51" }).success).toBe(false);
    expect(feedQuerySchema.safeParse({ language: "en", filter: "popular" }).success).toBe(false);
    expect(feedQuerySchema.parse({ language: "en", limit: "50", filter: "waiting" }).limit).toBe(50);
  });
});

describe("reportRequestSchema", () => {
  it("accepts the known reasons only", () => {
    for (const reason of ["spam", "scripture_dump", "harassment", "off_topic", "other"]) {
      expect(reportRequestSchema.safeParse({ reason }).success).toBe(true);
    }
    expect(reportRequestSchema.safeParse({ reason: "boring" }).success).toBe(false);
  });
});

describe("languages", () => {
  it("lists six languages with Russian last in the picker", () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(["en", "es", "fr", "ro", "uk", "ru"]);
  });

  it("gives each language its own name and a community phrase", () => {
    for (const l of LANGUAGES) {
      expect(l.nativeName.length).toBeGreaterThan(1);
      expect(l.label.length).toBeGreaterThan(l.nativeName.length);
    }
  });

  it("recognises language codes", () => {
    expect(isLanguageCode("ro")).toBe(true);
    expect(isLanguageCode("de")).toBe(false);
  });
});
