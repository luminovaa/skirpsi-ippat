import { WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client';
import { setWebSocketServer as setPzemWebSocketServer } from '../src/pzem/controller/post-pzem';
import { setWebSocketServer as setSuhuWebSocketServer } from '../src/suhu/controller/post-suhu';
import { toZonedTime } from 'date-fns-tz';
import { endOfDay, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

export const createWebSocketServer = (server: any) => {
    const wss = new WebSocketServer({ server });

    // Set WebSocket server untuk kedua controller
    setPzemWebSocketServer(wss);
    setSuhuWebSocketServer(wss);

    wss.on('connection', (ws) => {
        console.log('New WebSocket connection');

        // Kirim data terbaru saat client pertama kali connect
        sendLatestData(ws);

        // Set interval untuk mengirim data terbaru setiap beberapa detik
        const interval = setInterval(() => {
            sendLatestData(ws);
        }, 1000); // Update setiap 1 detik

        ws.on('close', () => {
            console.log('Client disconnected');
            clearInterval(interval);
        });
    });

    async function sendLatestData(ws: any) {
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

    return wss;
};