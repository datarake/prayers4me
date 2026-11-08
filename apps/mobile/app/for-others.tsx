import * as Haptics from "expo-haptics";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PrayerRequestPublic } from "@prayers4me/shared";
import { useLanguage } from "@/src/LanguageContext";
import { api } from "@/src/api";
import { EmptyState } from "@/src/components/EmptyState";
import { RequestCard } from "@/src/components/RequestCard";
import { LoadingState, Screen } from "@/src/components/ui";
import { colors, fonts } from "@/src/theme";

export default function ForOthersScreen() {
  const navigation = useNavigation();
  const { language, copy } = useLanguage();
  const [items, setItems] = useState<PrayerRequestPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: copy.forOthersTitle });
  }, [navigation, copy.forOthersTitle]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const page = await api.feed(language);
      setItems(page.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorGeneric);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language, copy.errorGeneric]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onPray = async (id: string) => {
    try {
      const result = await api.pray(id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                prayedByMe: true,
                prayersCount: result.prayersCount,
              }
            : item,
        ),
      );
    } catch (err) {
      Alert.alert(
        copy.errorGeneric,
        err instanceof Error ? err.message : undefined,
      );
    }
  };

  const onReport = (id: string) => {
    Alert.alert(copy.report, undefined, [
      { text: copy.back, style: "cancel" },
      {
        text: "Spam",
        onPress: async () => {
          try {
            await api.report(id, "spam");
            await load();
          } catch (err) {
            Alert.alert(
              copy.errorGeneric,
              err instanceof Error ? err.message : undefined,
            );
          }
        },
      },
      {
        text: "Scripture dump",
        onPress: async () => {
          try {
            await api.report(id, "scripture_dump");
            await load();
          } catch (err) {
            Alert.alert(
              copy.errorGeneric,
              err instanceof Error ? err.message : undefined,
            );
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingState label={copy.loading} />;

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
          <View style={styles.intro}>
            <Text style={styles.introText}>{copy.forOthersIntro}</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={error ? copy.errorGeneric : copy.emptyFeedTitle}
            body={error ?? copy.emptyFeedBody}
          />
        }
        renderItem={({ item }) => (
          <RequestCard
            item={item}
            language={language}
            prayLabel={copy.pray}
            prayedLabel={copy.prayed}
            reportLabel={copy.report}
            showActions
            onPray={() => onPray(item.id)}
            onReport={() => onReport(item.id)}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 22,
    paddingBottom: 48,
    flexGrow: 1,
  },
  intro: {
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  introText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.inkSoft,
  },
});
