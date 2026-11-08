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
import * as Notifications from "expo-notifications";
import { ErrorBoundary as DefaultErrorBoundary, Stack, usePathname, useRouter, type ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { LanguageProvider, useLanguage } from "@/src/LanguageContext";
import { syncPushRegistration } from "@/src/notifications";
import { telemetry } from "@/src/telemetry";
import { ToastProvider } from "@/src/components/Toast";
import { fontsFor } from "@/src/theme";
import { ThemeProvider, useTheme } from "@/src/ThemeContext";

/** Shows the default error screen, and reports the crash if the person agreed to crash reports. */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  useEffect(() => {
    telemetry.error(props.error, "error_boundary");
  }, [props.error]);
  return <DefaultErrorBoundary {...props} />;
}

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
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <RootStack />
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function RootStack() {
  const { language } = useLanguage();
  const fonts = fontsFor(language);
  const { colors, scheme } = useTheme();
  const router = useRouter();

  // Keep the server's push token in step with the phone (tokens change, permission can be revoked).
  useEffect(() => {
    syncPushRegistration();
    telemetry.init();
  }, []);

  // Which screens people use, by route name only. Never an id, a name or a piece of text.
  const pathname = usePathname();
  useEffect(() => {
    telemetry.screen(pathname);
  }, [pathname]);

  useEffect(() => {
    telemetry.setLanguage(language);
  }, [language]);

  // Tapping "someone prayed for you" opens the person's own requests, including from a cold start.
  const lastResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (
      lastResponse &&
      lastResponse.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER &&
      lastResponse.notification.request.content.data?.screen === "for-me"
    ) {
      router.push("/mine");
      Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    }
  }, [lastResponse, router]);

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.mist },
          headerTintColor: colors.heading,
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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="languages" options={{ title: "Language" }} />
        <Stack.Screen name="guidelines" options={{ title: "Guidelines" }} />
        <Stack.Screen
          name="for-me/compose"
          options={{ title: "Ask for prayer", presentation: "modal" }}
        />
      </Stack>
    </>
  );
}
