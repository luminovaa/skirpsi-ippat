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
        const { hour, startHour, endHour, date, startDate, endDate } = req.query;
        const timeZone = 'Asia/Jakarta';
        let whereClause: any = {};

        const now = toZonedTime(new Date(), timeZone);

        // Handle hour filter (specific hour today)
        if (hour) {
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
                lte: endOfHour
            };
        }
        // Handle hour range filter (today)
        else if (startHour && endHour) {
            const parsedStartHour = parseInt(startHour as string);
            const parsedEndHour = parseInt(endHour as string);
            if (
                isNaN(parsedStartHour) || isNaN(parsedEndHour) ||
                parsedStartHour < 0 || parsedStartHour > 23 ||
                parsedEndHour < 0 || parsedEndHour > 23 ||
                parsedStartHour > parsedEndHour
            ) {
                responseMessage(res, 400, "Invalid hour range parameters");
                return;
            }
            const startOfRange = new Date(now);
            startOfRange.setHours(parsedStartHour, 0, 0, 0);
            const endOfRange = new Date(now);
            endOfRange.setHours(parsedEndHour, 59, 59, 999);

            whereClause.created_at = {
                gte: startOfRange,
                lte: endOfRange
            };
        }
        // Handle specific date filter
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
                lte: end
            };
        }
        // Handle date range filter
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
                lte: end
            };
        } else {
            responseMessage(res, 400, "At least one filter parameter is required");
            return;
        }

        const data = await prisma.suhu.findMany({
            where: whereClause,
            select: {
                temperature: true,
                created_at: true
            },
            orderBy: {
                created_at: 'asc'
            }
        });

        if (data.length === 0) {
            responseMessage(res, 404, "No data found for the specified filters");
            return;
        }

        // Create Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Temperature Data');

        // Define columns
        worksheet.columns = [
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Temperature (°C)', key: 'temperature', width: 15 }
        ];

        // Add data to worksheet
        data.forEach(entry => {
            worksheet.addRow({
                date: format(toZonedTime(entry.created_at, timeZone), 'yyyy-MM-dd HH:mm:ss'),
                temperature: entry.temperature
            });
        });

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Generate Excel file
        const buffer = await workbook.xlsx.writeBuffer();

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=temperature_data.xlsx');

        // Send the file
        res.status(200).send(buffer);
    } catch (error) {
        console.error("Error generating Excel file: ", error);
        responseMessage(res, 500, "Terjadi kesalahan pada server");
    }
});

export { getAllSuhu, getAverageSuhuToday, getLatestSuhu, downloadSuhuExcel };