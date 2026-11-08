import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

export function PathButton({
  title,
  hint,
  onPress,
  emphasis = "primary",
}: {
  title: string;
  hint: string;
  onPress: () => void;
  emphasis?: "primary" | "secondary";
}) {
  const isPrimary = emphasis === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${hint}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && { opacity: 0.86, transform: [{ scale: 0.985 }] },
      ]}
    >
      <View style={styles.textBlock}>
        <Text style={[styles.title, isPrimary && styles.titleOnPrimary]}>
          {title}
        </Text>
        <Text style={[styles.hint, isPrimary && styles.hintOnPrimary]}>
          {hint}
        </Text>
      </View>
      <Text style={[styles.chevron, isPrimary && styles.titleOnPrimary]}>
        →
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 84,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  primary: {
    backgroundColor: colors.candle,
  },
  secondary: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.white,
  },
  titleOnPrimary: {
    color: colors.sea,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.78)",
  },
  hintOnPrimary: {
    color: "rgba(15, 61, 58, 0.72)",
  },
  chevron: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    color: colors.white,
  },
});
