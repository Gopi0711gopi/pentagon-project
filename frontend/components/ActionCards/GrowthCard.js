export default function GrowthCard({ data, toolName }) {
    if (!data) return null;

    if (toolName === 'search_leads') {
        const leads = data.leads || [];
        return (
            <div className="glass-card" style={{ padding: '0', marginTop: '12px', overflow: 'hidden', borderLeft: '4px solid #60a5fa' }}>
                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', color: '#60a5fa' }}>
                        Lead Search Results ({data.count})
                    </h4>
                </div>
                <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    {leads.map((lead, i) => (
                        <div key={i} style={{
                            padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px' }}>{lead.company}</div>
                                <span className="badge" style={{ background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa' }}>{lead.sector}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                                <span>📍 {lead.location}</span>
                                <span>👥 {lead.size} employees</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (toolName === 'qualify_lead') {
        const score = data.score || 0;
        const color = score >= 70 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171';

        return (
            <div className="glass-card" style={{ padding: '16px', marginTop: '12px', borderTop: `4px solid ${color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#fff' }}>{data.company}</h4>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            STATUS:
                            <span style={{ color, fontWeight: 600, textTransform: 'uppercase' }}>{data.status}</span>
                        </div>
                    </div>
                    <div style={{
                        background: `${color}20`, color: color, padding: '4px 8px', borderRadius: '6px',
                        fontWeight: 700, fontSize: '14px'
                    }}>
                        {score}/100
                    </div>
                </div>

                <div style={{
                    marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)',
                    borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5
                }}>
                    {data.reasoning}
                </div>
            </div>
        );
    }

    return null;
}
