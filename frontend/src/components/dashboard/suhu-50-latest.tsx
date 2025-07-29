import React, { useMemo, useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const timeFilters = [
  { value: '1h', label: '1 Hour', interval: '10s' },
  { value: '3h', label: '3 Hours', interval: '30s' },
  { value: '6h', label: '6 Hours', interval: '1m' },
  { value: '12h', label: '12 Hours', interval: '5m' },
  { value: '1d', label: '1 Day', interval: '15m' },
  { value: '3d', label: '3 Days', interval: '45m' },
  { value: '1w', label: '1 Week', interval: '1.5h' },
];

const TemperatureHistoryChart = () => {
  const { theme } = useTheme();
  const [temperatureHistory, setTemperatureHistory] = useState<suhu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [timeFilter, setTimeFilter] = useState('1h');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;

  const socketCallbacks = useMemo(
    () => ({
      onOpen: () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
        setLoading(false);
        setError(null);
        // Request historical data with current filter
        socket.current?.send(
          JSON.stringify({ 
            type: "get_temperature_history",
            filter: timeFilter 
          })
        );
      },
      onMessage: (message: any) => {
        if (message.type === "temperature_history") {
          setTemperatureHistory(message.data);
          setLastUpdated(new Date().toLocaleTimeString());
        } else if (message.type === "new_temperature") {
          setTemperatureHistory((prev) => [...prev.slice(-1000), message.data]);
          setLastUpdated(new Date().toLocaleTimeString());
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
    [timeFilter]
  );

  const { socket } = useWebSocket(wsUrl, socketCallbacks);

  useEffect(() => {
    // When filter changes, request new data
    if (socket?.current?.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({ 
          type: "get_temperature_history",
          filter: timeFilter 
        })
      );
    }
  }, [timeFilter, socket]);

  // Chart data and options
  const data = {
    labels: temperatureHistory.map((_, index) => ""), // Empty labels
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
        pointRadius: 0, // Remove points for cleaner look
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
          title: (context: any) => {
            const dataIndex = context[0].dataIndex;
            const date = new Date(temperatureHistory[dataIndex].created_at);
            return date.toLocaleString();
          },
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
          display: false, // Hide x-axis grid lines
        },
        ticks: {
          display: false, // Hide x-axis labels completely
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
    animation: {
      duration: 0,
    },
  };

  const currentFilter = timeFilters.find(f => f.value === timeFilter);

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
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <div className="flex flex-col space-y-1.5">
            <CardTitle className="text-xl sm:text-2xl">
              Temperature History
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Select 
                value={timeFilter} 
                onValueChange={setTimeFilter}
              >
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  {timeFilters.map((filter) => (
                    <SelectItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge
                variant={isConnected ? "default" : "destructive"}
                className={isConnected ? "bg-green-500 text-white" : ""}
              >
                {isConnected ? "LIVE" : "OFFLINE"}
              </Badge>
            </div>
          </div>
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
          <div className="mt-2 text-sm text-muted-foreground flex justify-between items-center">
            <span>
              {currentFilter && `Data aggregated every ${currentFilter.interval}`}
            </span>
            {lastUpdated && (
              <span>Last updated: {lastUpdated}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemperatureHistoryChart;