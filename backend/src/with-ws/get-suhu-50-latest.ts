import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping of time filters to their duration in milliseconds and averaging intervals
export const timeFilters = {
  '1h': { duration: 1 * 60 * 60 * 1000, interval: 10 * 1000 }, // 1 hour, 10 seconds
  '3h': { duration: 3 * 60 * 60 * 1000, interval: 30 * 1000 }, // 3 hours, 30 seconds
  '6h': { duration: 6 * 60 * 60 * 1000, interval: 60 * 1000 }, // 6 hours, 1 minute
  '12h': { duration: 12 * 60 * 60 * 1000, interval: 5 * 60 * 1000 }, // 12 hours, 5 minutes
  '1d': { duration: 24 * 60 * 60 * 1000, interval: 15 * 60 * 1000 }, // 1 day, 15 minutes
  '3d': { duration: 3 * 24 * 60 * 60 * 1000, interval: 45 * 60 * 1000 }, // 3 days, 45 minutes
  '1w': { duration: 7 * 24 * 60 * 60 * 1000, interval: 90 * 60 * 1000 }, // 1 week, 1.5 hours
};

export async function sendTemperatureHistory(ws: any, filter: keyof typeof timeFilters = '1h') {
  try {
    const { duration, interval } = timeFilters[filter] || timeFilters['1h']; // Default to 1 hour if filter is invalid
    const startTime = new Date(Date.now() - duration);

    // Fetch temperature data within the time range
    const temperatureHistory = await prisma.suhu.findMany({
      where: {
        created_at: {
          gte: startTime,
        },
      },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        temperature: true,
        created_at: true,
      },
    });

    // Group data by time intervals and calculate averages
    const averagedData = [];
    let currentIntervalStart = startTime.getTime();
    let currentIntervalEnd = currentIntervalStart + interval;
    let tempSum = 0;
    let tempCount = 0;

    for (const record of temperatureHistory) {
      const recordTime = new Date(record.created_at).getTime();

      // If the record is within the current interval
      if (recordTime >= currentIntervalStart && recordTime < currentIntervalEnd) {
        tempSum += record.temperature;
        tempCount++;
      } else {
        // Save the average for the previous interval if there are records
        if (tempCount > 0) {
          averagedData.push({
            temperature: Number((tempSum / tempCount).toFixed(2)),
            timestamp: new Date(currentIntervalStart),
          });
        }

        // Move to the next interval
        while (recordTime >= currentIntervalEnd) {
          currentIntervalStart += interval;
          currentIntervalEnd = currentIntervalStart + interval;
          tempSum = 0;
          tempCount = 0;
        }

        // Add the current record to the new interval
        tempSum = record.temperature;
        tempCount = 1;
      }
    }

    // Add the last interval if it has data
    if (tempCount > 0) {
      averagedData.push({
        temperature: Number((tempSum / tempCount).toFixed(2)),
        timestamp: new Date(currentIntervalStart),
      });
    }

    // Send data to client
    ws.send(
      JSON.stringify({
        type: 'temperature_history',
        data: averagedData,
        count: averagedData.length,
        filter,
      })
    );
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


        // Kirim data ke client
        ws.send(JSON.stringify({
            type: 'pzem_history',
            data: sortedData,
            count: sortedData.length
        }));
    } catch (error) {
        console.error('Error sending PZEM history data:', error);
    }
}