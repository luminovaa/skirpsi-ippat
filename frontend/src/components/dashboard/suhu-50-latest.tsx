import React, { useMemo, useState } from "react";
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";
import { useWebSocket } from "@/hooks/web-socket";
import { suhu } from "@/lib/type";

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

const TemperatureHistoryChart = () => {
  const { theme } = useTheme();
  const [temperatureHistory, setTemperatureHistory] = useState<suhu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;

  const socketCallbacks = useMemo(
    () => ({
      onOpen: () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
        setLoading(false);
        setError(null);
        // Request all historical data
        socket.current?.send(
          JSON.stringify({ type: "get_temperature_history" })
        );
      },
      onMessage: (message: any) => {
        console.log("Received message:", message);
        if (message.type === "temperature_history") {
          setTemperatureHistory(message.data); // Set all historical data
        } else if (message.type === "new_temperature") {
          setTemperatureHistory((prev) => [...prev, message.data]); // Append new data
        } else if (message.type === "latest_data") {
          setTemperatureHistory((prev) => [...prev, message.data.suhu]); // Append latest data
        }
      },
      onClose: () => {
        setIsConnected(false);
        setError("Disconnected from server.");
      },
      onError: () => {
        setError("Connection error. Please try again later.");
        setIsConnected(false);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { socket } = useWebSocket(wsUrl, socketCallbacks);

  // Chart data and options
  const data = {
    labels: temperatureHistory.map((item) => {
      const date = new Date(item.created_at);
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}.${String(date.getMilliseconds()).padStart(3, "0")}`;
    }),
    datasets: [
      {
        label: "Temperature (°C)",
        data: temperatureHistory.map((item) => item.temperature),
        fill: true,
        backgroundColor:
          theme === "dark"
            ? "rgba(37, 99, 235, 0.1)"
            : "rgba(37, 99, 235, 0.1)",
        borderColor:
          theme === "dark" ? "rgba(37, 99, 235, 1)" : "rgba(37, 99, 235, 1)",
        borderWidth: 2,
        pointRadius: 2,
        pointBackgroundColor:
          theme === "dark" ? "rgba(37, 99, 235, 1)" : "rgba(37, 99, 235, 1)",
        tension: 0.4,
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
          font: { size: 12 },
        },
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            return `${value.toFixed(1)}°C`;
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
          font: { size: 10 },
          maxTicksLimit: 20, // Limit the number of x-axis ticks to avoid clutter
          autoSkip: true, // Automatically skip labels to prevent overlap
        },
      },
      y: {
        grid: {
          color:
            theme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          display: true,
        },
        ticks: {
          color: theme === "dark" ? "#e4e4e7" : "#27272a",
          font: { size: 10 },
        },
        beginAtZero: false,
      },
    },
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
    // Enable scrolling or zooming for large datasets
    animation: {
      duration: 0, // Disable animations for smoother real-time updates
    },
  };

  if (loading) {
    return (
      <Card className="w-full dark:bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </CardHeader>
        <CardContent>
          <div className="h-64 w-64 md:h-[250px] md:w-[807px] relative">
            <Skeleton className="absolute top-0 left-0 h-full w-full" />
            {Array.from({ length: 10 }).map((_, index) => (
              <Skeleton
                key={index}
                className="absolute bottom-0 left-0 h-1/2 w-full"
                style={{
                  left: `${index * 10}%`,
                  width: "10%",
                  height: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full dark:bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl sm:text-2xl">
            Temperature History
          </CardTitle>
          <Badge variant="destructive">ERROR</Badge>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-52">
          <p className="text-lg text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full sm:justify-center">
      <Card className="dark:bg-zinc-900 px-4">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl sm:text-2xl">
            Temperature History
          </CardTitle>
          <Badge
            variant={isConnected ? "default" : "destructive"}
            className={isConnected ? "bg-green-500 text-white" : ""}
          >
            {isConnected ? "LIVE" : "OFFLINE"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-64 md:h-[250px] md:w-[807px]">
            {temperatureHistory.length > 0 ? (
              <Line data={data} options={options} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-lg text-muted-foreground">
                  No temperature data available
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemperatureHistoryChart;