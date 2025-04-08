import React from "react";
import { View, StyleSheet, Text, ScrollView } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import TemperatureDashboard from "@/components/suhu/temperature";
import PzemDashboard from "@/components/pzem/pzem-card";

export default function HomeScreen() {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 20,
      backgroundColor: colors.background,
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
      color: colors.text,
    },
    contentContainer: {
      paddingBottom: 30,
    },
  });
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Home
        </Text>
      </View>
      <TemperatureDashboard />
      <PzemDashboard/>
    </ScrollView>
  );
}

