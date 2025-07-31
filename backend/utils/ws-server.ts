import { WebSocketServer } from 'ws';
import { setWebSocketServer as setPzemWebSocketServer } from '../src/pzem/controller/post-pzem';
import { setWebSocketServer as setSuhuWebSocketServer } from '../src/suhu/controller/post-suhu';
import { setWebSocketServer as setRPMWebSocketServer } from '../src/rpm/controller/post-rpm';
import { sendLatestData } from '../src/with-ws/get-latest-data';
import { sendPzemHistory, sendTemperatureHistory, timeFilters } from '../src/with-ws/get-suhu-50-latest';
import { startDataMonitor } from './pzem-checker';
import { PrismaClient } from '@prisma/client';
import { toZonedTime } from 'date-fns-tz';
import { endOfDay, startOfDay } from 'date-fns';

const prisma = new PrismaClient();

interface ClientState {
    id: string;
    ws: any;
    intervals: {
        latestData?: NodeJS.Timeout;
        temperatureHistory?: NodeJS.Timeout;
        pzemHistory?: NodeJS.Timeout;
    };
    subscriptions: {
        latestData: boolean;
        temperatureHistory: boolean;
        temperatureFilter?: keyof typeof timeFilters;
        pzemHistory: boolean;
        pzemHistoryLimit?: number;
    };
    lastDataHash?: string;
}

const clients = new Map<string, ClientState>();

// Helper function untuk mendapatkan max RPM
async function getMaxRpmData() {
    try {
        const tenSecondAgo = new Date(Date.now() - 10000);
        const maxAggregate = await prisma.rpm.aggregate({
            _max: { rpm: true },
            where: { created_at: { gte: tenSecondAgo } }
        });

        if (maxAggregate._max.rpm === null) return null;

        const latestMaxRpm = await prisma.rpm.findFirst({
            where: {
                rpm: maxAggregate._max.rpm,
                created_at: { gte: tenSecondAgo }
            },
            orderBy: { created_at: 'desc' }
        });

        return latestMaxRpm;
    } catch (error) {
        console.error("Error fetching max RPM data: ", error);
        return null;
    }
}

// Fixed implementation untuk comparison
async function getLatestDataForComparison() {
    try {
        const timeZone = 'Asia/Jakarta';
        const now = toZonedTime(new Date(), timeZone);
        const startOfDayWIB = startOfDay(now);
        const endOfDayWIB = endOfDay(now);

        // Ambil semua data terbaru sekaligus
        const [pzemData, suhuData, rpmData, suhuAvg] = await Promise.all([
            prisma.pzem.findFirst({ orderBy: { created_at: 'desc' } }),
            prisma.suhu.findFirst({ orderBy: { created_at: 'desc' } }),
            getMaxRpmData(),
            prisma.suhu.aggregate({
                _avg: { temperature: true },
                _min: { temperature: true },
                _max: { temperature: true },
                where: {
                    created_at: {
                        gte: startOfDayWIB,
                        lt: endOfDayWIB,
                    },
                },
            })
        ]);

        const result = {
            average: suhuAvg._avg.temperature,
            min: suhuAvg._min.temperature,
            max: suhuAvg._max.temperature
        };

        return {
            pzem: pzemData,
            suhu: suhuData,
            suhuAvg: result,
            rpm: rpmData,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error in getLatestDataForComparison:', error);
        return null;
    }
}

export const createWebSocketServer = (server: any) => {
    const wss = new WebSocketServer({ server });

    setPzemWebSocketServer(wss);
    setSuhuWebSocketServer(wss);
    setRPMWebSocketServer(wss);
    startDataMonitor(wss);

    wss.on('connection', (ws) => {
        console.log('New WebSocket connection');

        const clientId = Math.random().toString(36).substr(2, 9);
        const clientState: ClientState = {
            id: clientId,
            ws,
            intervals: {},
            subscriptions: {
                latestData: false,
                temperatureHistory: false,
                pzemHistory: false
            }
        };
        
        clients.set(clientId, clientState);

        ws.send(JSON.stringify({
            type: 'connection_established',
            clientId: clientId,
            availableCommands: [
                'start_latest_data',
                'stop_latest_data', 
                'get_temperature_history',
                'stop_temperature_history',
                'start_pzem_history',
                'stop_pzem_history',
                'get_pzem_history_once'
            ]
        }));

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                handleClientMessage(clientId, data);
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid JSON message'
                }));
            }
        });

        ws.on('close', () => {
            console.log(`Client ${clientId} disconnected`);
            cleanupClient(clientId);
        });

        ws.on('error', (error) => {
            console.error(`WebSocket error for client ${clientId}:`, error);
            cleanupClient(clientId);
        });
    });

    return wss;
};

