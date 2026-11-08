import { useMemo } from "react";
import { useLanguage } from "./LanguageContext";
import { fontsFor, type FontSet } from "./theme";

/** Builds a StyleSheet with the fonts of the active language (rebuilt only when it changes). */
export function useStyles<T>(factory: (fonts: FontSet) => T): T {
  const { language } = useLanguage();
  return useMemo(() => factory(fontsFor(language)), [factory, language]);
}
