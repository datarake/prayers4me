import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, type FontSet } from "../theme";
import { useStyles } from "../useStyles";

export type FeedFilter = "newest" | "waiting";

/** Two quiet options. "Needs prayer" lists requests nobody has prayed for yet. */
export function FilterPills({
  value,
  labels,
  onChange,
}: {
  value: FeedFilter;
  labels: Record<FeedFilter, string>;
  onChange: (next: FeedFilter) => void;
}) {
  const styles = useStyles(createStyles);

  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {(["newest", "waiting"] as const).map((key) => {
        const selected = value === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync().catch(() => undefined);
              onChange(key);
            }}
            style={({ pressed }) => [
              styles.pill,
              selected && styles.pillSelected,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {labels[key]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (fonts: FontSet) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: 10,
      paddingTop: 14,
      paddingBottom: 4,
    },
    pill: {
      minHeight: 44,
      paddingHorizontal: 18,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: "rgba(255,255,255,0.6)",
    },
    pillSelected: {
      backgroundColor: colors.sea,
      borderColor: colors.sea,
    },
    label: {
      fontFamily: fonts.bodyMedium,
      fontSize: 15,
      color: colors.ink,
    },
    labelSelected: {
      color: colors.white,
      fontFamily: fonts.bodyBold,
    },
  });
