import { PrismaClient } from '@prisma/client';
import { toZonedTime } from 'date-fns-tz';
import { endOfDay, max, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

async function getMaxRpmData() {
    try {
        const tenSecondAgo = new Date(Date.now() - 10000);

        const maxAgregate = await prisma.rpm.aggregate({
            _max: {
                rpm: true,
            },
            where: {
                created_at: {
                    gte: tenSecondAgo,
                }
            }
        })

        if(maxAgregate._max.rpm === null){
            return null;
        }

        const latestMaxRpm = await prisma.rpm.findFirst({
            where: {
                rpm: maxAgregate._max.rpm,
                created_at: {
                    gte: tenSecondAgo,
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        })

        return latestMaxRpm;
    } catch (error) {
        console.error("Error fetching max RPM data: ", error);
        return null;
    }
}
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

        const rpmData = await getMaxRpmData();
        // Ambil data Suhu terbaru
        const suhuData = await prisma.suhu.findFirst({
            orderBy: { created_at: 'desc' }
        });

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
                    suhuAvg: result,
                    rpm: rpmData
                }
            }));
        }
    } catch (error) {
        console.error('Error sending WebSocket data:', error);
    }
}