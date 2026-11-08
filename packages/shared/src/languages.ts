/** `nativeName` is the language's own name (for scanning a list), `label` the community phrase. */
export const LANGUAGES = [
  { code: "en", nativeName: "English", label: "Prayers in English" },
  { code: "es", nativeName: "Español", label: "Oraciones en español" },
  { code: "fr", nativeName: "Français", label: "Prières en français" },
  { code: "ro", nativeName: "Română", label: "Rugăciuni în română" },
  { code: "uk", nativeName: "Українська", label: "Молитви українською" },
  { code: "ru", nativeName: "Русский", label: "Молитвы на русском языке" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

export function isLanguageCode(value: string): value is LanguageCode {
  return (LANGUAGE_CODES as readonly string[]).includes(value);
}
