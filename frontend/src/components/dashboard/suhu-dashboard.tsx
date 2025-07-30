import React, { useMemo, useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { suhu } from "@/lib/type";
import { useWebSocket } from "@/hooks/web-socket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Pause, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const SuhuDashboard = () => {
  const { theme } = useTheme();
  const [latestSuhu, setLatestSuhu] = useState<suhu>();
  const [todayStats, setTodayStats] = useState<suhu>();
  const [temperatureClassification, setTemperatureClassification] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Fungsi untuk mengklasifikasi suhu
  const classifyTemperature = (temp: number) => {
    if (temp <= 170) {
      return "Light";
    } else if (temp > 170 && temp < 240) {
      return "Medium";
    } else {
      return "Dark";
    }
  };

  // Socket callbacks untuk menangani pesan WebSocket
  const socketCallbacks = useMemo(
    () => ({
      onOpen: (ws: WebSocket) => {
        console.log("WebSocket connection established");
        wsRef.current = ws;
        setIsConnected(true);
        setLoading(false);
        setError(null);
        // Auto-start temperature history stream when connected
        startTemperatureHistoryStream();
      },
      onMessage: (message: any) => {
        console.log("Received message:", message.type);
        switch (message.type) {
          case "connection_established":
            console.log("Connection established:", message.clientId);
            break;
          case "latest_data":
            if (message.data?.suhu) {
              setLatestSuhu(message.data.suhu);
              setTodayStats(message.data.suhuAvg);
              const currentTemp = message.data.suhu.temperature;
              setTemperatureClassification(classifyTemperature(currentTemp));
              setLastUpdate(new Date());
            }
            break;
          case "temperature_history":
            if (message.data?.suhu) {
              // Asumsi data terbaru adalah elemen pertama
              setLatestSuhu(message.data.suhu[0]);
              setTodayStats(message.data.suhuAvg);
              const currentTemp = message.data.suhu[0]?.temperature;
              if (currentTemp) {
                setTemperatureClassification(classifyTemperature(currentTemp));
              }
              setLastUpdate(new Date());
            }
            break;
          case "stream_started":
            if (message.stream === "temperature_history") {
              setIsStreaming(true);
              console.log("Temperature history stream started");
            }
            break;
          case "stream_stopped":
            if (message.stream === "temperature_history") {
              setIsStreaming(false);
              console.log("Temperature history stream stopped");
            }
            break;
          case "error":
            console.error("Server error:", message.message);
            setError(message.message);
            break;
          case "pong":
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
    }),
    []
  );

  // Inisialisasi WebSocket
  const { reconnect, sendMessage } = useWebSocket(wsUrl, socketCallbacks);

  // Fungsi untuk mengirim perintah WebSocket
  const sendCommand = (command: any) => {
    const success = sendMessage(command);
    if (success) {
      console.log(`Sent command: ${JSON.stringify(command)}`);
    } else {
      setError("WebSocket not connected");
    }
    return success;
  };

  // Fungsi untuk memulai streaming data suhu
  const startTemperatureHistoryStream = () => {
    const success = sendCommand({ type: "get_temperature_history", filter: "1h" });
    if (success) {
      console.log("Requesting to start temperature history stream");
    }
  };

  // Fungsi untuk menghentikan streaming data suhu
  const stopTemperatureHistoryStream = () => {
    const success = sendCommand({ type: "stop_temperature_history" });
    if (success) {
      console.log("Requesting to stop temperature history stream");
    }
  };

  // Fungsi untuk toggle streaming
  const handleToggleStream = () => {
    if (isStreaming) {
      stopTemperatureHistoryStream();
    } else {
      startTemperatureHistoryStream();
    }
  };

  // Fungsi untuk reconnect manual
  const handleReconnect = () => {
    setError(null);
    setLoading(true);
    reconnect();
  };

  // Cleanup saat komponen unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current && isStreaming) {
        stopTemperatureHistoryStream();
      }
    };
  }, [isStreaming]);

  // UI untuk loading state
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

  // UI untuk error state
  if (error && !isConnected) {
    return (
      <div className="w-full sm:justify-center relative">
        <div className="filter blur-sm">
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
        <div className="absolute inset-0 flex items-center justify-center">
          <Card className="w-full sm:w-80 md:w-96 h-full bg-transparent border-0">
            <CardHeader className="flex flex-row pt-12 items-center justify-between pb-2">
              <CardTitle className="text-xl sm:text-2xl text-destructive">Error</CardTitle>
              <Badge variant="destructive">OFFLINE</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col pt-4 items-center">
                <p className="text-lg text-destructive text-center">{error}</p>
                <Button onClick={handleReconnect} variant="outline" className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // UI utama
  return (
    <div className="w-full sm:justify-center">
      <Card className="w-full sm:w-80 md:w-96 dark:bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-xl sm:text-2xl">Temperature</CardTitle>
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                Updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
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
          {error && isConnected && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="flex flex-col pt-4 sm:pt-9 items-center">
            <p className="text-4xl sm:text-5xl font-bold text-foreground">
              {latestSuhu?.temperature ? `${latestSuhu.temperature} °C` : "N/A"}
            </p>
            <p
              className={`mt-2 text-base sm:text-lg ${
                theme === "dark" ? "text-primary-light" : "text-primary-dark"
              }`}
            >
              {temperatureClassification || "N/A"}
            </p>
          </div>
          <div className="mt-6 sm:mt-10 flex justify-between">
            <p
              className={`text-base sm:text-lg ${
                theme === "dark" ? "text-primary-light" : "text-primary-dark"
              }`}
            >
              Min: {todayStats?.min ? `${todayStats.min} °C` : "N/A"}
            </p>
            <p
              className={`text-base sm:text-lg ${
                theme === "dark" ? "text-primary-light" : "text-primary-dark"
              }`}
            >
              Max: {todayStats?.max ? `${todayStats.max} °C` : "N/A"}
            </p>
          </div>
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 p-2 bg-muted rounded text-xs">
              <div>Connected: {isConnected ? "Yes" : "No"}</div>
              <div>Streaming: {isStreaming ? "Yes" : "No"}</div>
              <div>Last Update: {lastUpdate?.toISOString() || "Never"}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuhuDashboard;