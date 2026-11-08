import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { PrayerRequestPublic } from "@prayers4me/shared";
import { useLanguage } from "@/src/LanguageContext";
import { api } from "@/src/api";
import { EmptyState } from "@/src/components/EmptyState";
import { RequestCard } from "@/src/components/RequestCard";
import { LoadingState, PrimaryButton, Screen } from "@/src/components/ui";
import { colors, fonts } from "@/src/theme";

export default function ForMeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { language, copy } = useLanguage();
  const [items, setItems] = useState<PrayerRequestPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: copy.forMeTitle });
  }, [navigation, copy.forMeTitle]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const page = await api.myRequests();
      setItems(page.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [copy.errorGeneric]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  if (loading) return <LoadingState label={copy.loading} />;

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.top}>
            <Text style={styles.intro}>{copy.forMeIntro}</Text>
            <PrimaryButton
              label={copy.composeTitle}
              variant="solid"
              onPress={() => router.push("/for-me/compose")}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={error ? copy.errorGeneric : copy.emptyMineTitle}
            body={error ?? copy.emptyMineBody}
          />
        }
        renderItem={({ item }) => (
          <RequestCard
            item={item}
            language={language}
            prayLabel={copy.pray}
            prayedLabel={copy.prayed}
            reportLabel={copy.report}
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
  top: {
    paddingTop: 12,
    paddingBottom: 18,
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  intro: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.inkSoft,
  },
});
