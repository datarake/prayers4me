import { describe, expect, it } from "vitest";
import { prayersLabel, t } from "./i18n";

const LANGS = ["en", "es", "fr", "ro", "uk", "ru"] as const;

/** Every string in a language, with functions called on sample values. */
function strings(lang: (typeof LANGS)[number]): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(t(lang))) {
    if (typeof value === "string") out.push([key, value]);
    else if (Array.isArray(value)) value.forEach((v, i) => out.push([`${key}[${i}]`, String(v)]));
    else if (typeof value === "function") {
      const fn = value as (...args: unknown[]) => string;
      out.push([`${key}()`, fn(12, "Ana")]);
    }
  }
  return out;
}

describe("translations", () => {
  const keys = Object.keys(t("en")).sort();

  it.each(LANGS)("%s has exactly the same keys as English", (lang) => {
    expect(Object.keys(t(lang)).sort()).toEqual(keys);
  });

  it.each(LANGS)("%s has no empty or unfinished text", (lang) => {
    for (const [key, text] of strings(lang)) {
      expect(text.trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      expect(text, `${lang}.${key}`).not.toMatch(/undefined|\[object|\$\{|TODO|TBD/);
    }
  });

  it.each(LANGS)("%s uses no long or short dashes as punctuation", (lang) => {
    for (const [key, text] of strings(lang)) {
      expect(text, `${lang}.${key}`).not.toMatch(/[—–]/);
    }
  });

  it.each(LANGS)("%s has the same number of guidelines as English", (lang) => {
    expect(t(lang).guidelinesRules).toHaveLength(t("en").guidelinesRules.length);
  });

  it("writes Ukrainian and Russian in Cyrillic and the others in Latin", () => {
    expect(t("uk").tagline).toMatch(/[а-яіїєґ]/i);
    expect(t("ru").tagline).toMatch(/[а-яё]/i);
    for (const lang of ["en", "es", "fr", "ro"] as const) {
      expect(t(lang).tagline).not.toMatch(/[а-яё]/i);
    }
  });

  it("fills in names and numbers", () => {
    expect(t("en").prayFor("Ana")).toContain("Ana");
    expect(t("en").messageTooShort(10)).toContain("10");
    expect(t("en").timeMinutes(5)).toContain("5");
    expect(t("ru").timeHours(3)).toContain("3");
  });
});

describe("prayer counts", () => {
  it.each(LANGS)("%s distinguishes none, one and many", (lang) => {
    const none = prayersLabel(lang, 0);
    const one = prayersLabel(lang, 1);
    const many = prayersLabel(lang, 12);
    expect(new Set([none, one, many]).size).toBe(3);
    expect(many).toContain("12");
  });
});
