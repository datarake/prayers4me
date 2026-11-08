import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_NAME } from "@prayers4me/shared";
import { useLanguage } from "@/src/LanguageContext";
import { api } from "@/src/api";
import { PathButton } from "@/src/components/PathButton";
import { colors, fonts } from "@/src/theme";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy, ready } = useLanguage();

  useEffect(() => {
    if (!ready) return;
    api.session().catch(() => undefined);
  }, [ready]);

  return (
    <View style={styles.root}>
      <Image
        source={require("../assets/images/welcome-hero.jpg")}
        style={styles.heroImage}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />

      <LinearGradient
        pointerEvents="none"
        colors={[
          "rgba(8, 28, 26, 0.48)",
          "rgba(15, 61, 58, 0.62)",
          "rgba(10, 36, 34, 0.94)",
        ]}
        locations={[0, 0.38, 1]}
        style={styles.overlay}
      />

      <View
        pointerEvents="box-none"
        style={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 20) + 24,
            paddingBottom: Math.max(insets.bottom, 12) + 20,
          },
        ]}
      >
        <View style={styles.hero}>
          <Text style={styles.brand}>{APP_NAME}</Text>
          <Text style={styles.tagline}>{copy.tagline}</Text>
          <Text style={styles.about}>{copy.about}</Text>
        </View>

        <View style={styles.actions}>
          <PathButton
            title={copy.forMeAction}
            hint={copy.forMeActionHint}
            emphasis="primary"
            onPress={() => router.push("/for-me")}
          />
          <PathButton
            title={copy.forOthersAction}
            hint={copy.forOthersActionHint}
            emphasis="secondary"
            onPress={() => router.push("/for-others")}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/languages")}
            hitSlop={12}
            style={({ pressed }) => [
              styles.languageLink,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.languageText}>{copy.languageButton}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.sea,
  },
  heroImage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 0,
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  content: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  hero: {
    gap: 14,
    maxWidth: 360,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 46,
    lineHeight: 52,
    color: "#FFFFFF",
    letterSpacing: -1.2,
  },
  tagline: {
    fontFamily: fonts.displayItalic,
    fontSize: 24,
    lineHeight: 32,
    color: colors.candle,
  },
  about: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: "rgba(255,255,255,0.92)",
    maxWidth: 320,
  },
  actions: {
    gap: 12,
  },
  languageLink: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  languageText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
    textDecorationLine: "underline",
  },
});
