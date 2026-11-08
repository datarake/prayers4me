import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextProps,
  type ViewProps,
} from "react-native";
import { colors, fonts } from "../theme";

export function Screen({ style, ...props }: ViewProps) {
  return <View style={[styles.screen, style]} {...props} />;
}

export function BrandTitle({ style, ...props }: TextProps) {
  return <Text style={[styles.brand, style]} {...props} />;
}

export function Heading({ style, ...props }: TextProps) {
  return <Text style={[styles.heading, style]} {...props} />;
}

export function Body({ style, ...props }: TextProps) {
  return <Text style={[styles.body, style]} {...props} />;
}

export function Muted({ style, ...props }: TextProps) {
  return <Text style={[styles.muted, style]} {...props} />;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = "solid",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "solid" | "soft" | "ghost" | "onDark" | "candle";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "solid" && styles.buttonSolid,
        variant === "soft" && styles.buttonSoft,
        variant === "ghost" && styles.buttonGhost,
        variant === "onDark" && styles.buttonOnDark,
        variant === "candle" && styles.buttonCandle,
        (pressed || disabled) && { opacity: 0.72 },
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          variant === "ghost" && { color: colors.sea },
          variant === "soft" && { color: colors.sea },
          variant === "onDark" && { color: colors.white },
          variant === "candle" && { color: colors.sea },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.teal} />
      <Muted style={{ marginTop: 12 }}>{label}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.mist,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 42,
    lineHeight: 48,
    color: colors.white,
    letterSpacing: -0.5,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.inkSoft,
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  buttonSolid: {
    backgroundColor: colors.teal,
  },
  buttonSoft: {
    backgroundColor: "rgba(15, 61, 58, 0.08)",
  },
  buttonGhost: {
    backgroundColor: "transparent",
  },
  buttonOnDark: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  buttonCandle: {
    backgroundColor: colors.candle,
  },
  buttonLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.white,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
