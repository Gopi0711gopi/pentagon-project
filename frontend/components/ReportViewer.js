'use client';

import { useState, useEffect } from 'react';
import { BarChart, SparkLine } from './Charts';

export default function ReportViewer() {
    const [report, setReport] = useState(null);
    const [type, setType] = useState('weekly');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`http://localhost:8000/api/reports/${type}`).then(r => r.json()).then(d => { setReport(d); setLoading(false); }).catch(() => setLoading(false));
    }, [type]);

    const exportHTML = () => {
        const w = window.open(`http://localhost:8000/api/reports/${type}/html`, '_blank');
        setTimeout(() => w && w.print(), 1500);
    };

    if (loading) return <div className="animate-fade-in"><div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Generating report...</div></div>;
    if (!report) return <div className="empty-state">Could not generate report.</div>;

    const agentColors = { guardian: '#a78bfa', financier: '#4ade80', scout: '#38bdf8', operator: '#fbbf24', liaison: '#f472b6' };

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800 }}><span className="gradient-text">Reports</span> 📑</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{report.period}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <ToggleBtn label="Weekly" active={type === 'weekly'} onClick={() => setType('weekly')} />
                    <ToggleBtn label="Monthly" active={type === 'monthly'} onClick={() => setType('monthly')} />
                    <button onClick={exportHTML} style={{
                        padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.3)',
                        background: 'rgba(56,189,248,0.1)', color: '#38bdf8', cursor: 'pointer',
                        fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
                    }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(56,189,248,0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(56,189,248,0.1)'}
                    >📄 Export PDF</button>
                </div>
            </div>

            {/* Executive Summary */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>📋 Executive Summary</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {report.executive_summary.highlights.map((h, i) => (
                        <li key={i} style={{ padding: '8px 0', borderBottom: i < report.executive_summary.highlights.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', fontSize: '14px', display: 'flex', gap: '8px', color: 'var(--text-secondary)' }}>
                            <span style={{ color: '#4ade80' }}>▸</span> {h}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <StatBox value={report.task_metrics.total} label="Total Tasks" color="#38bdf8" />
                <StatBox value={`${report.task_metrics.success_rate}%`} label="Success Rate" color="#4ade80" />
                <StatBox value={`${report.task_metrics.avg_duration}s`} label="Avg Duration" color="#fbbf24" />
                <StatBox value={report.task_metrics.completed} label="Completed" color="#a78bfa" />
                <StatBox value={report.task_metrics.failed} label="Failed" color="#f87171" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Daily Breakdown Chart */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <BarChart
                        data={report.task_metrics.daily_breakdown.labels.map((l, i) => ({
                            label: l, value: report.task_metrics.daily_breakdown.values[i], color: '#38bdf8',
                        }))}
                        width={440} height={180} label="Daily Task Volume"
                    />
                </div>

                {/* Agent Table */}
                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>⚡ Agent Performance</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {['Agent', 'Tasks', 'Success', 'Errors'].map(h => (
                                    <th key={h} style={{ textAlign: h === 'Agent' ? 'left' : 'center', padding: '8px 6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {report.agent_performance.map(a => (
                                <tr key={a.agent}>
                                    <td style={{ padding: '10px 6px', fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>
                                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: agentColors[a.agent], marginRight: 8 }} />
                                        {a.agent}
                                    </td>
                                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{a.tasks}</td>
                                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '13px', color: a.success_rate >= 90 ? '#4ade80' : '#fbbf24' }}>{a.success_rate}%</td>
                                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '13px', color: a.errors > 0 ? '#f87171' : '#4ade80' }}>{a.errors}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Finance & Recommendations */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>💰 Finance</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                        <div><div style={{ fontSize: '20px', fontWeight: 800, color: '#4ade80' }}>${(report.finance_summary.revenue_mtd / 100).toLocaleString()}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Revenue MTD</div></div>
                        <div><div style={{ fontSize: '20px', fontWeight: 800, color: '#f87171' }}>${(report.finance_summary.total_overdue / 100).toLocaleString()}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Overdue</div></div>
                    </div>
                    {report.finance_summary.invoices.map((inv, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' }}>
                            <span>{inv.customer}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>${(inv.amount / 100).toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                <div className="glass-card" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>💡 Recommendations</h3>
                    {report.recommendations.map((r, i) => (
                        <div key={i} style={{ padding: '10px 0', borderBottom: i < report.recommendations.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                            <span style={{ color: '#fbbf24' }}>{i + 1}.</span> {r}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StatBox({ value, label, color }) {
    return (
        <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
        </div>
    );
}

function ToggleBtn({ label, active, onClick }) {
    return (
        <button onClick={onClick} style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-mono)', transition: 'all 0.2s',
            background: active ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${active ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: active ? '#38bdf8' : 'var(--text-muted)',
        }}>
            {label}
        </button>
    );
}
