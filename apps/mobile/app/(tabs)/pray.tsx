import { useFocusEffect, useNavigation } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  LayoutAnimation,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PrayerRequestPublic, ReportReason } from "@prayers4me/shared";
import { useLanguage } from "@/src/LanguageContext";
import { telemetry } from "@/src/telemetry";
import { api, errorMessage } from "@/src/api";
import { EmptyState } from "@/src/components/EmptyState";
import { FilterPills, type FeedFilter } from "@/src/components/FilterPills";
import { ReportSheet } from "@/src/components/ReportSheet";
import { RequestCard } from "@/src/components/RequestCard";
import { SkeletonList } from "@/src/components/Skeleton";
import { useToast } from "@/src/components/Toast";
import { Screen } from "@/src/components/ui";
import { type FontSet, type Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeContext";
import { useStyles } from "@/src/useStyles";

export default function ForOthersScreen() {
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  const navigation = useNavigation();
  const toast = useToast();
  const { language, copy } = useLanguage();

  const [items, setItems] = useState<PrayerRequestPublic[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedFilter>("newest");

  // Ignore responses that arrive after the language changed or a newer load started.
  const generation = useRef(0);
  const lastLoaded = useRef(0);

  useLayoutEffect(() => {
    navigation.setOptions({ title: copy.forOthersTitle });
  }, [navigation, copy.forOthersTitle]);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      const current = ++generation.current;
      setFailed(false);
      try {
        const page = await api.feed(language, undefined, filter);
        if (current !== generation.current) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        lastLoaded.current = Date.now();
      } catch (err) {
        if (current !== generation.current) return;
        if (mode === "refresh") {
          toast.show(errorMessage(err, copy.errorNetwork), "error");
        } else {
          setFailed(true);
        }
      } finally {
        if (current === generation.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [language, filter, copy.errorNetwork, toast],
  );

  useEffect(() => {
    setLoading(true);
    setItems([]);
    setCursor(null);
    load("initial");
  }, [load]);

  // Coming back to this tab after a while: refresh quietly so the list is never stale.
  useFocusEffect(
    useCallback(() => {
      if (lastLoaded.current && Date.now() - lastLoaded.current > 60_000) {
        load("refresh");
      }
    }, [load]),
  );

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || loading || refreshing) return;
    const current = generation.current;
    setLoadingMore(true);
    try {
      const page = await api.feed(language, cursor, filter);
      if (current !== generation.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.items.filter((p) => !seen.has(p.id))];
      });
      setCursor(page.nextCursor);
    } catch (err) {
      toast.show(errorMessage(err, copy.errorNetwork), "error");
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, loading, refreshing, language, filter, copy.errorNetwork, toast]);

  const patch = (id: string, change: Partial<PrayerRequestPublic>) =>
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );

  /** Optimistic: the UI answers instantly, and rolls back only if the server refuses. */
  const onPray = async (item: PrayerRequestPublic) => {
    patch(item.id, {
      prayedByMe: true,
      prayersCount: item.prayersCount + 1,
    });
    try {
      const result = await api.pray(item.id);
      patch(item.id, {
        prayedByMe: true,
        prayersCount: result.prayersCount,
      });
      if (!result.alreadyPrayed) {
        telemetry.track("prayed", { filter });
        toast.show(copy.prayerSent);
      }
      if (filter === "waiting") {
        // Give the confirmation a moment to be seen, then let the request leave this list.
        setTimeout(() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setItems((prev) => prev.filter((i) => i.id !== item.id));
        }, 1400);
      }
    } catch (err) {
      patch(item.id, {
        prayedByMe: item.prayedByMe,
        prayersCount: item.prayersCount,
      });
      toast.show(errorMessage(err, copy.errorNetwork), "error");
    }
  };

  const onReport = async (reason: ReportReason) => {
    const id = reportId;
    setReportId(null);
    if (!id) return;
    try {
      await api.report(id, reason);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setItems((prev) => prev.filter((item) => item.id !== id));
      telemetry.track("report_sent", { reason });
      toast.show(copy.reportThanks);
    } catch (err) {
      toast.show(errorMessage(err, copy.errorNetwork), "error");
    }
  };

  const onBlock = () => {
    const id = reportId;
    setReportId(null);
    if (!id) return;
    Alert.alert(copy.blockConfirmTitle, copy.blockConfirmBody, [
      { text: copy.cancel, style: "cancel" },
      {
        text: copy.blockPerson,
        style: "destructive",
        onPress: async () => {
          try {
            await api.blockAuthor(id);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            // Everything else by the same person disappears with a fresh load.
            setItems((prev) => prev.filter((item) => item.id !== id));
            load("refresh");
            telemetry.track("author_blocked");
            toast.show(copy.blockedToast);
          } catch (err) {
            toast.show(errorMessage(err, copy.errorNetwork), "error");
          }
        },
      },
    ]);
  };

  const retry = () => {
    setLoading(true);
    load("initial");
  };

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load("refresh");
            }}
            tintColor={colors.teal}
          />
        }
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={styles.introText}>{copy.forOthersIntro}</Text>
            <FilterPills
              value={filter}
              labels={{
                newest: copy.filterNewest,
                waiting: copy.filterWaiting,
              }}
              onChange={(next) => {
                telemetry.track("filter_changed", { filter: next });
                setFilter(next);
              }}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonList />
          ) : failed ? (
            <EmptyState
              title={copy.errorGeneric}
              body={copy.errorNetwork}
              actionLabel={copy.retry}
              onAction={retry}
            />
          ) : (
            <EmptyState
              title={
                filter === "waiting"
                  ? copy.waitingEmptyTitle
                  : copy.emptyFeedTitle
              }
              body={
                filter === "waiting"
                  ? copy.waitingEmptyBody
                  : copy.emptyFeedBody
              }
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.teal} style={styles.footer} />
          ) : items.length > 0 && !cursor ? (
            <Text style={[styles.footer, styles.end]}>{copy.feedEnd}</Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <RequestCard
            item={item}
            language={language}
            copy={copy}
            onPray={() => onPray(item)}
            onReport={() => setReportId(item.id)}
          />
        )}
      />

      <ReportSheet
        visible={reportId !== null}
        copy={copy}
        onSelect={onReport}
        onBlock={onBlock}
        onClose={() => setReportId(null)}
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
    intro: {
      paddingTop: 8,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    introText: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 23,
      color: colors.inkSoft,
    },
    footer: {
      paddingVertical: 28,
    },
    end: {
      textAlign: "center",
      fontFamily: fonts.displayItalic,
      fontSize: 16,
      lineHeight: 24,
      color: colors.inkSoft,
    },
  });
