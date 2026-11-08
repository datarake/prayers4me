import { LANGUAGES } from "@prayers4me/shared";
import Constants from "expo-constants";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { APP_NAME } from "@prayers4me/shared";
import { useLanguage } from "@/src/LanguageContext";
import { Icon } from "@/src/components/Icon";
import { api, errorMessage } from "@/src/api";
import { useToast } from "@/src/components/Toast";
import { telemetry } from "@/src/telemetry";
import { resetLocalData } from "@/src/session";
import { Screen } from "@/src/components/ui";
import {
  disableNotifications,
  enableNotifications,
  isNotificationsOn,
} from "@/src/notifications";
import { fontsFor, type FontSet, type Palette } from "@/src/theme";
import { useTheme, type ThemePreference } from "@/src/ThemeContext";
import { useStyles } from "@/src/useStyles";
import { Segmented } from "@/src/components/Segmented";
import { shareApp } from "@/src/share";

export default function SettingsScreen() {
  const styles = useStyles(createStyles);
  const { colors, preference, setPreference } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const { language, copy } = useLanguage();
  const [notifications, setNotifications] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: copy.tabSettings });
  }, [navigation, copy.tabSettings]);

  useFocusEffect(
    useCallback(() => {
      isNotificationsOn().then(setNotifications);
      telemetry.init().then((consent) => setSharing(consent === "granted"));
    }, []),
  );

  const onToggleNotifications = async (next: boolean) => {
    setBusy(true);
    if (!next) {
      await disableNotifications();
      setNotifications(false);
      telemetry.track("notifications_changed", { enabled: "no" });
    } else {
      const result = await enableNotifications();
      if (result === "enabled") {
        setNotifications(true);
        telemetry.track("notifications_changed", { enabled: "yes" });
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

  const onToggleSharing = async (next: boolean) => {
    setSharing(next);
    await telemetry.setConsent(next);
  };

  const onChangeTheme = (next: ThemePreference) => {
    setPreference(next);
    telemetry.track("theme_changed", { theme: next });
  };

  const onShare = async () => {
    try {
      telemetry.track("app_shared", { outcome: await shareApp(copy.shareMessage) });
    } catch {
      toast.show(copy.errorGeneric, "error");
    }
  };

  const confirmDeleteData = () => {
    Alert.alert(copy.deleteDataTitle, copy.deleteDataBody, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.deleteDataConfirm,
        style: "destructive",
        onPress: async () => {
          try {
            telemetry.track("account_deleted");
            await api.deleteAccount();
          } catch (err) {
            toast.show(errorMessage(err, copy.errorNetwork), "error");
            return;
          }
          // The server has forgotten this person, so this phone does too and starts fresh.
          await resetLocalData();
          toast.show(copy.deleteDataDone);
          router.replace("/");
        },
      },
    ]);
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
          <View style={styles.block}>
            <Text style={styles.label}>{copy.appearanceLabel}</Text>
            <Segmented
              label={copy.appearanceLabel}
              value={preference}
              onChange={onChangeTheme}
              options={[
                { key: "system", label: copy.appearanceSystem },
                { key: "light", label: copy.appearanceLight },
                { key: "dark", label: copy.appearanceDark },
              ]}
            />
          </View>
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
            onPress={() => router.push("/prayed")}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.label}>{copy.prayedLabel}</Text>
            <Icon name="chevronRight" size={18} color={colors.inkSoft} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            accessibilityRole="button"
            onPress={onShare}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.textBlock}>
              <Text style={styles.label}>{copy.shareLabel}</Text>
              <Text style={styles.hint}>{copy.shareHint}</Text>
            </View>
            <Icon name="share" size={20} color={colors.inkSoft} />
          </Pressable>
        </View>

        <View style={styles.group}>
          <View style={styles.row}>
            <View style={styles.textBlock}>
              <Text style={styles.label}>{copy.telemetryLabel}</Text>
              <Text style={styles.hint}>{copy.telemetryHint}</Text>
            </View>
            <Switch
              value={sharing}
              onValueChange={onToggleSharing}
              trackColor={{ true: colors.tealBright, false: colors.mistDeep }}
              accessibilityLabel={copy.telemetryLabel}
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

        <View style={styles.group}>
          <Pressable
            accessibilityRole="button"
            onPress={confirmDeleteData}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={[styles.label, styles.danger]}>{copy.deleteDataLabel}</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          {APP_NAME} {version ? `· ${copy.settingsVersion} ${version}` : ""}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (fonts: FontSet, colors: Palette) =>
  StyleSheet.create({
    content: {
      padding: 20,
      paddingBottom: 48,
      gap: 16,
    },
    group: {
      backgroundColor: colors.surface,
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
    block: {
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 18,
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
    danger: {
      color: colors.danger,
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
