'use client';

import { useState, useEffect, useMemo } from 'react';

export default function ActivityHeatmap({ selectedDate, onDateSelect }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hovered, setHovered] = useState(null);

    useEffect(() => {
        fetch('http://localhost:8000/api/analytics/heatmap')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    // Generate last 180 days (approx 6 months)
    const days = useMemo(() => {
        const d = [];
        const now = new Date();
        for (let i = 179; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const key = date.toISOString().split('T')[0];
            d.push({ date: key, val: data ? (data[key] || 0) : 0 });
        }
        return d;
    }, [data]);

    if (loading) return <div className="glass-card" style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading activity...</div>;

    // Color scale
    const getColor = (val) => {
        if (val === 0) return 'rgba(255,255,255,0.03)';
        if (val < 5) return 'rgba(56, 189, 248, 0.2)';
        if (val < 10) return 'rgba(56, 189, 248, 0.4)';
        if (val < 20) return 'rgba(56, 189, 248, 0.7)';
        return '#38bdf8';
    };

    return (
        <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Contribution Activity</h3>

            <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column', gap: '3px', width: 'max-content' }}>
                {days.map((d, i) => (
                    <div
                        key={d.date}
                        onMouseEnter={() => setHovered({ date: d.date, val: d.val })}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => onDateSelect && onDateSelect(d.date)}
                        style={{
                            width: '10px', height: '10px', borderRadius: '2px', background: getColor(d.val),
                            position: 'relative', cursor: 'pointer', transition: 'all 0.1s',
                            boxShadow: selectedDate === d.date ? '0 0 0 2px #fff' : 'none',
                            zIndex: selectedDate === d.date ? 10 : 1
                        }}
                    >
                        {/* Simple CSS Tooltip */}
                        {hovered && hovered.date === d.date && (
                            <div style={{
                                position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '6px',
                                background: 'rgba(15, 23, 42, 0.9)', color: '#fff', padding: '4px 8px', borderRadius: '4px',
                                fontSize: '10px', whiteSpace: 'nowrap', zIndex: 100, pointerEvents: 'none',
                                border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', fontWeight: 600
                            }}>
                                {d.val} tasks on {d.date}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)', marginTop: '12px', justifyContent: 'flex-end', fontFamily: 'var(--font-mono)' }}>
                <span>Less</span>
                <div style={{ width: 10, height: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 2 }} />
                <div style={{ width: 10, height: 10, background: 'rgba(56, 189, 248, 0.2)', borderRadius: 2 }} />
                <div style={{ width: 10, height: 10, background: 'rgba(56, 189, 248, 0.4)', borderRadius: 2 }} />
                <div style={{ width: 10, height: 10, background: 'rgba(56, 189, 248, 0.7)', borderRadius: 2 }} />
                <div style={{ width: 10, height: 10, background: '#38bdf8', borderRadius: 2 }} />
                <span>More</span>
            </div>
        </div>
    );
}
