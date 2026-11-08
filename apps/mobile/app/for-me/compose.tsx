import { MESSAGE_MAX_LENGTH, MESSAGE_MIN_LENGTH } from "@prayers4me/shared";
import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, useState, type ReactNode } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLanguage } from "@/src/LanguageContext";
import { api } from "@/src/api";
import { PrimaryButton, Screen } from "@/src/components/ui";
import { colors, fonts } from "@/src/theme";

export default function ComposeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { language, copy } = useLanguage();

  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [contactable, setContactable] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: copy.composeTitle });
  }, [navigation, copy.composeTitle]);

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await api.createRequest({
        language,
        displayName: displayName.trim(),
        message: message.trim(),
        contactable,
        phone: contactable ? phone.trim() || null : null,
        email: contactable ? email.trim() || null : null,
      });
      router.back();
    } catch (err) {
      Alert.alert(
        copy.errorGeneric,
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>{copy.composeIntro}</Text>

          <Field label={copy.nameLabel}>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={copy.nameLabel}
              placeholderTextColor={colors.inkSoft}
              style={styles.input}
              autoCapitalize="words"
            />
          </Field>

          <Field label={copy.messageLabel}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={copy.messageLabel}
              placeholderTextColor={colors.inkSoft}
              style={[styles.input, styles.textarea]}
              multiline
              textAlignVertical="top"
              maxLength={MESSAGE_MAX_LENGTH}
            />
            <Text style={styles.hint}>
              {message.trim().length}/{MESSAGE_MAX_LENGTH} · min{" "}
              {MESSAGE_MIN_LENGTH}
            </Text>
          </Field>

          <View style={styles.switchRow}>
            <Text style={styles.label}>{copy.contactLabel}</Text>
            <Switch
              value={contactable}
              onValueChange={setContactable}
              trackColor={{ true: colors.tealBright, false: colors.mistDeep }}
            />
          </View>

          {contactable ? (
            <>
              <Field label={copy.phoneLabel}>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={copy.phoneLabel}
                  placeholderTextColor={colors.inkSoft}
                  style={styles.input}
                  keyboardType="phone-pad"
                />
              </Field>
              <Field label={copy.emailLabel}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={copy.emailLabel}
                  placeholderTextColor={colors.inkSoft}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </Field>
            </>
          ) : null}

          <PrimaryButton
            label={copy.send}
            onPress={onSubmit}
            disabled={submitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 22,
    gap: 16,
  },
  intro: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.inkSoft,
    marginBottom: 4,
  },
  field: {
    gap: 8,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  textarea: {
    minHeight: 140,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
  },
  switchRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
});
