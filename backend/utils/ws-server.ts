import { WebSocketServer } from 'ws';
import { setWebSocketServer as setPzemWebSocketServer } from '../src/pzem/controller/post-pzem';
import { setWebSocketServer as setSuhuWebSocketServer } from '../src/suhu/controller/post-suhu';
import { setWebSocketServer as setRPMWebSocketServer } from '../src/rpm/controller/post-rpm';
import { sendLatestData } from '../src/with-ws/get-latest-data';
import { sendPzemHistory, sendTemperatureHistory } from '../src/with-ws/get-suhu-50-latest';
import { set } from 'date-fns';

export const createWebSocketServer = (server: any) => {
    const wss = new WebSocketServer({ server });

    // Set WebSocket server untuk kedua controller
    setPzemWebSocketServer(wss);
    setSuhuWebSocketServer(wss);
    setRPMWebSocketServer(wss);


    wss.on('connection', (ws) => {
        console.log('New WebSocket connection');

        // Kirim data terbaru saat client pertama kali connect
        sendLatestData(ws);

        // Set interval untuk mengirim data terbaru setiap beberapa detik
        const interval = setInterval(() => {
            sendLatestData(ws);
        }, 1000); // Update setiap 1 detik

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                
                // Handle berbagai tipe request
                if (data.type === 'get_temperature_history') {
                    const limit = data.limit || 50; 
                    sendTemperatureHistory(ws, limit);
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
            clearInterval(interval);
        });
    });
    return wss;
};