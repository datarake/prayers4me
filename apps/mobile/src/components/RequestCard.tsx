import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LanguageCode, PrayerRequestPublic } from "@prayers4me/shared";
import { prayersLabel, type Copy } from "../i18n";
import { colors, type FontSet } from "../theme";
import { useStyles } from "../useStyles";
import { Icon } from "./Icon";
import { PrayButton } from "./PrayButton";
import { Body } from "./ui";
import { Pressable } from "react-native";

/** Long stories are clamped so one request cannot push the rest of the feed off screen. */
const CLAMP_LINES = 5;
const LONG_MESSAGE_CHARS = 260;

const LOCALES: Record<LanguageCode, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  ro: "ro",
  uk: "uk",
  ru: "ru",
};

/**
 * "5 min ago" from our own localized strings. Intl.RelativeTimeFormat is not available on
 * every runtime, and a silent fallback to a calendar date made new requests look old.
 */
function whenLabel(iso: string, language: LanguageCode, copy: Copy): string {
  const date = new Date(iso);
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return copy.timeNow;
  if (minutes < 60) return copy.timeMinutes(minutes);
  if (minutes < 60 * 24) return copy.timeHours(Math.round(minutes / 60));
  if (minutes < 60 * 24 * 7) return copy.timeDays(Math.round(minutes / 1440));
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(LOCALES[language], {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function RequestCard({
  item,
  language,
  copy,
  onPray,
  onReport,
  onDelete,
  onEdit,
}: {
  item: PrayerRequestPublic;
  language: LanguageCode;
  copy: Copy;
  /** Present only in the public feed. */
  onPray?: () => void;
  onReport?: () => void;
  /** Present only where the user can manage their own requests. */
  onDelete?: () => void;
  onEdit?: () => void;
}) {
  const styles = useStyles(createStyles);
  const hasPrayers = item.prayersCount > 0;
  const [expanded, setExpanded] = useState(false);
  const isLong =
    item.message.length > LONG_MESSAGE_CHARS ||
    item.message.split("\n").length > CLAMP_LINES;
  const canAct = !item.isMine && Boolean(onPray);

  return (
    <View
      style={[
        styles.row,
        item.isMine && hasPrayers && styles.rowPrayedFor,
        // Once you have prayed, the card steps back so the ones still waiting stand out.
        item.prayedByMe && styles.rowPrayed,
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.name}>{item.displayName}</Text>
        <Text style={styles.date}>{whenLabel(item.createdAt, language, copy)}</Text>
      </View>

      {item.isMine || item.status !== "active" || item.editedAt ? (
        <View style={styles.badges}>
          {item.isMine ? (
            <Text style={styles.badge}>{copy.yourRequest}</Text>
          ) : null}
          {item.editedAt ? (
            <Text style={[styles.badge, styles.badgeQuiet]}>{copy.edited}</Text>
          ) : null}
          {item.status !== "active" ? (
            <Text style={[styles.badge, styles.badgeWarn]}>
              {copy.underReview}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Body
        style={[styles.message, isLong && styles.messageClamped]}
        numberOfLines={isLong && !expanded ? CLAMP_LINES : undefined}
      >
        {item.message}
      </Body>
      {isLong ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((v) => !v)}
          hitSlop={8}
          style={styles.moreBtn}
        >
          <Text style={styles.moreLabel}>
            {expanded ? copy.readLess : copy.readMore}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.countRow}>
        <View style={styles.flame}>
          <Icon
            name="candle"
            size={16}
            color={hasPrayers ? colors.teal : "rgba(61, 90, 86, 0.45)"}
          />
        </View>
        <Text style={[styles.count, !hasPrayers && styles.countNone]}>
          {prayersLabel(language, item.prayersCount)}
        </Text>
      </View>

      {item.isMine && onDelete ? (
        <View style={styles.actions}>
          {onEdit && item.editsLeft > 0 && item.status === "active" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.edit}
              onPress={onEdit}
              hitSlop={8}
              style={({ pressed }) => [
                styles.reportBtn,
                styles.editBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={[styles.reportLabel, styles.editLabel]}>{copy.edit}</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.delete}
            onPress={onDelete}
            hitSlop={8}
            style={({ pressed }) => [styles.reportBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={[styles.reportLabel, styles.deleteLabel]}>
              {copy.delete}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {canAct ? (
        <View style={styles.actions}>
          <PrayButton
            prayed={item.prayedByMe}
            label={copy.pray}
            prayedLabel={copy.prayed}
            accessibilityLabel={copy.prayFor(item.displayName)}
            onPress={onPray!}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.report}
            onPress={onReport}
            hitSlop={8}
            style={({ pressed }) => [styles.reportBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.reportLabel}>{copy.report}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (fonts: FontSet) =>
  StyleSheet.create({
    row: {
      paddingVertical: 22,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowPrayed: {
      opacity: 0.72,
    },
    messageClamped: {
      marginBottom: 4,
    },
    moreBtn: {
      minHeight: 44,
      justifyContent: "center",
      alignSelf: "flex-start",
    },
    moreLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 15,
      color: colors.tealText,
    },
    rowPrayedFor: {
      paddingLeft: 14,
      borderLeftWidth: 3,
      borderLeftColor: colors.candle,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 12,
      marginBottom: 8,
    },
    name: {
      fontFamily: fonts.display,
      fontSize: 21,
      lineHeight: 27,
      color: colors.ink,
      flexShrink: 1,
    },
    date: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.inkSoft,
    },
    badges: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 10,
    },
    badge: {
      fontFamily: fonts.bodyBold,
      fontSize: 12,
      color: colors.sea,
      backgroundColor: colors.mistDeep,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      overflow: "hidden",
    },
    badgeWarn: {
      color: "#7A4B00",
      backgroundColor: "#F8E7BE",
    },
    message: {
      color: colors.ink,
      fontSize: 17,
      lineHeight: 26,
      marginBottom: 14,
    },
    countRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 16,
    },
    flame: {
      width: 18,
      alignItems: "center",
    },
    count: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.tealText,
      flexShrink: 1,
    },
    countNone: {
      color: colors.inkSoft,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    reportBtn: {
      minHeight: 44,
      minWidth: 44,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    badgeQuiet: {
      color: colors.inkSoft,
      backgroundColor: "rgba(15, 61, 58, 0.07)",
    },
    editBtn: {
      alignItems: "flex-start",
    },
    editLabel: {
      color: colors.sea,
      fontFamily: fonts.bodyBold,
    },
    deleteLabel: {
      color: colors.danger,
    },
    reportLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.inkSoft,
    },
  });
