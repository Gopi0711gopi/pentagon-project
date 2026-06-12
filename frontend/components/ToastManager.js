'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastManager');
    }
    return context;
};

const TOAST_COLORS = {
    info: { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)', text: '#38bdf8', icon: 'ℹ️' },
    warning: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24', icon: '⚠️' },
    error: { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', text: '#f87171', icon: '🚨' },
    success: { bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.3)', text: '#4ade80', icon: '✅' },
};

export default function ToastManager({ wsMessage, children }) {
    const [toasts, setToasts] = useState([]);

    // Listen for WebSocket notification events
    useEffect(() => {
        if (!wsMessage) return;
        if (wsMessage.type === 'notification' || wsMessage.type === 'toast') {
            addToast({
                message: wsMessage.message || wsMessage.content || 'New event',
                level: wsMessage.level || 'info',
                source: wsMessage.source || wsMessage.agent || 'system',
            });
        }
    }, [wsMessage]);

    const addToast = useCallback((toast) => {
        const id = Date.now() + Math.random();
        setToasts(prev => {
            const updated = [{ ...toast, id, visible: true }, ...prev];
            return updated.slice(0, 5); // Max 5
        });

        // Auto-dismiss after 5s
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 400);
        }, 5000);
    }, []);

    // Expose addToast globally for other components
    useEffect(() => {
        window.__pentagonToast = addToast;
    }, [addToast]);

    const dismissToast = (id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, visible: false } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400);
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div style={{
                position: 'fixed', top: 16, right: 16, zIndex: 10000,
                display: 'flex', flexDirection: 'column', gap: '8px',
                pointerEvents: 'none',
            }}>
                {toasts.map((toast) => {
                    const color = TOAST_COLORS[toast.level] || TOAST_COLORS.info;
                    return (
                        <div key={toast.id} style={{
                            background: color.bg, border: `1px solid ${color.border}`,
                            borderRadius: '12px', padding: '12px 16px',
                            backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            display: 'flex', alignItems: 'flex-start', gap: '10px',
                            minWidth: 300, maxWidth: 400, pointerEvents: 'auto', cursor: 'pointer',
                            animation: toast.visible ? 'toastSlideIn 0.3s ease-out' : 'toastSlideOut 0.3s ease-in forwards',
                        }}
                            onClick={() => dismissToast(toast.id)}
                        >
                            <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{color.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {toast.source && (
                                    <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: color.text, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>
                                        {toast.source}
                                    </div>
                                )}
                                <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                    {toast.message}
                                </div>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0, opacity: 0.5 }}>✕</span>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