function handleClientMessage(clientId: string, data: any) {
    const client = clients.get(clientId);
    if (!client) return;

    switch (data.type) {
        case 'start_latest_data':
            startLatestDataStream(client);
            break;
        case 'stop_latest_data':
            stopLatestDataStream(client);
            break;
        case 'get_temperature_history':
            const filter = (data.filter || '1h') as keyof typeof timeFilters;
            startTemperatureHistoryStream(client, filter);
            break;
        case 'stop_temperature_history':
            stopTemperatureHistoryStream(client);
            break;
        case 'start_pzem_history':
            const historyLimit = data.limit || 50;
            startPzemHistoryStream(client, historyLimit);
            break;
        case 'stop_pzem_history':
            stopPzemHistoryStream(client);
            break;
        case 'get_pzem_history_once':
            const onceLimit = data.limit || 50;
            sendPzemHistory(client.ws, onceLimit);
            break;
        case 'ping':
            client.ws.send(JSON.stringify({ type: 'pong' }));
            break;
        default:
            client.ws.send(JSON.stringify({
                type: 'error',
                message: `Unknown command: ${data.type}`
            }));
            break;
    }
}

function startLatestDataStream(client: ClientState) {
    stopLatestDataStream(client);

    // Send initial data immediately
    sendLatestDataWithChangeDetection(client);
    
    // Gunakan interval yang lebih reasonable - 2 detik
    client.intervals.latestData = setInterval(() => {
        sendLatestDataWithChangeDetection(client);
    }, 2000); // Changed from 500ms to 2000ms
    
    client.subscriptions.latestData = true;
    
    client.ws.send(JSON.stringify({
        type: 'stream_started',
        stream: 'latest_data',
        interval: 2000,
        note: 'Data sent only when changed'
    }));

    console.log(`Started latest data stream for client ${client.id}`);
}

async function sendLatestDataWithChangeDetection(client: ClientState) {
    try {
        const latestData = await getLatestDataForComparison();
        
        if (!latestData) {
            console.error('Failed to fetch latest data');
            // Fallback ke fungsi original
            sendLatestData(client.ws);
            return;
        }
        
        // Create hash dari data yang relevan untuk comparison
        const dataForHash = {
            pzem: latestData.pzem ? {
                id: latestData.pzem.id,
                voltage: latestData.pzem.voltage,
                current: latestData.pzem.current,
                power: latestData.pzem.power,
                energy: latestData.pzem.energy,
                frequency: latestData.pzem.frequency,
                pf: latestData.pzem.power_factor
            } : null,
            suhu: latestData.suhu ? {
                id: latestData.suhu.id,
                temperature: latestData.suhu.temperature
            } : null,
            rpm: latestData.rpm ? {
                id: latestData.rpm.id,
                rpm: latestData.rpm.rpm
            } : null,
            suhuAvg: latestData.suhuAvg
        };
        
        const currentHash = JSON.stringify(dataForHash);
        
        // Send data jika hash berubah ATAU jika ini adalah pengiriman pertama
        if (client.lastDataHash !== currentHash) {
            client.lastDataHash = currentHash;
            
            // Send via WebSocket dengan format yang sama seperti sendLatestData
            client.ws.send(JSON.stringify({
                type: 'latest_data',
                data: latestData
            }));
            
            console.log(`Sent latest data to client ${client.id} (data changed)`);
        } else {
            console.log(`No data change for client ${client.id}, skipping send`);
        }
    } catch (error) {
        console.error('Error in sendLatestDataWithChangeDetection:', error);
        // Fallback ke fungsi original jika ada error
        try {
            sendLatestData(client.ws);
        } catch (fallbackError) {
            console.error('Fallback sendLatestData also failed:', fallbackError);
        }
    }
}

