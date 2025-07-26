import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export async function sendTemperatureHistory(ws: any, minutes: number = 10) {
    try {
        // Hitung timestamp 10 menit yang lalu
        const tenMinutesAgo = new Date(Date.now() - minutes * 60 * 1000);
        
        // Ambil data suhu dalam 10 menit terakhir
        const temperatureHistory = await prisma.suhu.findMany({
            where: {
                created_at: {
                    gte: tenMinutesAgo // greater than or equal (>=)
                }
            },
            orderBy: { created_at: 'asc' }, // urutkan dari lama ke baru
            select: {
                id: true,
                temperature: true,
                created_at: true
            }
        });

        // Kirim data ke client
        ws.send(JSON.stringify({
            type: 'temperature_history',
            data: temperatureHistory,
            count: temperatureHistory.length,
            timeWindow: `${minutes} minutes`,
            oldestData: temperatureHistory[0]?.created_at,
            newestData: temperatureHistory[temperatureHistory.length - 1]?.created_at
        }));
    } catch (error) {
        console.error('Error sending temperature history data:', error);
    }
}

export async function sendPzemHistory(ws: any, minutes: number = 10) {
    try {
        // Hitung timestamp 10 menit yang lalu
        const tenMinutesAgo = new Date(Date.now() - minutes * 60 * 1000);
        
        // Ambil data PZEM dalam 10 menit terakhir
        const pzemHistory = await prisma.pzem.findMany({
            where: {
                created_at: {
                    gte: tenMinutesAgo
                }
            },
            orderBy: { created_at: 'asc' }, // urutkan dari lama ke baru
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

        // Kirim data ke client
        ws.send(JSON.stringify({
            type: 'pzem_history',
            data: pzemHistory,
            count: pzemHistory.length,
            timeWindow: `${minutes} minutes`,
            oldestData: pzemHistory[0]?.created_at,
            newestData: pzemHistory[pzemHistory.length - 1]?.created_at
        }));
    } catch (error) {
        console.error('Error sending PZEM history data:', error);
    }
}