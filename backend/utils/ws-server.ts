import { WebSocketServer, WebSocket } from 'ws';
import { 
  setWebSocketServer as setPzemWebSocketServer,
} from '../src/pzem/controller/post-pzem';
import { setWebSocketServer as setSuhuWebSocketServer } from '../src/suhu/controller/post-suhu';
import { setWebSocketServer as setRPMWebSocketServer } from '../src/rpm/controller/post-rpm';
import { sendLatestData } from '../src/with-ws/get-latest-data';
import { 
  sendPzemHistory, 
  sendTemperatureHistory, 
  timeFilters 
} from '../src/with-ws/get-suhu-50-latest';
import { startDataMonitor } from './pzem-checker';

type ClientId = string;
type IntervalType = 'latest' | 'temperature_history' | 'pzem_history';

interface ClientState {
  intervals: Map<IntervalType, NodeJS.Timeout>;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<ClientId, ClientState> = new Map();

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.initialize();
  }

  private initialize(): void {
    // Set up WebSocket servers for different modules
    setPzemWebSocketServer(this.wss);
    setSuhuWebSocketServer(this.wss);
    setRPMWebSocketServer(this.wss);
    startDataMonitor(this.wss);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = this.generateClientId();
      console.log(`New connection from client ${clientId}`);

      this.clients.set(clientId, {
        intervals: new Map()
      });

      this.setupClientHandlers(clientId, ws);
      this.sendInitialData(ws);
    });
  }

  private setupClientHandlers(clientId: ClientId, ws: WebSocket): void {
    // Setup message handler
    ws.on('message', (message: Buffer) => this.handleMessage(clientId, ws, message));

    // Setup close/cleanup handler
    ws.on('close', () => this.cleanupClient(clientId));

    // Setup error handler
    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      this.cleanupClient(clientId);
    });
  }

  private handleMessage(clientId: ClientId, ws: WebSocket, message: Buffer): void {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'get_temperature_history':
          this.handleTemperatureHistoryRequest(clientId, ws, data.filter);
          break;
          
        case 'get_pzem_history':
          this.handlePzemHistoryRequest(ws, data.limit);
          break;
          
        default:
          console.warn(`Unknown message type from client ${clientId}: ${data.type}`);
      }
    } catch (error) {
      console.error(`Error processing message from client ${clientId}:`, error);
    }
  }

  private handleTemperatureHistoryRequest(clientId: ClientId, ws: WebSocket, filter: string = '1h'): void {
    const validatedFilter = this.validateTimeFilter(filter);
    const { interval } = timeFilters[validatedFilter];

    // Clear any existing temperature history interval
    this.clearClientInterval(clientId, 'temperature_history');

    // Send initial data and set up interval
    sendTemperatureHistory(ws, validatedFilter);

    const historyInterval = setInterval(() => {
      sendTemperatureHistory(ws, validatedFilter);
    }, interval);

    this.clients.get(clientId)?.intervals.set('temperature_history', historyInterval);
  }

  private handlePzemHistoryRequest(ws: WebSocket, limit: number = 50): void {
    // Pzem history is sent once (no interval) unless you want to implement periodic updates
    sendPzemHistory(ws, limit);
  }

  private sendInitialData(ws: WebSocket): void {
    // Send latest data immediately
    sendLatestData(ws);

    // Set up periodic latest data updates
    const latestDataInterval = setInterval(() => {
      sendLatestData(ws);
    }, 1000);

    // Store the interval for cleanup
    const clientId = [...this.clients.keys()].pop(); // Get the last added client
    if (clientId) {
      this.clients.get(clientId)?.intervals.set('latest', latestDataInterval);
    }
  }

  private cleanupClient(clientId: ClientId): void {
    console.log(`Cleaning up client ${clientId}`);
    
    const clientState = this.clients.get(clientId);
    if (clientState) {
      // Clear all intervals for this client
      clientState.intervals.forEach((interval, type) => {
        clearInterval(interval);
        console.log(`Cleared ${type} interval for client ${clientId}`);
      });
      
      this.clients.delete(clientId);
    }
  }

  private clearClientInterval(clientId: ClientId, type: IntervalType): void {
    const clientState = this.clients.get(clientId);
    const interval = clientState?.intervals.get(type);
    
    if (clientState && interval) {
      clearInterval(interval);
      clientState.intervals.delete(type);
    }
  }

  private validateTimeFilter(filter: string): keyof typeof timeFilters {
    return timeFilters[filter as keyof typeof timeFilters] ? 
      filter as keyof typeof timeFilters : 
      '1h';
  }

  private generateClientId(): ClientId {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Usage:
// const webSocketManager = new WebSocketManager(server);