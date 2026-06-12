'use client';

import { useState, useEffect, useCallback } from 'react';

export default function NotificationBell({ onCount }) {
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);

    const fetchNotifs = useCallback(() => {
        fetch('http://localhost:8000/api/notifications').then(r => r.json()).then(d => {
            if (Array.isArray(d)) {
                setNotifications(d);
                if (onCount) onCount(d.filter(n => !n.read).length);
            }
        }).catch(() => { });
    }, [onCount]);

    useEffect(() => {
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 10000);
        return () => clearInterval(interval);
    }, [fetchNotifs]);

    const markRead = async (idx) => {
        await fetch(`http://localhost:8000/api/notifications/${idx}/read`, { method: 'POST' });
        fetchNotifs();
    };

    const markAllRead = async () => {
        await fetch('http://localhost:8000/api/notifications/read-all', { method: 'POST' });
        fetchNotifs();
    };

    const unread = notifications.filter(n => !n.read).length;
    const levelColors = { info: '#38bdf8', warning: '#fbbf24', error: '#f87171' };

    return (
        <div style={{ position: 'relative' }}>
            {/* Bell Button */}
            <button onClick={() => setOpen(!open)} className="animate-icon-swing" style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', position: 'relative',
                fontSize: '16px', color: 'var(--text-secondary)', transition: 'all 0.2s',
            }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
                <span className="icon">🔔</span>
                {unread > 0 && (
                    <span style={{
                        position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%',
                        background: '#f87171', color: 'white', fontSize: '10px', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 8px rgba(248,113,113,0.4)',
                        animation: 'pulse 2s infinite',
                    }}>
                        {unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <>
                    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
                    <div style={{
                        position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 360, maxHeight: 420,
                        background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 999,
                        backdropFilter: 'blur(20px)', overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700 }}>Notifications</span>
                            {unread > 0 && (
                                <button onClick={markAllRead} style={{
                                    background: 'none', border: 'none', color: '#38bdf8', fontSize: '11px',
                                    fontFamily: 'var(--font-mono)', cursor: 'pointer', fontWeight: 600,
                                }}>
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔕</div>
                                    <p style={{ fontSize: '13px' }}>No notifications</p>
                                </div>
                            ) : notifications.map((n, i) => (
                                <div key={i} onClick={() => !n.read && markRead(i)}
                                    style={{
                                        padding: '12px 16px', display: 'flex', gap: '12px', cursor: n.read ? 'default' : 'pointer',
                                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                                        background: n.read ? 'transparent' : 'rgba(56,189,248,0.04)',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = n.read ? 'rgba(255,255,255,0.02)' : 'rgba(56,189,248,0.08)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(56,189,248,0.04)'}
                                >
                                    <div style={{
                                        width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                                        background: n.read ? 'rgba(255,255,255,0.1)' : (levelColors[n.level] || '#38bdf8'),
                                        boxShadow: n.read ? 'none' : `0 0 6px ${levelColors[n.level] || '#38bdf8'}40`,
                                    }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', opacity: n.read ? 0.5 : 1 }}>{n.message}</div>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                            <span style={{ textTransform: 'capitalize' }}>{n.source}</span>
                                            <span>·</span>
                                            <span>{timeAgo(n.timestamp)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function timeAgo(ts) {
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}
