// src/utils/websocket.ts
import { useEffect, useRef } from 'react';

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

export const useWebSocket = (url: string, callbacks: WebSocketCallbacks) => {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Buat koneksi WebSocket
    socketRef.current = new WebSocket(url);

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
  }, [url]);

  return socketRef;
};