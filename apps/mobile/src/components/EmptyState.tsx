import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, type FontSet } from "../theme";
import { useStyles } from "../useStyles";
import { Body, PrimaryButton } from "./ui";

/** Empty or error state. Always offers a way forward (an action) when one exists. */
export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const styles = useStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[colors.mistDeep, "rgba(201,228,222,0.35)"]}
        style={styles.orb}
      />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Body style={styles.body}>{body}</Body>
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (fonts: FontSet) =>
  StyleSheet.create({
    wrap: {
      paddingTop: 48,
      paddingHorizontal: 4,
      alignItems: "flex-start",
    },
    orb: {
      width: 72,
      height: 72,
      borderRadius: 36,
      marginBottom: 22,
    },
    title: {
      fontFamily: fonts.display,
      fontSize: 26,
      lineHeight: 32,
      color: colors.ink,
      marginBottom: 10,
    },
    body: {
      maxWidth: 340,
    },
    action: {
      alignSelf: "stretch",
      marginTop: 24,
    },
  });
