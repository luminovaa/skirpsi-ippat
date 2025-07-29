import { WebSocketServer } from 'ws';
import { setWebSocketServer as setPzemWebSocketServer } from '../src/pzem/controller/post-pzem';
import { setWebSocketServer as setSuhuWebSocketServer } from '../src/suhu/controller/post-suhu';
import { setWebSocketServer as setRPMWebSocketServer } from '../src/rpm/controller/post-rpm';
import { sendLatestData } from '../src/with-ws/get-latest-data';
import { sendPzemHistory, sendTemperatureHistory, timeFilters } from '../src/with-ws/get-suhu-50-latest';
import { startDataMonitor } from './pzem-checker';

export const createWebSocketServer = (server: any) => {
    const wss = new WebSocketServer({ server });

    setPzemWebSocketServer(wss);
    setSuhuWebSocketServer(wss);
    setRPMWebSocketServer(wss);
    startDataMonitor(wss);


    wss.on('connection', (ws) => {
  console.log('New WebSocket connection');

  const interval = setInterval(() => {
    sendLatestData(ws); // Tetap kirim data terbaru setiap detik
  }, 1000);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'get_temperature_history') {
        const filter = (data.filter || '1h') as keyof typeof timeFilters;
        const { interval } = timeFilters[filter] || timeFilters['1h'];
        sendTemperatureHistory(ws, filter); // Kirim data historis saat diminta
        const historyInterval = setInterval(() => {
          sendTemperatureHistory(ws, filter); // Kirim ulang setiap interval filter
        }, interval);
        ws.on('close', () => {
          clearInterval(historyInterval); // Hentikan interval saat klien terputus
          clearInterval(interval);
        });
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
};  