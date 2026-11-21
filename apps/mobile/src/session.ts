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

const JUST_SENT_KEY = "prayers4me.justSent";
const JUST_SENT_WINDOW_MS = 60 * 60 * 1000;

/** Remembers that a request was just sent, to offer "pray for someone while you wait". */
export async function markJustSent(): Promise<void> {
  try {
    await AsyncStorage.setItem(JUST_SENT_KEY, String(Date.now()));
  } catch {
    // Not critical.
  }
}

/** True for an hour after sending a request, until the person acts on or dismisses the offer. */
export async function hasJustSent(): Promise<boolean> {
  try {
    const at = Number(await AsyncStorage.getItem(JUST_SENT_KEY));
    return at > 0 && Date.now() - at < JUST_SENT_WINDOW_MS;
  } catch {
    return false;
  }
}

export async function clearJustSent(): Promise<void> {
  try {
    await AsyncStorage.removeItem(JUST_SENT_KEY);
  } catch {
    // Not critical.
  }
}

/**
 * After the server has deleted the account, forget this phone too: the next launch starts
 * as a new person, with a fresh device id and the welcome screen. The language stays.
 */
export async function resetLocalData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      DEVICE_KEY,
      WELCOME_KEY,
      JUST_SENT_KEY,
      "prayers4me.notifications",
    ]);
  } catch {
    // Not critical.
  }
}
