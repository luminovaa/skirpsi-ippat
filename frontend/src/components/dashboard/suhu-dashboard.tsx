import React, { useMemo, useState } from "react";
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
  const [temperatureClassification, setTemperatureClassification] = useState<
    string | null
  >(null);
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;

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
      setLoading(false);
      setError(null);
    },
    onMessage: (message: any) => {
      if (message.type === "latest_data") {
        setLatestSuhu(message.data.suhu);
        setTodayStats(message.data.suhuAvg);
        const currentTemp = message.data.suhu.temperature;
        setTemperatureClassification(classifyTemperature(currentTemp));
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
  
  useWebSocket(wsUrl, socketCallbacks);

  if (loading) {
    return (
      <div className="w-full sm:justify-center">
        <Card className="w-full sm:w-80 md:w-96 dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-7 w-32" /> {/* Judul "Temperature" */}
            <Skeleton className="h-6 w-16 rounded-full" /> {/* Badge LIVE/OFFLINE */}
          </CardHeader>
          <CardContent>
            <div className="flex flex-col pt-4 sm:pt-9 items-center">
              <Skeleton className="h-12 w-24 sm:h-14 sm:w-28" /> {/* Suhu (XX °C) */}
              <Skeleton className="mt-2 h-5 w-20" /> {/* Klasifikasi (Light/Medium/Dark) */}
            </div>
            <div className="mt-6 sm:mt-10 flex justify-between">
              <Skeleton className="h-5 w-16" /> {/* Min: XX °C */}
              <Skeleton className="h-5 w-16" /> {/* Max: XX °C */}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-lg text-destructive">{error}</p>
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