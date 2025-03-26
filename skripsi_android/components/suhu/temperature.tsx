import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { suhu } from "@/utils/type";
import { getAverageSuhuToday, getLatestSuhu } from "@/api/suhu-api";

const TemperatureDashboard = () => {
  const { colors } = useTheme();
  const [todayStats, setTodayStats] = useState<suhu>();
  const [latestSuhu, setLatestSuhu] = useState<suhu>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [temperatureClassification, setTemperatureClassification] = useState<string | null>(null);

  const classifyTemperature = (temp: number) => {
    if(temp < 20) {
      return "Cold";
    } else if (temp >= 20 && temp <= 27) {
      return "Normal";
    } else {
      return 'Hot';
    }
  }

  useEffect(() => {
    const fetchTemperatureData = async () => {
      try {
        const averageResponse = await getAverageSuhuToday();
        setTodayStats(averageResponse.data.data);

        const latestResponse = await getLatestSuhu();
        setLatestSuhu(latestResponse.data.data);
        const currentTemp = latestResponse.data.data.temperature;
        setTemperatureClassification(classifyTemperature(currentTemp));

        setLoading(false);
      } catch (err) {
        console.error("Error fetching temperature data:", err);
        setError("Failed to fetch temperature data");
        setLoading(false);
      }
    };

    fetchTemperatureData();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      backgroundColor: colors.background,
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

    //TEXT
    currentText:{
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
      textAlign: 'center',
      // marginTop: 10x`,
    }
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
          <Text style={styles.maxMinText}>Now</Text>
        </View>
        <View style={styles.currentContainer}>
          <Text style={styles.currentText}>{latestSuhu?.temperature} °C</Text>
          <Text style={styles.classificationText}>{temperatureClassification}</Text>
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
