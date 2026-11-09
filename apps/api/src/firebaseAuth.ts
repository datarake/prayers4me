import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { ApiError } from "./errors.js";
import type { Env } from "./env.js";

/** Where Google publishes the public keys that sign Firebase ID tokens and App Check tokens. */
const ID_TOKEN_KEYS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const APP_CHECK_KEYS_URL = "https://firebaseappcheck.googleapis.com/v1/jwks";

export type KeyResolvers = {
  idToken?: JWTVerifyGetKey;
  appCheck?: JWTVerifyGetKey;
};

export interface Verifiers {
  /**
   * Returns the Firebase user id of a valid ID token, plus the email when the person signed in
   * with one (anonymous app users have none). `emailVerified` comes from the token, not the client.
   */
  verifyIdToken(token: string): Promise<{ uid: string; email?: string; emailVerified: boolean }>;
  /** Throws unless the token proves the call comes from a genuine copy of the app. */
  verifyAppCheck(token: string): Promise<void>;
}

/**
 * Verifies tokens locally against Google's published keys (cached and refreshed by `jose`),
 * so a request never waits on a call to Firebase. Keys can be replaced in tests.
 */
export function createVerifiers(env: Env, keys: KeyResolvers = {}): Verifiers {
  let idKeys = keys.idToken;
  let appCheckKeys = keys.appCheck;

  return {
    async verifyIdToken(token) {
      const projectId = env.FIREBASE_PROJECT_ID;
      if (!projectId) {
        throw new ApiError(500, "auth_not_configured", "FIREBASE_PROJECT_ID is not set");
      }
      idKeys ??= createRemoteJWKSet(new URL(ID_TOKEN_KEYS_URL));
      try {
        const { payload } = await jwtVerify(token, idKeys, {
          algorithms: ["RS256"],
          issuer: `https://securetoken.google.com/${projectId}`,
          audience: projectId,
        });
        if (typeof payload.sub !== "string" || payload.sub.length === 0 || payload.sub.length > 128) {
          throw new Error("missing subject");
        }
        const email = typeof payload.email === "string" ? payload.email.toLowerCase() : undefined;
        return { uid: payload.sub, email, emailVerified: payload.email_verified === true };
      } catch {
        throw new ApiError(401, "unauthorized", "Invalid or expired sign-in token");
      }
    },

    async verifyAppCheck(token) {
      const number = env.FIREBASE_PROJECT_NUMBER;
      if (!number) {
        throw new ApiError(500, "auth_not_configured", "FIREBASE_PROJECT_NUMBER is not set");
      }
      appCheckKeys ??= createRemoteJWKSet(new URL(APP_CHECK_KEYS_URL));
      try {
        await jwtVerify(token, appCheckKeys, {
          algorithms: ["RS256"],
          issuer: `https://firebaseappcheck.googleapis.com/${number}`,
          audience: `projects/${number}`,
        });
      } catch {
        throw new ApiError(401, "app_check_failed", "This app could not be verified");
      }
    },
  };
}
