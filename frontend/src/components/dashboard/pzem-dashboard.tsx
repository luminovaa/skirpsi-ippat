import React, { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { pzem } from "@/lib/type";
import { useWebSocket } from "@/hooks/web-socket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PzemDashboard = () => {
  const [latestPzem, setLatestPzem] = useState<pzem>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL!;

  const socketCallbacks = useMemo(() => ({
    onOpen: () => {
      console.log("WebSocket connection established");
      setIsConnected(true);
      setLoading(false);
      setError(null);
    },
    onMessage: (message: any) => {
      if (message.type === "latest_data") {
        setLatestPzem(message.data.pzem);
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
      <div className="w-full px-4">
        <Card className="w-full max-w-4xl mx-auto dark:bg-zinc-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-7 w-36" /> 
            <Skeleton className="h-6 w-16 rounded-full" /> 
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                    <Skeleton className="mb-1 h-4 w-16" /> 
                    <Skeleton className="h-8 w-20" /> 
                  </CardContent>
                </Card>
              ))}
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
    <div className="w-full ">
      <Card className="w-full max-w-4xl mx-auto dark:bg-zinc-900">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl sm:text-2xl">Power Usage</CardTitle>
          <Badge
            variant={isConnected ? "outline" : "destructive"}
            className={isConnected ? "bg-green-500 text-white" : ""}
          >
            {isConnected ? "LIVE" : "OFFLINE"}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Voltage
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.voltage ? `${latestPzem.voltage}V` : "N/A"}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Current
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.current ? `${latestPzem.current}A` : "N/A"}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Power
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.power ? `${latestPzem.power}W` : "N/A"}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Energy
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.energy ? `${latestPzem.energy}Wh` : "N/A"}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Frequency
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.frequency ? `${latestPzem.frequency}Hz` : "N/A"}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-3 sm:p-4">
                <span className="mb-1 text-xs sm:text-sm text-muted-foreground">
                  Power Factor
                </span>
                <span className="text-lg sm:text-xl font-bold text-foreground">
                  {latestPzem?.power_factor
                    ? `${latestPzem.power_factor}`
                    : "N/A"}
                </span>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PzemDashboard;
