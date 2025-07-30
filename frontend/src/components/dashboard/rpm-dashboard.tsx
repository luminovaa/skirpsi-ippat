import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Pause, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebSocket } from "@/hooks/web-socket";
import { rpm } from "@/lib/type";

ChartJS.register(ArcElement, Tooltip, Legend);

const RPMDashboard = () => {
  const { theme } = useTheme();
  const [rpmData, setRpmData] = useState<rpm | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Fungsi untuk mengklasifikasi RPM
  const classifyRPM = (rpm: number) => {
    if (rpm <= 20) return "Low";
    if (rpm <= 40) return "Medium";
    return "High";
  };

  // Data untuk grafik Doughnut
  const chartData = {
    datasets: [
      {
        data: rpmData ? [rpmData.rpm, 200 - rpmData.rpm] : [0, 200],
        backgroundColor: ["#22c55e", "#e5e7eb"],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      },
    ],
  };

  const chartOptions = {
    cutout: "70%",
    plugins: {
      tooltip: { enabled: false },
      legend: { display: false },
    },
    maintainAspectRatio: false,
    responsive: true,
  };

  // Socket callbacks
  const socketCallbacks = useMemo(
    () => ({
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
          case "connection_established":
            console.log("Connection established:", message.clientId);
            break;
          case "latest_data":
            if (message.data?.rpm) {
              setRpmData(message.data.rpm);
              setLastUpdate(new Date());
            }
            break;
          case "stream_started":
            if (message.stream === "latest_data") {
              setIsStreaming(true);
              console.log("Latest data stream started");
            }
            break;
          case "stream_stopped":
            if (message.stream === "latest_data") {
              setIsStreaming(false);
              console.log("Latest data stream stopped");
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

  // Fungsi untuk memulai streaming data
  const startLatestDataStream = () => {
    const success = sendCommand({ type: "start_latest_data" });
    if (success) {
      console.log("Requesting to start latest data stream");
    }
  };

  // Fungsi untuk menghentikan streaming data
  const stopLatestDataStream = () => {
    const success = sendCommand({ type: "stop_latest_data" });
    if (success) {
      console.log("Requesting to stop latest data stream");
    }
  };

  // Fungsi untuk toggle streaming
  const handleToggleStream = () => {
    if (isStreaming) {
      stopLatestDataStream();
    } else {
      startLatestDataStream();
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
        stopLatestDataStream();
      }
    };
  }, [isStreaming]);

  // UI untuk loading state
  if (loading) {
    return (
      <div className="w-full sm:justify-center">
        <Card className="w-full sm:w-80 md:w-96 dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center pt-2">
              <Skeleton className="h-4 w-16 mb-4" />
              <div className="relative w-full max-w-[200px] h-[98px]">
                <Skeleton className="w-full h-full" />
              </div>
            </div>
            <div className="mt-10 flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
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
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center pt-2">
                <Skeleton className="h-4 w-16 mb-4" />
                <div className="relative w-full max-w-[200px] h-[98px]">
                  <Skeleton className="w-full h-full" />
                </div>
              </div>
              <div className="mt-10 flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
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
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg sm:text-xl">RPM</CardTitle>
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
          <div className="flex flex-col items-center pt-2">
            <p
              className={`
                text-sm sm:text-base
                ${theme === "dark" ? "text-primary-light" : "text-primary-dark"}
              `}
            >
              {rpmData ? classifyRPM(rpmData.rpm) : "N/A"}
            </p>
            <div className="relative w-full max-w-[200px] h-[160px]">
              <Doughnut data={chartData} options={chartOptions} />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-1 text-center">
                <p className="text-xl font-bold text-foreground sm:text-2xl">
                  {rpmData?.rpm ? `${rpmData.rpm} RPM` : "N/A"}
                </p>
              </div>
            </div>
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

export default RPMDashboard;