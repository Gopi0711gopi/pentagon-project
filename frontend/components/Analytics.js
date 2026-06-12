'use client';

import { useState, useEffect } from 'react';
import { BarChart, DonutChart, SparkLine } from './Charts';
import ActivityHeatmap from './ActivityHeatmap';

export default function Analytics() {
    const [overview, setOverview] = useState(null);
    const [agents, setAgents] = useState(null);
    const [history, setHistory] = useState(null);
    const [filters, setFilters] = useState({ agent: '', status: '', date: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('http://localhost:8000/api/analytics/overview').then(r => r.json()),
            fetch('http://localhost:8000/api/analytics/agents').then(r => r.json()),
            fetch('http://localhost:8000/api/analytics/history?limit=15').then(r => r.json()),
        ]).then(([o, a, h]) => {
            setOverview(o); setAgents(a); setHistory(h); setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const fetchHistory = (newFilters) => {
        const params = new URLSearchParams({ limit: '15' });
        if (newFilters.agent) params.set('agent', newFilters.agent);
        if (newFilters.status) params.set('status', newFilters.status);
        if (newFilters.date) params.set('date', newFilters.date);

        fetch(`http://localhost:8000/api/analytics/history?${params}`)
            .then(r => r.json())
            .then(setHistory);
    };

    const toggleFilter = (key, value) => {
        setFilters(prev => {
            const next = { ...prev, [key]: prev[key] === value ? '' : value };
            fetchHistory(next);
            return next;
        });
    };

    if (loading) return <div className="animate-fade-in"><div className="section-header"><h2>Agent Analytics</h2></div><div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading analytics...</div></div>;

    const agentList = agents ? Object.values(agents) : [];
    const agentColors = { guardian: '#a78bfa', financier: '#4ade80', scout: '#38bdf8', operator: '#fbbf24', liaison: '#f472b6' };

    const exportCSV = () => {
        if (!history || !history.tasks) return;

        const headers = ['ID', 'Task', 'Agents', 'Status', 'Duration (s)', 'Timestamp'];
        const rows = history.tasks.map(t => [
            t.id,
            `"${t.task.replace(/"/g, '""')}"`,
            `"${t.agents.join(', ')}"`,
            t.status,
            t.duration_sec,
            t.timestamp
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ecomind-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800 }}>
                        <span className="gradient-text">Agent Analytics</span> 📊
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Performance metrics across all Ecomind agents
                    </p>
                </div>
                {/* Active Filters & Export */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {(filters.agent || filters.status || filters.date) && (
                        <div style={{ display: 'flex', gap: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '12px' }}>
                            {filters.date && <FilterChip label={filters.date} onClear={() => toggleFilter('date', filters.date)} />}
                            {filters.agent && <FilterChip label={filters.agent} onClear={() => toggleFilter('agent', filters.agent)} color={agentColors[filters.agent]} />}
                            {filters.status && <FilterChip label={filters.status} onClear={() => toggleFilter('status', filters.status)} />}
                            <button onClick={() => { setFilters({ agent: '', status: '', date: '' }); fetchHistory({}); }}
                                style={{ fontSize: '11px', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                Clear All
                            </button>
                        </div>
                    )}
                    <button onClick={exportCSV} className="animate-icon-jump" style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', color: 'var(--text-primary)', fontSize: '12px',
                        fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                        <span className="icon">⬇️</span> Download CSV
                    </button>
                </div>
            </div>

            {/* Overview Stats */}
            {overview && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                    <MiniStat icon="📋" value={overview.total_tasks} label="Total Tasks" color="#38bdf8" />
                    <MiniStat icon="✅" value={overview.completed} label="Completed" color="#4ade80" />
                    <MiniStat icon="❌" value={overview.failed} label="Failed" color="#f87171" />
                    <MiniStat icon="📈" value={`${overview.success_rate}%`} label="Success Rate" color="#a78bfa" />
                    <MiniStat icon="⏱️" value={`${overview.avg_duration_sec}s`} label="Avg Duration" color="#fbbf24" />
                    <MiniStat icon="🔥" value={overview.tasks_today} label="Today" color="#f472b6" />
                </div>
            )}

            {/* Charts Row */}
            {overview && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <BarChart
                            data={overview.daily_chart.labels.map((label, i) => ({
                                label,
                                value: overview.daily_chart.values[i],
                                color: filters.date === overview.daily_chart.dates?.[i] ? '#38bdf8' : '#38bdf8',
                                date: overview.daily_chart.dates?.[i]
                            }))}
                            width={480} height={200} label="Tasks Per Day (Last 7 Days)"
                            selectedLabel={overview.daily_chart.labels.find((_, i) => overview.daily_chart.dates[i] === filters.date)}
                            onClick={(d) => toggleFilter('date', d.date)}
                        />
                    </div>
                    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <DonutChart
                            segments={Object.entries(overview.agent_usage).map(([name, count]) => ({
                                label: name.charAt(0).toUpperCase() + name.slice(1),
                                value: count,
                                color: agentColors[name] || '#64748b',
                            }))}
                            size={150} thickness={20} label="Agent Usage"
                            selectedLabel={filters.agent ? filters.agent.charAt(0).toUpperCase() + filters.agent.slice(1) : ''}
                            onClick={(d) => toggleFilter('agent', d.label.toLowerCase())}
                        />
                    </div>
                </div>
            )}

            {/* Heatmap */}
            <div style={{ marginBottom: '24px' }}>
                <ActivityHeatmap selectedDate={filters.date} onDateSelect={(d) => toggleFilter('date', d)} />
            </div>

            {/* Agent Performance Cards */}
            <div className="section-header" style={{ marginBottom: '16px' }}><h2 style={{ fontSize: '16px' }}>⚡ Agent Performance</h2></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                {agentList.map((agent) => (
                    <div key={agent.agent} className="glass-card" style={{ padding: '20px', cursor: 'pointer', border: filters.agent === agent.agent ? `1px solid ${agentColors[agent.agent]}` : '1px solid transparent' }}
                        onClick={() => toggleFilter('agent', agent.agent)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: agentColors[agent.agent] }} />
                                <span style={{ fontWeight: 700, fontSize: '15px', textTransform: 'capitalize' }}>{agent.agent}</span>
                            </div>
                            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '5px', fontFamily: 'var(--font-mono)', fontWeight: 700, background: agent.uptime_pct > 99 ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)', color: agent.uptime_pct > 99 ? '#4ade80' : '#fbbf24' }}>
                                {agent.uptime_pct}% uptime
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: agentColors[agent.agent] }}>{agent.tasks_handled}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tasks</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: agent.success_rate >= 90 ? '#4ade80' : '#fbbf24' }}>{agent.success_rate}%</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Success</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{agent.avg_response_time}s</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Avg Time</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: agent.errors_this_week > 0 ? '#f87171' : '#4ade80' }}>{agent.errors_this_week}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Errors</div>
                            </div>
                        </div>

                        <SparkLine data={agent.trend_7d} width={240} height={36} color={agentColors[agent.agent]} />
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>7-day task trend</div>
                    </div>
                ))}
            </div>

            {/* Task History */}
            <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700 }}>📜 Task History</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select value={filters.agent} onChange={(e) => toggleFilter('agent', e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                            <option value="">All Agents</option>
                            {['guardian', 'financier', 'scout', 'operator', 'liaison'].map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        <select value={filters.status} onChange={(e) => toggleFilter('status', e.target.value)}
                            style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                            <option value="">All Status</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                </div>

                {history && history.tasks && history.tasks.length > 0 ? history.tasks.map((task, i) => (
                    <div key={task.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 0', borderBottom: i < history.tasks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 500 }}>{task.task}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {task.agents.map(a => (
                                    <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: agentColors[a], display: 'inline-block' }} />
                                        {a}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '120px' }}>
                            <StatusBadge status={task.status} />
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                                {task.duration_sec}s · {new Date(task.timestamp).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        No tasks found for selected filters.
                    </div>
                )}
                {history && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', fontFamily: 'var(--font-mono)' }}>Showing {history.tasks?.length || 0} of {history.total} tasks</div>}
            </div>
        </div>
    );
}

function FilterChip({ label, onClear, color }) {
    return (
        <span style={{
            fontSize: '11px', padding: '4px 8px', borderRadius: '12px',
            background: color ? `${color}20` : 'rgba(255,255,255,0.1)',
            border: `1px solid ${color || 'rgba(255,255,255,0.2)'}`,
            color: color || '#fff', display: 'flex', alignItems: 'center', gap: '6px',
            fontFamily: 'var(--font-mono)'
        }}>
            {label}
            <button onClick={onClear} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: '10px' }}>✕</button>
        </span>
    );
}

function MiniStat({ icon, value, label, color }) {
    return (
        <div className="glass-card animate-icon-pop" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
            <span className="icon" style={{ fontSize: '16px', marginBottom: '4px' }}>{icon}</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</div>
        </div>
    );
}

function StatusBadge({ status }) {
    const c = { completed: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' }, failed: { bg: 'rgba(248,113,113,0.15)', color: '#f87171' }, pending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' } };
    const s = c[status] || c.pending;
    return <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '5px', fontFamily: 'var(--font-mono)', background: s.bg, color: s.color }}>{status}</span>;
}
