import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../../../utils/async_handler";
import { responseData, responseMessage } from "../../../utils/respone_handler";
import { Response } from "express";
import { toZonedTime } from "date-fns-tz";
import { endOfDay, startOfDay } from "date-fns";

const prisma = new PrismaClient();

const getAllPzem = asyncHandler(async (req: Request, res: Response<any, Record<string, any>>): Promise<void> => {
    try {
        const data = await prisma.pzem.findMany();
        responseData(res, 200, "Success", data);
    } catch (error) {
        console.error("Error fetching data: ", error);
        responseMessage(res, 500, "Terjadi kesalahan pada server");
    }
});

const getAveragePzemToday = asyncHandler(async (req: Request, res: Response<any, Record<string, any>>): Promise<void> => {
    try {
        const timeZone = 'Asia/Jakarta';

        const now = toZonedTime(new Date(), timeZone);

        const startOfDayWIB = startOfDay(now);
        const endOfDayWIB = endOfDay(now);

        const data = await prisma.pzem.aggregate({
            _avg: {
                voltage: true,
                current: true,
                power: true,
                power_factor: true,
                energy: true,
                va: true,
                var: true,
            },
            where: {
                created_at: {
                    gte: startOfDayWIB,
                    lt: endOfDayWIB,
                },
            },
        });

        responseData(res, 200, "Success", data);
    } catch (error) {
        console.error("Error fetching data: ", error);
        responseMessage(res, 500, "Terjadi kesalahan pada server");
    }
});

const getLatestPzem = asyncHandler(async (req: Request, res: Response<any, Record<string, any>>): Promise<void> => {
    try {
        const data = await prisma.pzem.findFirst({
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

export { getAllPzem, getAveragePzemToday, getLatestPzem };