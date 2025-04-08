import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { pzem } from "@/utils/type";
import { useWebSocket } from "@/service/websocket";

const PzemDashboard = () => {
  const { colors } = useTheme();
  const [latestPzem, setLatestPzem] = useState<pzem>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsUrl = process.env.EXPO_PUBLIC_WS_URL!;

  // Gunakan hook WebSocket
  useWebSocket(wsUrl, {
    onOpen: () => {
      setIsConnected(true);
      setLoading(false);
    },
    onMessage: (message) => {
      if (message.type === 'latest_data') {
        setLatestPzem(message.data.pzem);
      }
    },
    onClose: () => {
      setIsConnected(false);
      setError('Disconnected from server');
    },
    onError: (err) => {
      console.error('WebSocket error:', err);
      setError('Connection error');
      setIsConnected(false);
    }
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
      backgroundColor: colors.background,
    },
    gridContainer: {
      width: "100%",
      borderRadius: 10,
      backgroundColor: colors.card,
      elevation: 1,
      padding: 15,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 15,
    },
    gridItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary + "10", // 20% opacity of primary color
      borderRadius: 8,
      padding: 15,
      marginHorizontal: 5,
    },
    gridLabel: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 5,
    },
    titleContainer: {
      paddingBottom: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 15,
    },
    gridValue: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
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
    errorText: {
      color: colors.danger,
      fontSize: 18,
    },
    titleText: {
      color: colors.text,
      fontSize: 23,
    },
    nowText: {
      color: colors.textSecondary,
      fontSize: 18,
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
          <Text style={styles.titleText}>Power Usage</Text>
          <View style={styles.connectionStatus}>
            <Text style={styles.connectionStatusText}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Voltage</Text>
            <Text style={styles.gridValue}>
              {latestPzem!.voltage ? latestPzem!.voltage + "V" : "N/A"}
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Current</Text>
            <Text style={styles.gridValue}>
              {latestPzem!.current ? latestPzem!.current + "A" : "N/A"}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Power</Text>
            <Text style={styles.gridValue}>
              {latestPzem!.power ? latestPzem!.power + "W" : "N/A"}
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Energy</Text>
            <Text style={styles.gridValue}>
              {latestPzem ? latestPzem.energy + "Wh" : "N/A"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default PzemDashboard;
