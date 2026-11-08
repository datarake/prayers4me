import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, type FontSet } from "../theme";
import { useStyles } from "../useStyles";

/** The core action. Springs on press, gives haptic feedback, and settles into a calm "done" state. */
export function PrayButton({
  prayed,
  label,
  prayedLabel,
  accessibilityLabel,
  onPress,
}: {
  prayed: boolean;
  label: string;
  prayedLabel: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const styles = useStyles(createStyles);
  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!prayed) return;
    scale.setValue(0.92);
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [prayed, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={prayed ? prayedLabel : accessibilityLabel}
        accessibilityState={{ disabled: prayed, selected: prayed }}
        disabled={prayed}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
            () => undefined,
          );
          onPress();
        }}
        hitSlop={6}
        style={({ pressed }) => [
          styles.btn,
          prayed && styles.btnDone,
          pressed && !prayed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
      >
        <Text style={[styles.icon, prayed && styles.labelDone]}>
          {prayed ? "✓" : "🕯"}
        </Text>
        <Text style={[styles.label, prayed && styles.labelDone]}>
          {prayed ? prayedLabel : label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (fonts: FontSet) =>
  StyleSheet.create({
    btn: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 20,
      borderRadius: 24,
      backgroundColor: colors.sea,
    },
    btnDone: {
      backgroundColor: colors.mistDeep,
    },
    icon: {
      fontSize: 16,
      color: colors.candle,
    },
    label: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: colors.white,
    },
    labelDone: {
      color: colors.sea,
    },
  });
