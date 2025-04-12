import { PrismaClient } from '@prisma/client';
import { toZonedTime } from 'date-fns-tz';
import { endOfDay, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

export async function sendLatestData(ws: any) {
    try {
        const timeZone = 'Asia/Jakarta';
        const now = toZonedTime(new Date(), timeZone);

        // Get start and end of day in WIB
        const startOfDayWIB = startOfDay(now);
        const endOfDayWIB = endOfDay(now);

        // Ambil data PZEM terbaru
        const pzemData = await prisma.pzem.findFirst({
            orderBy: { created_at: 'desc' }
        });

        // Ambil data Suhu terbaru
        const suhuData = await prisma.suhu.findFirst({
            orderBy: { created_at: 'desc' }
        });

        // Get average, min, max temperature for today
        const suhuAvg = await prisma.suhu.aggregate({
            _avg: {
                temperature: true
            },
            _min: {
                temperature: true
            },
            _max: {
                temperature: true
            },
            where: {
                created_at: {
                    gte: startOfDayWIB,
                    lt: endOfDayWIB,
                },
            },
        });

        const result = {
            average: suhuAvg._avg.temperature,
            min: suhuAvg._min.temperature,
            max: suhuAvg._max.temperature
        };

        // Kirim kedua data sekaligus
        if (pzemData || suhuData) {
            ws.send(JSON.stringify({
                type: 'latest_data',
                data: {
                    pzem: pzemData,
                    suhu: suhuData,
                    suhuAvg: result
                }
            }));
        }
    } catch (error) {
        console.error('Error sending WebSocket data:', error);
    }
}