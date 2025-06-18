import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../../../utils/async_handler";
import { responseData, responseMessage } from "../../../utils/respone_handler";
import { Request, Response } from "express";
import { format, toZonedTime } from "date-fns-tz";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

const getAllSuhu = asyncHandler(async (req: Request, res: Response<any, Record<string, any>>): Promise<void> => {
    try {
        const data = await prisma.suhu.findMany();
        responseData(res, 200, "Success", data);
    } catch (error) {
        console.error("Error fetching data: ", error);
        responseMessage(res, 500, "Terjadi kesalahan pada server");
    }
});

const getAverageSuhuToday = asyncHandler(async (req: Request, res: Response<any, Record<string, any>>): Promise<void> => {
    try {
        const timeZone = 'Asia/Jakarta';
        
        const now = toZonedTime(new Date(), timeZone);
        
        const startOfDayWIB = startOfDay(now);
        const endOfDayWIB = endOfDay(now);
        
        const data = await prisma.suhu.aggregate({
            _avg: {
                temperature: true
            },
            _min: {
                temperature: true
            },
            _max: {
                temperature: true
            },
            where: {
                created_at: {
                    gte: startOfDayWIB,
                    lt: endOfDayWIB,
                },
            },
        });

        console.log("Start of Day (WIB):", startOfDayWIB);
        console.log("End of Day (WIB):", endOfDayWIB);
        
        const result = {
            average: data._avg.temperature,
            min: data._min.temperature,
            max: data._max.temperature
        };

        responseData(res, 200, "Success", result);
    } catch (error) {
        console.error("Error fetching data: ", error);
        responseMessage(res, 500, "Terjadi kesalahan pada server");
    }
});

const getLatestSuhu = asyncHandler(async (req: Request, res: Response<any, Record<string, any>>): Promise<void> => {
    try {
        const data = await prisma.suhu.findFirst({
            orderBy: {
                created_at: 'desc'
            }
        })

        if (!data) {
            responseMessage(res, 404, "Data tidak ditemukan");
        } else {
            responseData(res, 200, "Success", data);
        }
    } catch (error) {
        console.error("Error fetching data: ", error);
        responseMessage(res, 500, "Terjadi kesalahan pada server");
    }
});


