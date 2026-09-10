import { useEffect, useRef, useCallback, useState } from "react";
import { useAuthStore } from "@/store/authStore";

interface WSMessage {
  type: string;
  org_id: string;
  payload: any;
}

export function useSocket(onMessage?: (msg: WSMessage) => void) {
  const token = useAuthStore((s) => s.token);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const onMessageRef = useRef(onMessage);
  const [connected, setConnected] = useState(false);

  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!token) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/ws?token=${token}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        onMessageRef.current?.(data);
      } catch (e) {
        // ignore
      }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, send };
}
