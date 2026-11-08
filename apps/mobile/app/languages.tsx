import { LANGUAGES } from "@prayers4me/shared";
import * as Haptics from "expo-haptics";
import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLanguage } from "@/src/LanguageContext";
import { telemetry } from "@/src/telemetry";
import { Icon } from "@/src/components/Icon";
import { Screen } from "@/src/components/ui";
import { fontsFor, type FontSet, type Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeContext";
import { useStyles } from "@/src/useStyles";

export default function LanguagesScreen() {
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { language, setLanguage, copy } = useLanguage();

  useLayoutEffect(() => {
    navigation.setOptions({ title: copy.languagesTitle });
  }, [navigation, copy.languagesTitle]);

  return (
    <Screen>
      <FlatList
        data={LANGUAGES}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListHeaderComponent={
          // The language decides which community you see, so say so.
          <Text style={styles.intro}>{copy.languageIntro}</Text>
        }
        renderItem={({ item }) => {
          const selected = item.code === language;
          // Each name is set in the font that actually contains its letters.
          const f = fontsFor(item.code);
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${item.nativeName}. ${item.label}`}
              onPress={async () => {
                Haptics.selectionAsync().catch(() => undefined);
                await setLanguage(item.code);
                telemetry.track("language_changed", { language: item.code });
                router.back();
              }}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.names}>
                <Text
                  style={[
                    styles.name,
                    { fontFamily: selected ? f.bodyBold : f.bodyMedium },
                    selected && styles.nameSelected,
                  ]}
                >
                  {item.nativeName}
                </Text>
                <Text style={[styles.phrase, { fontFamily: f.body }]}>
                  {item.label}
                </Text>
              </View>
              {selected ? (
                <View style={styles.checked}>
                  <Icon name="check" size={16} color={colors.white} strokeWidth={2.4} />
                </View>
              ) : (
                <Icon name="circle" size={26} color={colors.radioOff} />
              )}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const createStyles = (fonts: FontSet, colors: Palette) =>
  StyleSheet.create({
    list: {
      padding: 20,
      paddingBottom: 40,
    },
    intro: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: colors.inkSoft,
      marginBottom: 16,
    },
    sep: {
      height: 10,
    },
    row: {
      minHeight: 68,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    rowSelected: {
      borderColor: colors.teal,
      backgroundColor: colors.mistDeep,
    },
    names: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: 19,
      lineHeight: 25,
      color: colors.ink,
    },
    nameSelected: {
      color: colors.heading,
    },
    phrase: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.inkSoft,
    },
    checked: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.teal,
      alignItems: "center",
      justifyContent: "center",
    },
  });
