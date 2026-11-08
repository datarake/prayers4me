import { getDeviceId } from "./session";
import { nativeFirebaseIsPresent } from "./telemetry/firebase";

/**
 * How the app proves who it is to the API.
 *
 * - `dev`: a made-up id kept on the phone. Only for a local API running in dev mode.
 * - `firebase`: an anonymous Firebase account (no sign-in screen, nothing to remember) whose
 *   signed token the API verifies, plus an App Check token that shows the call comes from a
 *   genuine copy of the app. Set `EXPO_PUBLIC_AUTH_MODE=firebase` for builds that talk to a
 *   real API. It needs a development or release build: Expo Go has no Firebase.
 */
export const AUTH_MODE: "dev" | "firebase" =
  process.env.EXPO_PUBLIC_AUTH_MODE === "firebase" ? "firebase" : "dev";

/** A fixed debug token for simulators and development builds, registered once in the Firebase console. */
const APP_CHECK_DEBUG_TOKEN = process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN;

type AuthModule = typeof import("@react-native-firebase/auth");
type AppCheckModule = typeof import("@react-native-firebase/app-check");
type AppModule = typeof import("@react-native-firebase/app");

type Firebase = {
  auth: AuthModule;
  appCheck: AppCheckModule;
  appCheckInstance: ReturnType<AppCheckModule["initializeAppCheck"]>;
  authInstance: ReturnType<AuthModule["getAuth"]>;
};

let firebase: Firebase | null = null;

function loadFirebase(): Firebase {
  if (firebase) return firebase;
  if (!nativeFirebaseIsPresent()) {
    throw new Error("Sign-in needs a development or release build of the app (not Expo Go).");
  }
  /* eslint-disable @typescript-eslint/no-require-imports */
  const app: AppModule = require("@react-native-firebase/app");
  const auth: AuthModule = require("@react-native-firebase/auth");
  const appCheck: AppCheckModule = require("@react-native-firebase/app-check");
  /* eslint-enable @typescript-eslint/no-require-imports */

  // App Check has to start before the first call to any Firebase service.
  const provider = new appCheck.ReactNativeFirebaseAppCheckProvider();
  provider.configure({
    apple: {
      provider: __DEV__ ? "debug" : "appAttestWithDeviceCheckFallback",
      ...(__DEV__ && APP_CHECK_DEBUG_TOKEN ? { debugToken: APP_CHECK_DEBUG_TOKEN } : {}),
    },
    android: {
      provider: __DEV__ ? "debug" : "playIntegrity",
      ...(__DEV__ && APP_CHECK_DEBUG_TOKEN ? { debugToken: APP_CHECK_DEBUG_TOKEN } : {}),
    },
  });
  const firebaseApp = app.getApp();
  const appCheckInstance = appCheck.initializeAppCheck(firebaseApp, {
    provider,
    isTokenAutoRefreshEnabled: true,
  });

  firebase = { auth, appCheck, appCheckInstance, authInstance: auth.getAuth(firebaseApp) };
  return firebase;
}

let signingIn: Promise<void> | null = null;

/** Makes sure this install has an anonymous account. Concurrent callers share one sign-in. */
async function ensureSignedIn(fb: Firebase): Promise<void> {
  if (fb.authInstance.currentUser) return;
  signingIn ??= fb.auth
    .signInAnonymously(fb.authInstance)
    .then(() => undefined)
    .finally(() => {
      signingIn = null;
    });
  await signingIn;
}

/** The headers every API call carries. `forceRefresh` asks Firebase for a brand new token. */
export async function authHeaders(forceRefresh = false): Promise<Record<string, string>> {
  if (AUTH_MODE === "dev") {
    return { Authorization: `Bearer dev:${await getDeviceId()}` };
  }

  const fb = loadFirebase();
  await ensureSignedIn(fb);
  const user = fb.authInstance.currentUser;
  if (!user) throw new Error("Could not sign in");
  const idToken = await user.getIdToken(forceRefresh);

  const headers: Record<string, string> = { Authorization: `Bearer ${idToken}` };
  try {
    const { token } = await fb.appCheck.getToken(fb.appCheckInstance, forceRefresh);
    if (token) headers["X-Firebase-AppCheck"] = token;
  } catch {
    // Attestation can fail on an emulator or without a network. The API decides whether
    // that is acceptable; the app does not block on it.
  }
  return headers;
}

/**
 * After the server deleted the account, delete the anonymous Firebase account too, so the
 * next launch is a new person and no token for the old one can bring the data back.
 */
export async function forgetIdentity(): Promise<void> {
  if (AUTH_MODE !== "firebase") return;
  try {
    const fb = loadFirebase();
    const user = fb.authInstance.currentUser;
    if (user) await fb.auth.deleteUser(user);
  } catch {
    // The server side is already gone. If deleting here fails, sign out so a new account starts.
    try {
      const fb = loadFirebase();
      await fb.auth.signOut(fb.authInstance);
    } catch {
      // Nothing more to do.
    }
  }
}
