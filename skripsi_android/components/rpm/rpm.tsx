import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useWebSocket } from "@/service/websocket";
import { PieChart } from "react-native-gifted-charts";

interface RpmData {
  rpm: number;
  created_at: string;
}

const RpmDashboard = () => {
  const { colors } = useTheme();
  const [latestRpm, setLatestRpm] = useState<RpmData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wsUrl = process.env.EXPO_PUBLIC_WS_URL!;

  // Max RPM for gauge (adjust based on your requirements)
  const MAX_RPM = 300;

  // Prepare data for semi-circle chart
  const rpmPercentage = latestRpm ? (latestRpm.rpm / MAX_RPM) * 100 : 0;
  const pieData = [
    {
      value: rpmPercentage,
      color: colors.primary,
      text: `${latestRpm?.rpm || 0}`,
      textColor: colors.text,
      textSize: 24,
    },
    {
      value: 100 - rpmPercentage,
      color: colors.secondary,
    },
  ];

  useWebSocket(wsUrl, {
    onOpen: () => {
      setIsConnected(true);
      setLoading(false);
    },
    onMessage: (message) => {
      if (message.type === "latest_data") {
        setLatestRpm(message.data.rpm);
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
      paddingVertical: 20,
    },
    gridContainer: {
      width: "100%",
      elevation: 1,
      borderRadius: 15,
      backgroundColor: colors.card,
      paddingVertical: 20,
      paddingHorizontal: 20,
      alignItems: "center",
    },
    titleContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      marginBottom: 20,
    },
    chartContainer: {
      height: 150,
      width: 300,
      marginBottom: 20,
      alignItems: "center",
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
    // TEXT
    connectionStatusText: {
      color: colors.text,
      fontSize: 12,
    },
    titleText: {
      color: colors.text,
      fontSize: 23,
    },
    errorText: {
      color: colors.danger,
      fontSize: 18,
    },
    unitText: {
      color: colors.textSecondary,
      fontSize: 18,
      textAlign: "center",
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          <Text style={styles.titleText}>RPM</Text>
          <View style={styles.connectionStatus}>
            <Text style={styles.connectionStatusText}>
              {isConnected ? "LIVE" : "OFFLINE"}
            </Text>
          </View>
        </View>
        <View style={styles.chartContainer}>
          <PieChart
            data={pieData}
            semiCircle
            radius={120}
            donut
            innerRadius={80}
            showText
            textColor={colors.text}
            textSize={24}
            showValuesAsLabels
            innerCircleColor={colors.inner}
            centerLabelComponent={() => (
              <Text
                style={{ color: colors.text, fontSize: 24, fontWeight: "bold" }}
              >
                {latestRpm?.rpm || 0} RPM
              </Text>
            )}
          />
        </View>
      </View>
    </View>
  );
};

export default RpmDashboard;
