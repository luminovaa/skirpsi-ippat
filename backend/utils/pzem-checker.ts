import { PrismaClient } from "@prisma/client";
import { WebSocketServer } from "ws";

const prisma = new PrismaClient();
const CHECK_INTERVAL = 1000; // cek saben 1 detik
const TIMEOUT_THRESHOLD = 10000; // batas 2 detik

interface MonitorConfig {
  model: 'rpm' | 'suhu' | 'pzem';
  defaultData: any;
  eventName: string;
}

export const startDataMonitor = (wss: WebSocketServer) => {
  const monitorConfigs: MonitorConfig[] = [
    {
      model: 'rpm',
      defaultData: { rpm: 0 },
      eventName: 'new_rpm'
    },
    {
      model: 'suhu',
      defaultData: { temperature: 0 },
      eventName: 'new_suhu'
    },
    {
      model: 'pzem',
      defaultData: {
        voltage: 0,
        current: 0,
        frequency: 0,
        power: 0,
        power_factor: 0,
        energy: 0,
        va: 0,
        var: 0,
      },
      eventName: 'new_pzem'
    }
  ];

  const state = new Map<string, boolean>();

  setInterval(async () => {
    const now = Date.now();

    for (const config of monitorConfigs) {
      try {
        const latestRecord = await (prisma as any)[config.model].findFirst({ 
          orderBy: { created_at: 'desc' } 
        });
        
        const lastRecordTime = latestRecord ? new Date(latestRecord.created_at).getTime() : 0;
        const timeDiff = now - lastRecordTime;
        const hasSentDefault = state.get(config.model) || false;

        if (timeDiff > TIMEOUT_THRESHOLD && !hasSentDefault) {
          // Kirim data default
          const newData = await (prisma as any)[config.model].create({ 
            data: config.defaultData 
          });
          
          console.log(`⚠️ ${config.model.toUpperCase()} default dikirim karena tidak ada data selama 2 detik.`);

          // Kirim ng websocket dan webscoket ngirim ng database
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ 
                type: config.eventName, 
                data: config.model === 'pzem' ? newData : newData[Object.keys(config.defaultData)[0]]
              }));
            }
          });

          state.set(config.model, true);
        } else if (timeDiff <= TIMEOUT_THRESHOLD && hasSentDefault) {
          state.set(config.model, false);
        }
      } catch (err) {
        console.error(`Gagal monitor ${config.model.toUpperCase()}:`, err);
      }
    }
  }, CHECK_INTERVAL);
};
