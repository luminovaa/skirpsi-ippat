import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const timeFilters = {
  '1h': { duration: 1 * 60 * 60 * 1000, interval: 10 * 1000, points: 360 }, // 1 hour, 10 seconds, ~360 points
  '3h': { duration: 3 * 60 * 60 * 1000, interval: 30 * 1000, points: 360 }, // 3 hours, 30 seconds, ~360 points  
  '6h': { duration: 6 * 60 * 60 * 1000, interval: 60 * 1000, points: 360 }, // 6 hours, 1 minute, ~360 points
  '12h': { duration: 12 * 60 * 60 * 1000, interval: 5 * 60 * 1000, points: 144 }, // 12 hours, 5 minutes, ~144 points
  '1d': { duration: 24 * 60 * 60 * 1000, interval: 15 * 60 * 1000, points: 96 }, // 1 day, 15 minutes, ~96 points
  '3d': { duration: 3 * 24 * 60 * 60 * 1000, interval: 45 * 60 * 1000, points: 96 }, // 3 days, 45 minutes, ~96 points
  '1w': { duration: 7 * 24 * 60 * 60 * 1000, interval: 90 * 60 * 1000, points: 112 }, // 1 week, 1.5 hours, ~112 points
};

interface TemperatureHistoryRecord {
  timestamp: Date;
  temperature: number | null;
  data_points: number;
}

export async function sendTemperatureHistory(ws: any, filter: keyof typeof timeFilters = '1h') {
  try {
    const { duration, interval, points } = timeFilters[filter] || timeFilters['1h'];
    
    // Calculate start time
    const startTime = new Date(Date.now() - duration);
    const endTime = new Date();
    
    // Convert interval to seconds for PostgreSQL
    const intervalSeconds = Math.floor(interval / 1000);

    // Use Prisma.sql for safer raw queries
    const temperatureHistory = await prisma.$queryRaw<TemperatureHistoryRecord[]>`
      SELECT
          time_slot AS timestamp,
          COALESCE(AVG(s.temperature), NULL) AS temperature,
          COUNT(s.temperature) AS data_points
      FROM generate_series(
          ${startTime}::timestamp,
          ${endTime}::timestamp,
          ${intervalSeconds}::text || ' seconds'::interval
      ) AS time_slot
      LEFT JOIN suhu s
          ON s.created_at >= time_slot
          AND s.created_at < time_slot + ${intervalSeconds}::text || ' seconds'::interval
      GROUP BY time_slot
      ORDER BY time_slot DESC;
    `;

    // Format data for the client
    const formattedData = temperatureHistory.map((item) => ({
      temperature: item.temperature ? Number(item.temperature.toFixed(2)) : null,
      timestamp: new Date(item.timestamp),
      dataPoints: Number(item.data_points),
    }));

    // Send to client
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