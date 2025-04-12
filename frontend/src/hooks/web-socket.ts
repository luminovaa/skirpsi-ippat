// src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';

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
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    if (!isMountedRef.current || !shouldReconnectRef.current) return;

    // Close previous connection if exists
    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.onmessage = null;
      
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close(1000, 'Reconnecting');
      }
    }

    console.log('Creating new WebSocket connection');
    socketRef.current = new WebSocket(url);

    const socket = socketRef.current;

    socket.onopen = () => {
      console.log('WebSocket connected');
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
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

    socket.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      callbacks.onClose?.();

      if (isMountedRef.current && shouldReconnectRef.current) {
        // Exponential backoff for reconnection
        const delay = Math.min(1000 * Math.pow(2, 5), 30000); // Max 30 seconds
        console.log(`Reconnecting in ${delay}ms...`);
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      callbacks.onError?.(error);
    };
  }, [url, callbacks]);

  useEffect(() => {
    isMountedRef.current = true;
    shouldReconnectRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      shouldReconnectRef.current = false;
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (socketRef.current) {
        console.log('Cleaning up WebSocket');
        socketRef.current.onopen = null;
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onmessage = null;
        
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.close(1000, 'Component unmounted');
        }
        
        socketRef.current = null;
      }
    };
  }, [connect]);

  return {
    socket: socketRef,
    disconnect: () => {
      shouldReconnectRef.current = false;
      if (socketRef.current) {
        socketRef.current.close(1000, 'Manual disconnect');
      }
    }
  };
};