const downloadSuhuExcel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { hour, startHour, endHour, minute, startMinute, endMinute, date, startDate, endDate } = req.query;
    const timeZone = "Asia/Jakarta";
    let whereClause: any = {};

    const now = toZonedTime(new Date(), timeZone);

    // Filter berdasarkan menit spesifik (dalam jam tertentu) - TODAY
    if (hour && minute && !startMinute && !endMinute) {
      const parsedHour = parseInt(hour as string);
      const parsedMinute = parseInt(minute as string);
      if (
        isNaN(parsedHour) || parsedHour < 0 || parsedHour > 23 ||
        isNaN(parsedMinute) || parsedMinute < 0 || parsedMinute > 59
      ) {
        responseMessage(res, 400, "Invalid hour or minute parameter");
        return;
      }
      const startOfMinute = new Date(now);
      startOfMinute.setHours(parsedHour, parsedMinute, 0, 0);
      const endOfMinute = new Date(now);
      endOfMinute.setHours(parsedHour, parsedMinute, 59, 999);

      whereClause.created_at = {
        gte: startOfMinute,
        lte: endOfMinute,
      };
    }

    // Filter berdasarkan range menit (dalam jam tertentu) - TODAY
    else if (hour && startMinute && endMinute) {
      const parsedHour = parseInt(hour as string);
      const parsedStartMinute = parseInt(startMinute as string);
      const parsedEndMinute = parseInt(endMinute as string);
      if (
        isNaN(parsedHour) || parsedHour < 0 || parsedHour > 23 ||
        isNaN(parsedStartMinute) || parsedStartMinute < 0 || parsedStartMinute > 59 ||
        isNaN(parsedEndMinute) || parsedEndMinute < 0 || parsedEndMinute > 59 ||
        parsedStartMinute > parsedEndMinute
      ) {
        responseMessage(res, 400, "Invalid hour or minute range parameters");
        return;
      }
      const startOfRange = new Date(now);
      startOfRange.setHours(parsedHour, parsedStartMinute, 0, 0);
      const endOfRange = new Date(now);
      endOfRange.setHours(parsedHour, parsedEndMinute, 59, 999);

      whereClause.created_at = {
        gte: startOfRange,
        lte: endOfRange,
      };
    }

    // Filter berdasarkan jam spesifik - TODAY
    else if (hour && !startHour && !endHour) {
      const parsedHour = parseInt(hour as string);
      if (isNaN(parsedHour) || parsedHour < 0 || parsedHour > 23) {
        responseMessage(res, 400, "Invalid hour parameter");
        return;
      }
      const startOfHour = new Date(now);
      startOfHour.setHours(parsedHour, 0, 0, 0);
      const endOfHour = new Date(now);
      endOfHour.setHours(parsedHour, 59, 59, 999);

      whereClause.created_at = {
        gte: startOfHour,
        lte: endOfHour,
      };
    }

    // Filter berdasarkan range jam - TODAY
    else if (startHour && endHour) {
      const parsedStartHour = parseInt(startHour as string);
      const parsedEndHour = parseInt(endHour as string);
      if (
        isNaN(parsedStartHour) ||
        isNaN(parsedEndHour) ||
        parsedStartHour < 0 ||
        parsedStartHour > 23 ||
        parsedEndHour < 0 ||
        parsedEndHour > 23 ||
        parsedStartHour > parsedEndHour
      ) {
        responseMessage(res, 400, "Invalid hour range parameters");
        return;
      }
      
      // Jika range jam melewati tengah malam (contoh: 22:00 - 02:00)
      if (parsedStartHour > parsedEndHour) {
        // Split menjadi dua query: dari startHour ke 23:59 dan dari 00:00 ke endHour
        const startOfRange1 = new Date(now);
        startOfRange1.setHours(parsedStartHour, 0, 0, 0);
        const endOfRange1 = new Date(now);
        endOfRange1.setHours(23, 59, 59, 999);
        
        const startOfRange2 = new Date(now);
        startOfRange2.setHours(0, 0, 0, 0);
        const endOfRange2 = new Date(now);
        endOfRange2.setHours(parsedEndHour, 59, 59, 999);

        whereClause.created_at = {
          OR: [
            {
              gte: startOfRange1,
              lte: endOfRange1,
            },
            {
              gte: startOfRange2,
              lte: endOfRange2,
            }
          ]
        };
      } else {
        const startOfRange = new Date(now);
        startOfRange.setHours(parsedStartHour, 0, 0, 0);
        const endOfRange = new Date(now);
        endOfRange.setHours(parsedEndHour, 59, 59, 999);

        whereClause.created_at = {
          gte: startOfRange,
          lte: endOfRange,
        };
      }
    }

    // Filter berdasarkan tanggal spesifik
    else if (date) {
      const parsedDate = parseISO(date as string);
      if (isNaN(parsedDate.getTime())) {
        responseMessage(res, 400, "Invalid date format");
        return;
      }
      const start = startOfDay(toZonedTime(parsedDate, timeZone));
      const end = endOfDay(toZonedTime(parsedDate, timeZone));

      whereClause.created_at = {
        gte: start,
        lte: end,
      };
    }

    // Filter berdasarkan range tanggal
    else if (startDate && endDate) {
      const parsedStartDate = parseISO(startDate as string);
      const parsedEndDate = parseISO(endDate as string);
      if (
        isNaN(parsedStartDate.getTime()) ||
        isNaN(parsedEndDate.getTime()) ||
        parsedStartDate > parsedEndDate
      ) {
        responseMessage(res, 400, "Invalid date range");
        return;
      }
      const start = startOfDay(toZonedTime(parsedStartDate, timeZone));
      const end = endOfDay(toZonedTime(parsedEndDate, timeZone));

      whereClause.created_at = {
        gte: start,
        lte: end,
      };
    } else {
      responseMessage(res, 400, "At least one filter parameter is required");
      return;
    }

    // Debug: Log the whereClause untuk debugging
    console.log("WHERE CLAUSE:", JSON.stringify(whereClause, null, 2));

    const [suhuData, pzemData, rpmData] = await Promise.all([
      prisma.suhu.findMany({
        where: whereClause,
        select: {
          temperature: true,
          created_at: true,
        },
        orderBy: {
          created_at: "asc",
        },
      }),
      prisma.pzem.findMany({
        where: whereClause,
        select: {
          created_at: true,
          voltage: true,
          current: true,
          power: true,
          frequency: true,
          power_factor: true,
          energy: true,
          va: true,
          var: true,
        },
        orderBy: {
          created_at: "asc",
        },
      }),
      prisma.rpm.findMany({
        where: whereClause,
        select: {
          created_at: true,
          rpm: true,
        },
        orderBy: {
          created_at: "asc",
        },
      }),
    ]);

    // Debug: Log jumlah data yang ditemukan
    console.log(`Found data - Suhu: ${suhuData.length}, PZEM: ${pzemData.length}, RPM: ${rpmData.length}`);

    if (suhuData.length === 0 && pzemData.length === 0 && rpmData.length === 0) {
      responseMessage(res, 404, "No data found for the specified filters");
      return;
    }

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Temperature Data
    const suhuWorksheet = workbook.addWorksheet("Temperature Data");
    suhuWorksheet.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "Temperature (°C)", key: "temperature", width: 15 },
    ];
    suhuData.forEach((entry) => {
      suhuWorksheet.addRow({
        date: format(toZonedTime(entry.created_at, timeZone), "dd-MM-yyyy HH:mm:ss"),
        temperature: entry.temperature,
      });
    });
    suhuWorksheet.getRow(1).font = { bold: true };
    suhuWorksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    // Sheet 2: PZEM Data
    const pzemWorksheet = workbook.addWorksheet("PZEM Data");
    pzemWorksheet.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "Voltage (V)", key: "voltage", width: 15 },
      { header: "Current (A)", key: "current", width: 15 },
      { header: "Power (W)", key: "power", width: 15 },
      { header: "Frequency (Hz)", key: "frequency", width: 15 },
      { header: "Power Factor", key: "power_factor", width: 15 },
      { header: "Energy (kWh)", key: "energy", width: 15 },
      { header: "VA", key: "va", width: 15 },
      { header: "VAR", key: "var", width: 15 },
    ];
    pzemData.forEach((entry) => {
      pzemWorksheet.addRow({
        date: format(toZonedTime(entry.created_at, timeZone), "dd-MM-yyyy HH:mm:ss"),
        voltage: entry.voltage,
        current: entry.current,
        power: entry.power,
        frequency: entry.frequency,
        power_factor: entry.power_factor,
        energy: entry.energy,
        va: entry.va,
        var: entry.var,
      });
    });
    pzemWorksheet.getRow(1).font = { bold: true };
    pzemWorksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    // Sheet 3: RPM Data
    const rpmWorksheet = workbook.addWorksheet("RPM Data");
    rpmWorksheet.columns = [
      { header: "Date", key: "date", width: 20 },
      { header: "RPM", key: "rpm", width: 15 },
    ];
    rpmData.forEach((entry) => {
      rpmWorksheet.addRow({
        date: format(toZonedTime(entry.created_at, timeZone), "dd-MM-yyyy HH:mm:ss"),
        rpm: entry.rpm,
      });
    });
    rpmWorksheet.getRow(1).font = { bold: true };
    rpmWorksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=temperature_pzem_rpm_data.xlsx");

    res.status(200).send(buffer);
  } catch (error) {
    console.error("Error generating Excel file: ", error);
    responseMessage(res, 500, "Terjadi kesalahan pada server");
  }
});
export { getAllSuhu, getAverageSuhuToday, getLatestSuhu, downloadSuhuExcel };