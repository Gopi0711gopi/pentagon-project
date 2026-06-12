'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function useWebSocket(url = 'ws://localhost:8000/ws/stream') {
    const [agentStatuses, setAgentStatuses] = useState({});
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);

    const connect = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                // Send a ping to keep alive
                ws.send(JSON.stringify({ type: 'ping' }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);

                    if (data.type === 'agent_status') {
                        setAgentStatuses(data.agents);
                    }
                } catch (e) {
                    // Skip non-JSON messages
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                wsRef.current = null;
                // Auto-reconnect after 3s
                reconnectTimer.current = setTimeout(connect, 3000);
            };

            ws.onerror = () => {
                ws.close();
            };
        } catch (e) {
            reconnectTimer.current = setTimeout(connect, 5000);
        }
    }, [url]);

    useEffect(() => {
        connect();
        return () => {
            clearTimeout(reconnectTimer.current);
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    const sendMessage = useCallback((message) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    return { agentStatuses, isConnected, lastMessage, sendMessage };
}
