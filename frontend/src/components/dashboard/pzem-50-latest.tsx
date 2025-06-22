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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;

  const socketCallbacks = useMemo(
    () => ({
      onOpen: () => {
        console.log("WebSocket connection established");
        setIsConnected(true);
        setLoading(false);
        setError(null);
        // Minta data awal
        socket.current?.send(
          JSON.stringify({ type: "get_pzem_history", limit: 50 })
        );
      },
      onMessage: (message: any) => {
        console.log("Received message:", message);
        if (message.type === "pzem_history") {
          setPzemHistory(message.data);
        } else if (message.type === "new_pzem") {
          setPzemHistory((prev) => [...prev, message.data].slice(-50));
        } else if (message.type === "latest_data") {
          setPzemHistory((prev) => [...prev, message.data.pzem].slice(-50));
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

  if (loading) {
    return (
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
    );
  }
  if (error) {
    return (
      <Card className="w-full dark:bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl sm:text-2xl">PZEM History</CardTitle>
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
            PZEM Monitoring History
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
        </CardContent>
      </Card>
    </div>
  );
};

export default PzemHistoryChart;
