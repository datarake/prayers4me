import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { type FontSet, type Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeContext";
import { useStyles } from "@/src/useStyles";

export default function NotFoundScreen() {
  const styles = useStyles(createStyles);
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go home</Text>
        </Link>
      </View>
    </>
  );
}

const createStyles = (fonts: FontSet, colors: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      backgroundColor: colors.mist,
    },
    title: {
      fontFamily: fonts.display,
      fontSize: 22,
      color: colors.ink,
    },
    link: {
      marginTop: 16,
      paddingVertical: 12,
    },
    linkText: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: colors.teal,
    },
  });
