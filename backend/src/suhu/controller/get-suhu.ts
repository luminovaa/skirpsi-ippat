import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../../../utils/async_handler";
import { responseData, responseMessage } from "../../../utils/respone_handler";
import { Response } from "express";

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
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60 * 1000;
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startOfDay.setTime(startOfDay.getTime() + offset);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        endOfDay.setTime(endOfDay.getTime() + offset);

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
                    gte: startOfDay,
                    lt: endOfDay,
                },
            },
        });
        const suhuToday = {
            average: data._avg.temperature,
            min: data._min.temperature,
            max: data._max.temperature
        };
        responseData(res, 200, "Success", suhuToday);
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