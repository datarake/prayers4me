import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import {
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from "@expo-google-fonts/fraunces";
import { Lora_600SemiBold, Lora_600SemiBold_Italic } from "@expo-google-fonts/lora";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { LanguageProvider, useLanguage } from "@/src/LanguageContext";
import { ToastProvider } from "@/src/components/Toast";
import { colors, fontsFor } from "@/src/theme";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    Lora_600SemiBold,
    Lora_600SemiBold_Italic,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <LanguageProvider>
      <ToastProvider>
        <RootStack />
      </ToastProvider>
    </LanguageProvider>
  );
}

function RootStack() {
  const { language } = useLanguage();
  const fonts = fontsFor(language);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.mist },
          headerTintColor: colors.sea,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerTitleStyle: {
            fontFamily: fonts.display,
            fontSize: 20,
            color: colors.ink,
          },
          contentStyle: { backgroundColor: colors.mist },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="languages" options={{ title: "Language" }} />
        <Stack.Screen name="for-others" options={{ title: "For others" }} />
        <Stack.Screen name="for-me/index" options={{ title: "For me" }} />
        <Stack.Screen
          name="for-me/compose"
          options={{ title: "Ask for prayer", presentation: "modal" }}
        />
      </Stack>
    </>
  );
}
