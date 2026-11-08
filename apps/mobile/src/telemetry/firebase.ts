import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform, TurboModuleRegistry } from "react-native";
import type { Backend } from "./core";

/**
 * Is Firebase compiled into this app? It must be checked BEFORE the library is loaded.
 * In React Native a module that fails while it is first loaded reports a fatal error to the
 * app (a red screen in development, a crash in a release build) instead of throwing to the
 * code that required it, so wrapping the require in try/catch is not enough.
 */
export function nativeFirebaseIsPresent(): boolean {
  if (Platform.OS === "web") return false;
  // Expo Go never contains Firebase.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  try {
    return TurboModuleRegistry.get("NativeRNFBTurboApp") != null;
  } catch {
    return false;
  }
}

/**
 * The Firebase implementation. The native modules exist only in a development or release
 * build, not in Expo Go or on the web. Where they are missing, this returns null and the app
 * simply has no monitoring.
 */
export function loadFirebaseBackend(): Backend | null {
  if (!nativeFirebaseIsPresent()) return null;

  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const analyticsModule: typeof import("@react-native-firebase/analytics") = require("@react-native-firebase/analytics");
    const crashlyticsModule: typeof import("@react-native-firebase/crashlytics") = require("@react-native-firebase/crashlytics");
    /* eslint-enable @typescript-eslint/no-require-imports */

    const analytics = analyticsModule.getAnalytics();
    const crashlytics = crashlyticsModule.getCrashlytics();

    return {
      async setCollectionEnabled(enabled) {
        await analyticsModule.setAnalyticsCollectionEnabled(analytics, enabled);
        // Advertising consent stays off whatever the person chooses: this app has no ads.
        await analyticsModule.setConsent(analytics, {
          analytics_storage: enabled,
          ad_storage: false,
          ad_user_data: false,
          ad_personalization: false,
        });
        await crashlyticsModule.setCrashlyticsCollectionEnabled(crashlytics, enabled);
      },
      logEvent(name, params) {
        void analyticsModule.logEvent(analytics, name, params);
      },
      logScreen(name) {
        void analyticsModule.logScreenView(analytics, { screen_name: name, screen_class: name });
      },
      setUserProperty(name, value) {
        void analyticsModule.setUserProperty(analytics, name, value);
      },
      recordError(error, context) {
        crashlyticsModule.log(crashlytics, context);
        crashlyticsModule.recordError(crashlytics, error);
      },
      async resetData() {
        await analyticsModule.resetAnalyticsData(analytics);
      },
    };
  } catch {
    return null;
  }
}
