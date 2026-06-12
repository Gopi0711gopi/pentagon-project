'use client';

import { useState, useEffect } from 'react';

export default function ActivityLog() {
    const [data, setData] = useState(null);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:8000/api/activity?limit=30').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const filterByAgent = (agent) => {
        setFilter(agent);
        const url = agent ? `http://localhost:8000/api/activity?limit=30&agent=${agent}` : 'http://localhost:8000/api/activity?limit=30';
        fetch(url).then(r => r.json()).then(setData);
    };

    if (loading) return <div className="animate-fade-in"><div className="section-header"><h2>Activity Log</h2></div><div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div></div>;

    const agentColors = { guardian: '#a78bfa', financier: '#4ade80', scout: '#38bdf8', operator: '#fbbf24', liaison: '#f472b6', system: '#64748b' };
    const statusIcons = { completed: '✅', failed: '❌', pending: '⏳' };
    const tasks = data?.tasks || [];
    const auditEvents = data?.audit || [];

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800 }}><span className="gradient-text">Activity Log</span> 📜</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Complete audit trail of all Ecomind operations</p>
            </div>

            {/* Agent Filter Chips */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <Chip label="All" active={filter === ''} onClick={() => filterByAgent('')} color="#38bdf8" />
                {['guardian', 'financier', 'scout', 'operator', 'liaison'].map(a => (
                    <Chip key={a} label={a} active={filter === a} onClick={() => filterByAgent(a)} color={agentColors[a]} />
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
                {/* Task Timeline */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Task Timeline</h3>
                    {tasks.map((task, i) => (
                        <div key={task.id} style={{ display: 'flex', gap: '14px', paddingBottom: '16px', marginBottom: '16px', borderBottom: i < tasks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            {/* Timeline dot */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '32px' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: task.status === 'completed' ? '#4ade80' : task.status === 'failed' ? '#f87171' : '#fbbf24', boxShadow: `0 0 8px ${task.status === 'completed' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` }} />
                                {i < tasks.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)', marginTop: 4 }} />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{statusIcons[task.status]} {task.task}</div>
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', marginLeft: 8 }}>
                                        {new Date(task.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    {task.agents.map(a => (
                                        <span key={a} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: `${agentColors[a]}20`, color: agentColors[a], fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                            {a}
                                        </span>
                                    ))}
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '2px 6px' }}>
                                        {task.duration_sec}s
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {data?.total_tasks || 0} total tasks recorded
                    </div>
                </div>

                {/* Audit Events */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Audit Events</h3>
                    {auditEvents.length > 0 ? auditEvents.map((evt, i) => (
                        <div key={i} style={{ padding: '10px 0', borderBottom: i < auditEvents.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <div style={{ fontSize: '13px' }}>{evt.action || evt.event || 'System event'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '3px' }}>
                                {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : '—'}
                            </div>
                        </div>
                    )) : (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                            <p style={{ fontSize: '13px' }}>No audit events yet. Execute a task to generate events.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Chip({ label, active, onClick, color }) {
    return (
        <button onClick={onClick} style={{
            padding: '6px 14px', borderRadius: '20px', border: `1px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
            background: active ? `${color}20` : 'transparent', color: active ? color : 'var(--text-muted)',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
            fontFamily: 'var(--font-mono)', transition: 'all 0.2s',
        }}>
            {label}
        </button>
    );
}
