import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Pause, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";
import { useWebSocket } from "@/hooks/web-socket";
import { pzem } from "@/lib/type";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PzemHistoryChart = () => {
  const { theme } = useTheme();
  const [pzemHistory, setPzemHistory] = useState<pzem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Socket callbacks
  const socketCallbacks = useMemo(
    () => ({
      onOpen: (ws: WebSocket) => {
        console.log("WebSocket connection established");
        wsRef.current = ws;
        setIsConnected(true);
        setLoading(false);
        setError(null);
        // Auto-start pzem history stream when connected
        startPzemHistoryStream();
      },
      onMessage: (message: any) => {
        console.log("Received message:", message);
        switch (message.type) {
          case "connection_established":
            console.log("Connection established:", message.clientId);
            break;
          case "pzem_history":
            setPzemHistory(message.data);
            setLastUpdate(new Date());
            break;
          case "new_pzem":
          case "latest_data":
            if (message.data?.pzem) {
              setPzemHistory((prev) => [...prev, message.data.pzem].slice(-50));
              setLastUpdate(new Date());
            }
            break;
          case "stream_started":
            if (message.stream === "pzem_history") {
              setIsStreaming(true);
              console.log("Pzem history stream started");
            }
            break;
          case "stream_stopped":
            if (message.stream === "pzem_history") {
              setIsStreaming(false);
              console.log("Pzem history stream stopped");
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
  const { socket, sendMessage, reconnect } = useWebSocket(wsUrl, socketCallbacks);

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

  // Fungsi untuk memulai streaming riwayat PZEM
  const startPzemHistoryStream = () => {
    const success = sendCommand({ type: "start_pzem_history", limit: 50 });
    if (success) {
      console.log("Requesting to start pzem history stream");
    }
  };

  // Fungsi untuk menghentikan streaming riwayat PZEM
  const stopPzemHistoryStream = () => {
    const success = sendCommand({ type: "stop_pzem_history" });
    if (success) {
      console.log("Requesting to stop pzem history stream");
    }
  };

  // Fungsi untuk toggle streaming
  const handleToggleStream = () => {
    if (isStreaming) {
      stopPzemHistoryStream();
    } else {
      startPzemHistoryStream();
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
        stopPzemHistoryStream();
      }
    };
  }, [isStreaming]);

  // Chart data and options
  const data = {
    labels: pzemHistory.map((item) => {
      const date = new Date(item.created_at);
      return `${date.getHours()}:${String(date.getMinutes()).padStart(
        2,
        "0"
      )}:${String(date.getSeconds()).padStart(2, "0")}.${String(
        date.getMilliseconds()
      ).padStart(3, "0")}`;
    }),
    datasets: [
      {
        label: "Voltage (V)",
        data: pzemHistory.map((item) => item.voltage),
        fill: false,
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.4,
        yAxisID: "y1",
      },
      {
        label: "Current (A)",
        data: pzemHistory.map((item) => item.current),
        fill: false,
        backgroundColor: "rgba(54, 162, 235, 0.5)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.4,
        yAxisID: "y1",
      },
      {
        label: "Power (W)",
        data: pzemHistory.map((item) => item.power),
        fill: false,
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.4,
        yAxisID: "y1",
      },
      {
        label: "Energy (Wh)",
        data: pzemHistory.map((item) => item.energy),
        fill: false,
        backgroundColor: "rgba(153, 102, 255, 0.5)",
        borderColor: "rgba(153, 102, 255, 1)",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.4,
        yAxisID: "y2",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: theme === "dark" ? "#e4e4e7" : "#27272a",
          boxWidth: 12,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              const value = context.parsed.y;
              if (label.includes("Voltage")) {
                label += `${value.toFixed(1)} V`;
              } else if (label.includes("Current")) {
                label += `${value.toFixed(3)} A`;
              } else if (label.includes("Power")) {
                label += `${value.toFixed(1)} W`;
              } else if (label.includes("Energy")) {
                label += `${value.toFixed(1)} Wh`;
              }
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color:
            theme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          display: true,
        },
        ticks: {
          color: theme === "dark" ? "#e4e4e7" : "#27272a",
          font: {
            size: 10,
          },
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        grid: {
          color:
            theme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          display: true,
        },
        ticks: {
          color: theme === "dark" ? "#e4e4e7" : "#27272a",
          font: {
            size: 10,
          },
        },
      },
      y2: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        grid: {
          drawOnChartArea: false,
          color:
            theme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: theme === "dark" ? "#e4e4e7" : "#27272a",
          font: {
            size: 10,
          },
        },
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  };

  // UI untuk loading state
  if (loading) {
    return (
      <div className="w-full sm:justify-center">
        <Card className="w-full dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </CardHeader>
          <CardContent>
            <div className="h-64 w-64 md:h-[250px] md:w-[807px] relative">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="absolute bottom-0 left-0 h-1/2 w-full"
                  style={{
                    left: `${index * 25}%`,
                    width: "25%",
                    height: `${Math.random() * 100}%`,
                  }}
                />
              ))}
              <Skeleton className="absolute top-0 left-0 h-full w-full" />
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
          <Card className="w-full dark:bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="h-64 w-64 md:h-[250px] md:w-[807px] relative">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="absolute bottom-0 left-0 h-1/2 w-full"
                    style={{
                      left: `${index * 25}%`,
                      width: "25%",
                      height: `${Math.random() * 100}%`,
                    }}
                  />
                ))}
                <Skeleton className="absolute top-0 left-0 h-full w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Card className="w-full h-full bg-transparent border-0">
            <CardHeader className="flex flex-row pt-12 items-center justify-between pb-2">
              <CardTitle className="text-xl sm:text-2xl text-destructive">
                Error
              </CardTitle>
              <Badge variant="destructive">OFFLINE</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col pt-4 items-center">
                <p className="text-lg text-destructive text-center">{error}</p>
                <Button
                  onClick={handleReconnect}
                  variant="outline"
                  className="mt-4"
                >
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
      <Card className="w-full dark:bg-zinc-900 px-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-xl sm:text-2xl">
              PZEM Monitoring History
            </CardTitle>
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
          <div className="h-64 w-64 md:h-[250px] md:w-[807px]">
            {pzemHistory.length > 0 ? (
              <Line data={data} options={options} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-lg text-muted-foreground">
                  No PZEM data available
                </p>
              </div>
            )}
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

export default PzemHistoryChart;