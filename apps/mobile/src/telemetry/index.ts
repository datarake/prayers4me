import AsyncStorage from "@react-native-async-storage/async-storage";
import { createTelemetry } from "./core";
import { loadFirebaseBackend } from "./firebase";

export type { Consent, EventName } from "./core";

/** The app-wide telemetry. Silent until the person opts in under Settings. */
export const telemetry = createTelemetry({
  loadBackend: loadFirebaseBackend,
  storage: {
    get: (key) => AsyncStorage.getItem(key),
    set: (key, value) => AsyncStorage.setItem(key, value),
  },
});
