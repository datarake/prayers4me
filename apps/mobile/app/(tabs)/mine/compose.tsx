import {
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  NAME_MAX_LENGTH,
} from "@prayers4me/shared";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
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
  Text,
  TextInput,
  View,
} from "react-native";
import { useLanguage } from "@/src/LanguageContext";
import { Icon } from "@/src/components/Icon";
import { api, errorMessage } from "@/src/api";
import { useToast } from "@/src/components/Toast";
import { HELPLINE_URL, looksLikeCrisis } from "@/src/safety";
import {
  clearDraft,
  hasSentBefore,
  loadDraft,
  markHasSent,
  markJustSent,
  saveDraft,
} from "@/src/session";
import { telemetry } from "@/src/telemetry";
import { PrimaryButton, Screen } from "@/src/components/ui";
import { type FontSet, type Palette } from "@/src/theme";
import { useTheme } from "@/src/ThemeContext";
import { useStyles } from "@/src/useStyles";

export default function ComposeScreen() {
  const styles = useStyles(createStyles);
  const { colors } = useTheme();
  const router = useRouter();
  // Typed loosely: expo-router's typed navigation omits the stack's `beforeRemove` event.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const toast = useToast();
  const { language, copy } = useLanguage();

  // Editing reuses this form: the request arrives through route params.
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    message?: string;
  }>();
  const editingId = params.id;
  const isEditing = Boolean(editingId);
  const initial = useRef({
    name: params.name ?? "",
    message: params.message ?? "",
  }).current;

  const [displayName, setDisplayName] = useState(initial.name);
  const [message, setMessage] = useState(initial.message);
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const messageRef = useRef<ElementRef<typeof TextInput>>(null);
  const nameRef = useRef<ElementRef<typeof TextInput>>(null);
  const done = useRef(false);
  const draftReady = useRef(false);
  // Examples help a first request. Someone who has sent one already knows how; until the
  // answer is read they stay hidden, so they never flash in and disappear.
  const [showExamples, setShowExamples] = useState(false);

  useEffect(() => {
    if (isEditing) return;
    hasSentBefore().then((sent) => setShowExamples(!sent));
  }, [isEditing]);

  // A new request starts from the saved draft, so leaving the form never loses what was typed.
  useEffect(() => {
    if (isEditing) return;
    let cancelled = false;
    loadDraft().then((draft) => {
      if (cancelled) return;
      if (draft) {
        setDisplayName((current) => current || draft.name);
        setMessage((current) => current || draft.message);
      }
      draftReady.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [isEditing]);

  useEffect(() => {
    if (isEditing || !draftReady.current) return;
    // Saving an empty form removes the draft, so this also runs after a send.
    saveDraft({ name: displayName, message });
  }, [isEditing, displayName, message]);

  const name = displayName.trim();
  const body = message.trim();
  const changed =
    name !== initial.name.trim() ||
    body !== initial.message.trim();
  // Only an edit asks before leaving: a new request is saved as a draft instead.
  const dirty = isEditing && changed;

  const errors = {
    name: name.length === 0 ? copy.nameRequired : null,
    message:
      body.length < MESSAGE_MIN_LENGTH
        ? copy.messageTooShort(MESSAGE_MIN_LENGTH)
        : null,
  };
  const valid = !errors.name && !errors.message;
  const show = (key: string) => attempted || touched[key];
  const touch = (key: string) => setTouched((t) => ({ ...t, [key]: true }));

  // Leaving always lands on "My requests" in this tab. A plain back could leave the tab (when
  // the form was opened from the welcome screen) and keep this form on top of the list.
  // dismissTo goes back to the list when it is underneath, and replaces the form with it when not.
  const leave = () => router.dismissTo("/mine");

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing ? copy.editTitle : copy.composeTitle,
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.leaveCompose}
          onPress={() => leave()}
          hitSlop={12}
          style={styles.headerBtn}
        >
          <Icon name="close" size={24} color={colors.heading} />
        </Pressable>
      ),
    });
  }, [navigation, router, isEditing, copy.composeTitle, copy.editTitle, copy.leaveCompose, colors.heading, styles.headerBtn]);

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

  const showSupport = looksLikeCrisis(message);

  const onSubmit = async () => {
    setAttempted(true);
    if (!valid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => undefined,
      );
      if (errors.name) nameRef.current?.focus();
      else messageRef.current?.focus();
      return;
    }
    if (isEditing && !changed) {
      // Nothing to save: leave quietly, without spending one of the limited edits.
      done.current = true;
      leave();
      return;
    }
    setSubmitting(true);
    try {
      if (isEditing && editingId) {
        await api.updateRequest(editingId, {
          displayName: name,
          message: body,
        });
        done.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => undefined,
        );
        telemetry.track("request_edited");
        toast.show(copy.updated);
        leave();
        return;
      }
      await api.createRequest({
        language,
        displayName: name,
        message: body,
      });
      // A sent request starts the next one from an empty form. The screen can stay
      // mounted in the stack, so its fields are emptied as well as the saved draft.
      done.current = true;
      await clearDraft();
      setDisplayName("");
      setMessage("");
      setAttempted(false);
      setTouched({});
      setShowExamples(false);
      await markHasSent();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      await markJustSent();
      telemetry.track("request_sent", {
        language,
        length: body.length < 100 ? "short" : body.length < 400 ? "medium" : "long",
        support_card: showSupport ? "yes" : "no",
      });
      toast.show(copy.requestSent);
      leave();
    } catch (err) {
      toast.show(errorMessage(err, copy.errorNetwork), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = MESSAGE_MAX_LENGTH - message.length;

  const confirmReset = () =>
    Alert.alert(copy.discardTitle, copy.discardBody, [
      { text: copy.keepWriting, style: "cancel" },
      {
        text: copy.resetForm,
        style: "destructive",
        onPress: () => {
          setDisplayName("");
          setMessage("");
          setAttempted(false);
          setTouched({});
          clearDraft();
          nameRef.current?.focus();
        },
      },
    ]);

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
            <View style={styles.counterRow}>
              {!isEditing && (name.length > 0 || body.length > 0) ? (
                <Pressable accessibilityRole="button" onPress={confirmReset} hitSlop={10}>
                  <Text style={styles.resetLink}>{copy.resetForm}</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Text
                style={[styles.counter, remaining < 100 && styles.counterWarn]}
                accessibilityLiveRegion="polite"
              >
                {message.length}/{MESSAGE_MAX_LENGTH}
              </Text>
            </View>
          </Field>

          {isEditing || !showExamples || body.length > 0 ? null : (
            <View style={styles.examples}>
              <Text style={styles.examplesTitle}>{copy.examplesTitle}</Text>
              <Text style={styles.help}>{copy.examplesHint}</Text>
              {copy.examples.map((text) => (
                <Pressable
                  key={text}
                  accessibilityRole="button"
                  accessibilityLabel={`${copy.examplesBadge}: ${text}`}
                  onPress={() => {
                    setMessage(text);
                    messageRef.current?.focus();
                  }}
                  style={({ pressed }) => [
                    styles.exampleCard,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.exampleBadge}>{copy.examplesBadge}</Text>
                  <Text style={styles.exampleText}>{text}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {showSupport ? (
            <View style={styles.supportCard} accessibilityLiveRegion="polite">
              <Text style={styles.supportTitle}>{copy.crisisTitle}</Text>
              <Text style={styles.supportBody}>{copy.crisisBody}</Text>
              <Pressable
                accessibilityRole="link"
                onPress={() =>
                  WebBrowser.openBrowserAsync(HELPLINE_URL).catch(() => undefined)
                }
                style={({ pressed }) => [
                  styles.supportBtn,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.supportBtnLabel}>{copy.crisisAction}</Text>
              </Pressable>
            </View>
          ) : null}

          {isEditing ? null : (
            <Pressable
              accessibilityRole="link"
              onPress={() => router.push("/guidelines")}
              hitSlop={8}
            >
              <Text style={styles.agree}>{copy.guidelinesAgree}</Text>
            </Pressable>
          )}

          <PrimaryButton
            label={submitting ? copy.sending : isEditing ? copy.saveChanges : copy.send}
            onPress={onSubmit}
            loading={submitting}
          />
          <PrimaryButton
            label={copy.leaveCompose}
            variant="ghost"
            onPress={() => leave()}
            disabled={submitting}
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
  const styles = useStyles(createStyles);
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

const createStyles = (fonts: FontSet, colors: Palette) =>
  StyleSheet.create({
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
      backgroundColor: colors.surface,
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
    counterRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    resetLink: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.heading,
      textDecorationLine: "underline",
    },
    counter: {
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
    examples: {
      gap: 10,
    },
    examplesTitle: {
      fontFamily: fonts.display,
      fontSize: 20,
      lineHeight: 26,
      color: colors.ink,
    },
    exampleCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 6,
    },
    exampleBadge: {
      fontFamily: fonts.bodyBold,
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: colors.inkSoft,
    },
    exampleText: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: colors.ink,
    },
    supportCard: {
      backgroundColor: colors.noteBg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.noteBorder,
      padding: 16,
      gap: 8,
    },
    supportTitle: {
      fontFamily: fonts.display,
      fontSize: 20,
      lineHeight: 26,
      color: colors.ink,
    },
    supportBody: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: colors.ink,
    },
    supportBtn: {
      minHeight: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.solid,
      marginTop: 6,
    },
    supportBtnLabel: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      color: colors.white,
    },
    agree: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      color: colors.inkSoft,
      textAlign: "center",
      textDecorationLine: "underline",
    },
    headerBtn: {
      minHeight: 44,
      minWidth: 44,
      justifyContent: "center",
      alignItems: "center",
    },
  });
