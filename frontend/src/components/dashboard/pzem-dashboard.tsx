import React, { useMemo, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { pzem } from "@/lib/type";
import { useWebSocket } from "@/hooks/web-socket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PzemDashboard = () => {
  const [latestPzem, setLatestPzem] = useState<pzem>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [wsReady, setWsReady] = useState(false);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;

  // Function to send messages to WebSocket
  const sendMessage = useCallback((socket: WebSocket | null, message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('Sending message:', message);
      socket.send(JSON.stringify(message));
      return true;
    }
    console.warn('Socket not ready, message not sent:', message);
    return false;
  }, []);

  const socketCallbacks = useMemo(() => ({
    onOpen: (socket: WebSocket) => {
      console.log("WebSocket connection established");
      setIsConnected(true);
      setWsReady(true);
      setError(null);
      
      // Immediately request latest data
      sendMessage(socket, { type: 'start_latest_data' });
    },
    onMessage: (message: any) => {
      console.log('Received message:', message);
      
      switch (message.type) {
        case 'connection_established':
          console.log('Connection established with client ID:', message.clientId);
          // Automatically request data when connection is established
          if (socket && socket.current) {
            sendMessage(socket.current, { type: 'start_latest_data' });
          }
          break;
          
        case 'latest_data':
          console.log('Latest data received:', message.data);
          if (message.data && message.data.pzem) {
            setLatestPzem(message.data.pzem);
          }
          setLoading(false);
          break;
          
        case 'stream_started':
          console.log(`Stream started: ${message.stream}`);
          if (message.stream === 'latest_data') {
            setLoading(false);
          }
          break;
          
        case 'stream_stopped':
          console.log(`Stream stopped: ${message.stream}`);
          break;
          
        case 'error':
          console.error('WebSocket error message:', message.message);
          setError(`Server error: ${message.message}`);
          break;
          
        default:
          console.log('Unknown message type:', message.type);
          break;
      }
    },
    onClose: () => {
      console.log("WebSocket connection closed");
      setIsConnected(false);
      setWsReady(false);
      setError("Disconnected from server. Reconnecting...");
    },
    onError: (error: Event) => {
      console.error("WebSocket error:", error);
      setError("Connection error. Trying to reconnect...");
      setIsConnected(false);
      setWsReady(false);
    },
  }), [sendMessage]);
  
  const { socket } = useWebSocket(wsUrl, socketCallbacks);

  if (loading) {
    return (
      <div className="w-full px-4">
        <Card className="w-full max-w-4xl mx-auto dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-7 w-36" /> 
            <Skeleton className="h-6 w-16 rounded-full" /> 
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                    <Skeleton className="mb-1 h-4 w-16" /> 
                    <Skeleton className="h-8 w-20" /> 
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-destructive mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Card className="w-full max-w-4xl mx-auto dark:bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl sm:text-2xl">Power Usage</CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={isConnected ? "outline" : "destructive"}
              className={isConnected ? "bg-green-500 text-white" : ""}
            >
              {isConnected ? "LIVE" : "OFFLINE"}
            </Badge>
            {error && isConnected && (
              <Badge variant="destructive" className="text-xs">
                {error}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Voltage
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.voltage ? `${latestPzem.voltage}V` : "N/A"}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Current
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.current ? `${latestPzem.current}A` : "N/A"}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Power
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.power ? `${latestPzem.power}W` : "N/A"}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Energy
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.energy ? `${latestPzem.energy}Wh` : "N/A"}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Frequency
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.frequency ? `${latestPzem.frequency}Hz` : "N/A"}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Power Factor
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.power_factor
                    ? `${latestPzem.power_factor}`
                    : "N/A"}
                </span>
              </CardContent>
            </Card>
          </div>
          
          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-2 bg-muted rounded text-xs">
              <p>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
              <p>WebSocket Ready: {wsReady ? 'Yes' : 'No'}</p>
              <p>Last Data: {latestPzem?.created_at ? new Date(latestPzem.created_at).toLocaleTimeString() : 'None'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PzemDashboard;