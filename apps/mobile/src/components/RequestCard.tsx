import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LanguageCode, PrayerRequestPublic } from "@prayers4me/shared";
import { prayersLabel } from "../i18n";
import { colors, fonts } from "../theme";
import { Body, Muted } from "./ui";

export function RequestCard({
  item,
  language,
  prayLabel,
  prayedLabel,
  reportLabel,
  onPray,
  onReport,
  showActions,
}: {
  item: PrayerRequestPublic;
  language: LanguageCode;
  prayLabel: string;
  prayedLabel: string;
  reportLabel: string;
  onPray?: () => void;
  onReport?: () => void;
  showActions?: boolean;
}) {
  const date = new Date(item.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={styles.name}>{item.displayName}</Text>
        <Muted>{date}</Muted>
      </View>
      <Body style={styles.message}>{item.message}</Body>
      <Text style={styles.count}>{prayersLabel(language, item.prayersCount)}</Text>

      {showActions ? (
        <View style={styles.actions}>
          <Pressable
            onPress={onPray}
            disabled={item.prayedByMe}
            style={({ pressed }) => [
              styles.prayBtn,
              item.prayedByMe && styles.prayBtnDone,
              pressed && !item.prayedByMe && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[
                styles.prayLabel,
                item.prayedByMe && styles.prayLabelDone,
              ]}
            >
              {item.prayedByMe ? prayedLabel : prayLabel}
            </Text>
          </Pressable>
          <Pressable onPress={onReport} hitSlop={10} style={styles.reportBtn}>
            <Text style={styles.reportLabel}>{reportLabel}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 10,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 26,
    color: colors.ink,
    flexShrink: 1,
  },
  message: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 25,
    marginBottom: 14,
  },
  count: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.teal,
    marginBottom: 14,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  prayBtn: {
    backgroundColor: colors.sea,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  prayBtnDone: {
    backgroundColor: colors.mistDeep,
  },
  prayLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.white,
  },
  prayLabelDone: {
    color: colors.sea,
  },
  reportBtn: {
    paddingVertical: 8,
  },
  reportLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
  },
});
