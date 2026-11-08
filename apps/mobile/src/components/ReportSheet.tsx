import { REPORT_REASONS, type ReportReason } from "@prayers4me/shared";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Copy } from "../i18n";
import { colors, type FontSet } from "../theme";
import { useStyles } from "../useStyles";

function reasonLabel(copy: Copy, reason: ReportReason): string {
  switch (reason) {
    case "spam":
      return copy.reasonSpam;
    case "scripture_dump":
      return copy.reasonScripture;
    case "harassment":
      return copy.reasonHarassment;
    case "off_topic":
      return copy.reasonOffTopic;
    default:
      return copy.reasonOther;
  }
}

/** Bottom sheet with every report reason, localized (replaces the English-only Alert). */
export function ReportSheet({
  visible,
  copy,
  onSelect,
  onClose,
}: {
  visible: boolean;
  copy: Copy;
  onSelect: (reason: ReportReason) => void;
  onClose: () => void;
}) {
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel={copy.cancel}
        accessibilityRole="button"
      />
      <View
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
        accessibilityViewIsModal
      >
        <View style={styles.grabber} />
        <Text style={styles.title} accessibilityRole="header">
          {copy.reportTitle}
        </Text>
        <Text style={styles.subtitle}>{copy.reportSubtitle}</Text>

        {REPORT_REASONS.map((reason) => (
          <Pressable
            key={reason}
            accessibilityRole="button"
            onPress={() => onSelect(reason)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.rowLabel}>{reasonLabel(copy, reason)}</Text>
          </Pressable>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.cancelLabel}>{copy.cancel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const createStyles = (fonts: FontSet) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(8, 28, 26, 0.5)",
    },
    sheet: {
      backgroundColor: colors.mist,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    grabber: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.mistDeep,
      marginBottom: 16,
    },
    title: {
      fontFamily: fonts.display,
      fontSize: 22,
      lineHeight: 28,
      color: colors.ink,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: colors.inkSoft,
      marginTop: 4,
      marginBottom: 14,
    },
    row: {
      minHeight: 54,
      justifyContent: "center",
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    rowPressed: {
      backgroundColor: colors.mistDeep,
    },
    rowLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 16,
      color: colors.ink,
    },
    cancel: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    cancelLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: colors.sea,
    },
  });
