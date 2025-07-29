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
import { Button } from "@/components/ui/button";
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
  const [activeFilter, setActiveFilter] = useState<string>('1h');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataConfig, setDataConfig] = useState<any>(null);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;

  // Filter options
  const timeFilters = [
    { value: '1h', label: '1 Jam', interval: '10 detik' },
    { value: '3h', label: '3 Jam', interval: '30 detik' },
    { value: '6h', label: '6 Jam', interval: '1 menit' },
    { value: '12h', label: '12 Jam', interval: '5 menit' },
    { value: '1d', label: '1 Hari', interval: '15 menit' },
    { value: '3d', label: '3 Hari', interval: '45 menit' },
    { value: '1w', label: '1 Minggu', interval: '1.5 jam' }
  ];

  const socketCallbacks = useMemo(
    () => ({
      onOpen: () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
        setLoading(false);
        setError(null);
        // Request temperature history with default filter
        socket.current?.send(
          JSON.stringify({ 
            type: "get_temperature_history",
            timeFilter: activeFilter
          })
        );
      },
      onMessage: (message: any) => {
        console.log("Received message:", message);
        if (message.type === "temperature_history") {
          setTemperatureHistory(message.data);
          setDataConfig(message.config);
          setLastUpdated(new Date());
        } else if (message.type === "temperature_history_error") {
          setError(message.error);
        } else if (message.type === "new_temperature") {
          // Only add new data if we're on real-time filter (1h)
          if (activeFilter === '1h') {
            setTemperatureHistory((prev) => [...prev, message.data]);
            setLastUpdated(new Date());
          }
        } else if (message.type === "latest_data") {
          // Only add latest data if we're on real-time filter (1h)
          if (activeFilter === '1h') {
            setTemperatureHistory((prev) => [...prev, message.data.suhu]);
            setLastUpdated(new Date());
          }
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
    [activeFilter]
  );

  const { socket } = useWebSocket(wsUrl, socketCallbacks);

  // Handle filter change
  const handleFilterChange = (filterValue: string) => {
    setActiveFilter(filterValue);
    setLoading(true);
    
    // Request new data with selected filter
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({ 
          type: "get_temperature_history",
          timeFilter: filterValue
        })
      );
    }
  };

  // Get current filter info
  const currentFilter = timeFilters.find(f => f.value === activeFilter);

  // Chart data and options
  const data = {
    labels: temperatureHistory.map(() => ""), // Empty labels
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
            const dataPoint = temperatureHistory[context.dataIndex];
            const date = new Date(dataPoint.created_at);
            const timeString = `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
            return [`${value.toFixed(1)}°C`, `Waktu: ${timeString}`];
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
          display: false, // Hide x-axis labels
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
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {timeFilters.map((filter) => (
                <Skeleton key={filter.value} className="h-8 w-16" />
              ))}
            </div>
          </div>
          <div className="h-64 w-64 md:h-[250px] md:w-[807px] relative">
            <Skeleton className="absolute top-0 left-0 h-full w-full" />
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
          {/* Time Filter Buttons */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {timeFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={activeFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange(filter.value)}
                  className="text-xs"
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Chart */}
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

          {/* Data Info */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>
                Data diperbarui setiap: <strong>{currentFilter?.interval}</strong>
              </span>
              <span>
                Total data: <strong>{temperatureHistory.length}</strong>
              </span>
            </div>
            <div className="flex items-center gap-4">
              {dataConfig && (
                <span>
                  Periode: <strong>{dataConfig.period}</strong>
                </span>
              )}
              {lastUpdated && (
                <span>
                  Terakhir diperbarui: <strong>{lastUpdated.toLocaleTimeString('id-ID')}</strong>
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemperatureHistoryChart;