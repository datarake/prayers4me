export const LANGUAGES = [
  { code: "en", label: "Prayers in English" },
  { code: "es", label: "Oraciones en español" },
  { code: "fr", label: "Prières en français" },
  { code: "ro", label: "Rugăciuni în română" },
  { code: "uk", label: "Молитви українською" },
  { code: "ru", label: "Молитвы на русском языке" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function isLanguageCode(value: string): value is LanguageCode {
  return (LANGUAGE_CODES as readonly string[]).includes(value);
}
