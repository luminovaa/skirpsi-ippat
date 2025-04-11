import React, { useState } from "react";
import { useTheme } from "next-themes";
import { pzem } from "@/lib/type";
import { useWebSocket } from "@/hooks/web-socket";

const PzemDashboard = () => {
  const { theme } = useTheme();
  const [latestPzem, setLatestPzem] = useState<pzem>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Colors based on theme (simplified from the original)
  const colors = {
    background: theme === "dark" ? "#1a1a1a" : "#f8f9fa",
    card: theme === "dark" ? "#2a2a2a" : "#ffffff",
    text: theme === "dark" ? "#ffffff" : "#000000",
    textSecondary: theme === "dark" ? "#a0a0a0" : "#6c757d",
    primary: "#007bff",
    success: "#28a745",
    danger: "#dc3545",
  };

  // Gunakan hook useWebSocket
  useWebSocket({
    onOpen: () => {
      setIsConnected(true);
      setLoading(false);
    },
    onMessage: (message) => {
      if (message.type === 'latest_data') {
        setLatestPzem(message.data.pzem);
      }
    },
    onClose: () => {
      setIsConnected(false);
      setError('Disconnected from server');
    },
    onError: () => {
      setError('Connection error');
      setIsConnected(false);
    }
  });

  if (loading) {
    return (
      <div className="flex flex-1 justify-center items-center h-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 justify-center items-center h-screen bg-background">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 justify-center items-center p-5 min-h-screen" 
         style={{ backgroundColor: colors.background }}>
      <div className="w-full max-w-md rounded-lg p-4 shadow"
           style={{ backgroundColor: colors.card }}>
        
        <div className="flex justify-between items-center mb-4 pb-2">
          <h2 className="text-2xl" style={{ color: colors.text }}>Power Usage</h2>
          <div className="px-2 py-1 rounded-full text-xs" 
               style={{ backgroundColor: isConnected ? colors.success : colors.danger }}>
            <span className="text-white">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col items-center justify-center p-4 rounded-lg"
               style={{ backgroundColor: `${colors.primary}10` }}>
            <span className="text-sm mb-1" style={{ color: colors.textSecondary }}>Voltage</span>
            <span className="text-xl font-bold" style={{ color: colors.text }}>
              {latestPzem?.voltage ? `${latestPzem.voltage}V` : "N/A"}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 rounded-lg"
               style={{ backgroundColor: `${colors.primary}10` }}>
            <span className="text-sm mb-1" style={{ color: colors.textSecondary }}>Current</span>
            <span className="text-xl font-bold" style={{ color: colors.text }}>
              {latestPzem?.current ? `${latestPzem.current}A` : "N/A"}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center justify-center p-4 rounded-lg"
               style={{ backgroundColor: `${colors.primary}10` }}>
            <span className="text-sm mb-1" style={{ color: colors.textSecondary }}>Power</span>
            <span className="text-xl font-bold" style={{ color: colors.text }}>
              {latestPzem?.power ? `${latestPzem.power}W` : "N/A"}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 rounded-lg"
               style={{ backgroundColor: `${colors.primary}10` }}>
            <span className="text-sm mb-1" style={{ color: colors.textSecondary }}>Energy</span>
            <span className="text-xl font-bold" style={{ color: colors.text }}>
              {latestPzem?.energy ? `${latestPzem.energy}Wh` : "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PzemDashboard;