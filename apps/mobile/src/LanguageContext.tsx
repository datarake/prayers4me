import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LanguageCode } from "@prayers4me/shared";
import { t } from "./i18n";
import { getStoredLanguage, setStoredLanguage } from "./session";

type LanguageContextValue = {
  language: LanguageCode;
  ready: boolean;
  setLanguage: (language: LanguageCode) => Promise<void>;
  copy: ReturnType<typeof t>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getStoredLanguage()
      .then(setLanguageState)
      .finally(() => setReady(true));
  }, []);

  const setLanguage = useCallback(async (next: LanguageCode) => {
    setLanguageState(next);
    await setStoredLanguage(next);
  }, []);

  const value = useMemo(
    () => ({
      language,
      ready,
      setLanguage,
      copy: t(language),
    }),
    [language, ready, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
