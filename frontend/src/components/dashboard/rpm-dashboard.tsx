import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebSocket } from "@/hooks/web-socket";
import { rpm } from "@/lib/type";

ChartJS.register(ArcElement, Tooltip, Legend);

const RPMDashboard = () => {
  const { theme } = useTheme();
  const [rpmData, setRpmData] = useState<rpm | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [wsReady, setWsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;

  // Function to send messages to WebSocket
  const sendMessage = useCallback((socket: WebSocket | null, message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('Sending RPM message:', message);
      socket.send(JSON.stringify(message));
      return true;
    }
    console.warn('RPM Socket not ready, message not sent:', message);
    return false;
  }, []);

  const socketCallbacks = useMemo(() => ({
    onOpen: (socket: WebSocket) => {
      console.log("RPM WebSocket connection established");
      setIsConnected(true);
      setWsReady(true);
      setError(null);
      
      // Immediately request latest data
      sendMessage(socket, { type: 'start_latest_data' });
    },
    onMessage: (message: any) => {
      console.log('RPM Received message:', message);
      
      switch (message.type) {
        case 'connection_established':
          console.log('RPM Connection established with client ID:', message.clientId);
          // Automatically request data when connection is established
          if (socket && socket.current) {
            sendMessage(socket.current, { type: 'start_latest_data' });
          }
          break;
          
        case 'latest_data':
          console.log('RPM Latest data received:', message.data);
          if (message.data && message.data.rpm) {
            setRpmData(message.data.rpm);
          }
          setLoading(false);
          break;
          
        case 'stream_started':
          console.log(`RPM Stream started: ${message.stream}`);
          if (message.stream === 'latest_data') {
            setLoading(false);
          }
          break;
          
        case 'stream_stopped':
          console.log(`RPM Stream stopped: ${message.stream}`);
          break;
          
        case 'error':
          console.error('RPM WebSocket error message:', message.message);
          setError(`Server error: ${message.message}`);
          break;
          
        default:
          console.log('RPM Unknown message type:', message.type);
          break;
      }
    },
    onClose: () => {
      console.log("RPM WebSocket connection closed");
      setIsConnected(false);
      setWsReady(false);
      setError("Disconnected from server. Reconnecting...");
    },
    onError: (error: Event) => {
      console.error("RPM WebSocket error:", error);
      setError("Connection error. Trying to reconnect...");
      setIsConnected(false);
      setWsReady(false);
    },
  }), [sendMessage]);

  const { socket } = useWebSocket(wsUrl, socketCallbacks);

  const classifyRPM = (rpm: number) => {
    if (rpm <= 20) return "Low";
    if (rpm <= 40) return "Medium";
    return "High";
  };

  const getRPMColor = (rpm: number) => {
    if (rpm <= 20) return "#22c55e"; // Green for low
    if (rpm <= 40) return "#eab308"; // Yellow for medium
    return "#ef4444"; // Red for high
  };

  const chartData = {
    datasets: [
      {
        data: rpmData ? [rpmData.rpm, Math.max(0, 100 - rpmData.rpm)] : [0, 100],
        backgroundColor: [
          rpmData ? getRPMColor(rpmData.rpm) : "#22c55e",
          theme === "dark" ? "#374151" : "#e5e7eb"
        ],
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
                <Skeleton className="w-full h-full rounded-full" />
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

  if (error && !isConnected) {
    return (
      <div className="w-full sm:justify-center">
        <Card className="w-full sm:w-80 md:w-96 dark:bg-zinc-900">
          <CardHeader>
            <CardTitle className="text-lg text-center text-destructive">
              Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-center text-muted-foreground">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Reload
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full sm:justify-center">
      <Card className="w-full sm:w-80 md:w-96 dark:bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-lg sm:text-xl">RPM Monitor</CardTitle>
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
          <div className="flex flex-col items-center pt-2">
            <p
              className={`
                text-sm sm:text-base font-medium mb-2
                ${rpmData ? (
                  rpmData.rpm <= 20 ? "text-green-500" :
                  rpmData.rpm <= 40 ? "text-yellow-500" : "text-red-500"
                ) : "text-muted-foreground"}
              `}
            >
              {rpmData ? classifyRPM(rpmData.rpm) : "No Data"}
            </p>
            <div className="relative w-full max-w-[200px] h-[160px]">
              <Doughnut data={chartData} options={chartOptions} />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-1 text-center">
                <p className="text-xl font-bold text-foreground sm:text-2xl">
                  {rpmData?.rpm ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">RPM</p>
              </div>
            </div>
          </div>
          
          {/* RPM Range Indicators */}
          <div className="mt-6 flex justify-between text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-muted-foreground">Low (≤20)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-muted-foreground">Med (21-40)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-muted-foreground">High (&gt;40)</span>
            </div>
          </div>

          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-2 bg-muted rounded text-xs">
              <p>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
              <p>WebSocket Ready: {wsReady ? 'Yes' : 'No'}</p>
              <p>Last RPM: {rpmData?.rpm ?? 'None'}</p>
              <p>Last Update: {rpmData?.created_at ? new Date(rpmData.created_at).toLocaleTimeString() : 'None'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RPMDashboard;