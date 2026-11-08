import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, type Palette } from "./theme";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "prayers4me.theme";

type ThemeValue = {
  colors: Palette;
  scheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeValue>({
  colors: lightColors,
  scheme: "light",
  preference: "system",
  setPreference: () => undefined,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === "light" || saved === "dark" || saved === "system") {
          setPreferenceState(saved);
        }
      })
      .catch(() => undefined);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const scheme = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
    return {
      colors: scheme === "dark" ? darkColors : lightColors,
      scheme,
      preference,
      setPreference,
    };
  }, [preference, system, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
