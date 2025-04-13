import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const RealTimeClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
      setLoading(false);
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const formatTime = () => {
    const hours = currentTime.getHours().toString().padStart(2, "0");
    const minutes = currentTime.getMinutes().toString().padStart(2, "0");
    const seconds = currentTime.getSeconds().toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };
  
  const formatDate = () => {
    const day = currentTime.getDate().toString().padStart(2, "0");
    const month = (currentTime.getMonth() + 1).toString().padStart(2, "0");
    const year = currentTime.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  const getDayName = () => {
    const days = [
      "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"
    ];
    return days[currentTime.getDay()];
  };
  
  if (loading) {
    return (
      <Card className="w-full dark:bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl sm:text-2xl flex flex-col items-start gap-1">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-24" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full dark:bg-zinc-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl sm:text-2xl flex flex-col items-start gap-1">
          <div className="flex flex-col gap-1">
            <div className="text-xl font-semibold">
              {getDayName()}
            </div>
            <div className="text-base text-muted-foreground">
              {formatDate()}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-blue-500 font-mono text-xl">{formatTime()}</span>
      </CardContent>
    </Card>
  );
};

export default RealTimeClock;