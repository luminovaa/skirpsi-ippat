import { ThemeProvider } from "@/constants/theme-context";
import { useTheme } from "@/hooks/use-theme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function AppLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <TabsWithTheme />
    </>
  );
}

function TabsWithTheme() {
  const { colors, theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={theme === "dark" ? "settings" : "settings-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}