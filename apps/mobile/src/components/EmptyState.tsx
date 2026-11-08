import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts } from "../theme";
import { Body } from "./ui";

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[colors.mistDeep, "rgba(201,228,222,0.35)"]}
        style={styles.orb}
      />
      <Text style={styles.title}>{title}</Text>
      <Body style={styles.body}>{body}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 56,
    paddingHorizontal: 8,
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
    maxWidth: 320,
  },
});
