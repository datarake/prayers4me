import { createTelemetry } from "./core";
import { loadFirebaseBackend } from "./firebase";

export type { EventName } from "./core";

/** The app-wide telemetry. Starts reporting as soon as the app launches. */
export const telemetry = createTelemetry({ loadBackend: loadFirebaseBackend });
