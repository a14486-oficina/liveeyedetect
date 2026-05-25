import { useRef, useEffect, useCallback } from "react";

export default function useWS(url) {
  const wsRef = useRef(null);
  const mountedRef = useRef(true);
  const retriesRef = useRef(0);
  const timerRef = useRef(null);
  const handlersRef = useRef({});

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
    }
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      handlersRef.current.onopen?.();
    };
    ws.onmessage = (e) => {
      handlersRef.current.onmessage?.(e);
    };
    ws.onclose = (e) => {
      handlersRef.current.onclose?.(e);
      if (mountedRef.current) {
        const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
        retriesRef.current += 1;
        timerRef.current = setTimeout(connect, delay);
      }
    };
    ws.onerror = () => {};
  }, [url]);

  useEffect(() => {
    mountedRef.current = true;
    retriesRef.current = 0;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { wsRef, handlersRef };
}
