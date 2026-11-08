import { StyleSheet, Text, View } from "react-native";
import type { Copy } from "../i18n";
import { type FontSet, type Palette } from "../theme";
import { useTheme } from "../ThemeContext";
import { useStyles } from "../useStyles";
import { PrimaryButton } from "./ui";

/**
 * Shown after someone sends a request. Prayers are what the whole product runs on,
 * and the person who just asked is the most likely to understand why they matter.
 */
export function WaitCard({
  copy,
  onPray,
  onLater,
}: {
  copy: Copy;
  onPray: () => void;
  onLater: () => void;
}) {
  const styles = useStyles(createStyles);

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        {copy.waitTitle}
      </Text>
      <Text style={styles.body}>{copy.waitBody}</Text>
      <View style={styles.actions}>
        <View style={{ flex: 1.4 }}>
          <PrimaryButton label={copy.forOthersAction} onPress={onPray} />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton label={copy.notifyLater} variant="soft" onPress={onLater} />
        </View>
      </View>
    </View>
  );
}

const createStyles = (fonts: FontSet, colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.noteBg,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.noteBorder,
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
      color: colors.ink,
    },
    actions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
    },
  });
