import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { LanguageCode } from "@prayers4me/shared";
import { api } from "./api";

const STATE_KEY = "prayers4me.notifications";
/** Set when turning notifications off could not reach the server; the next launch retries. */
const CLEAR_PENDING_KEY = "prayers4me.notifications.clearPending";
/** The language of the evening reminder of new requests, when it is on. */
export const DIGEST_KEY = "prayers4me.digest";
/** Set once the reminder was offered after a prayer, so it is offered only once. */
export const DIGEST_OFFERED_KEY = "prayers4me.digest.offered";

/** Banner while the app is open too, but silent: this is a quiet app. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** unasked: show our own prompt. dismissed: never nag again. enabled: registered. */
export type PromptState = "unasked" | "dismissed" | "enabled";

export async function getPromptState(): Promise<PromptState> {
  try {
    const value = await AsyncStorage.getItem(STATE_KEY);
    return value === "dismissed" || value === "enabled" ? value : "unasked";
  } catch {
    return "unasked";
  }
}

async function setPromptState(state: PromptState) {
  try {
    await AsyncStorage.setItem(STATE_KEY, state);
  } catch {
    // Not critical: worst case the prompt shows again.
  }
}

export async function dismissPrompt() {
  await setPromptState("dismissed");
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

async function registerToken(): Promise<boolean> {
  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId: projectId() })
  ).data;
  await api.registerPushToken(token);
  return true;
}

/**
 * enabled: done. denied: the person said no in the system dialog. blocked: the system will not
 * ask again, only the phone's settings can turn it on. offline: allowed, but the server could
 * not be reached. unavailable: this device or build cannot receive pushes.
 */
export type EnableResult = "enabled" | "denied" | "blocked" | "offline" | "unavailable";

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Prayers",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Called only when the person taps "Turn on" in our own prompt, never at launch.
 * Asks the system for permission, then registers this device with the server.
 */
export async function enableNotifications(): Promise<EnableResult> {
  try {
    // Android 13+ shows the permission dialog only once a channel exists.
    await ensureAndroidChannel();

    const current = await Notifications.getPermissionsAsync();
    if (!current.granted && !current.canAskAgain) {
      await setPromptState("dismissed");
      return "blocked";
    }
    const result = current.granted
      ? current
      : await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: false, allowSound: true },
        });

    if (!result.granted) {
      await setPromptState("dismissed");
      return result.canAskAgain ? "denied" : "blocked";
    }

    let token: string;
    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId: projectId() })).data;
    } catch {
      // Simulators and Expo Go on Android cannot get a push token.
      return "unavailable";
    }
    try {
      await api.registerPushToken(token);
    } catch {
      return "offline";
    }
    await clearPendingClear();
    await setPromptState("enabled");
    return "enabled";
  } catch {
    return "unavailable";
  }
}

/**
 * Tokens can change, and permission can be revoked in system settings.
 * Called on launch to keep the server in step with the phone.
 */
export async function syncPushRegistration() {
  try {
    if (await AsyncStorage.getItem(CLEAR_PENDING_KEY)) {
      // Turning off earlier happened offline: tell the server now.
      await api.registerPushToken(null);
      await clearPendingClear();
    }
    if ((await getPromptState()) !== "enabled") return;
    await ensureAndroidChannel();
    const { granted } = await Notifications.getPermissionsAsync();
    if (granted) {
      await registerToken();
      // Keeps the server's copy right, and moves the evening with the phone's time zone.
      await api.setDigest(await getDigestLanguage(), utcOffsetMinutes());
    } else await api.registerPushToken(null);
  } catch {
    // Offline or unsupported: nothing to do.
  }
}

/** True when the person turned notifications on and the phone still allows them. */
export async function isNotificationsOn(): Promise<boolean> {
  try {
    if ((await getPromptState()) !== "enabled") return false;
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Stops "someone prayed" pushes: the server forgets this device's token. */
export async function disableNotifications(): Promise<void> {
  await setPromptState("dismissed");
  // Without notifications there is no evening reminder either. Turning them back on later
  // should not bring it back by surprise.
  await removeKey(DIGEST_KEY);
  try {
    await api.registerPushToken(null);
    await clearPendingClear();
  } catch {
    // Offline: remember it, so the next launch tells the server.
    try {
      await AsyncStorage.setItem(CLEAR_PENDING_KEY, "1");
    } catch {
      // Not critical.
    }
  }
}

async function clearPendingClear() {
  try {
    await AsyncStorage.removeItem(CLEAR_PENDING_KEY);
  } catch {
    // Not critical.
  }
}

/** Push tokens can change while the app runs (rare, mostly after an FCM reset). Keeps the server in step. */
export function watchPushToken(): () => void {
  const subscription = Notifications.addPushTokenListener(() => {
    syncPushRegistration();
  });
  return () => subscription.remove();
}

async function removeKey(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Not critical.
  }
}

/** Minutes ahead of UTC, as the server expects (Bucharest in winter: 120). */
function utcOffsetMinutes(): number {
  return -new Date().getTimezoneOffset();
}

export async function getDigestLanguage(): Promise<LanguageCode | null> {
  try {
    return ((await AsyncStorage.getItem(DIGEST_KEY)) as LanguageCode | null) ?? null;
  } catch {
    return null;
  }
}

/** True when the evening reminder is on and the phone still allows notifications. */
export async function isDigestOn(): Promise<boolean> {
  return (await getDigestLanguage()) !== null && (await isNotificationsOn());
}

/**
 * Turns on the evening reminder of new requests in `language`. Notifications are turned on
 * first when they are not (the system asks for permission then), since the reminder needs them.
 */
export async function enableDigest(language: LanguageCode): Promise<EnableResult> {
  if (!(await isNotificationsOn())) {
    const result = await enableNotifications();
    if (result !== "enabled") return result;
  }
  try {
    await api.setDigest(language, utcOffsetMinutes());
  } catch {
    return "offline";
  }
  try {
    await AsyncStorage.setItem(DIGEST_KEY, language);
  } catch {
    // The server has it; the next launch would only send it again.
  }
  return "enabled";
}

/** Turns the evening reminder off. Offline, the next launch tells the server. */
export async function disableDigest(): Promise<void> {
  await removeKey(DIGEST_KEY);
  try {
    await api.setDigest(null, utcOffsetMinutes());
  } catch {
    // syncPushRegistration sends the local state at the next launch.
  }
}

/** The reminder follows the language of the Pray list, so a tap opens the requests it counted. */
export async function followLanguageForDigest(language: LanguageCode): Promise<void> {
  if ((await getDigestLanguage()) === null) return;
  try {
    await AsyncStorage.setItem(DIGEST_KEY, language);
    await api.setDigest(language, utcOffsetMinutes());
  } catch {
    // Sent again at the next launch.
  }
}

/** Offer the reminder once, after a prayer, to someone who does not have it yet. */
export async function shouldOfferDigest(): Promise<boolean> {
  try {
    if (await AsyncStorage.getItem(DIGEST_OFFERED_KEY)) return false;
    return (await getDigestLanguage()) === null;
  } catch {
    return false;
  }
}

export async function markDigestOffered(): Promise<void> {
  try {
    await AsyncStorage.setItem(DIGEST_OFFERED_KEY, "1");
  } catch {
    // Not critical.
  }
}
