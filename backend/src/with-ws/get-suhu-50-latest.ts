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

export async function sendTemperatureHistory(ws: any, filter: keyof typeof timeFilters = '1h') {
  try {
    const { duration, interval, points } = timeFilters[filter] || timeFilters['1h'];
    const now = Date.now();
    const startTime = new Date(now - duration);

    // Fetch all temperature data within the time range
    const temperatureHistory = await prisma.suhu.findMany({
      where: {
        created_at: {
          gte: startTime,
        },
      },
      orderBy: { created_at: 'asc' },
      select: {
        temperature: true,
        created_at: true,
      },
    });

    // Create sliding window with fixed number of points
    const averagedData = [];
    const timeSlots = [];
    
    // Generate time slots from now backwards
    for (let i = points - 1; i >= 0; i--) {
      const slotEnd = now - (i * interval);
      const slotStart = slotEnd - interval;
      timeSlots.push({ start: slotStart, end: slotEnd, timestamp: new Date(slotEnd) });
    }

    // Group data into time slots and calculate averages
    for (const slot of timeSlots) {
      const recordsInSlot = temperatureHistory.filter(record => {
        const recordTime = new Date(record.created_at).getTime();
        return recordTime >= slot.start && recordTime < slot.end;
      });

      if (recordsInSlot.length > 0) {
        const avgTemp = recordsInSlot.reduce((sum, record) => sum + record.temperature, 0) / recordsInSlot.length;
        averagedData.push({
          temperature: Number(avgTemp.toFixed(2)),
          timestamp: slot.timestamp,
          dataPoints: recordsInSlot.length
        });
      } else {
        // Add null data point for missing intervals to maintain chart continuity
        averagedData.push({
          temperature: null,
          timestamp: slot.timestamp,
          dataPoints: 0
        });
      }
    }

    // Filter out null values or keep them based on your chart requirements
    const filteredData = averagedData.filter(item => item.temperature !== null);

    // Send data to client
    ws.send(
      JSON.stringify({
        type: 'temperature_history',
        data: filteredData,
        count: filteredData.length,
        filter,
        timeRange: {
          start: startTime,
          end: new Date(now),
          interval: interval,
          totalPoints: points
        }
      })
    );
    
    console.log(`Sent temperature history for ${filter}: ${filteredData.length} points`);
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