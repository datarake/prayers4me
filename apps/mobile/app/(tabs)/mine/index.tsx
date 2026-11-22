import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  LayoutAnimation,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PrayerRequestPublic } from "@prayers4me/shared";
import { useLanguage } from "@/src/LanguageContext";
import { telemetry } from "@/src/telemetry";
import { api, errorMessage } from "@/src/api";
import { EmptyState } from "@/src/components/EmptyState";
import { RequestCard } from "@/src/components/RequestCard";
import { NotifyPrompt } from "@/src/components/NotifyPrompt";
import { WaitCard } from "@/src/components/WaitCard";
import { clearJustSent, hasJustSent, markHasSent } from "@/src/session";
import { SkeletonList } from "@/src/components/Skeleton";
import { useToast } from "@/src/components/Toast";
import {
  dismissPrompt,
  enableNotifications,
  getPromptState,
  type PromptState,
} from "@/src/notifications";
import { PrimaryButton, Screen } from "@/src/components/ui";
import { type FontSet, type Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeContext";
import { useStyles } from "@/src/useStyles";
import { explainEnableResult } from "@/src/notifyFeedback";

export default function ForMeScreen() {
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const { language, copy } = useLanguage();
  const [items, setItems] = useState<PrayerRequestPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const hasLoaded = useRef(false);
  const [promptState, setPromptState] = useState<PromptState>("dismissed");
  const [justSent, setJustSent] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: copy.forMeTitle });
  }, [navigation, copy.forMeTitle]);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const page = await api.myRequests();
      setItems(page.items);
      hasLoaded.current = true;
      if (page.items.length > 0) markHasSent();
    } catch {
      // Keep whatever we already show; only a first load becomes an error state.
      if (!hasLoaded.current) setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh quietly whenever the screen regains focus (e.g. after composing),
  // without flashing a spinner over content the user is already looking at.
  useFocusEffect(
    useCallback(() => {
      load();
      getPromptState().then(setPromptState);
      hasJustSent().then(setJustSent);
    }, [load]),
  );

  const onEnableNotifications = async () => {
    setEnabling(true);
    const result = await enableNotifications();
    setEnabling(false);
    if (result === "enabled") {
      telemetry.track("notifications_changed", { enabled: "yes" });
      toast.show(copy.notifyOn);
      setPromptState("enabled");
    } else {
      explainEnableResult(result, copy, toast.show);
      // Offline is worth another try later; anything else would only nag.
      if (result !== "offline") {
        await dismissPrompt();
        setPromptState("dismissed");
      }
    }
  };

  const onLaterNotifications = async () => {
    await dismissPrompt();
    setPromptState("dismissed");
  };

  const totalPrayers = useMemo(
    () => items.reduce((sum, item) => sum + item.prayersCount, 0),
    [items],
  );

  const compose = () => router.push("/mine/compose");

  const startEdit = (item: PrayerRequestPublic) =>
    router.push({
      pathname: "/mine/compose",
      params: {
        id: item.id,
        name: item.displayName,
        message: item.message,
      },
    });

  const confirmDelete = (item: PrayerRequestPublic) => {
    Alert.alert(copy.deleteTitle, copy.deleteBody, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteRequest(item.id);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
            telemetry.track("request_deleted");
            toast.show(copy.deleted);
          } catch (err) {
            toast.show(errorMessage(err, copy.errorNetwork), "error");
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.teal}
          />
        }
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.top}>
              {totalPrayers > 0 ? (
                <>
                  <View style={styles.summary}>
                    <Text style={styles.summaryNumber}>{totalPrayers}</Text>
                    <Text style={styles.summaryLabel}>{copy.prayersReceived}</Text>
                  </View>
                  <Text style={styles.intro}>{copy.forMeIntro}</Text>
                </>
              ) : (
                // A big "0" on your own request reads as failure. Say what is true instead.
                <View style={styles.waiting}>
                  <Text style={styles.waitingTitle} accessibilityRole="header">
                    {copy.mineWaitingTitle}
                  </Text>
                  <Text style={styles.intro}>{copy.mineWaitingBody}</Text>
                </View>
              )}
              {justSent ? (
                <WaitCard
                  copy={copy}
                  onPray={async () => {
                    await clearJustSent();
                    setJustSent(false);
                    router.navigate("/pray");
                  }}
                  onLater={async () => {
                    await clearJustSent();
                    setJustSent(false);
                  }}
                />
              ) : promptState === "unasked" ? (
                <NotifyPrompt
                  copy={copy}
                  busy={enabling}
                  onEnable={onEnableNotifications}
                  onLater={onLaterNotifications}
                />
              ) : null}
              <PrimaryButton label={copy.composeTitle} onPress={compose} />
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonList count={2} />
          ) : failed ? (
            <EmptyState
              title={copy.errorGeneric}
              body={copy.errorNetwork}
              actionLabel={copy.retry}
              onAction={() => {
                setLoading(true);
                load();
              }}
            />
          ) : (
            <EmptyState
              title={copy.emptyMineTitle}
              body={copy.emptyMineBody}
              actionLabel={copy.composeTitle}
              onAction={compose}
            />
          )
        }
        renderItem={({ item }) => (
          <RequestCard
            item={item}
            language={language}
            copy={copy}
            onDelete={() => confirmDelete(item)}
            onEdit={() => startEdit(item)}
          />
        )}
      />
    </Screen>
  );
}

const createStyles = (fonts: FontSet, colors: Palette) =>
  StyleSheet.create({
    list: {
      paddingHorizontal: 22,
      paddingBottom: 56,
      flexGrow: 1,
    },
    top: {
      paddingTop: 12,
      paddingBottom: 18,
      gap: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    waiting: {
      gap: 6,
    },
    waitingTitle: {
      fontFamily: fonts.display,
      fontSize: 28,
      lineHeight: 34,
      color: colors.heading,
    },
    summary: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 12,
    },
    summaryNumber: {
      fontFamily: fonts.display,
      fontSize: 48,
      lineHeight: 54,
      color: colors.heading,
    },
    summaryLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 16,
      color: colors.tealText,
      flexShrink: 1,
    },
    intro: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 23,
      color: colors.inkSoft,
    },
  });
