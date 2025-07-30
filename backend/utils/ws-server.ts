import { WebSocketServer } from 'ws';
import { setWebSocketServer as setPzemWebSocketServer } from '../src/pzem/controller/post-pzem';
import { setWebSocketServer as setSuhuWebSocketServer } from '../src/suhu/controller/post-suhu';
import { setWebSocketServer as setRPMWebSocketServer } from '../src/rpm/controller/post-rpm';
import { sendLatestData } from '../src/with-ws/get-latest-data';
import { sendPzemHistory, sendTemperatureHistory, timeFilters } from '../src/with-ws/get-suhu-50-latest';
import { startDataMonitor } from './pzem-checker';

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
    lastDataHash?: string; // For detecting data changes
}

// Store client states
const clients = new Map<string, ClientState>();

export const createWebSocketServer = (server: any) => {
    const wss = new WebSocketServer({ server });

    setPzemWebSocketServer(wss);
    setSuhuWebSocketServer(wss);
    setRPMWebSocketServer(wss);
    startDataMonitor(wss);

    wss.on('connection', (ws) => {
        console.log('New WebSocket connection');

        // Create unique client ID and state
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

        // Send initial connection confirmation
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
    // Stop existing stream if any
    stopLatestDataStream(client);

    // Send initial data immediately
    sendLatestDataWithChangeDetection(client);
    
    // Start interval - check every 500ms but only send if data changed
    client.intervals.latestData = setInterval(() => {
        sendLatestDataWithChangeDetection(client);
    }, 500); // Reduced interval for better responsiveness
    
    client.subscriptions.latestData = true;
    
    client.ws.send(JSON.stringify({
        type: 'stream_started',
        stream: 'latest_data',
        interval: 500,
        note: 'Data sent only when changed'
    }));

    console.log(`Started latest data stream for client ${client.id}`);
}

async function sendLatestDataWithChangeDetection(client: ClientState) {
    try {
        // Get latest data (you'll need to modify this based on your sendLatestData implementation)
        const latestData = await getLatestDataForComparison();
        
        // Create hash of current data
        const currentHash = JSON.stringify(latestData);
        
        // Only send if data changed
        if (client.lastDataHash !== currentHash) {
            client.lastDataHash = currentHash;
            sendLatestData(client.ws);
            console.log(`Sent latest data to client ${client.id} (data changed)`);
        }
    } catch (error) {
        console.error('Error in sendLatestDataWithChangeDetection:', error);
        // Fallback to regular send
        sendLatestData(client.ws);
    }
}

// Helper function - you need to implement this based on your data structure
async function getLatestDataForComparison() {
    // This should return the same data structure that sendLatestData sends
    // but in a format suitable for comparison
    // Example implementation:
    /*
    const [latestPzem, latestSuhu, latestRpm] = await Promise.all([
        prisma.pzem.findFirst({ orderBy: { created_at: 'desc' } }),
        prisma.suhu.findFirst({ orderBy: { created_at: 'desc' } }),
        prisma.rpm.findFirst({ orderBy: { created_at: 'desc' } })
    ]);
    
    return {
        pzem: latestPzem,
        suhu: latestSuhu,
        rpm: latestRpm,
        timestamp: new Date()
    };
    */
    return {}; // Placeholder - implement based on your actual data structure
}

function stopLatestDataStream(client: ClientState) {
    if (client.intervals.latestData) {
        clearInterval(client.intervals.latestData);
        client.intervals.latestData = undefined;
    }
    
    client.subscriptions.latestData = false;
    
    client.ws.send(JSON.stringify({
        type: 'stream_stopped',
        stream: 'latest_data'
    }));

    console.log(`Stopped latest data stream for client ${client.id}`);
}

function startPzemHistoryStream(client: ClientState, limit: number = 50) {
    // Stop existing stream if any
    stopPzemHistoryStream(client);
    
    // Send initial data immediately
    sendPzemHistory(client.ws, limit);
    
    // Start interval - send every 5 seconds for PZEM history
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
    // Stop existing stream if any
    stopTemperatureHistoryStream(client);

    const { interval } = timeFilters[filter] || timeFilters['1h'];
    
    // Send initial data immediately
    sendTemperatureHistory(client.ws, filter);
    
    // Start interval
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

    // Clear all intervals
    if (client.intervals.latestData) {
        clearInterval(client.intervals.latestData);
    }
    if (client.intervals.temperatureHistory) {
        clearInterval(client.intervals.temperatureHistory);
    }
    if (client.intervals.pzemHistory) {
        clearInterval(client.intervals.pzemHistory);
    }

    // Remove client from map
    clients.delete(clientId);
    
    console.log(`Cleaned up client ${clientId}`);
}

// Optional: Add method to get active clients info (for debugging)
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