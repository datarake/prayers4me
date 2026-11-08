import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { type FontSet, type Palette } from "../theme";
import { useStyles } from "../useStyles";

/** A short row of mutually exclusive choices, for settings with two or three options. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (next: T) => void;
  label: string;
}) {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync().catch(() => undefined);
              onChange(option.key);
            }}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (fonts: FontSet, colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    segment: {
      flex: 1,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.pillBg,
      paddingHorizontal: 8,
    },
    segmentSelected: {
      backgroundColor: colors.solid,
      borderColor: colors.solid,
    },
    label: {
      fontFamily: fonts.bodyMedium,
      fontSize: 15,
      color: colors.inkSoft,
    },
    labelSelected: {
      color: colors.white,
      fontFamily: fonts.bodyBold,
    },
  });
