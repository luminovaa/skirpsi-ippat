import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
function getFilterParams(filter: string) {
    const params = {
        timeRange: '1 HOUR',
        groupInterval: 10, // dalam detik
        truncateLevel: 'SECOND'
    };

    switch (filter) {
        case '1h':
            params.timeRange = '1 HOUR';
            params.groupInterval = 10; // 10 detik
            params.truncateLevel = 'SECOND';
            break;
        case '3h':
            params.timeRange = '3 HOUR';
            params.groupInterval = 30; // 30 detik
            params.truncateLevel = 'SECOND';
            break;
        case '6h':
            params.timeRange = '6 HOUR';
            params.groupInterval = 60; // 1 menit
            params.truncateLevel = 'MINUTE';
            break;
        case '12h':
            params.timeRange = '12 HOUR';
            params.groupInterval = 300; // 5 menit
            params.truncateLevel = 'MINUTE';
            break;
        case '1d':
            params.timeRange = '1 DAY';
            params.groupInterval = 900; // 15 menit
            params.truncateLevel = 'MINUTE';
            break;
        case '3d':
            params.timeRange = '3 DAY';
            params.groupInterval = 2700; // 45 menit
            params.truncateLevel = 'MINUTE';
            break;
        case '1w':
            params.timeRange = '7 DAY';
            params.groupInterval = 5400; // 1.5 jam
            params.truncateLevel = 'HOUR';
            break;
    }

    return params;
}

export async function sendTemperatureHistory(ws: any, filter: string) {
    try {
        const { timeRange, groupInterval, truncateLevel } = getFilterParams(filter);

        // Query dengan aggregasi langsung di database
        const processedData = await prisma.$queryRaw`
            SELECT 
                AVG(temperature) as temperature,
                DATE_FORMAT(
                    DATE_SUB(
                        created_at, 
                        INTERVAL 
                            MOD(
                                ${truncateLevel === 'SECOND' 
                                    ? 'SECOND(created_at)' 
                                    : truncateLevel === 'MINUTE' 
                                        ? 'MINUTE(created_at)' 
                                        : 'HOUR(created_at)'}, 
                                ${groupInterval}
                            ) 
                        ${truncateLevel === 'SECOND' 
                            ? 'SECOND' 
                            : truncateLevel === 'MINUTE' 
                                ? 'MINUTE' 
                                : 'HOUR'}
                    ),
                    '%Y-%m-%d %H:%i:%s'
                ) as time_interval
            FROM suhu
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${timeRange})
            GROUP BY time_interval
            ORDER BY time_interval ASC
        `;

        // Format data untuk response
        const formattedData = processedData.map((item: any) => ({
            temperature: item.temperature,
            created_at: new Date(item.time_interval)
        }));

        ws.send(JSON.stringify({
            type: 'temperature_history',
            filter: filter,
            data: formattedData,
            count: formattedData.length
        }));
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