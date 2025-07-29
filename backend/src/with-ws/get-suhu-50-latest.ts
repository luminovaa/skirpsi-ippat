import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export async function sendTemperatureHistory(ws: any, timeFilter: string = '1h') {
    try {
        // Konfigurasi filter waktu dan interval rata-rata
        type TimeFilterKey = '1h' | '3h' | '6h' | '12h' | '1d' | '3d' | '1w';
        const timeConfigs: Record<TimeFilterKey, { hours: number; intervalMinutes: number; intervalSeconds: number }> = {
            '1h': { hours: 1, intervalMinutes: 0, intervalSeconds: 10 },    // 10 detik
            '3h': { hours: 3, intervalMinutes: 0, intervalSeconds: 30 },    // 30 detik  
            '6h': { hours: 6, intervalMinutes: 1, intervalSeconds: 0 },     // 1 menit
            '12h': { hours: 12, intervalMinutes: 5, intervalSeconds: 0 },   // 5 menit
            '1d': { hours: 24, intervalMinutes: 15, intervalSeconds: 0 },   // 15 menit
            '3d': { hours: 72, intervalMinutes: 45, intervalSeconds: 0 },   // 45 menit
            '1w': { hours: 168, intervalMinutes: 90, intervalSeconds: 0 }   // 1.5 jam (90 menit)
        };

        const config = timeConfigs[timeFilter as TimeFilterKey] || timeConfigs['1h'];
        
        // Hitung waktu mulai berdasarkan filter
        const startTime = new Date();
        startTime.setHours(startTime.getHours() - config.hours);

        // Ambil data dari database berdasarkan rentang waktu
        const rawData = await prisma.suhu.findMany({
            where: {
                created_at: {
                    gte: startTime
                }
            },
            orderBy: { created_at: 'asc' },
            select: {
                id: true,
                temperature: true,
                created_at: true
            }
        });

        // Jika tidak ada data
        if (rawData.length === 0) {
            ws.send(JSON.stringify({
                type: 'temperature_history',
                data: [],
                count: 0,
                timeFilter: timeFilter,
                message: 'No data available for the selected time period'
            }));
            return;
        }

        // Hitung interval dalam milidetik
        const intervalMs = (config.intervalMinutes * 60 + config.intervalSeconds) * 1000;
        
        // Kelompokkan data berdasarkan interval waktu dan hitung rata-rata
        const groupedData = new Map();
        
        rawData.forEach((record: { id: number; temperature: string; created_at: Date }) => {
            const recordTime = new Date(record.created_at);
            
            // Hitung slot waktu berdasarkan interval
            const timeSlot = Math.floor(recordTime.getTime() / intervalMs) * intervalMs;
            const slotKey = new Date(timeSlot).toISOString();
            
            if (!groupedData.has(slotKey)) {
                groupedData.set(slotKey, {
                    temperatures: [],
                    created_at: new Date(timeSlot)
                });
            }
            
            groupedData.get(slotKey).temperatures.push(parseFloat(record.temperature));
        });

        // Hitung rata-rata untuk setiap kelompok dan buat data final
        const averagedData = Array.from(groupedData.entries()).map(([timeSlot, group]) => {
            const avgTemperature = group.temperatures.reduce((sum: number, temp: number) => sum + temp, 0) / group.temperatures.length;
            
            return {
                id: `avg_${timeSlot}`,
                temperature: Math.round(avgTemperature * 100) / 100, // Bulatkan ke 2 desimal
                created_at: group.created_at,
                dataPoints: group.temperatures.length // Jumlah data yang dirata-rata
            };
        }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Kirim data ke client
        ws.send(JSON.stringify({
            type: 'temperature_history',
            data: averagedData,
            count: averagedData.length,
            timeFilter: timeFilter,
            config: {
                period: `${config.hours} hours`,
                averageInterval: config.intervalMinutes > 0 
                    ? `${config.intervalMinutes} minutes` 
                    : `${config.intervalSeconds} seconds`,
                totalRawDataPoints: rawData.length
            }
        }));

    } catch (error) {
        console.error('Error sending temperature history data:', error);
        
        // Kirim error ke client
        ws.send(JSON.stringify({
            type: 'temperature_history_error',
            error: 'Failed to fetch temperature history',
            timeFilter: timeFilter
        }));
    }
}

// Fungsi helper untuk validasi filter waktu
export function isValidTimeFilter(filter: string): boolean {
    const validFilters = ['1h', '3h', '6h', '12h', '1d', '3d', '1w'];
    return validFilters.includes(filter);
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