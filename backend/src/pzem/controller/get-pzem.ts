import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../../../utils/async_handler";
import { responseData, responseMessage } from "../../../utils/respone_handler";
import { Response } from "express";

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
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60 * 1000;
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startOfDay.setTime(startOfDay.getTime() + offset);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        endOfDay.setTime(endOfDay.getTime() + offset);

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
                    gte: startOfDay,
                    lt: endOfDay,
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