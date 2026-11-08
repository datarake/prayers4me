import { LANGUAGES } from "@prayers4me/shared";
import Constants from "expo-constants";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { APP_NAME } from "@prayers4me/shared";
import { useLanguage } from "@/src/LanguageContext";
import { Icon } from "@/src/components/Icon";
import { useToast } from "@/src/components/Toast";
import { Screen } from "@/src/components/ui";
import {
  disableNotifications,
  enableNotifications,
  isNotificationsOn,
} from "@/src/notifications";
import { colors, fontsFor, type FontSet } from "@/src/theme";
import { useStyles } from "@/src/useStyles";

export default function SettingsScreen() {
  const styles = useStyles(createStyles);
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const { language, copy } = useLanguage();
  const [notifications, setNotifications] = useState(false);
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: copy.tabSettings });
  }, [navigation, copy.tabSettings]);

  useFocusEffect(
    useCallback(() => {
      isNotificationsOn().then(setNotifications);
    }, []),
  );

  const onToggleNotifications = async (next: boolean) => {
    setBusy(true);
    if (!next) {
      await disableNotifications();
      setNotifications(false);
    } else {
      const result = await enableNotifications();
      if (result === "enabled") {
        setNotifications(true);
        toast.show(copy.notifyOn);
      } else {
        toast.show(
          result === "denied" ? copy.notifyDenied : copy.notifyUnavailable,
          "error",
        );
      }
    }
    setBusy(false);
  };

  const current = LANGUAGES.find((l) => l.code === language);
  const version = Constants.expoConfig?.version ?? "";

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.group}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${copy.languagesTitle}: ${current?.nativeName ?? ""}`}
            onPress={() => router.push("/languages")}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.label}>{copy.languagesTitle}</Text>
            <View style={styles.value}>
              <Text
                style={[
                  styles.valueText,
                  { fontFamily: fontsFor(language).bodyMedium },
                ]}
              >
                {current?.nativeName}
              </Text>
              <Icon name="chevronRight" size={18} color={colors.inkSoft} />
            </View>
          </Pressable>
        </View>

        <View style={styles.group}>
          <View style={styles.row}>
            <View style={styles.textBlock}>
              <Text style={styles.label}>{copy.settingsNotifications}</Text>
              <Text style={styles.hint}>{copy.settingsNotificationsHint}</Text>
            </View>
            <Switch
              value={notifications}
              disabled={busy}
              onValueChange={onToggleNotifications}
              trackColor={{ true: colors.tealBright, false: colors.mistDeep }}
              accessibilityLabel={copy.settingsNotifications}
            />
          </View>
        </View>

        <View style={styles.group}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/guidelines")}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.label}>{copy.guidelinesTitle}</Text>
            <Icon name="chevronRight" size={18} color={colors.inkSoft} />
          </Pressable>
        </View>

        <Text style={styles.footer}>
          {APP_NAME} {version ? `· ${copy.settingsVersion} ${version}` : ""}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (fonts: FontSet) =>
  StyleSheet.create({
    content: {
      padding: 20,
      paddingBottom: 48,
      gap: 16,
    },
    group: {
      backgroundColor: colors.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    row: {
      minHeight: 60,
      paddingHorizontal: 18,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    rowPressed: {
      backgroundColor: colors.mist,
    },
    textBlock: {
      flex: 1,
      gap: 2,
    },
    label: {
      fontFamily: fonts.bodyMedium,
      fontSize: 17,
      color: colors.ink,
    },
    hint: {
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.inkSoft,
    },
    value: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    valueText: {
      fontSize: 16,
      color: colors.inkSoft,
    },
    footer: {
      textAlign: "center",
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.inkSoft,
      marginTop: 8,
    },
  });
