import {
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  NAME_MAX_LENGTH,
} from "@prayers4me/shared";
import * as Haptics from "expo-haptics";
import { useNavigation, useRouter } from "expo-router";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ElementRef,
  type ReactNode,
} from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLanguage } from "@/src/LanguageContext";
import { api, errorMessage } from "@/src/api";
import { useToast } from "@/src/components/Toast";
import { PrimaryButton, Screen } from "@/src/components/ui";
import { colors, fonts } from "@/src/theme";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ComposeScreen() {
  const router = useRouter();
  // Typed loosely: expo-router's typed navigation omits the stack's `beforeRemove` event.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const toast = useToast();
  const { language, copy } = useLanguage();

  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [contactable, setContactable] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const messageRef = useRef<ElementRef<typeof TextInput>>(null);
  const phoneRef = useRef<ElementRef<typeof TextInput>>(null);
  const emailRef = useRef<ElementRef<typeof TextInput>>(null);
  const nameRef = useRef<ElementRef<typeof TextInput>>(null);
  const done = useRef(false);

  const name = displayName.trim();
  const body = message.trim();
  const dirty = name.length > 0 || body.length > 0;

  const errors = {
    name: name.length === 0 ? copy.nameRequired : null,
    message:
      body.length < MESSAGE_MIN_LENGTH
        ? copy.messageTooShort(MESSAGE_MIN_LENGTH)
        : null,
    contact: !contactable
      ? null
      : !phone.trim() && !email.trim()
        ? copy.contactNeeded
        : null,
    email:
      contactable && email.trim() && !EMAIL_RE.test(email.trim())
        ? copy.emailInvalid
        : null,
  };
  const valid = !errors.name && !errors.message && !errors.contact && !errors.email;
  const show = (key: string) => attempted || touched[key];
  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  useLayoutEffect(() => {
    navigation.setOptions({
      title: copy.composeTitle,
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.headerBtn}
        >
          <Text style={styles.headerBtnLabel}>{copy.cancel}</Text>
        </Pressable>
      ),
    });
  }, [navigation, router, copy.composeTitle, copy.cancel]);

  // Never lose a heartfelt, half-written request to a stray swipe-down.
  useEffect(() => {
    return navigation.addListener("beforeRemove", (e: { preventDefault: () => void; data: { action: unknown } }) => {
      if (done.current || !dirty) return;
      e.preventDefault();
      Alert.alert(copy.discardTitle, copy.discardBody, [
        { text: copy.keepWriting, style: "cancel" },
        {
          text: copy.discard,
          style: "destructive",
          onPress: () => navigation.dispatch(e.data.action),
        },
      ]);
    });
  }, [navigation, dirty, copy]);

  const onSubmit = async () => {
    setAttempted(true);
    if (!valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => undefined,
      );
      if (errors.name) nameRef.current?.focus();
      else if (errors.message) messageRef.current?.focus();
      else if (errors.contact) phoneRef.current?.focus();
      else emailRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await api.createRequest({
        language,
        displayName: name,
        message: body,
        contactable,
        phone: contactable ? phone.trim() || null : null,
        email: contactable ? email.trim() || null : null,
      });
      done.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      toast.show(copy.requestSent);
      router.back();
    } catch (err) {
      toast.show(errorMessage(err, copy.errorNetwork), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = MESSAGE_MAX_LENGTH - message.length;

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Text style={styles.intro}>{copy.composeIntro}</Text>

          <Field
            label={copy.nameLabel}
            help={copy.nameHelp}
            error={show("name") ? errors.name : null}
          >
            <TextInput
              ref={nameRef}
              value={displayName}
              onChangeText={setDisplayName}
              onBlur={() => touch("name")}
              placeholderTextColor={colors.inkSoft}
              style={[styles.input, show("name") && errors.name && styles.inputError]}
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="next"
              maxLength={NAME_MAX_LENGTH}
              onSubmitEditing={() => messageRef.current?.focus()}
              blurOnSubmit={false}
              accessibilityLabel={copy.nameLabel}
            />
          </Field>

          <Field
            label={copy.messageLabel}
            error={show("message") ? errors.message : null}
          >
            <TextInput
              ref={messageRef}
              value={message}
              onChangeText={setMessage}
              onBlur={() => touch("message")}
              placeholderTextColor={colors.inkSoft}
              style={[
                styles.input,
                styles.textarea,
                show("message") && errors.message && styles.inputError,
              ]}
              multiline
              textAlignVertical="top"
              maxLength={MESSAGE_MAX_LENGTH}
              accessibilityLabel={copy.messageLabel}
            />
            <Text
              style={[styles.counter, remaining < 100 && styles.counterWarn]}
              accessibilityLiveRegion="polite"
            >
              {message.length}/{MESSAGE_MAX_LENGTH}
            </Text>
          </Field>

          <View style={styles.switchCard}>
            <View style={styles.switchRow}>
              <Text style={[styles.label, { flex: 1 }]}>{copy.contactLabel}</Text>
              <Switch
                value={contactable}
                onValueChange={setContactable}
                trackColor={{ true: colors.tealBright, false: colors.mistDeep }}
                accessibilityLabel={copy.contactLabel}
              />
            </View>
            {contactable ? (
              <View style={{ gap: 14, marginTop: 14 }}>
                <Text style={styles.help}>🔒 {copy.contactHelp}</Text>
                <Field label={copy.phoneLabel}>
                  <TextInput
                    ref={phoneRef}
                    value={phone}
                    onChangeText={setPhone}
                    style={styles.input}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    accessibilityLabel={copy.phoneLabel}
                  />
                </Field>
                <Field
                  label={copy.emailLabel}
                  error={
                    errors.email && show("email")
                      ? errors.email
                      : errors.contact && attempted
                        ? errors.contact
                        : null
                  }
                >
                  <TextInput
                    ref={emailRef}
                    value={email}
                    onChangeText={setEmail}
                    onBlur={() => touch("email")}
                    style={[
                      styles.input,
                      ((errors.email && show("email")) ||
                        (errors.contact && attempted)) &&
                        styles.inputError,
                    ]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    accessibilityLabel={copy.emailLabel}
                  />
                </Field>
              </View>
            ) : null}
          </View>

          <PrimaryButton
            label={submitting ? copy.sending : copy.send}
            onPress={onSubmit}
            loading={submitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : help ? (
        <Text style={styles.help}>{help}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 22,
    paddingBottom: 48,
    gap: 20,
  },
  intro: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.inkSoft,
  },
  field: {
    gap: 8,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
  },
  inputError: {
    borderColor: colors.danger,
  },
  textarea: {
    minHeight: 160,
    lineHeight: 25,
  },
  counter: {
    alignSelf: "flex-end",
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
  },
  counterWarn: {
    color: colors.danger,
  },
  help: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
  },
  switchCard: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  switchRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  headerBtnLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.sea,
  },
});
