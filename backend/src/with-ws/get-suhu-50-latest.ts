import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export async function sendTemperatureHistorySQL(ws: any) {
    try {
        // Query SQL MySQL untuk group by interval 10 detik dalam 1 jam terakhir
       const result = await prisma.$queryRaw`
    SELECT 
        CONCAT('avg_', FLOOR(UNIX_TIMESTAMP(created_at) / 10) * 10) as id,
        AVG(temperature) as temperature,
        FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(created_at) / 10) * 10) as created_at,
        COUNT(*) as data_count,
        MIN(temperature) as min_temp,
        MAX(temperature) as max_temp
    FROM suhu 
    WHERE UNIX_TIMESTAMP(created_at) >= UNIX_TIMESTAMP(NOW()) - 3600
    GROUP BY FLOOR(UNIX_TIMESTAMP(created_at) / 10)
    ORDER BY created_at ASC
`;

        console.log('query',result);
        // if ((result as any[]).length === 0) {
        //     const fallbackData = await prisma.suhu.findMany({
        //         orderBy: { created_at: 'desc' },
        //         take: 50
        //     });

        //     if (fallbackData.length > 0) {
        //         ws.send(JSON.stringify({
        //             type: 'temperature_history',
        //             data: fallbackData.map(item => ({
        //                 id: item.id,
        //                 temperature: item.temperature,
        //                 created_at: item.created_at,
        //                 data_count: 1,
        //                 min_temp: item.temperature,
        //                 max_temp: item.temperature
        //             })),
        //             count: fallbackData.length,
        //             interval: 'raw_data',
        //             period: 'all_available'
        //         }));
        //         return;
        //     }
        // }

        // Format hasil untuk konsistensi tipe data
        const formattedData = (result as any[]).map(item => ({
            id: String(item.id),
            temperature: Math.round(Number(item.temperature) * 100) / 100,
            created_at: new Date(item.created_at),
            data_count: Number(item.data_count),
            min_temp: Math.round(Number(item.min_temp) * 100) / 100,
            max_temp: Math.round(Number(item.max_temp) * 100) / 100
        }));

        ws.send(JSON.stringify({
            type: 'temperature_history',
            data: formattedData,
            count: formattedData.length,
            interval: '10_seconds',
            period: '1_hour'
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