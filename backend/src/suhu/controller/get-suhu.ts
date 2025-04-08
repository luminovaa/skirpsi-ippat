import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../../../utils/async_handler";
import { responseData, responseMessage } from "../../../utils/respone_handler";
import { Request, Response } from "express";
import { toZonedTime } from "date-fns-tz";
import { endOfDay, startOfDay } from "date-fns";

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

const getHistorySuhu = asyncHandler(async (req: Request, res: Response<any, Record<string, any>>): Promise<void> => {
    try {
        const { range = '1day' } = req.query;
        const timeZone = 'Asia/Jakarta';
        const now = toZonedTime(new Date(), timeZone);
        
        let startDate: Date;
        let groupBy: 'hour' | 'period' | 'day';
        let periodsPerDay: number;
        
        switch (range) {
            case '1day':
                startDate = startOfDay(now);
                groupBy = 'hour';
                break;
            case '3days':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 3);
                startDate = startOfDay(startDate);
                groupBy = 'period';
                periodsPerDay = 4; // pagi, siang, sore, malam
                break;
            case '1week':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
                startDate = startOfDay(startDate);
                groupBy = 'period';
                periodsPerDay = 2; // siang dan malam
                break;
            case '1month':
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 1);
                startDate = startOfDay(startDate);
                groupBy = 'day';
                break;
            default:
                responseMessage(res, 400, "Invalid range parameter. Valid values: 1day, 3days, 1week, 1month");
                return;
        }

        const rawData = await prisma.suhu.findMany({
            where: {
                created_at: {
                    gte: startDate,
                    lte: now,
                },
            },
            orderBy: {
                created_at: 'asc',
            },
        });

        let result: Array<{ time: string, temperature: number }> = [];
        
        if (groupBy === 'hour') {
            const hourlyGroups: Record<string, number[]> = {};
            
            rawData.forEach(entry => {
                const entryDate = toZonedTime(entry.created_at, timeZone);
                const hour = entryDate.getHours();
                const hourKey = `${hour.toString().padStart(2, '0')}:00`;
                
                if (!hourlyGroups[hourKey]) {
                    hourlyGroups[hourKey] = [];
                }
                hourlyGroups[hourKey].push(entry.temperature);
            });
            
            result = Object.entries(hourlyGroups).map(([hour, temps]) => ({
                time: hour,
                temperature: parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2))
            }));
            
        } else if (groupBy === 'period') {
            const periodGroups: Record<string, number[]> = {};
            
            rawData.forEach(entry => {
                const entryDate = toZonedTime(entry.created_at, timeZone);
                const day = entryDate.toISOString().split('T')[0];
                const hour = entryDate.getHours();
                
                let period: string;
                
                if (periodsPerDay === 4) {
                    if (hour >= 5 && hour < 11) period = 'Pagi';
                    else if (hour >= 11 && hour < 15) period = 'Siang';
                    else if (hour >= 15 && hour < 19) period = 'Sore';
                    else period = 'Malam';
                } else {
                    period = (hour >= 6 && hour < 18) ? 'Siang' : 'Malam';
                }
                
                const periodKey = `${day} ${period}`;
                
                if (!periodGroups[periodKey]) {
                    periodGroups[periodKey] = [];
                }
                periodGroups[periodKey].push(entry.temperature);
            });
            
            result = Object.entries(periodGroups).map(([period, temps]) => ({
                time: period,
                temperature: parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2))
            }));
            
        } else {
            const dailyGroups: Record<string, number[]> = {};
            
            rawData.forEach(entry => {
                const entryDate = toZonedTime(entry.created_at, timeZone);
                const dayKey = entryDate.toISOString().split('T')[0];
                
                if (!dailyGroups[dayKey]) {
                    dailyGroups[dayKey] = [];
                }
                dailyGroups[dayKey].push(entry.temperature);
            });
            
            result = Object.entries(dailyGroups).map(([day, temps]) => ({
                time: day,
                temperature: parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2))
            }));
        }
        
        responseData(res, 200, "Success", result);
    } catch (error) {
        console.error("Error fetching history data: ", error);
        responseMessage(res, 500, "Terjadi kesalahan pada server");
    }
});

export { getAllSuhu, getAverageSuhuToday, getLatestSuhu, getHistorySuhu };