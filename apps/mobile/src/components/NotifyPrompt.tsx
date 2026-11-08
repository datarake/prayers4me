import { StyleSheet, Text, View } from "react-native";
import type { Copy } from "../i18n";
import { type FontSet, type Palette } from "../theme";
import { useTheme } from "../ThemeContext";
import { useStyles } from "../useStyles";
import { PrimaryButton } from "./ui";

/**
 * Our own pre-prompt, shown in context once someone has a request. The system permission
 * dialog can only be shown once, so we ask it only after the person says yes here.
 */
export function NotifyPrompt({
  copy,
  busy,
  onEnable,
  onLater,
}: {
  copy: Copy;
  busy?: boolean;
  onEnable: () => void;
  onLater: () => void;
}) {
  const styles = useStyles(createStyles);

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        {copy.notifyTitle}
      </Text>
      <Text style={styles.body}>{copy.notifyBody}</Text>
      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label={copy.notifyEnable}
            onPress={onEnable}
            loading={busy}
          />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label={copy.notifyLater}
            variant="soft"
            onPress={onLater}
            disabled={busy}
          />
        </View>
      </View>
    </View>
  );
}

const createStyles = (fonts: FontSet, colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 8,
    },
    title: {
      fontFamily: fonts.display,
      fontSize: 20,
      lineHeight: 26,
      color: colors.ink,
    },
    body: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: colors.inkSoft,
    },
    actions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
    },
  });
