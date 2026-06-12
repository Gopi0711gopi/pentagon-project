'use client';

export default function AgentStatusCard({ name, icon, status = 'idle', cpu = 0, memory = 0, lastActive, tasksRunning = 0 }) {
    const colors = {
        guardian: '#a78bfa', financier: '#4ade80', scout: '#38bdf8',
        operator: '#fbbf24', liaison: '#f472b6',
    };
    const color = colors[name.toLowerCase()] || '#64748b';

    const statusColors = {
        active: '#4ade80',
        idle: '#fbbf24',
        offline: '#f87171',
    };
    const statusColor = statusColors[status] || '#64748b';

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 12px', fontSize: '13px', color: 'var(--text-secondary)',
            borderRadius: '8px', transition: 'background 0.2s',
            cursor: 'default',
        }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
            <span style={{ display: 'flex', alignItems: 'center' }}>
                {icon?.startsWith('/') ? (
                    <img src={icon} alt={name} style={{ width: 18, height: 18, borderRadius: '4px', objectFit: 'cover' }} />
                ) : (
                    icon
                )}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 500, fontSize: '12px' }}>{name}</span>
                    {/* Status dot with pulse */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {tasksRunning > 0 && (
                            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: statusColor, fontWeight: 700 }}>
                                {tasksRunning}
                            </span>
                        )}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: 7, height: 7, borderRadius: '50%',
                                background: statusColor,
                                boxShadow: `0 0 6px ${statusColor}60`,
                            }} />
                            {status === 'active' && (
                                <div style={{
                                    position: 'absolute', inset: -2,
                                    borderRadius: '50%', border: `1px solid ${statusColor}`,
                                    animation: 'pulse 1.5s ease-in-out infinite',
                                    opacity: 0.6,
                                }} />
                            )}
                        </div>
                    </div>
                </div>

                {/* Mini metric bars */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {/* CPU bar */}
                    <div style={{ flex: 1 }}>
                        <div style={{
                            height: 3, borderRadius: 2,
                            background: 'rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%', borderRadius: 2,
                                width: `${Math.min(cpu, 100)}%`,
                                background: cpu > 70 ? '#f87171' : cpu > 40 ? '#fbbf24' : color,
                                transition: 'width 0.8s ease',
                            }} />
                        </div>
                    </div>
                    {/* Memory bar */}
                    <div style={{ flex: 1 }}>
                        <div style={{
                            height: 3, borderRadius: 2,
                            background: 'rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%', borderRadius: 2,
                                width: `${Math.min(memory, 100)}%`,
                                background: memory > 70 ? '#f87171' : memory > 40 ? '#fbbf24' : '#38bdf8',
                                transition: 'width 0.8s ease',
                            }} />
                        </div>
                    </div>
                    <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {cpu}%
                    </span>
                </div>
            </div>
        </div>
    );
}
