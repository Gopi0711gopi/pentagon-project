'use client';

import { useState, useEffect, useCallback } from 'react';

const agentColors = {
    guardian: '#f87171', financier: '#4ade80', scout: '#60a5fa',
    operator: '#fbbf24', liaison: '#38bdf8', system: '#a78bfa',
    scheduler: '#c084fc', settings: '#94a3b8',
};
const agentIcons = {
    guardian: '🛡️', financier: '💰', scout: '🔍',
    operator: '⚙️', liaison: '👑', system: '🧠',
    scheduler: '📅', settings: '⚙️',
};
const priorityConfig = {
    critical: { color: '#f87171', label: 'CRITICAL', glow: '0 0 12px rgba(248,113,113,0.4)' },
    high: { color: '#fbbf24', label: 'HIGH', glow: '0 0 8px rgba(251,191,36,0.3)' },
    medium: { color: '#38bdf8', label: 'MED', glow: 'none' },
    low: { color: '#64748b', label: 'LOW', glow: 'none' },
};
const categoryIcons = {
    finance: '💰', security: '🛡️', growth: '📈',
    ops: '⚙️', system: '🧠', general: '📋',
};
const CATEGORIES = ['all', 'finance', 'security', 'growth', 'ops', 'system'];

export default function NotificationCenter({ onExecuteCommand }) {
    const [notifications, setNotifications] = useState([]);
    const [filter, setFilter] = useState('all');
    const [showRead, setShowRead] = useState(true);

    const fetchNotifs = useCallback(async () => {
        try {
            const res = await fetch('http://localhost:8000/api/notifications');
            const data = await res.json();
            if (Array.isArray(data)) setNotifications(data);
        } catch { }
    }, []);

    useEffect(() => {
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 5000);
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

    const filtered = notifications.filter(n => {
        if (filter !== 'all' && (n.category || 'general') !== filter) return false;
        if (!showRead && n.read) return false;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.read).length;
    const stats = {
        total: notifications.length,
        unread: unreadCount,
        critical: notifications.filter(n => n.priority === 'critical' && !n.read).length,
        high: notifications.filter(n => n.priority === 'high' && !n.read).length,
    };

    const formatTime = (iso) => {
        const d = new Date(iso);
        const diff = Date.now() - d.getTime();
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800 }}><span className="gradient-text">Notifications</span> 🔔</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {stats.unread} unread · {stats.total} total
                        {stats.critical > 0 && <span style={{ color: '#f87171', marginLeft: 8 }}>🔴 {stats.critical} critical</span>}
                        {stats.high > 0 && <span style={{ color: '#fbbf24', marginLeft: 8 }}>🟡 {stats.high} high</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowRead(!showRead)} style={{
                        padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                        fontFamily: 'var(--font-mono)', cursor: 'pointer',
                        background: showRead ? 'rgba(255,255,255,0.06)' : 'rgba(56,189,248,0.1)',
                        border: `1px solid ${showRead ? 'rgba(255,255,255,0.08)' : 'rgba(56,189,248,0.3)'}`,
                        color: showRead ? 'var(--text-muted)' : '#38bdf8',
                    }}>
                        {showRead ? '👁️ All' : '🔵 Unread'}
                    </button>
                    {stats.unread > 0 && (
                        <button onClick={markAllRead} style={{
                            padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                            fontFamily: 'var(--font-mono)', cursor: 'pointer',
                            background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80',
                        }}>
                            ✅ Mark All Read
                        </button>
                    )}
                </div>
            </div>

            {/* Category Filters */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setFilter(cat)} style={{
                        padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                        fontFamily: 'var(--font-mono)', cursor: 'pointer', textTransform: 'uppercase',
                        background: filter === cat ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${filter === cat ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        color: filter === cat ? '#38bdf8' : 'var(--text-muted)',
                        transition: 'all 0.2s',
                    }}>
                        {categoryIcons[cat] || '📋'} {cat}
                    </button>
                ))}
            </div>

            {/* Notification List */}
            <div className="glass-card" style={{ padding: '8px' }}>
                {filtered.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔕</div>
                        <p>No notifications in this category</p>
                    </div>
                ) : (
                    filtered.map((n, i) => {
                        const pri = priorityConfig[n.priority] || priorityConfig.medium;
                        const sourceColor = agentColors[n.source] || '#38bdf8';
                        const sourceIcon = agentIcons[n.source] || '🤖';
                        const catIcon = categoryIcons[n.category] || '📋';

                        return (
                            <div key={n.id ?? i} style={{
                                padding: '14px 16px', borderRadius: '10px', marginBottom: '4px',
                                background: n.read ? 'transparent' : 'rgba(56,189,248,0.04)',
                                borderLeft: `3px solid ${n.read ? 'transparent' : pri.color}`,
                                transition: 'all 0.2s', cursor: n.read ? 'default' : 'pointer',
                            }}
                                onClick={() => !n.read && markRead(i)}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                onMouseOut={(e) => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(56,189,248,0.04)'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                                        {/* Unread dot */}
                                        <div style={{
                                            width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                                            background: n.read ? 'rgba(255,255,255,0.1)' : pri.color,
                                            boxShadow: n.read ? 'none' : pri.glow,
                                        }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', lineHeight: 1.5, opacity: n.read ? 0.5 : 1 }}>
                                                {n.message}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                                                <span style={{
                                                    fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                                                    background: `${sourceColor}15`, color: sourceColor,
                                                    fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase',
                                                }}>
                                                    {sourceIcon} {n.source}
                                                </span>
                                                <span style={{
                                                    fontSize: '9px', padding: '1px 5px', borderRadius: '3px',
                                                    background: `${pri.color}15`, color: pri.color,
                                                    fontFamily: 'var(--font-mono)', fontWeight: 700,
                                                }}>
                                                    {pri.label}
                                                </span>
                                                <span style={{
                                                    fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                                                }}>
                                                    {catIcon} {n.category || 'general'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                                        {formatTime(n.timestamp)}
                                    </span>
                                </div>

                                {/* Action Buttons */}
                                {n.actions && n.actions.length > 0 && !n.read && (
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', marginLeft: '18px' }}>
                                        {n.actions.map((action, j) => (
                                            <button key={j} onClick={(e) => {
                                                e.stopPropagation();
                                                if (onExecuteCommand) onExecuteCommand(action.command);
                                                markRead(i);
                                            }} style={{
                                                padding: '4px 10px', borderRadius: '5px', fontSize: '10px',
                                                fontWeight: 600, fontFamily: 'var(--font-mono)', cursor: 'pointer',
                                                background: j === 0 ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.06)',
                                                border: `1px solid ${j === 0 ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                                color: j === 0 ? '#38bdf8' : 'var(--text-secondary)',
                                                transition: 'all 0.2s',
                                            }}
                                                onMouseOver={(e) => e.currentTarget.style.background = j === 0 ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.1)'}
                                                onMouseOut={(e) => e.currentTarget.style.background = j === 0 ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.06)'}
                                            >
                                                {action.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
