import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";

const STATE_KEY = "prayers4me.notifications";

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

export type EnableResult = "enabled" | "denied" | "unavailable";

/**
 * Called only when the person taps "Turn on" in our own prompt, never at launch.
 * Asks the system for permission, then registers this device with the server.
 */
export async function enableNotifications(): Promise<EnableResult> {
  try {
    // Android 13+ shows the permission dialog only once a channel exists.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Prayers",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    const result = current.granted
      ? current
      : await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: false, allowSound: true },
        });

    if (!result.granted) {
      await setPromptState("dismissed");
      return "denied";
    }

    await registerToken();
    await setPromptState("enabled");
    return "enabled";
  } catch {
    // Simulators and Expo Go on Android cannot get a push token. Try again another time.
    return "unavailable";
  }
}

/**
 * Tokens can change, and permission can be revoked in system settings.
 * Called on launch to keep the server in step with the phone.
 */
export async function syncPushRegistration() {
  try {
    if ((await getPromptState()) !== "enabled") return;
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
  } catch {
    // Offline: the server keeps the token until the next launch syncs it.
  }
}
