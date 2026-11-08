import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import type { LanguageCode } from "@prayers4me/shared";

const DEVICE_KEY = "prayers4me.deviceId";
const LANGUAGE_KEY = "prayers4me.language";

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
  return "en";
}

export async function setStoredLanguage(language: LanguageCode): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
}
