import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export async function sendTemperatureHistory(ws: any, limit: number = 50) {
    try {
        // Ambil 50 data suhu terbaru
        const temperatureHistory = await prisma.suhu.findMany({
            orderBy: { created_at: 'desc' },
            take: limit,
            select: {
                id: true,
                temperature: true,
                created_at: true
            }
        });

        // Urutkan data berdasarkan timestamp (dari lama ke baru) untuk chart
        const sortedData = [...temperatureHistory].reverse();

        // Kirim data ke client
        ws.send(JSON.stringify({
            type: 'temperature_history',
            data: sortedData,
            count: sortedData.length
        }));
    } catch (error) {
        console.error('Error sending temperature history data:', error);
    }
}

export async function sendPzemHistory(ws: any, limit: number = 50) {
    try {
        // Ambil 50 data PZEM terbaru
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

        // Urutkan data berdasarkan timestamp (dari lama ke baru) untuk chart
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