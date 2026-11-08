export type Palette = {
  /** Page background. */
  mist: string;
  mistDeep: string;
  /** Cards, sheets and inputs. */
  surface: string;
  ink: string;
  inkSoft: string;
  /** Headings, strong labels, outlines and icons that sit on the page background. */
  heading: string;
  /** Fill of solid buttons, pills and toasts (always paired with white text). */
  solid: string;
  teal: string;
  tealBright: string;
  /** Teal for small text: readable on the page background in both themes. */
  tealText: string;
  candle: string;
  danger: string;
  border: string;
  /** Quiet badge and soft button fills. */
  subtle: string;
  /** Icon colour for an inactive state, and the inactive tab. */
  muted: string;
  tabInactive: string;
  /** Switch off state. */
  radioOff: string;
  /** Amber notice (crisis card, wait card) and the "under review" badge. */
  noteBg: string;
  noteBorder: string;
  warnBg: string;
  warnText: string;
  /** Dimmed backdrop behind sheets. */
  overlay: string;
  pillBg: string;
  fieldBg: string;
  /** Text on a solid fill. */
  white: string;
};

export const lightColors: Palette = {
  mist: "#E7F3F0",
  mistDeep: "#C9E4DE",
  surface: "#FFFFFF",
  ink: "#102A28",
  inkSoft: "#3D5A56",
  heading: "#0F3D3A",
  solid: "#0F3D3A",
  teal: "#1F8A80",
  tealBright: "#2BB3A6",
  /** 5.3:1 on the pale background (the bright teal is only 3.7:1). */
  tealText: "#176E66",
  candle: "#E6C16A",
  danger: "#B42318",
  border: "rgba(15, 61, 58, 0.12)",
  subtle: "rgba(15, 61, 58, 0.07)",
  muted: "rgba(61, 90, 86, 0.45)",
  tabInactive: "rgba(61, 90, 86, 0.75)",
  radioOff: "rgba(15, 61, 58, 0.25)",
  noteBg: "#FFF4DA",
  noteBorder: "#EBCB86",
  warnBg: "#F8E7BE",
  warnText: "#7A4B00",
  overlay: "rgba(8, 28, 26, 0.5)",
  pillBg: "rgba(255,255,255,0.6)",
  fieldBg: "rgba(255,255,255,0.7)",
  white: "#FFFFFF",
};

export const darkColors: Palette = {
  mist: "#0E1B1A",
  mistDeep: "#1F3532",
  surface: "#162826",
  ink: "#EAF3F1",
  inkSoft: "#A9C2BE",
  heading: "#E3F1EE",
  solid: "#1A7A70",
  teal: "#1F8A80",
  tealBright: "#2BB3A6",
  tealText: "#52C7BA",
  candle: "#E6C16A",
  danger: "#FF8A80",
  border: "rgba(255, 255, 255, 0.12)",
  subtle: "rgba(255, 255, 255, 0.08)",
  muted: "rgba(169, 194, 190, 0.5)",
  tabInactive: "rgba(169, 194, 190, 0.8)",
  radioOff: "rgba(255, 255, 255, 0.3)",
  noteBg: "#3A2F14",
  noteBorder: "#7A6428",
  warnBg: "#4A3A12",
  warnText: "#F3D98B",
  overlay: "rgba(0, 0, 0, 0.6)",
  pillBg: "rgba(255,255,255,0.08)",
  fieldBg: "rgba(255,255,255,0.06)",
  white: "#FFFFFF",
};

/** Brand colours for surfaces that look the same in both themes (the welcome screen). */
export const brand = {
  sea: "#0F3D3A",
  candle: "#E6C16A",
  white: "#FFFFFF",
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
