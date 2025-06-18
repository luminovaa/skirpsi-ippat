import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../../../utils/async_handler";
import { responseData, responseMessage } from "../../../utils/respone_handler";
import { WebSocketServer } from "ws";

const prisma = new PrismaClient();
let wss: WebSocketServer;

export const setWebSocketServer = (server: WebSocketServer) => {
    wss = server;
};

export const postSuhu = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { temperature } = req.body;

        const suhu = await prisma.suhu.create({
            data: { temperature, created_at: new Date() }
        });
        if (wss) {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: 'new_suhu',
                        data: suhu
                    }));
                }
            });
        }


        responseData(res, 201, "Success", suhu);
    } catch (error) {
        console.error("Error posting data: ", error);
        responseMessage(res, 500, "Terjadi kesalahan pada server");
    }
});
