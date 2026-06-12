'use client';

import { useState, useEffect } from 'react';

const agentColors = {
    guardian: '#f87171', financier: '#4ade80', scout: '#60a5fa',
    operator: '#fbbf24', liaison: '#38bdf8', system: '#a78bfa',
};
const agentIcons = {
    guardian: '🛡️', financier: '💰', scout: '🔍',
    operator: '⚙️', liaison: '👑', system: '🧠',
};

export default function History({ onReplay }) {
    const [conversations, setConversations] = useState([]);
    const [stats, setStats] = useState({});
    const [selected, setSelected] = useState(null);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/history');
            const data = await res.json();
            setConversations(data.conversations || []);
            setStats({ total: data.total_conversations, traces: data.total_traces });
            setLoading(false);
        } catch { setLoading(false); }
    };

    const viewDetail = async (id) => {
        setSelected(id);
        try {
            const res = await fetch(`http://localhost:8000/api/history/${id}`);
            const data = await res.json();
            setDetail(data);
        } catch { }
    };

    const deleteConv = async (id, e) => {
        e.stopPropagation();
        await fetch(`http://localhost:8000/api/history/${id}`, { method: 'DELETE' });
        setConversations(c => c.filter(x => x.id !== id));
        if (selected === id) { setSelected(null); setDetail(null); }
    };

    const clearAll = async () => {
        if (!confirm('Clear all conversation history?')) return;
        await fetch('http://localhost:8000/api/history', { method: 'DELETE' });
        setConversations([]);
        setSelected(null);
        setDetail(null);
    };

    const formatTime = (iso) => {
        const d = new Date(iso);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    if (loading) return (
        <div className="animate-fade-in">
            <div className="section-header"><h2>History</h2></div>
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading conversations...</div>
        </div>
    );

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800 }}><span className="gradient-text">History</span> 💬</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        {stats.total || 0} conversations · {stats.traces || 0} total traces
                    </p>
                </div>
                {conversations.length > 0 && (
                    <button onClick={clearAll} style={{
                        padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(248,113,113,0.3)',
                        background: 'rgba(248,113,113,0.1)', color: '#f87171', cursor: 'pointer',
                        fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-mono)',
                    }}>
                        🗑️ Clear All
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selected ? '340px 1fr' : '1fr', gap: '16px' }}>
                {/* Conversation List */}
                <div className="glass-card" style={{ padding: '12px', maxHeight: '700px', overflow: 'auto' }}>
                    {conversations.length === 0 ? (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
                            <p>No conversations yet. Run a command to get started!</p>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => viewDetail(conv.id)}
                                style={{
                                    padding: '14px', borderRadius: '10px', marginBottom: '6px', cursor: 'pointer',
                                    background: selected === conv.id ? 'rgba(56,189,248,0.1)' : 'transparent',
                                    border: `1px solid ${selected === conv.id ? 'rgba(56,189,248,0.3)' : 'transparent'}`,
                                    transition: 'all 0.2s',
                                }}
                                onMouseOver={(e) => { if (selected !== conv.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                onMouseOut={(e) => { if (selected !== conv.id) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.4, flex: 1, marginRight: '8px' }}>
                                        {conv.command.length > 60 ? conv.command.slice(0, 60) + '...' : conv.command}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                            {formatTime(conv.created_at)}
                                        </span>
                                        <button
                                            onClick={(e) => deleteConv(conv.id, e)}
                                            style={{
                                                background: 'none', border: 'none', color: 'var(--text-muted)',
                                                cursor: 'pointer', fontSize: '12px', padding: '2px 4px',
                                                opacity: 0.5, transition: 'opacity 0.2s',
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                                            onMouseOut={(e) => e.currentTarget.style.opacity = 0.5}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    {conv.agents_used.map(a => (
                                        <span key={a} style={{
                                            fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                                            background: `${agentColors[a] || '#666'}15`,
                                            color: agentColors[a] || '#666',
                                            fontFamily: 'var(--font-mono)', fontWeight: 600,
                                            textTransform: 'uppercase',
                                        }}>
                                            {agentIcons[a] || '🤖'} {a}
                                        </span>
                                    ))}
                                    <span style={{
                                        fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                                        marginLeft: 'auto',
                                    }}>
                                        {conv.trace_count} traces · {conv.duration_ms}ms
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Detail View */}
                {selected && detail && (
                    <div className="glass-card" style={{ padding: '20px', maxHeight: '700px', overflow: 'auto' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{detail.command}</div>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                <span>{new Date(detail.created_at).toLocaleString()}</span>
                                <span>{detail.trace_count} traces</span>
                                <span>{detail.duration_ms}ms</span>
                            </div>
                        </div>

                        {/* Mini trace replay */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {detail.traces.map((trace, i) => (
                                <div key={i} style={{
                                    padding: '10px 12px', borderRadius: '8px',
                                    borderLeft: `3px solid ${agentColors[trace.agent] || '#666'}33`,
                                    background: 'rgba(255,255,255,0.02)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                        <span style={{
                                            fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                                            background: `${agentColors[trace.agent] || '#666'}20`,
                                            color: agentColors[trace.agent] || '#666',
                                            fontWeight: 700, textTransform: 'uppercase',
                                            fontFamily: 'var(--font-mono)',
                                        }}>
                                            {agentIcons[trace.agent] || '🤖'} {trace.agent}
                                        </span>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            {trace.event_type?.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: '12px', lineHeight: 1.5, color: 'var(--text-secondary)',
                                        whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)',
                                    }}>
                                        {trace.content?.length > 200 ? trace.content.slice(0, 200) + '...' : trace.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
