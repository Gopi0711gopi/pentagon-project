'use client';

import PentagonViz from './PentagonViz';

export default function WarRoom({ traces = [], isStreaming = false }) {
  const activeAgents = [...new Set(traces.map((t) => t.agent).filter((a) => a !== 'system'))];

  // Compute live stats from traces
  const agentStats = {};
  traces.forEach((t) => {
    if (t.agent && t.agent !== 'system') {
      if (!agentStats[t.agent]) agentStats[t.agent] = { events: 0, actions: 0, thoughts: 0 };
      agentStats[t.agent].events++;
      if (t.event_type === 'agent_action') agentStats[t.agent].actions++;
      if (t.event_type === 'thought_trace') agentStats[t.agent].thoughts++;
    }
  });

  const missionStatus = isStreaming ? 'IN PROGRESS' : traces.length > 0 ? 'COMPLETE' : 'STANDBY';
  const missionColor = isStreaming ? '#fbbf24' : traces.length > 0 ? '#4ade80' : '#64748b';

  const agentColors = {
    guardian: '#f87171', financier: '#4ade80', scout: '#60a5fa',
    operator: '#fbbf24', liaison: '#38bdf8',
  };
  const agentIcons = {
    guardian: '🛡️', financier: '💰', scout: '🔍',
    operator: '⚙️', liaison: '👑',
  };

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <h2>War Room</h2>
        <span className="badge" style={{
          background: `${missionColor}22`, color: missionColor,
          border: `1px solid ${missionColor}44`,
        }}>
          ● {missionStatus}
        </span>
      </div>

      {/* Mission Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Agents Active', value: activeAgents.length, icon: '🤖', color: '#38bdf8' },
          { label: 'Total Events', value: traces.length, icon: '📡', color: '#a78bfa' },
          { label: 'Actions Taken', value: traces.filter(t => t.event_type === 'agent_action').length, icon: '⚡', color: '#fbbf24' },
          { label: 'Approvals', value: traces.filter(t => t.event_type === 'approval_request').length, icon: '⏳', color: '#f87171' },
        ].map(stat => (
          <div key={stat.label} className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>{stat.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: stat.color, fontFamily: 'var(--font-mono)' }}>{stat.value}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="war-room-grid" style={{ display: 'grid', gap: '20px', alignItems: 'start' }}>
        {/* Left: Ecomind Visualization + Agent Roster */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-card" style={{ padding: '32px 20px' }}>
            <PentagonViz activeAgents={activeAgents} size={320} />
            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {isStreaming ? '◉ Processing...' : '○ Awaiting Command'}
              </div>
            </div>
          </div>

          {/* Agent Roster */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              Agent Roster
            </div>
            {['guardian', 'financier', 'scout', 'operator', 'liaison'].map(agent => {
              const isActive = activeAgents.includes(agent);
              const stats = agentStats[agent];
              return (
                <div key={agent} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', borderRadius: '8px', marginBottom: '4px',
                  background: isActive ? `${agentColors[agent]}10` : 'transparent',
                  transition: 'all 0.3s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{agentIcons[agent]}</span>
                    <span style={{
                      fontSize: '12px', fontWeight: 700, textTransform: 'capitalize',
                      color: isActive ? agentColors[agent] : 'var(--text-muted)',
                    }}>{agent}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {stats && (
                      <span style={{
                        fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
                      }}>
                        {stats.events}e · {stats.actions}a
                      </span>
                    )}
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: isActive ? agentColors[agent] : 'rgba(255,255,255,0.1)',
                      boxShadow: isActive ? `0 0 8px ${agentColors[agent]}60` : 'none',
                      transition: 'all 0.3s',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Activity Feed */}
        <div className="glass-card" style={{ padding: '24px', maxHeight: '700px', overflow: 'auto' }}>
          <div className="section-header">
            <h2 style={{ fontSize: '16px' }}>Mission Timeline</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {traces.length} events
            </span>
          </div>

          {traces.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🧠</div>
              <p>Enter a command to activate the Ecomind pipeline. Agents will appear here in real-time.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {traces.map((trace, i) => (
                <TraceItem key={i} trace={trace} index={i} agentColors={agentColors} />
              ))}
              {isStreaming && (
                <div style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px',
                  color: 'var(--accent-cyan)', fontSize: '13px',
                }}>
                  <span className="status-dot working" /> Processing...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TraceItem({ trace, index, agentColors }) {
  const eventIcons = {
    thought_trace: '💭',
    agent_action: '⚡',
    status_update: '📡',
    approval_request: '⏳',
    final_response: '📋',
    collaboration: '🤝',
    memory: '🧠',
  };

  const agentColor = agentColors[trace.agent] || '#38bdf8';

  return (
    <div
      className={`trace-item ${trace.agent || ''}`}
      style={{ animationDelay: `${index * 0.06}s`, borderLeft: `3px solid ${agentColor}33`, paddingLeft: '14px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span className={`agent-badge ${trace.agent || ''}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {trace.agent_icon?.startsWith('/') ? (
            <img src={trace.agent_icon} alt="agent" style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <span>{trace.agent_icon || '🤖'}</span>
          )}
          {trace.agent}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {eventIcons[trace.event_type] || '•'} {trace.event_type?.replace(/_/g, ' ')}
        </span>
        {trace.timestamp && (
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
            {new Date(trace.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
      <div style={{
        fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)',
        whiteSpace: 'pre-wrap',
        fontFamily: trace.event_type === 'final_response' ? 'var(--font-sans)' : 'var(--font-mono)',
      }}>
        {trace.content}
      </div>
    </div>
  );
}