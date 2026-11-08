import { LANGUAGES, type LanguageCode } from "@prayers4me/shared";
import { Pressable, StyleSheet, Text } from "react-native";
import { fontsFor, type FontSet } from "../theme";
import { useStyles } from "../useStyles";
import { Icon } from "./Icon";

/** Shows the current language by its own name, so it reads as a choice, not a footnote. */
export function LanguagePill({
  language,
  accessibilityLabel,
  onPress,
}: {
  language: LanguageCode;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const styles = useStyles(createStyles);
  const current = LANGUAGES.find((l) => l.code === language);
  const white = "rgba(255,255,255,0.92)";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}: ${current?.nativeName ?? ""}`}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.pill, pressed && { opacity: 0.75 }]}
    >
      <Icon name="globe" size={18} color={white} />
      <Text
        style={[styles.label, { fontFamily: fontsFor(language).bodyMedium }]}
        maxFontSizeMultiplier={1.3}
      >
        {current?.nativeName}
      </Text>
      <Icon name="chevronDown" size={16} color={white} />
    </Pressable>
  );
}

const createStyles = (_fonts: FontSet) =>
  StyleSheet.create({
    pill: {
      alignSelf: "center",
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.32)",
      backgroundColor: "rgba(255,255,255,0.12)",
    },
    label: {
      fontSize: 15,
      color: "rgba(255,255,255,0.95)",
    },
  });
