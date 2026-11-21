import { Stack } from "expo-router";
import { useLanguage } from "@/src/LanguageContext";
import { fontsFor } from "@/src/theme";
import { useTheme } from "@/src/ThemeContext";

/** "My requests" and the form to write or edit one. A stack inside the tab, so the tab bar stays visible. */
export default function MineLayout() {
  const { language } = useLanguage();
  const fonts = fontsFor(language);
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.mist },
        headerTintColor: colors.heading,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 20, color: colors.ink },
        contentStyle: { backgroundColor: colors.mist },
      }}
    />
  );
}