function stopLatestDataStream(client: ClientState) {
    if (client.intervals.latestData) {
        clearInterval(client.intervals.latestData);
        client.intervals.latestData = undefined;
    }
    
    client.subscriptions.latestData = false;
    client.lastDataHash = undefined; // Reset hash when stopping
    
    client.ws.send(JSON.stringify({
        type: 'stream_stopped',
        stream: 'latest_data'
    }));

    console.log(`Stopped latest data stream for client ${client.id}`);
}

function startPzemHistoryStream(client: ClientState, limit: number = 50) {
    stopPzemHistoryStream(client);
    
    sendPzemHistory(client.ws, limit);
    
    client.intervals.pzemHistory = setInterval(() => {
        sendPzemHistory(client.ws, limit);
    }, 1000);
    
    client.subscriptions.pzemHistory = true;
    client.subscriptions.pzemHistoryLimit = limit;
    
    client.ws.send(JSON.stringify({
        type: 'stream_started',
        stream: 'pzem_history',
        limit: limit,
        interval: 1000
    }));

    console.log(`Started PZEM history stream for client ${client.id} with limit ${limit}`);
}

function stopPzemHistoryStream(client: ClientState) {
    if (client.intervals.pzemHistory) {
        clearInterval(client.intervals.pzemHistory);
        client.intervals.pzemHistory = undefined;
    }
    
    client.subscriptions.pzemHistory = false;
    client.subscriptions.pzemHistoryLimit = undefined;
    
    client.ws.send(JSON.stringify({
        type: 'stream_stopped',
        stream: 'pzem_history'
    }));

    console.log(`Stopped PZEM history stream for client ${client.id}`);
}

function startTemperatureHistoryStream(client: ClientState, filter: keyof typeof timeFilters) {
    stopTemperatureHistoryStream(client);

    const { interval } = timeFilters[filter] || timeFilters['1h'];
    
    sendTemperatureHistory(client.ws, filter);
    
    client.intervals.temperatureHistory = setInterval(() => {
        sendTemperatureHistory(client.ws, filter);
    }, interval);
    
    client.subscriptions.temperatureHistory = true;
    client.subscriptions.temperatureFilter = filter;
    
    client.ws.send(JSON.stringify({
        type: 'stream_started',
        stream: 'temperature_history',
        filter: filter,
        interval: interval
    }));

    console.log(`Started temperature history stream for client ${client.id} with filter ${filter}`);
}

function stopTemperatureHistoryStream(client: ClientState) {
    if (client.intervals.temperatureHistory) {
        clearInterval(client.intervals.temperatureHistory);
        client.intervals.temperatureHistory = undefined;
    }
    
    client.subscriptions.temperatureHistory = false;
    client.subscriptions.temperatureFilter = undefined;
    
    client.ws.send(JSON.stringify({
        type: 'stream_stopped',
        stream: 'temperature_history'
    }));

    console.log(`Stopped temperature history stream for client ${client.id}`);
}

function cleanupClient(clientId: string) {
    const client = clients.get(clientId);
    if (!client) return;

    if (client.intervals.latestData) {
        clearInterval(client.intervals.latestData);
    }
    if (client.intervals.temperatureHistory) {
        clearInterval(client.intervals.temperatureHistory);
    }
    if (client.intervals.pzemHistory) {
        clearInterval(client.intervals.pzemHistory);
    }

    clients.delete(clientId);
    
    console.log(`Cleaned up client ${clientId}`);
}

export function getActiveClientsInfo() {
    const clientsInfo = Array.from(clients.values()).map(client => ({
        id: client.id,
        subscriptions: client.subscriptions,
        activeIntervals: {
            latestData: !!client.intervals.latestData,
            temperatureHistory: !!client.intervals.temperatureHistory,
            pzemHistory: !!client.intervals.pzemHistory
        }
    }));

    return {
        totalClients: clients.size,
        clients: clientsInfo
    };
}