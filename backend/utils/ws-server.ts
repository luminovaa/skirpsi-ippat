import { WebSocketServer } from 'ws';
import { setWebSocketServer as setPzemWebSocketServer } from '../src/pzem/controller/post-pzem';
import { setWebSocketServer as setSuhuWebSocketServer } from '../src/suhu/controller/post-suhu';
import { setWebSocketServer as setRPMWebSocketServer } from '../src/rpm/controller/post-rpm';
import { sendLatestData } from '../src/with-ws/get-latest-data';
import { sendPzemHistory, sendTemperatureHistorySQL } from '../src/with-ws/get-suhu-50-latest';
import { startDataMonitor } from './pzem-checker';

export const createWebSocketServerFixed = (server: any) => {
    const wss = new WebSocketServer({ server });

    setPzemWebSocketServer(wss);
    setSuhuWebSocketServer(wss);
    setRPMWebSocketServer(wss);
    startDataMonitor(wss);

    wss.on('connection', (ws) => {
        console.log('New WebSocket connection');
        
        let realtimeInterval: NodeJS.Timeout | null = null;
        let historyInterval: NodeJS.Timeout | null = null;

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());

                if (data.type === 'get_temperature_history') {
                    // Kirim data history sekali
                    sendTemperatureHistorySQL(ws);
                    
                    // Setup interval untuk history update (10 detik)
                    if (historyInterval) clearInterval(historyInterval);
                    historyInterval = setInterval(() => {
                        sendTemperatureHistorySQL(ws);
                    }, 10000); // Update history setiap 10 detik
                }

                if (data.type === 'get_realtime_data') {
                    // Setup interval untuk realtime (1 detik)
                    if (realtimeInterval) clearInterval(realtimeInterval);
                    realtimeInterval = setInterval(() => {
                        sendLatestData(ws);
                    }, 1000);
                    
                    // Kirim data awal
                    sendLatestData(ws);
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
            if (realtimeInterval) clearInterval(realtimeInterval);
            if (historyInterval) clearInterval(historyInterval);
        });
    });
    
    return wss;
};