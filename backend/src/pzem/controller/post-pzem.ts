import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../../../utils/async_handler";
import { responseData, responseMessage } from "../../../utils/respone_handler";
import { WebSocketServer } from "ws";
import { sendZeroIfNoData } from "../../../utils/ws-timout";

const prisma = new PrismaClient();
let wss: WebSocketServer;
let pzemTimeout: NodeJS.Timeout | null = null;

export const setWebSocketServer = (server: WebSocketServer) => {
  wss = server;
};

export const postPzem = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { voltage,
      current,
      frequency,
      power,
      power_factor,
      energy,
      va,
      var: varr
    } = req.body;

    const pzem = await prisma.pzem.create({
      data: {
        voltage,
        frequency,
        current,
        power,
        power_factor,
        energy,
        va,
        var: varr
      }
    });

    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'new_pzem',
            data: pzem
          }));
        }
      });
    }

    if (pzemTimeout) clearTimeout(pzemTimeout);
    pzemTimeout = setTimeout(() => {
      console.log("Tidak ada data masuk selama 2 detik, kirim data 0");
      sendZeroIfNoData(wss);
    }, 2000);

    responseData(res, 201, "Success", pzem);
  } catch (error) {
    console.error("Error posting data: ", error);
    responseMessage(res, 500, "Terjadi kesalahan pada server");
  }
});

