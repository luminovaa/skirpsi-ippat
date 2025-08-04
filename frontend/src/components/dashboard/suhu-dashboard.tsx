import React, { useMemo, useState, useEffect } from "react";
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
  const [dataReceived, setDataReceived] = useState(false);
  const [temperatureClassification, setTemperatureClassification] = useState<
    string | null
  >(null);
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;

  // Set up timeout for data receipt
  useEffect(() => {
    if (loading) {
      const timeoutId = setTimeout(() => {
        if (!dataReceived) {
          setLoading(false);
          setError("Server error: Contact us u admin for help.");
        }
      }, 10000); // 10 seconds timeout

      // Clean up function
      return () => clearTimeout(timeoutId);
    }
  }, [loading, dataReceived]);

  const classifyTemperature = (temp: number) => {
    if (temp <= 170) {
      return "Light";
    } else if (temp > 170 && temp < 240) {
      return "Medium";
    } else {
      return "Dark";
    }
  };

  const socketCallbacks = useMemo(() => ({
    onOpen: () => {
      console.log("WebSocket connection established");
      setIsConnected(true);
      setLoading(true);
      setError(null);

      socket.current?.send(
        JSON.stringify({ type: "get_realtime_data" })
      );
      // Keep loading true until we actually receive data
    },
    onMessage: (message: any) => {
      if (message.type === "latest_data") {
        setLatestSuhu(message.data.suhu);
        setTodayStats(message.data.suhuAvg);
        const currentTemp = message.data.suhu.temperature;
        setTemperatureClassification(classifyTemperature(currentTemp));
        setDataReceived(true);
        setLoading(false);
        setError(null);
      }
    },
    onClose: () => {
      setIsConnected(false);
      setError("Disconnected from server. Reconnecting...");
    },
    onError: (error: Event) => {
      console.error("WebSocket error:", error);
      setError("Connection error. Trying to reconnect...");
      setIsConnected(false);
    },
  }), []);
  
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

  if (error) {
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
              <CardTitle className="text-xl sm:text-2xl text-destructive">Error</CardTitle>
              <Badge variant="destructive">OFFLINE</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col pt-4 items-center">
                <p className="text-lg text-destructive text-center">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Retry
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
          <Badge
            variant={isConnected ? "default" : "destructive"}
            className={isConnected ? "bg-green-500 text-white" : ""}
          >
            {isConnected ? "LIVE" : "OFFLINE"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col pt-4 sm:pt-9 items-center">
            <p className="text-4xl sm:text-5xl font-bold text-foreground">
              {latestSuhu?.temperature} °C
            </p>
            <p
              className={`mt-2 text-base sm:text-lg ${
                theme === "dark" ? "text-primary-light" : "text-primary-dark"
              }`}
            >
              {temperatureClassification}
            </p>
          </div>
          <div className="mt-6 sm:mt-10 flex justify-between">
            <p
              className={`text-base sm:text-lg ${
                theme === "dark" ? "text-primary-light" : "text-primary-dark"
              }`}
            >
              Min: {todayStats?.min} °C
            </p>
            <p
              className={`text-base sm:text-lg ${
                theme === "dark" ? "text-primary-light" : "text-primary-dark"
              }`}
            >
              Max: {todayStats?.max} °C
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuhuDashboard;