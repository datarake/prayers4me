import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLanguage } from "@/src/LanguageContext";
import { Screen } from "@/src/components/ui";
import { type FontSet, type Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeContext";
import { useStyles } from "@/src/useStyles";

export default function GuidelinesScreen() {
  const styles = useStyles(createStyles);
  const navigation = useNavigation();
  const router = useRouter();
  const { copy } = useLanguage();

  // Opens on top of the compose modal, where there is no automatic back button.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: copy.guidelinesTitle,
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerBtn}
        >
          <Text style={styles.headerBtnLabel}>{copy.back}</Text>
        </Pressable>
      ),
    });
  }, [navigation, router, styles, copy.guidelinesTitle, copy.back]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>{copy.guidelinesIntro}</Text>
        {copy.guidelinesRules.map((rule, i) => (
          <View key={i} style={styles.rule}>
            <Text style={styles.number}>{i + 1}</Text>
            <Text style={styles.ruleText}>{rule}</Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (fonts: FontSet, colors: Palette) =>
  StyleSheet.create({
    headerBtn: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    headerBtnLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 16,
      color: colors.heading,
    },
    content: {
      padding: 22,
      paddingBottom: 48,
      gap: 18,
    },
    intro: {
      fontFamily: fonts.display,
      fontSize: 24,
      lineHeight: 31,
      color: colors.ink,
      marginBottom: 6,
    },
    rule: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 14,
    },
    number: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: "hidden",
      textAlign: "center",
      lineHeight: 32,
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.heading,
      backgroundColor: colors.mistDeep,
    },
    ruleText: {
      flex: 1,
      fontFamily: fonts.body,
      fontSize: 17,
      lineHeight: 26,
      color: colors.ink,
      paddingTop: 2,
    },
  });
