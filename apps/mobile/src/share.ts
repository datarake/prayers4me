import { Share } from "react-native";

/**
 * Where the app can be installed. Set EXPO_PUBLIC_SHARE_URL once the store listing or a landing
 * page exists. Until then the message goes out without a link rather than with a wrong one.
 */
const SHARE_URL = process.env.EXPO_PUBLIC_SHARE_URL ?? "";

/** What goes into the share sheet. Never contains a request, only the app. */
export function shareContent(message: string): { message: string; url?: string } {
  return SHARE_URL ? { message: `${message}\n${SHARE_URL}` } : { message };
}

/** Opens the system share sheet. Resolves to what the person did. */
export async function shareApp(message: string): Promise<"shared" | "dismissed"> {
  const result = await Share.share(shareContent(message));
  return result.action === Share.sharedAction ? "shared" : "dismissed";
}
