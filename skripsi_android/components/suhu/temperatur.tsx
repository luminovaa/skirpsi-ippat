import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { suhu } from '@/utils/type';
import { getAverageSuhuToday, getLatestSuhu } from '@/api/suhu-api';

const TemperatureDashboard = () => {
  const { colors } = useTheme();
  const [todayStats, setTodayStats] = useState<suhu>();
  const [latestSuhu, setLatestSuhu] = useState<suhu>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Updated type here

  useEffect(() => {
    const fetchTemperatureData = async () => {
      try {
        // Fetch today's temperature statistics
        const averageResponse = await getAverageSuhuToday();
        setTodayStats(averageResponse.data);

        // Fetch latest temperature reading
        const latestResponse = await getLatestSuhu();
        setLatestSuhu(latestResponse.data);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching temperature data:', err);
        setError('Failed to fetch temperature data');
        setLoading(false);
      }
    };

    fetchTemperatureData();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.background
    },
    gridContainer: {
      width: '100%',
      borderRadius: 10,
      backgroundColor: colors.card,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      padding: 15
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 15
    },
    gridItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '20', // 20% opacity of primary color
      borderRadius: 8,
      padding: 15,
      marginHorizontal: 5
    },
    gridLabel: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 5
    },
    gridValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text
    },
    errorText: {
      color: colors.danger,
      fontSize: 18
    },
    loadingIndicator: {
      color: colors.primary
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
        {/* First Row */}
        <View style={styles.row}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Average</Text>
            <Text style={styles.gridValue}>
              {todayStats!.average ? todayStats!.average + '°C' : 'N/A'}
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Min</Text>
            <Text style={styles.gridValue}>
              {todayStats!.min ? todayStats!.min + '°C' : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Second Row */}
        <View style={styles.row}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Max</Text>
            <Text style={styles.gridValue}>
              {todayStats!.max ? todayStats!.max + '°C' : 'N/A'}
            </Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Latest</Text>
            <Text style={styles.gridValue}>
              {latestSuhu ? latestSuhu.temperature + '°C' : 'N/A'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default TemperatureDashboard;