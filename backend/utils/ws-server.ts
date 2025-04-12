import { WebSocketServer } from 'ws';
import { setWebSocketServer as setPzemWebSocketServer } from '../src/pzem/controller/post-pzem';
import { setWebSocketServer as setSuhuWebSocketServer } from '../src/suhu/controller/post-suhu';
import { sendLatestData } from '../src/with-ws/get-latest-data';

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

    return wss;
};