import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";

const STATE_KEY = "prayers4me.notifications";
/** Set when turning notifications off could not reach the server; the next launch retries. */
const CLEAR_PENDING_KEY = "prayers4me.notifications.clearPending";

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
    if (granted) await registerToken();
    else await api.registerPushToken(null);
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
