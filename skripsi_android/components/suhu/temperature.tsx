import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { suhu } from "@/utils/type";
import { useWebSocket } from "@/service/websocket";

const TemperatureDashboard = () => {
  const { colors } = useTheme();
  const [todayStats, setTodayStats] = useState<suhu>();
  const [latestSuhu, setLatestSuhu] = useState<suhu>();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [temperatureClassification, setTemperatureClassification] = useState<
    string | null
  >(null);

  const classifyTemperature = (temp: number) => {
    if (temp <= 170) {
      return "Light";
  } else if (temp > 170 && temp < 240) {
      return "Meidum";
  } else {
      return "Dark";
  }
  };

  const wsUrl = process.env.EXPO_PUBLIC_WS_URL!;

  // Gunakan hook WebSocket
  useWebSocket(wsUrl, {
    onOpen: () => {
      setIsConnected(true);
      setLoading(false);
    },
    onMessage: (message) => {
      if (message.type === "latest_data") {
        setLatestSuhu(message.data.suhu);
        setTodayStats(message.data.suhuAvg);
        const currentTemp = message.data.suhu.temperature;
        setTemperatureClassification(classifyTemperature(currentTemp));
      }
    },
    onClose: () => {
      setIsConnected(false);
      setError("Disconnected from server");
    },
    onError: (err) => {
      console.error("WebSocket error:", err);
      setError("Connection error");
      setIsConnected(false);
    },
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      backgroundColor: colors.background,
      paddingBottom: 20,
    },
    gridContainer: {
      width: "100%",
      elevation: 1,
      borderRadius: 15,
      backgroundColor: colors.card,
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    currentContainer: {
      alignItems: "center",
    },
    rowMaxMinContainer: {
      paddingTop: 40,
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 15,
    },
    titleContainer: {
      paddingBottom: 30,
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 15,
    },
    loadingIndicator: {
      color: colors.primary,
    },
    connectionStatus: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: isConnected ? colors.success : colors.danger,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    
    //TEXT
    connectionStatusText: {
      color: colors.text,
      fontSize: 12,
    },
    currentText: {
      color: colors.text,
      fontSize: 50,
      fontWeight: "bold",
    },
    errorText: {
      color: colors.danger,
      fontSize: 18,
    },
    maxMinText: {
      color: colors.textSecondary,
      fontSize: 18,
    },
    titleText: {
      color: colors.text,
      fontSize: 23,
    },
    classificationText: {
      color: colors.textSecondary,
      fontSize: 18,
      textAlign: "center",
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={styles.loadingIndicator.color} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.gridContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Temperature</Text>
          <View style={styles.connectionStatus}>
            <Text style={styles.connectionStatusText}>
              {isConnected ? "LIVE" : "OFFLINE"}
            </Text>
          </View>
        </View>
        <View style={styles.currentContainer}>
          <Text style={styles.currentText}>{latestSuhu?.temperature} °C</Text>
          <Text style={styles.classificationText}>
            {temperatureClassification}
          </Text>
        </View>
        <View style={styles.rowMaxMinContainer}>
          <Text style={styles.maxMinText}>Min: {todayStats?.min} °C</Text>
          <Text style={styles.maxMinText}>Max: {todayStats?.max} °C</Text>
        </View>
      </View>
    </View>
  );
};

export default TemperatureDashboard;
