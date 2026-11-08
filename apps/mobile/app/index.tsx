import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { setStatusBarStyle } from "expo-status-bar";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_NAME } from "@prayers4me/shared";
import { useLanguage } from "@/src/LanguageContext";
import { api } from "@/src/api";
import { PathButton } from "@/src/components/PathButton";
import { brandFont, colors, type FontSet } from "@/src/theme";
import { useStyles } from "@/src/useStyles";

export default function WelcomeScreen() {
  const styles = useStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { copy, ready } = useLanguage();

  // Light icons over the dark hero; the other screens are light-themed.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light");
      return () => setStatusBarStyle("dark");
    }, []),
  );

  useEffect(() => {
    if (!ready) return;
    api.session().catch(() => undefined);
  }, [ready]);

  // Emphasize the human part of the line ("for you"): the last two words, in every language.
  const words = copy.tagline.split(" ");
  const taglineHead = words.slice(0, -2).join(" ");
  const taglineTail = words.slice(-2).join(" ");

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
          "rgba(8, 28, 26, 0.62)",
          "rgba(15, 61, 58, 0.14)",
          "rgba(10, 36, 34, 0.80)",
          "rgba(10, 36, 34, 0.97)",
        ]}
        locations={[0, 0.28, 0.6, 1]}
        style={styles.overlay}
      />

      <View
        pointerEvents="box-none"
        style={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 20) + 16,
            paddingBottom: Math.max(insets.bottom, 12) + 20,
          },
        ]}
      >
        <View style={styles.brandBar} accessibilityRole="header">
          <Image
            source={require("../assets/images/logo-mark.png")}
            style={styles.logo}
            accessibilityIgnoresInvertColors
            accessibilityElementsHidden
          />
          <Text
            style={styles.brand}
            accessibilityLabel={APP_NAME}
            maxFontSizeMultiplier={1.2}
          >
            Prayers<Text style={styles.brandFour}>4</Text>me
          </Text>
        </View>

        <View style={styles.bottom}>
          <View style={styles.hero}>
            <Text style={styles.tagline} maxFontSizeMultiplier={1.15}>
              {taglineHead}
              {taglineHead ? " " : ""}
              <Text style={styles.taglineAccent}>{taglineTail}</Text>
            </Text>
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
              accessibilityHint={copy.languagesTitle}
              onPress={() => router.push("/languages")}
              hitSlop={12}
              style={({ pressed }) => [
                styles.languageLink,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.languageText}>🌐  {copy.languageButton}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const createStyles = (fonts: FontSet) =>
  StyleSheet.create({
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
    brandBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    logo: {
      width: 40,
      height: 41,
    },
    brand: {
      fontFamily: brandFont,
      fontSize: 26,
      lineHeight: 32,
      color: "#FFFFFF",
      letterSpacing: -0.6,
    },
    brandFour: {
      color: colors.candle,
    },
    bottom: {
      gap: 28,
    },
    hero: {
      gap: 16,
    },
    tagline: {
      fontFamily: fonts.display,
      fontSize: 38,
      lineHeight: 45,
      color: "#FFFFFF",
      letterSpacing: -0.6,
    },
    taglineAccent: {
      fontFamily: fonts.displayItalic,
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
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    languageText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: "rgba(255,255,255,0.82)",
      textDecorationLine: "underline",
    },
  });
