import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors } from "../theme";

function Bar({ width, height = 14 }: { width: `${number}%`; height?: number }) {
  return <View style={[styles.bar, { width, height }]} />;
}

/** Placeholder cards shown while the first page loads (feels faster than a spinner). */
export function SkeletonList({ count = 3 }: { count?: number }) {
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{ opacity: pulse }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Bar width="42%" height={20} />
          <View style={{ height: 14 }} />
          <Bar width="100%" />
          <View style={{ height: 8 }} />
          <Bar width="92%" />
          <View style={{ height: 8 }} />
          <Bar width="64%" />
          <View style={{ height: 18 }} />
          <Bar width="34%" height={42} />
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bar: {
    borderRadius: 8,
    backgroundColor: colors.mistDeep,
  },
});
