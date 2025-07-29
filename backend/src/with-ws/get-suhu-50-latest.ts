import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const timeFilters = {
  '1h': { duration: 1 * 60 * 60 * 1000, interval: 10 * 1000, points: 360 }, // 1 jam, 10 deitk, ~360 points
  '3h': { duration: 3 * 60 * 60 * 1000, interval: 30 * 1000, points: 360 }, // 3 jam, 30 deitk, ~360 points  
  '6h': { duration: 6 * 60 * 60 * 1000, interval: 60 * 1000, points: 360 }, // 6 jam, 1 menit ~360 points
  '12h': { duration: 12 * 60 * 60 * 1000, interval: 5 * 60 * 1000, points: 144 }, // 12 jam, 5 menit, ~144 points
  '1d': { duration: 24 * 60 * 60 * 1000, interval: 15 * 60 * 1000, points: 96 }, // 1 hari, 15 menit, ~96 points
  '3d': { duration: 3 * 24 * 60 * 60 * 1000, interval: 45 * 60 * 1000, points: 96 }, // 3 hari, 45 menit, ~96 points
  '1w': { duration: 7 * 24 * 60 * 60 * 1000, interval: 90 * 60 * 1000, points: 112 }, // 1 mingfgu, 1.5 jam, ~112 points
};

interface TemperatureHistoryRecord {
  timestamp: Date;
  temperature: number | null;
  data_points: number;
}

export async function sendTemperatureHistory(ws: any, filter: keyof typeof timeFilters = '1h') {
  try {
    const { duration, interval, points } = timeFilters[filter] || timeFilters['1h'];
    
    const startTime = new Date(Date.now() - duration);
    const endTime = new Date();
    
    const intervalSeconds = Math.floor(interval / 1000);

    const temperatureHistory = await prisma.$queryRaw<TemperatureHistoryRecord[]>`
      WITH RECURSIVE time_series AS (
        SELECT ${startTime} AS time_slot
        UNION ALL
        SELECT DATE_ADD(time_slot, INTERVAL ${intervalSeconds} SECOND)
        FROM time_series
        WHERE time_slot < ${endTime}
      )
      SELECT
          ts.time_slot AS timestamp,
          COALESCE(AVG(s.temperature), NULL) AS temperature,
          COUNT(s.temperature) AS data_points
      FROM time_series ts
      LEFT JOIN suhu s
          ON s.created_at >= ts.time_slot
          AND s.created_at < DATE_ADD(ts.time_slot, INTERVAL ${intervalSeconds} SECOND)
      GROUP BY ts.time_slot
      ORDER BY ts.time_slot DESC;
    `;

    const formattedData = temperatureHistory.map((item) => ({
      temperature: item.temperature ? Number(item.temperature.toFixed(2)) : null,
      timestamp: new Date(item.timestamp),
      dataPoints: Number(item.data_points),
    }));

    ws.send(
      JSON.stringify({
        type: 'temperature_history',
        data: formattedData,
        count: formattedData.length,
        filter,
        timeRange: {
          start: startTime,
          end: endTime,
          interval,
          totalPoints: points,
        },
      })
    );

    console.log(`Sent temperature history for ${filter}: ${formattedData.length} points`);
  } catch (error) {
    console.error('Error sending temperature history data:', error);
  }
}

export async function sendPzemHistory(ws: any, limit: number = 50) {
    try {
         const pzemHistory = await prisma.pzem.findMany({
            orderBy: { created_at: 'desc' },
            take: limit,
            select: {
                id: true,
                voltage: true,
                current: true,
                power: true,
                energy: true,
                frequency: true,
                power_factor: true,
                created_at: true
            }
        });

        const sortedData = [...pzemHistory].reverse();

        // Send data to client
        ws.send(JSON.stringify({
            type: 'pzem_history',
            data: sortedData,
            count: sortedData.length
        }));
    } catch (error) {
        console.error('Error sending PZEM history data:', error);
    }
}