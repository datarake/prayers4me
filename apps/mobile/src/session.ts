import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { isLanguageCode, type LanguageCode } from "@prayers4me/shared";

const DEVICE_KEY = "prayers4me.deviceId";
const LANGUAGE_KEY = "prayers4me.language";
const WELCOME_KEY = "prayers4me.welcomeSeen";

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_KEY, id);
  return id;
}

export async function getStoredLanguage(): Promise<LanguageCode> {
  const value = await AsyncStorage.getItem(LANGUAGE_KEY);
  if (
    value === "en" ||
    value === "es" ||
    value === "fr" ||
    value === "ro" ||
    value === "uk" ||
    value === "ru"
  ) {
    return value;
  }
  return deviceLanguage();
}

/** First launch: follow the phone's language when we support it. */
function deviceLanguage(): LanguageCode {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "en";
    const code = locale.slice(0, 2).toLowerCase();
    if (isLanguageCode(code)) return code;
  } catch {
    // fall through
  }
  return "en";
}

export async function setStoredLanguage(language: LanguageCode): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
}

/** The welcome screen is for the first launch only. After that the app opens on the feed. */
export async function hasSeenWelcome(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(WELCOME_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function markWelcomeSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(WELCOME_KEY, "1");
  } catch {
    // Not critical: the welcome screen would just show once more.
  }
}
