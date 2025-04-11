import { useEffect, useRef } from 'react';

// URL WebSocket tetap yang didefinisikan dalam hook
const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL;

type WebSocketMessage = {
  type: string;
  data: any;
};

type WebSocketCallbacks = {
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
};

export const useWebSocket = (callbacks: WebSocketCallbacks) => {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Pastikan kode hanya dijalankan di browser (client-side)
    if (typeof window !== 'undefined') {
      // Buat koneksi WebSocket dengan URL tetap
      socketRef.current = new WebSocket(WEBSOCKET_URL!);

      // Setup event handlers
      const socket = socketRef.current;

      socket.onopen = () => {
        console.log('WebSocket connected');
        callbacks.onOpen?.();
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          callbacks.onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        callbacks.onClose?.();
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        callbacks.onError?.(error);
      };

      // Cleanup function
      return () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };
    }
    // Jika di server, tidak lakukan apa-apa
    return undefined;
  }, [callbacks]); // Hanya callbacks sebagai dependency

  // Fungsi untuk mengirim pesan
  const sendMessage = (message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  };

  return {
    socket: socketRef,
    sendMessage
  };
};