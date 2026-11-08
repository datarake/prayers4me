export const colors = {
  ink: "#102A28",
  inkSoft: "#3D5A56",
  mist: "#E7F3F0",
  mistDeep: "#C9E4DE",
  sea: "#0F3D3A",
  seaMid: "#1A5C56",
  teal: "#1F8A80",
  tealBright: "#2BB3A6",
  /** Teal for small text: 5.3:1 on the pale background (the bright teal is only 3.7:1). */
  tealText: "#176E66",
  candle: "#E6C16A",
  white: "#FFFFFF",
  danger: "#B42318",
  border: "rgba(15, 61, 58, 0.12)",
} as const;

import type { LanguageCode } from "@prayers4me/shared";

export type FontSet = {
  display: string;
  displayItalic: string;
  body: string;
  bodyMedium: string;
  bodyBold: string;
};

/** Brand typography: Fraunces + DM Sans. Covers Latin, including Romanian ș/ț. */
const latin: FontSet = {
  display: "Fraunces_600SemiBold",
  displayItalic: "Fraunces_600SemiBold_Italic",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodyBold: "DMSans_700Bold",
};

/**
 * Cyrillic companions: neither Fraunces nor DM Sans has Cyrillic glyphs, so Ukrainian
 * and Russian would silently fall back to the system font. Lora (warm serif) and
 * Manrope (geometric sans) match the brand's voice and cover all of Cyrillic.
 */
const cyrillic: FontSet = {
  display: "Lora_600SemiBold",
  displayItalic: "Lora_600SemiBold_Italic",
  body: "Manrope_400Regular",
  bodyMedium: "Manrope_500Medium",
  bodyBold: "Manrope_700Bold",
};

export function fontsFor(language: LanguageCode): FontSet {
  return language === "uk" || language === "ru" ? cyrillic : latin;
}

/** The wordmark is Latin text in every language, so it always uses the brand serif. */
export const brandFont = latin.display;
