import React from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import TemperatureDashboard from "@/components/suhu/temperature";
import PzemDashboard from "@/components/pzem/pzem-card";

export default function HomeScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Home
        </Text>
      </View>
      <TemperatureDashboard />
      <PzemDashboard/>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  text: {
    fontSize: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  contentContainer: {
    paddingBottom: 30,
  },
});
