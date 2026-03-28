import { useCallback, useEffect, useRef, useState } from "react";

interface WebSocketMessage {
  type: string;
  channel?: string;
  data?: any;
}

interface SubscribeOptions {
  /** Optionally filter to only specific event_types, e.g. ['swap.status_changed'] */
  eventTypes?: string[];
}

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;
const RECONNECT_MULTIPLIER = 2;

export function useWebSocket(url: string | null, token: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const reconnectDelay = useRef(RECONNECT_BASE_MS);
  const listeners = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  // Track subscriptions so they can be re-sent after reconnect
  const subscriptions = useRef<Map<string, SubscribeOptions>>(new Map());

  const sendRaw = useCallback((payload: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload));
    }
  }, []);

  const resubscribeAll = useCallback(() => {
    subscriptions.current.forEach((opts, channel) => {
      sendRaw({
        type: "subscribe",
        channel,
        event_types: opts.eventTypes ?? [],
      });
    });
  }, [sendRaw]);

  const connect = useCallback(() => {
    if (!url || !token) return;
    if (ws.current?.readyState === WebSocket.CONNECTING) return;

    if (ws.current) {
      ws.current.onclose = null; // prevent re-trigger during teardown
      ws.current.close();
    }

    const wsUrl = new URL(url);
    wsUrl.searchParams.set("token", token);

    const socket = new WebSocket(wsUrl.toString());

    socket.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectDelay.current = RECONNECT_BASE_MS;
      resubscribeAll();
    };

    socket.onclose = (event) => {
      setIsConnected(false);

      if (!event.wasClean) {
        const delay = reconnectDelay.current;
        reconnectDelay.current = Math.min(delay * RECONNECT_MULTIPLIER, RECONNECT_MAX_MS);
        reconnectTimeout.current = setTimeout(connect, delay);
      }
    };

    socket.onerror = () => {
      setError(new Error("WebSocket connection error"));
    };

    socket.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        // Respond to server-side heartbeat pings
        if (message.type === "ping") {
          sendRaw({ type: "pong" });
          return;
        }

        const key = message.channel ?? message.type;
        const channelListeners = listeners.current.get(key);
        if (channelListeners) {
          channelListeners.forEach((cb) => cb(message.data));
        }
      } catch {
        // malformed frame – ignore
      }
    };

    ws.current = socket;
  }, [url, token, resubscribeAll, sendRaw]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }
    };
  }, [connect]);

  const subscribe = useCallback(
    (channel: string, callback: (data: any) => void, opts: SubscribeOptions = {}) => {
      if (!listeners.current.has(channel)) {
        listeners.current.set(channel, new Set());
      }
      listeners.current.get(channel)!.add(callback);

      // Track subscription for re-send on reconnect
      subscriptions.current.set(channel, opts);

      // Send subscription to server
      sendRaw({ type: "subscribe", channel, event_types: opts.eventTypes ?? [] });

      return () => {
        const set = listeners.current.get(channel);
        if (set) {
          set.delete(callback);
          if (set.size === 0) {
            listeners.current.delete(channel);
            subscriptions.current.delete(channel);
            sendRaw({ type: "unsubscribe", channel });
          }
        }
      };
    },
    [sendRaw]
  );

  const updatePreferences = useCallback(
    (channel: string, eventTypes: string[]) => {
      subscriptions.current.set(channel, { eventTypes });
      sendRaw({ type: "update_preferences", channel, event_types: eventTypes });
    },
    [sendRaw]
  );

  const send = useCallback((type: string, data: object) => sendRaw({ type, ...data }), [sendRaw]);

  return { isConnected, error, subscribe, updatePreferences, send };
}
