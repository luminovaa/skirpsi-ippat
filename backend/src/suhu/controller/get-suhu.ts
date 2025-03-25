import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../../../utils/async_handler";
import { responseData, responseMessage } from "../../../utils/respone_handler";
import { Response } from "express";
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
        // Set timezone to WIB (Asia/Jakarta)
        const timeZone = 'Asia/Jakarta';
        
        // Get current time in WIB
        const now = toZonedTime(new Date(), timeZone);
        
        // Get start and end of day in WIB
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

export { getAllSuhu, getAverageSuhuToday, getLatestSuhu };