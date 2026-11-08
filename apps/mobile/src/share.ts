import { APP_DOMAIN } from "@prayers4me/shared";
import { Share } from "react-native";

/**
 * The page people land on from a shared message: the app's own website, which has the
 * store links. A build can point somewhere else (a staging site) with EXPO_PUBLIC_SHARE_URL,
 * and an empty value switches the link off.
 */
export const SHARE_URL = process.env.EXPO_PUBLIC_SHARE_URL ?? `https://${APP_DOMAIN}`;

/** What goes into the share sheet. Never contains a request, only the app. */
export function shareContent(
  message: string,
  url: string = SHARE_URL,
): { message: string } {
  return url ? { message: `${message}\n${url}` } : { message };
}

/** Opens the system share sheet. Resolves to what the person did. */
export async function shareApp(message: string): Promise<"shared" | "dismissed"> {
  const result = await Share.share(shareContent(message));
  return result.action === Share.sharedAction ? "shared" : "dismissed";
}
