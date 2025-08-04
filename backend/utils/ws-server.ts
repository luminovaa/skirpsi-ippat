import { WebSocketServer } from 'ws';
import { setWebSocketServer as setPzemWebSocketServer } from '../src/pzem/controller/post-pzem';
import { setWebSocketServer as setSuhuWebSocketServer } from '../src/suhu/controller/post-suhu';
import { setWebSocketServer as setRPMWebSocketServer } from '../src/rpm/controller/post-rpm';
import { sendLatestData } from '../src/with-ws/get-latest-data';
import { sendPzemHistory, sendTemperatureHistorySQL } from '../src/with-ws/get-suhu-50-latest';
import { startDataMonitor } from './pzem-checker';

export const createWebSocketServer = (server: any) => {
    const wss = new WebSocketServer({ server });

    setPzemWebSocketServer(wss);
    setSuhuWebSocketServer(wss);
    setRPMWebSocketServer(wss);
    startDataMonitor(wss);

    // Tambahkan interval untuk mengirim history setiap 10 detik
    const historyInterval = setInterval(() => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                sendTemperatureHistorySQL(client);
            }
        });
    }, 10000); // 10 detik

    wss.on('connection', (ws) => {
        console.log('New WebSocket connection');

        // Kirim data terbaru setiap detik untuk client ini
        const latestDataInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                sendLatestData(ws);
            }
        }, 1000);

        // Kirim history segera setelah koneksi terbentuk
        sendTemperatureHistorySQL(ws);

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());

                if (data.type === 'get_temperature_history') {
                    sendTemperatureHistorySQL(ws);
                }

                if (data.type === 'get_pzem_history') {
                    const limit = data.limit || 50;
                    sendPzemHistory(ws, limit);
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
            clearInterval(latestDataInterval);
        });
    });

    // Bersihkan interval ketika server ditutup
    wss.on('close', () => {
        clearInterval(historyInterval);
    });

    return wss;
};