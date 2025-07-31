import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { suhu } from "@/lib/type";
import { useWebSocket } from "@/hooks/web-socket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const SuhuDashboard = () => {
  const { theme } = useTheme();
  const [latestSuhu, setLatestSuhu] = useState<suhu>();
  const [todayStats, setTodayStats] = useState<suhu>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [wsReady, setWsReady] = useState(false);
  const [dataReceived, setDataReceived] = useState(false);
  const [temperatureClassification, setTemperatureClassification] = useState<
    string | null
  >(null);
  
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;

  // Function to send messages to WebSocket
  const sendMessage = useCallback((socket: WebSocket | null, message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('Sending Suhu message:', message);
      socket.send(JSON.stringify(message));
      return true;
    }
    console.warn('Suhu Socket not ready, message not sent:', message);
    return false;
  }, []);

  // Set up timeout for data receipt - only if connected but no data
  useEffect(() => {
    if (isConnected && !dataReceived) {
      const timeoutId = setTimeout(() => {
        if (!dataReceived) {
          setError("No data received from server. Check sensor connection.");
        }
      }, 15000); // 15 seconds timeout after connection

      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, dataReceived]);

  const classifyTemperature = (temp: number) => {
    if (temp <= 170) {
      return "Light";
    } else if (temp > 170 && temp < 240) {
      return "Medium";
    } else {
      return "Dark";
    }
  };

  const getTemperatureColor = (temp: number) => {
    if (temp <= 170) {
      return "text-blue-500"; // Light - Blue
    } else if (temp > 170 && temp < 240) {
      return "text-yellow-500"; // Medium - Yellow
    } else {
      return "text-red-500"; // Dark - Red
    }
  };

  const socketCallbacks = useMemo(() => ({
    onOpen: (socket: WebSocket) => {
      console.log("Suhu WebSocket connection established");
      setIsConnected(true);
      setWsReady(true);
      setError(null);
      
      // Immediately request latest data
      sendMessage(socket, { type: 'start_latest_data' });
    },
    onMessage: (message: any) => {
      console.log('Suhu Received message:', message);
      
      switch (message.type) {
        case 'connection_established':
          console.log('Suhu Connection established with client ID:', message.clientId);
          // Automatically request data when connection is established
          if (socket && socket.current) {
            sendMessage(socket.current, { type: 'start_latest_data' });
          }
          break;
          
        case 'latest_data':
          console.log('Suhu Latest data received:', message.data);
          if (message.data) {
            if (message.data.suhu) {
              setLatestSuhu(message.data.suhu);
              const currentTemp = message.data.suhu.temperature;
              setTemperatureClassification(classifyTemperature(currentTemp));
            }
            
            if (message.data.suhuAvg) {
              setTodayStats(message.data.suhuAvg);
            }
            
            setDataReceived(true);
            setLoading(false);
            setError(null);
          }
          break;
          
        case 'stream_started':
          console.log(`Suhu Stream started: ${message.stream}`);
          if (message.stream === 'latest_data') {
            setLoading(false);
          }
          break;
          
        case 'stream_stopped':
          console.log(`Suhu Stream stopped: ${message.stream}`);
          break;
          
        case 'error':
          console.error('Suhu WebSocket error message:', message.message);
          setError(`Server error: ${message.message}`);
          break;
          
        default:
          console.log('Suhu Unknown message type:', message.type);
          break;
      }
    },
    onClose: () => {
      console.log("Suhu WebSocket connection closed");
      setIsConnected(false);
      setWsReady(false);
      setDataReceived(false);
      setError("Disconnected from server. Reconnecting...");
    },
    onError: (error: Event) => {
      console.error("Suhu WebSocket error:", error);
      setError("Connection error. Trying to reconnect...");
      setIsConnected(false);
      setWsReady(false);
      setDataReceived(false);
    },
  }), [sendMessage]);
  
  const { socket } = useWebSocket(wsUrl, socketCallbacks);

  if (loading) {
    return (
      <div className="w-full sm:justify-center">
        <Card className="w-full sm:w-80 md:w-96 dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-7 w-32" /> 
            <Skeleton className="h-6 w-16 rounded-full" /> 
          </CardHeader>
          <CardContent>
            <div className="flex flex-col pt-4 sm:pt-9 items-center">
              <Skeleton className="h-12 w-24 sm:h-14 sm:w-28" /> 
              <Skeleton className="mt-2 h-5 w-20" /> 
            </div>
            <div className="mt-6 sm:mt-10 flex justify-between">
              <Skeleton className="h-7 w-16" /> 
              <Skeleton className="h-5 w-16" /> 
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !isConnected) {
    return (
      <div className="w-full sm:justify-center relative">
        <div className="filter blur-sm">
          {/* Skeleton sebagai background dengan efek blur */}
          <Card className="w-full sm:w-80 md:w-96 dark:bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col pt-4 sm:pt-9 items-center">
                <Skeleton className="h-12 w-24 sm:h-14 sm:w-28" />
                <Skeleton className="mt-2 h-5 w-20" />
              </div>
              <div className="mt-6 sm:mt-10 flex justify-between">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </CardContent>
          </Card>
        </div>
  
        {/* Overlay untuk pesan error */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Card className="w-full sm:w-80 md:w-96 h-full bg-transparent border-0">
            <CardHeader className="flex flex-row pt-12 items-center justify-between pb-2">
              <CardTitle className="text-xl sm:text-2xl text-destructive">Connection Error</CardTitle>
              <Badge variant="destructive">OFFLINE</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col pt-4 items-center">
                <p className="text-sm text-center text-muted-foreground mb-2">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Retry Connection
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full sm:justify-center">
      <Card className="w-full sm:w-80 md:w-96 dark:bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl sm:text-2xl">Temperature</CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={isConnected ? "outline" : "destructive"}
              className={isConnected ? "bg-green-500 text-white" : ""}
            >
              {isConnected ? "LIVE" : "OFFLINE"}
            </Badge>
            {error && isConnected && (
              <Badge variant="destructive" className="text-xs max-w-20 truncate">
                Sensor Issue
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col pt-4 sm:pt-9 items-center">
            <p className="text-4xl sm:text-5xl font-bold text-foreground">
              {latestSuhu?.temperature ?? 0}°C
            </p>
            <p
              className={`mt-2 text-base sm:text-lg font-medium ${
                latestSuhu?.temperature 
                  ? getTemperatureColor(latestSuhu.temperature)
                  : "text-muted-foreground"
              }`}
            >
              {temperatureClassification ?? "No Data"}
            </p>
          </div>
          
          <div className="mt-6 sm:mt-10 flex justify-between">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Min Today</p>
              <p className="text-base sm:text-lg font-semibold text-blue-500">
                {todayStats?.min ?? '--'}°C
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Max Today</p>
              <p className="text-base sm:text-lg font-semibold text-red-500">
                {todayStats?.max ?? '--'}°C
              </p>
            </div>
          </div>
          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-2 bg-muted rounded text-xs">
              <p>Connection: {isConnected ? 'Connected' : 'Disconnected'}</p>
              <p>WebSocket Ready: {wsReady ? 'Yes' : 'No'}</p>
              <p>Data Received: {dataReceived ? 'Yes' : 'No'}</p>
              <p>Temperature: {latestSuhu?.temperature ?? 'None'}°C</p>
              <p>Last Update: {latestSuhu?.created_at ? new Date(latestSuhu.created_at).toLocaleTimeString() : 'None'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuhuDashboard;