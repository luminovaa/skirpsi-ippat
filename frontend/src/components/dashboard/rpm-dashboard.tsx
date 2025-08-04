import React, { useState, useEffect, useMemo } from "react";
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
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;

  const socketCallbacks = useMemo(
    () => ({
      onOpen: () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
        setLoading(false);
        setError(null);
      },
      onMessage: (message: any) => {
        if (message.type === "latest_data") {
          setRpmData(message.data.rpm);
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
    }),
    []
  );

  useWebSocket(wsUrl, socketCallbacks);

  const classifyRPM = (rpm: number) => {
    if (rpm <= 20) return "Low";
    if (rpm <= 40) return "Medium";
    return "High";
  };

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
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-lg sm:text-xl">RPM</CardTitle>
          <Badge
            variant={isConnected ? "default" : "destructive"}
            className={isConnected ? "bg-green-500 text-white" : ""}
          >
            {isConnected ? "LIVE" : "OFFLINE"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center pt-2">
            <p
              className={`
                 text-sm sm:text-base
                ${theme === "dark" ? "text-primary-light" : "text-primary-dark"}
              `}
            >
              {rpmData ? classifyRPM(rpmData.rpm) : ""}
            </p>
            <div className="relative w-full max-w-[200px] h-[160px]">
              <Doughnut data={chartData} options={chartOptions} />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-1 text-center">
                <p className="text-xl font-bold text-foreground sm:text-2xl">
                  {rpmData?.rpm} RPM
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RPMDashboard;
