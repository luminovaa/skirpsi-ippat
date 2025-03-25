import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from "@/hooks/use-theme";
import TemperatureDashboard from '@/components/suhu/temperatur';

export default function HomeScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TemperatureDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    fontSize: 24,
  },
});