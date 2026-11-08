import { useFocusEffect, useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { PrayerRequestPublic } from "@prayers4me/shared";
import { useLanguage } from "@/src/LanguageContext";
import { api, errorMessage } from "@/src/api";
import { EmptyState } from "@/src/components/EmptyState";
import { RequestCard } from "@/src/components/RequestCard";
import { SkeletonList } from "@/src/components/Skeleton";
import { useToast } from "@/src/components/Toast";
import { Screen } from "@/src/components/ui";
import { telemetry } from "@/src/telemetry";
import { type FontSet, type Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeContext";
import { useStyles } from "@/src/useStyles";

/**
 * Requests the person has prayed for. Private, plain and quiet: no counts of their own
 * prayers, no streaks, nothing to keep up. It is a place to remember, and to see how a
 * request has grown.
 */
export default function PrayedScreen() {
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
  const generation = useRef(0);

  useLayoutEffect(() => {
    navigation.setOptions({ title: copy.prayedLabel });
  }, [navigation, copy.prayedLabel]);

  useEffect(() => {
    telemetry.track("prayed_history_opened");
  }, []);

  const load = useCallback(async () => {
    const current = ++generation.current;
    setFailed(false);
    try {
      const page = await api.prayedFor();
      if (current !== generation.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch (err) {
      if (current !== generation.current) return;
      if (items.length > 0) toast.show(errorMessage(err, copy.errorNetwork), "error");
      else setFailed(true);
    } finally {
      if (current === generation.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copy.errorNetwork, toast]);

  // Refresh whenever the screen is shown, so a prayer said a moment ago is already here.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || loading || refreshing) return;
    const current = generation.current;
    setLoadingMore(true);
    try {
      const page = await api.prayedFor(cursor);
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
  }, [cursor, loadingMore, loading, refreshing, copy.errorNetwork, toast]);

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
              load();
            }}
            tintColor={colors.teal}
          />
        }
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.top}>
              <Text style={styles.intro}>{copy.prayedHint}</Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          loading ? (
            <SkeletonList />
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
            <EmptyState title={copy.prayedEmptyTitle} body={copy.prayedEmptyBody} />
          )
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={colors.teal} style={styles.footer} /> : undefined
        }
        renderItem={({ item }) => (
          // Shown as plain history: the card is not dimmed and has no pray or report buttons.
          <RequestCard item={{ ...item, prayedByMe: false }} language={language} copy={copy} />
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
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    intro: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 23,
      color: colors.inkSoft,
    },
    footer: {
      paddingVertical: 24,
    },
  });
