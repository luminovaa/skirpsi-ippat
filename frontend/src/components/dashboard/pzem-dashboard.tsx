import React, { useMemo, useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { pzem } from "@/lib/type";
import { useWebSocket } from "@/hooks/web-socket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Pause, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PzemDashboard = () => {
  const [latestPzem, setLatestPzem] = useState<pzem>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;

  const socketCallbacks = useMemo(() => ({
    onOpen: (ws: WebSocket) => {
      console.log("WebSocket connection established");
      wsRef.current = ws;
      setIsConnected(true);
      setLoading(false);
      setError(null);
      
      // Auto-start latest data stream when connected
      startLatestDataStream();
    },
    
    onMessage: (message: any) => {
      console.log("Received message:", message.type);
      
      switch (message.type) {
        case 'connection_established':
          console.log("Connection established:", message.clientId);
          break;
          
        case 'latest_data':
          if (message.data?.pzem) {
            setLatestPzem(message.data.pzem);
            setLastUpdate(new Date());
          }
          break;
          
        case 'stream_started':
          if (message.stream === 'latest_data') {
            setIsStreaming(true);
            console.log("Latest data stream started");
          }
          break;
          
        case 'stream_stopped':
          if (message.stream === 'latest_data') {
            setIsStreaming(false);
            console.log("Latest data stream stopped");
          }
          break;
          
        case 'error':
          console.error("Server error:", message.message);
          setError(message.message);
          break;
          
        case 'pong':
          console.log("Received pong");
          break;
          
        default:
          console.log("Unknown message type:", message.type);
      }
    },
    
    onClose: () => {
      console.log("WebSocket connection closed");
      wsRef.current = null;
      setIsConnected(false);
      setIsStreaming(false);
      setError("Disconnected from server. Reconnecting...");
      
      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        setError("Attempting to reconnect...");
      }, 3000);
    },
    
    onError: (error: Event) => {
      console.error("WebSocket error:", error);
      setError("Connection error. Trying to reconnect...");
      setIsConnected(false);
      setIsStreaming(false);
    },
  }), []);

  // WebSocket hook
  const { reconnect } = useWebSocket(wsUrl, socketCallbacks);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Stop streaming before cleanup
      if (wsRef.current && isStreaming) {
        stopLatestDataStream();
      }
    };
  }, [isStreaming]);

  // WebSocket command functions
  const sendCommand = (command: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(command));
      return true;
    } else {
      setError("WebSocket not connected");
      return false;
    }
  };

  const startLatestDataStream = () => {
    const success = sendCommand({ type: 'start_latest_data' });
    if (success) {
      console.log("Requesting to start latest data stream");
    }
  };

  const stopLatestDataStream = () => {
    const success = sendCommand({ type: 'stop_latest_data' });
    if (success) {
      console.log("Requesting to stop latest data stream");
    }
  };

  const pingServer = () => {
    sendCommand({ type: 'ping' });
  };

  const handleToggleStream = () => {
    if (isStreaming) {
      stopLatestDataStream();
    } else {
      startLatestDataStream();
    }
  };

  const handleReconnect = () => {
    setError(null);
    setLoading(true);
    reconnect();
  };

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
      <div className="w-full px-4">
        <Card className="w-full max-w-4xl mx-auto dark:bg-zinc-900">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-destructive mb-2">{error}</p>
              <p className="text-sm text-muted-foreground mb-4">
                Check your connection and server status
              </p>
              <Button onClick={handleReconnect} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Card className="w-full max-w-4xl mx-auto dark:bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-xl sm:text-2xl">Power Usage</CardTitle>
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                Updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Stream Control Button */}
            <Button
              onClick={handleToggleStream}
              size="sm"
              variant="outline"
              disabled={!isConnected}
            >
              {isStreaming ? (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Start
                </>
              )}
            </Button>
            
            {/* Connection Status Badge */}
            <Badge
              variant={isConnected ? "outline" : "destructive"}
              className={`${isConnected ? "bg-green-500 text-white" : ""} ${
                isStreaming ? "animate-pulse" : ""
              }`}
            >
              {isConnected ? (isStreaming ? "STREAMING" : "CONNECTED") : "OFFLINE"}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Error Display */}
          {error && isConnected && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <Card className={!latestPzem ? "opacity-50" : ""}>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Voltage
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.voltage ? `${Number(latestPzem.voltage).toFixed(1)}V` : "N/A"}
                </span>
              </CardContent>
            </Card>
            
            <Card className={!latestPzem ? "opacity-50" : ""}>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Current
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.current ? `${Number(latestPzem.current).toFixed(2)}A` : "N/A"}
                </span>
              </CardContent>
            </Card>
            
            <Card className={!latestPzem ? "opacity-50" : ""}>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Power
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.power ? `${Number(latestPzem.power).toFixed(1)}W` : "N/A"}
                </span>
              </CardContent>
            </Card>
            
            <Card className={!latestPzem ? "opacity-50" : ""}>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Energy
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.energy ? `${Number(latestPzem.energy).toFixed(2)}Wh` : "N/A"}
                </span>
              </CardContent>
            </Card>
            
            <Card className={!latestPzem ? "opacity-50" : ""}>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Frequency
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.frequency ? `${Number(latestPzem.frequency).toFixed(1)}Hz` : "N/A"}
                </span>
              </CardContent>
            </Card>
            
            <Card className={!latestPzem ? "opacity-50" : ""}>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Power Factor
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.power_factor
                    ? `${Number(latestPzem.power_factor).toFixed(2)}`
                    : "N/A"}
                </span>
              </CardContent>
            </Card>
          </div>
          
          {/* Debug Info (optional - remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-2 bg-muted rounded text-xs">
              <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
              <div>Streaming: {isStreaming ? 'Yes' : 'No'}</div>
              <div>Last Update: {lastUpdate?.toISOString() || 'Never'}</div>
              <Button onClick={pingServer} size="sm" className="mt-2">
                Ping Server
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PzemDashboard;