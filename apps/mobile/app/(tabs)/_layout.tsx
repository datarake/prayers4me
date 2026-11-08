import { Tabs } from "expo-router";
import { useLanguage } from "@/src/LanguageContext";
import { Icon } from "@/src/components/Icon";
import { colors, fontsFor } from "@/src/theme";

/** The app's home: pray, my requests, settings. Always one tap apart. */
export default function TabsLayout() {
  const { language, copy } = useLanguage();
  const fonts = fontsFor(language);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.mist },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontFamily: fonts.display,
          fontSize: 20,
          color: colors.ink,
        },
        sceneStyle: { backgroundColor: colors.mist },
        tabBarActiveTintColor: colors.sea,
        tabBarInactiveTintColor: "rgba(61, 90, 86, 0.75)",
        tabBarStyle: {
          backgroundColor: colors.mist,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="pray"
        options={{
          tabBarLabel: copy.tabPray,
          tabBarIcon: ({ color }) => <Icon name="candle" size={24} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="mine"
        options={{
          tabBarLabel: copy.forMeTitle,
          tabBarIcon: ({ color }) => <Icon name="user" size={24} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: copy.tabSettings,
          tabBarIcon: ({ color }) => (
            <Icon name="settings" size={24} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}
