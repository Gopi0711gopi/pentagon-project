'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import FinanceCard from './ActionCards/FinanceCard';
import GrowthCard from './ActionCards/GrowthCard';
import GenericToolCard from './ActionCards/GenericToolCard';
import ApprovalCard from './ActionCards/ApprovalCard';

const AGENTS_META = {
  guardian: { icon: '/avatars/guardian.png', color: '#f87171', label: 'Guardian' },
  financier: { icon: '/avatars/financier.png', color: '#4ade80', label: 'Financier' },
  scout: { icon: '/avatars/scout.png', color: '#60a5fa', label: 'Scout' },
  operator: { icon: '/avatars/operator.png', color: '#fbbf24', label: 'Operator' },
  liaison: { icon: '/avatars/liaison.png', color: '#38bdf8', label: 'Liaison' },
  system: { icon: '🧠', color: '#a78bfa', label: 'System' },
};

const eventIcons = {
  thought_trace: '💭',
  agent_action: '⚡',
  status_update: '📡',
  approval_request: '⏳',
  final_response: '📋',
  collaboration: '🤝',
  memory: '🧠',
};

const renderIcon = (iconStr, size = 18) => {
  if (iconStr?.startsWith('/')) {
    return <img src={iconStr} alt="icon" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  }
  return <span style={{ fontSize: `${size}px` }}>{iconStr || '🤖'}</span>;
};

export default function ThoughtTrace({ traces = [] }) {
  const bottomRef = useRef(null);

  const handleResolve = async (approvalId, status) => {
    try {
      await fetch(`http://localhost:8000/api/approvals/${approvalId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolved_by: 'user' }),
      });
      // In a real app, we'd optimistically update or re-fetch traces
      alert(`Request ${status}!`);
    } catch (e) {
      console.error("Resolution failed", e);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [traces]);

  // Extract unique agent chain from traces
  const agentChain = useMemo(() => {
    const seen = new Set();
    const chain = [];
    for (const trace of traces) {
      const agent = trace.agent;
      if (agent && !seen.has(agent)) {
        seen.add(agent);
        chain.push(agent);
      }
    }
    return chain;
  }, [traces]);

  // Determine which agent is currently active (latest)
  const activeAgent = traces.length > 0 ? traces[traces.length - 1].agent : null;

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <h2>Thought Trace</h2>
        <span className="badge">{traces.length} events</span>
      </div>

      {traces.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🧠</div>
          <p>Agent thought traces will stream here in real-time when you execute a command.</p>
          <div style={{ marginTop: '16px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Use the command bar below or press <kbd style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>Ctrl+/</kbd> to focus it
          </div>
        </div>
      ) : (
        <>
          {/* Agent Chain Flow Visualization */}
          {agentChain.length > 0 && (
            <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
                Agent Pipeline
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {agentChain.map((agent, i) => {
                  const meta = AGENTS_META[agent] || AGENTS_META.system;
                  const isActive = agent === activeAgent;
                  const isPast = !isActive;
                  return (
                    <div key={agent} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 16px', borderRadius: '12px',
                        background: isActive ? `${meta.color}15` : 'rgba(255,255,255,0.03)',
                        border: `1.5px solid ${isActive ? `${meta.color}60` : 'rgba(255,255,255,0.06)'}`,
                        position: 'relative', transition: 'all 0.3s',
                        opacity: isPast ? 0.7 : 1,
                      }}>
                        {/* Pulse ring for active agent */}
                        {isActive && (
                          <div style={{
                            position: 'absolute', inset: -3, borderRadius: '15px',
                            border: `2px solid ${meta.color}40`,
                            animation: 'pulse 2s ease-in-out infinite',
                          }} />
                        )}
                        {renderIcon(meta.icon, 24)}
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: isActive ? meta.color : 'var(--text-secondary)' }}>
                            {meta.label}
                          </div>
                          <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            {traces.filter(t => t.agent === agent).length} events
                          </div>
                        </div>
                      </div>
                      {/* Arrow connector */}
                      {i < agentChain.length - 1 && (
                        <svg width="28" height="12" viewBox="0 0 28 12" style={{ flexShrink: 0 }}>
                          <defs>
                            <linearGradient id={`arrow-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor={AGENTS_META[agentChain[i]]?.color || '#64748b'} stopOpacity="0.5" />
                              <stop offset="100%" stopColor={AGENTS_META[agentChain[i + 1]]?.color || '#64748b'} stopOpacity="0.5" />
                            </linearGradient>
                          </defs>
                          <line x1="2" y1="6" x2="20" y2="6" stroke={`url(#arrow-grad-${i})`} strokeWidth="1.5" />
                          <polygon points="20,2 28,6 20,10" fill={AGENTS_META[agentChain[i + 1]]?.color || '#64748b'} opacity="0.5" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trace Events */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {traces.map((trace, i) => {
                const meta = AGENTS_META[trace.agent] || AGENTS_META.system;
                return (
                  <div key={i} className={`trace-item ${trace.agent || ''}`} style={{
                    animation: `traceSlideIn 0.4s ease-out ${i * 0.05}s both`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span className={`agent-badge ${trace.agent}`}>
                        {renderIcon(trace.agent_icon || meta.icon, 14)} {trace.agent}
                      </span>
                      <span style={{
                        fontSize: '11px', color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {eventIcons[trace.event_type] || '•'} {trace.event_type?.replace(/_/g, ' ')}
                      </span>
                      {trace.timestamp && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                          {new Date(trace.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    <div style={{
                      fontSize: '13px', lineHeight: 1.7, color: 'var(--text-secondary)',
                      whiteSpace: 'pre-wrap',
                      fontFamily: trace.event_type === 'final_response' ? 'var(--font-sans)' : 'var(--font-mono)',
                      fontWeight: trace.event_type === 'final_response' ? 500 : 400,
                    }}>
                      {trace.content}
                    </div>

                    {/* Action Card Rendering */}
                    {trace.tool_output && (
                      <div className="action-card-container">
                        {['get_balance', 'list_transactions', 'list_invoices', 'create_invoice'].includes(trace.tool_name) ? (
                          <FinanceCard data={trace.tool_output} toolName={trace.tool_name} />
                        ) : ['search_leads', 'qualify_lead'].includes(trace.tool_name) ? (
                          <GrowthCard data={trace.tool_output} toolName={trace.tool_name} />
                        ) : (
                          <GenericToolCard data={trace.tool_output} toolName={trace.tool_name} />
                        )}
                      </div>
                    )}

                    {/* Approval Card Rendering */}
                    {trace.event_type === 'approval_request' && (
                      <ApprovalCard
                        data={trace.params}
                        toolName={trace.tool_name}
                        onResolve={(decision) => handleResolve(trace.approval_id, decision)}
                      />
                    )}

                    {trace.metadata && Object.keys(trace.metadata).length > 0 && (
                      <div style={{
                        marginTop: '8px', padding: '8px 12px',
                        background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
                        fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
                        display: 'flex', gap: '16px', flexWrap: 'wrap',
                      }}>
                        {Object.entries(trace.metadata).map(([k, v]) => (
                          <span key={k}>
                            <span style={{ color: 'var(--accent-cyan)' }}>{k}</span>: {JSON.stringify(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}