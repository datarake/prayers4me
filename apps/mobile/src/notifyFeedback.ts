import { Alert, Linking } from "react-native";
import type { EnableResult } from "./notifications";

type Copy = {
  notifyDenied: string;
  notifyUnavailable: string;
  errorNetwork: string;
  cancel: string;
  openSettings: string;
};

/**
 * Tells the person why notifications did not turn on. When the system will not ask again,
 * the only way back is the phone's settings, so offer to open them.
 */
export function explainEnableResult(
  result: Exclude<EnableResult, "enabled">,
  copy: Copy,
  showToast: (message: string, kind?: "error") => void,
): void {
  if (result === "blocked") {
    Alert.alert(copy.notifyDenied, undefined, [
      { text: copy.cancel, style: "cancel" },
      { text: copy.openSettings, onPress: () => Linking.openSettings().catch(() => undefined) },
    ]);
  } else if (result === "denied") {
    showToast(copy.notifyDenied, "error");
  } else if (result === "offline") {
    showToast(copy.errorNetwork, "error");
  } else {
    showToast(copy.notifyUnavailable, "error");
  }
}
