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
import { api, errorMessage } from "@/src/api";
import { EmptyState } from "@/src/components/EmptyState";
import { RequestCard } from "@/src/components/RequestCard";
import { NotifyPrompt } from "@/src/components/NotifyPrompt";
import { SkeletonList } from "@/src/components/Skeleton";
import { useToast } from "@/src/components/Toast";
import {
  dismissPrompt,
  enableNotifications,
  getPromptState,
  type PromptState,
} from "@/src/notifications";
import { PrimaryButton, Screen } from "@/src/components/ui";
import { colors, type FontSet } from "@/src/theme";
import { useStyles } from "@/src/useStyles";

export default function ForMeScreen() {
  const styles = useStyles(createStyles);
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
    }, [load]),
  );

  const onEnableNotifications = async () => {
    setEnabling(true);
    const result = await enableNotifications();
    setEnabling(false);
    if (result === "enabled") {
      toast.show(copy.notifyOn);
      setPromptState("enabled");
    } else if (result === "denied") {
      toast.show(copy.notifyDenied, "error");
      setPromptState("dismissed");
    } else {
      toast.show(copy.notifyUnavailable, "error");
      await dismissPrompt();
      setPromptState("dismissed");
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

  const compose = () => router.push("/for-me/compose");

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
              <View style={styles.summary}>
                <Text style={styles.summaryNumber}>{totalPrayers}</Text>
                <Text style={styles.summaryLabel}>{copy.prayersReceived}</Text>
              </View>
              <Text style={styles.intro}>{copy.forMeIntro}</Text>
              {promptState === "unasked" ? (
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
          />
        )}
      />
    </Screen>
  );
}

const createStyles = (fonts: FontSet) =>
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
    summary: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 12,
    },
    summaryNumber: {
      fontFamily: fonts.display,
      fontSize: 48,
      lineHeight: 54,
      color: colors.sea,
    },
    summaryLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 16,
      color: colors.teal,
      flexShrink: 1,
    },
    intro: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 23,
      color: colors.inkSoft,
    },
  });
