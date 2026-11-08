import { useMemo } from "react";
import { useLanguage } from "./LanguageContext";
import { useTheme } from "./ThemeContext";
import { fontsFor, type FontSet, type Palette } from "./theme";

/** Builds a StyleSheet with the fonts of the active language and the active theme. */
export function useStyles<T>(factory: (fonts: FontSet, colors: Palette) => T): T {
  const { language } = useLanguage();
  const { colors } = useTheme();
  return useMemo(() => factory(fontsFor(language), colors), [factory, language, colors]);
}
