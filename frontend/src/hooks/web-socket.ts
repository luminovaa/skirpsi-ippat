// src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';

type WebSocketMessage = {
  type: string;
  data?: any;
  [key: string]: any;
};

type WebSocketCallbacks = {
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: (socket: WebSocket) => void; // Pass socket instance
  onClose?: () => void;
  onError?: (error: Event) => void;
};

export const useWebSocket = (url: string, callbacks: WebSocketCallbacks) => {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const shouldReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    if (!isMountedRef.current || !shouldReconnectRef.current) return;

    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.onmessage = null;
      
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close(1000, 'Reconnecting');
      }
    }

    console.log(`Creating new WebSocket connection (attempt ${reconnectAttemptsRef.current + 1})`);
    
    try {
      socketRef.current = new WebSocket(url);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      callbacks.onError?.(error as Event);
      return;
    }

    const socket = socketRef.current;

    socket.onopen = () => {
      console.log('WebSocket connected successfully');
      reconnectAttemptsRef.current = 0; // Reset counter on successful connection
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      
      // Pass the socket instance to the callback
      callbacks.onOpen?.(socket);
    };

    socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('Received WebSocket message:', message);
        callbacks.onMessage?.(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error, 'Raw data:', event.data);
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket disconnected', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      
      callbacks.onClose?.();

      // Only reconnect if component is still mounted and we should reconnect
      if (isMountedRef.current && shouldReconnectRef.current) {
        reconnectAttemptsRef.current++;
        
        if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
          // Exponential backoff with jitter
          const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          const jitter = Math.random() * 1000; // Add up to 1 second of jitter
          const delay = baseDelay + jitter;
          
          console.log(`Reconnecting in ${Math.round(delay)}ms... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          reconnectTimerRef.current = setTimeout(connect, delay);
        } else {
          console.error('Max reconnection attempts reached. Giving up.');
          callbacks.onError?.(new Event('Max reconnection attempts reached'));
        }
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      callbacks.onError?.(error);
    };
  }, [url, callbacks]);

  // Method to send messages
  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        const messageStr = JSON.stringify(message);
        console.log('Sending WebSocket message:', message);
        socketRef.current.send(messageStr);
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('WebSocket not ready. Current state:', 
        socketRef.current ? socketRef.current.readyState : 'null');
      return false;
    }
  }, []);

  // Method to get connection status
  const getConnectionStatus = useCallback(() => {
    if (!socketRef.current) return 'disconnected';
    
    switch (socketRef.current.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    shouldReconnectRef.current = true;
    reconnectAttemptsRef.current = 0;
    connect();

    return () => {
      console.log('Cleaning up WebSocket hook');
      isMountedRef.current = false;
      shouldReconnectRef.current = false;
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (socketRef.current) {
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
    sendMessage,
    getConnectionStatus,
    disconnect: () => {
      console.log('Manual disconnect requested');
      shouldReconnectRef.current = false;
      if (socketRef.current) {
        socketRef.current.close(1000, 'Manual disconnect');
      }
    },
    reconnect: () => {
      console.log('Manual reconnect requested');
      shouldReconnectRef.current = true;
      reconnectAttemptsRef.current = 0;
      connect();
    }
  };
};