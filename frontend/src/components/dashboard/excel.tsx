import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

export const DownloadExcel = () => {
  const [filterType, setFilterType] = useState<string>("hour");
  const [hour, setHour] = useState<string>("");
  const [minute, setMinute] = useState<string>("");
  const [startHour, setStartHour] = useState<string>("");
  const [endHour, setEndHour] = useState<string>("");
  const [startMinute, setStartMinute] = useState<string>("");
  const [endMinute, setEndMinute] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast()

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      let params: any = {};
      let filename = "Analisis.xlsx";

      switch (filterType) {
        case "hour":
          if (!hour) throw new Error("Please select an hour");
          params.hour = hour;
          if (minute && minute !== "all") {
            params.minute = minute;
            filename = `Analisis_${hour.padStart(2, "0")}-${minute.padStart(2, "0")}.xlsx`;
          } else {
            filename = `Analisis_hour_${hour}.xlsx`;
          }
          break;
        case "hourRange":
          if (!startHour || !endHour)
            throw new Error("Please select start and end hours");
          params.startHour = startHour;
          params.endHour = endHour;
          if (startMinute && endMinute && startMinute !== "all" && endMinute !== "all") {
            params.startMinute = startMinute;
            params.endMinute = endMinute;
            filename = `Analisis_${startHour.padStart(2, "0")}-${startMinute.padStart(2, "0")}_to_${endHour.padStart(2, "0")}-${endMinute.padStart(2, "0")}.xlsx`;
          } else {
            filename = `Analisis_${startHour}-${endHour}.xlsx`;
          }
          break;
        case "hourMinute":
          if (!hour || !minute) throw new Error("Please select hour and minute");
          params.hour = hour;
          params.minute = minute;
          filename = `Analisis_${hour.padStart(2, "0")}-${minute.padStart(2, "0")}.xlsx`;
          break;
        case "minuteRange":
          if (!hour || !startMinute || !endMinute)
            throw new Error("Please select hour, start minute, and end minute");
          params.hour = hour;
          params.startMinute = startMinute;
          params.endMinute = endMinute;
          filename = `Analisis_${hour.padStart(2, "0")}_${startMinute.padStart(2, "0")}-${endMinute.padStart(2, "0")}.xlsx`;
          break;
        case "date":
          if (!date) throw new Error("Please select a date");
          params.date = format(date, "yyyy-MM-dd");
          filename = `Ahhh_${format(date, "yyyy-MM-dd")}.xlsx`;
          break;
        case "dateRange":
          if (!startDate || !endDate)
            throw new Error("Please select start and end dates");
          params.startDate = format(startDate, "yyyy-MM-dd");
          params.endDate = format(endDate, "yyyy-MM-dd");
          filename = `Ahhh_${format(startDate, "yyyy-MM-dd")}_to_${format(
            endDate,
            "yyyy-MM-dd"
          )}.xlsx`;
          break;
        default:
          throw new Error("Invalid filter type");
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/suhu/download-excel`,
        {
          params,
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Excel file downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "Failed to download Excel file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderFilterInputs = () => {
    switch (filterType) {
      case "hour":
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="hour">Hour</Label>
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger id="hour">
                  <SelectValue placeholder="Select hour" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "hourRange":
        return (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="startHour">Start Hour</Label>
                <Select value={startHour} onValueChange={setStartHour}>
                  <SelectTrigger id="startHour">
                    <SelectValue placeholder="Select start hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endHour">End Hour</Label>
                <Select value={endHour} onValueChange={setEndHour}>
                  <SelectTrigger id="endHour">
                    <SelectValue placeholder="Select end hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      case "hourMinute":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="hourMinute">Hour</Label>
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger id="hourMinute">
                  <SelectValue placeholder="Select hour" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minuteSpecific">Minute</Label>
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger id="minuteSpecific">
                  <SelectValue placeholder="Select minute" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 60 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i.toString().padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "minuteRange":
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="hourForMinutes">Hour</Label>
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger id="hourForMinutes">
                  <SelectValue placeholder="Select hour" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {i.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="startMinuteRange">Start Minute</Label>
                <Select value={startMinute} onValueChange={setStartMinute}>
                  <SelectTrigger id="startMinuteRange">
                    <SelectValue placeholder="Select start minute" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 60 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endMinuteRange">End Minute</Label>
                <Select value={endMinute} onValueChange={setEndMinute}>
                  <SelectTrigger id="endMinuteRange">
                    <SelectValue placeholder="Select end minute" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 60 }, (_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {i.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      case "date":
        return (
          <div className="grid gap-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );
      case "dateRange":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Download Temperature Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="filterType">Filter Type</Label>
            <Select
              value={filterType}
              onValueChange={(value) => {
                setFilterType(value);
                setHour("");
                setMinute("");
                setStartHour("");
                setEndHour("");
                setStartMinute("");
                setEndMinute("");
                setDate(undefined);
                setStartDate(undefined);
                setEndDate(undefined);
              }}
            >
              <SelectTrigger id="filterType">
                <SelectValue placeholder="Select filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Specific Hour</SelectItem>
                <SelectItem value="hourRange">Hour Range</SelectItem>
                <SelectItem value="hourMinute">Specific Hour & Minute</SelectItem>
                <SelectItem value="minuteRange">Minute Range (in Hour)</SelectItem>
                <SelectItem value="date">Specific Date</SelectItem>
                <SelectItem value="dateRange">Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {renderFilterInputs()}
          <Button
            onClick={handleDownload}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Downloading..." : "Download Excel"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};