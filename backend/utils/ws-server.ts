import { WebSocketServer } from 'ws';
import { setWebSocketServer as setPzemWebSocketServer } from '../src/pzem/controller/post-pzem';
import { setWebSocketServer as setSuhuWebSocketServer } from '../src/suhu/controller/post-suhu';
import { setWebSocketServer as setRPMWebSocketServer } from '../src/rpm/controller/post-rpm';
import { sendLatestData } from '../src/with-ws/get-latest-data';
import { sendPzemHistory, sendTemperatureHistory, timeFilters } from '../src/with-ws/get-suhu-50-latest';
import { startDataMonitor } from './pzem-checker';

// Store active intervals for each client
const clientIntervals = new Map();

export const createWebSocketServer = (server: any) => {
    const wss = new WebSocketServer({ server });

    setPzemWebSocketServer(wss);
    setSuhuWebSocketServer(wss);
    setRPMWebSocketServer(wss);
    startDataMonitor(wss);

    wss.on('connection', (ws) => {
        console.log('New WebSocket connection');

        // Create unique client ID
        const clientId = Math.random().toString(36).substr(2, 9);
        clientIntervals.set(clientId, new Set());

        // Send latest data immediately on connection
        sendLatestData(ws);

        setInterval(() => {
            sendLatestData(ws);
        }, 1000);

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());

                if (data.type === 'get_temperature_history') {
                    const filter = (data.filter || '1h') as keyof typeof timeFilters;
                    const { interval } = timeFilters[filter] || timeFilters['1h'];

                    // Clear existing intervals
                    const existingIntervals = clientIntervals.get(clientId);
                    if (existingIntervals) {
                        existingIntervals.forEach((intervalId: NodeJS.Timeout) => {
                            clearInterval(intervalId);
                        });
                        existingIntervals.clear();
                    }

                    sendTemperatureHistory(ws, filter);

                    const historyInterval = setInterval(() => {
                        sendTemperatureHistory(ws, filter);
                    }, interval);

                    existingIntervals.add(historyInterval);
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

            // Clear all intervals for this client
            const intervals = clientIntervals.get(clientId);
            if (intervals) {
                intervals.forEach((intervalId: NodeJS.Timeout) => {
                    clearInterval(intervalId);
                });
                clientIntervals.delete(clientId);
            }
        });
    });
};