import { LANGUAGES } from "@prayers4me/shared";
import * as Haptics from "expo-haptics";
import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLanguage } from "@/src/LanguageContext";
import { Screen } from "@/src/components/ui";
import { colors, fontsFor, type FontSet } from "@/src/theme";
import { useStyles } from "@/src/useStyles";

export default function LanguagesScreen() {
  const styles = useStyles(createStyles);
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
        renderItem={({ item }) => {
          const selected = item.code === language;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={async () => {
                Haptics.selectionAsync().catch(() => undefined);
                await setLanguage(item.code);
                router.back();
              }}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text
                style={[
                  styles.label,
                  // Each language name is set in the font that actually contains its letters.
                  { fontFamily: fontsFor(item.code).bodyMedium },
                  selected && styles.labelSelected,
                  selected && { fontFamily: fontsFor(item.code).bodyBold },
                ]}
              >
                {item.label}
              </Text>
              {selected ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const createStyles = (fonts: FontSet) =>
  StyleSheet.create({
    list: {
      padding: 20,
    },
    sep: {
      height: 10,
    },
    row: {
      minHeight: 60,
      borderRadius: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rowSelected: {
      borderColor: colors.teal,
      backgroundColor: colors.mistDeep,
    },
    label: {
      fontFamily: fonts.bodyMedium,
      fontSize: 16,
      color: colors.ink,
    },
    labelSelected: {
      fontFamily: fonts.bodyBold,
      color: colors.sea,
    },
    check: {
      fontFamily: fonts.bodyBold,
      color: colors.teal,
      fontSize: 18,
    },
  });
