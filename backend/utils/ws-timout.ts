import { WebSocketServer } from "ws";

let pzemTimeout: NodeJS.Timeout;
let rpmTimeout: NodeJS.Timeout;
let suhuTimeout: NodeJS.Timeout;


export const sendZeroIfNoDataRpm = (wss: WebSocketServer) => {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'new_rpm',
          data: {
            rpm: 0,
            created_at: new Date()
          }
        }));
      }
    });
  }
};



export const sendZeroIfNoData = (wss: WebSocketServer) => {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'new_pzem',
          data: {
            voltage: 0,
            frequency: 0,
            current: 0,
            power: 0,
            power_factor: 0,
            energy: 0,
            va: 0,
            var: 0,
            created_at: new Date()
          }
        }));
      }
    });
  }
};


export const sendZeroIfNoDataSuhu = (wss: WebSocketServer) => {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'new_suhu',
          data: {
            temperature: 0,
            created_at: new Date()
          }
        }));
      }
    });
  }
};
