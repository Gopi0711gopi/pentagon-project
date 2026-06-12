'use client';

import { useState, useEffect, useMemo } from 'react';
import { BarChart, DonutChart, SparkLine } from './Charts';
import InvoiceDetail from './InvoiceDetail';
import { exportInvoicePDF } from '../utils/exportPDF';

const QUICK_ACTIONS = [
  { icon: '💰', label: 'Check Balance', command: 'Show me the current Stripe balance', color: '#4ade80' },
  { icon: '🔍', label: 'Find Leads', command: 'Find new leads in technology sector', color: '#60a5fa' },
  { icon: '📋', label: 'Overdue Report', command: 'Show overdue invoices and prepare chaser emails', color: '#f87171' },
  { icon: '🛡️', label: 'Security Scan', command: 'Run a full security audit', color: '#a78bfa' },
  { icon: '📊', label: 'Generate Report', command: 'Generate a weekly business report', color: '#fbbf24' },
  { icon: '⚙️', label: 'System Health', command: 'Check system health and run backups', color: '#38bdf8' },
];

const agentColors = {
  guardian: '#f87171', financier: '#4ade80', scout: '#60a5fa',
  operator: '#fbbf24', liaison: '#38bdf8',
};

export default function DailyBrief({ onExecuteCommand }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/daily-brief')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
    // Fetch recent activity
    fetch('http://localhost:8000/api/history?limit=5')
      .then((r) => r.json())
      .then((d) => setRecentActivity(d.conversations || []))
      .catch(() => { });
  }, []);

  // Derive values (may be null) — hooks must come before early returns
  const fin = data?.finance || {};
  const sec = data?.security || {};
  const ops = data?.operations || {};
  const leads = data?.leads || {};
  const invoices = fin.invoices || [];

  // Chart data — memoized to prevent re-animation on parent re-renders
  const revenueChartData = useMemo(() => invoices.map((inv) => ({
    label: inv.customer.split(' ')[0],
    value: inv.amount,
    color: inv.status === 'overdue' ? '#f87171' : inv.status === 'paid' ? '#4ade80' : '#60a5fa',
  })), [invoices]);

  const statusDonut = useMemo(() => [
    { label: 'Overdue', value: fin.overdue_count || 0, color: '#f87171' },
    { label: 'Paid', value: fin.paid_this_week || 0, color: '#4ade80' },
    { label: 'Open', value: Math.max(0, invoices.length - (fin.overdue_count || 0) - (fin.paid_this_week || 0)), color: '#60a5fa' },
  ].filter(s => s.value > 0), [fin.overdue_count, fin.paid_this_week, invoices.length]);

  const threatDonut = useMemo(() => [
    { label: 'Blocked', value: sec.threats_blocked || 0, color: '#f87171' },
    { label: 'Today', value: sec.incidents_today || 0, color: '#fbbf24' },
    { label: 'Clean', value: Math.round((sec.compliance_pct || 96)), color: '#4ade80' },
  ], [sec.threats_blocked, sec.incidents_today, sec.compliance_pct]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="section-header"><h2>Daily Brief</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass-card" style={{ height: '100px', padding: '20px', animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <div className="empty-state"><div className="icon">📋</div><p>Could not load daily brief.</p></div>;

  return (
    <div className="animate-fade-in">
      {/* Greeting */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {data.date}
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0' }}>
          {data.greeting}, <span className="gradient-text">Commander</span> 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
          {data.summary}
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <StatCard icon="💰" value={`$${(fin.total_revenue_mtd / 100).toLocaleString()}`} label="Revenue MTD" color="#4ade80" extra={<SparkLine data={[8200, 9400, 11200, 10800, 12350]} width={120} height={32} color="#4ade80" />} />
        <StatCard icon="🔴" value={fin.overdue_count} label="Overdue Invoices" color="#f87171" sub={`$${(fin.total_overdue / 100).toLocaleString()}`} />
        <StatCard icon="🔍" value={leads.new_count || 5} label="New Leads" color="#60a5fa" sub={`${leads.qualified || 2} qualified`} />
        <StatCard icon="⚙️" value={ops.active_tasks || 3} label="Active Tasks" color="#fbbf24" sub={`${ops.completed_today || 2} done today`} />
        <StatCard icon="🛡️" value={sec.threats_blocked || 7} label="Threats Blocked" color="#a78bfa" sub={`${sec.compliance_pct || 96}% compliance`} />
        <StatCard icon="✅" value={data.approvals?.pending || 4} label="Pending Approvals" color="#38bdf8" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '28px' }}>
        <div className="glass-card" style={{ padding: '24px' }}>
          <BarChart data={revenueChartData} width={560} height={220} label="Invoice Amounts by Client" />
        </div>
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <DonutChart segments={statusDonut} size={160} thickness={22} label="Invoice Status" />
        </div>
      </div>

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* Finance - Clickable Invoices */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div className="section-header">
            <h2 style={{ fontSize: '16px' }}>💰 Invoices</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Click to view details
            </span>
          </div>
          {invoices.map((inv, i) => (
            <div
              key={i}
              onClick={() => setSelectedInvoice(inv)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                marginBottom: '6px', transition: 'all 0.25s ease',
                background: 'rgba(255,255,255,0.02)', border: '1px solid transparent',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.borderColor = 'rgba(56,189,248,0.2)';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: inv.status === 'overdue' ? '#f87171' : inv.status === 'paid' ? '#4ade80' : '#60a5fa',
                }} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{inv.customer}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600 }}>
                  ${(inv.amount / 100).toLocaleString()}
                </span>
                <StatusBadge status={inv.status} />
                <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>→</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Security with chart */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div className="section-header">
              <h2 style={{ fontSize: '16px' }}>🛡️ Security</h2>
              <StatusBadge status={sec.level || 'nominal'} />
            </div>
            <DonutChart segments={threatDonut} size={130} thickness={16} />
          </div>

          {/* Top Prospect */}
          {leads.top_prospect && (
            <div className="glass-card" style={{ padding: '24px' }}>
              <div className="section-header"><h2 style={{ fontSize: '16px' }}>🎯 Top Prospect</h2></div>
              <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{leads.top_prospect.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>{leads.top_prospect.interest}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{
                    width: `${leads.top_prospect.score}%`, height: '100%', borderRadius: 3,
                    background: 'linear-gradient(90deg, #38bdf8, #4ade80)',
                    transition: 'width 1s ease',
                  }} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#4ade80', fontFamily: 'var(--font-mono)' }}>
                  {leads.top_prospect.score}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '10px', cursor: 'pointer' }}>
                → {leads.top_prospect.next_action}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Tasks */}
      {ops.upcoming && ops.upcoming.length > 0 && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div className="section-header"><h2 style={{ fontSize: '16px' }}>⚙️ Upcoming</h2></div>
          {ops.upcoming.map((task, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: i < ops.upcoming.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StatusBadge status={task.priority} />
                <span style={{ fontSize: '14px' }}>{task.title}</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {task.due}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ marginBottom: '28px' }}>
        <div className="section-header" style={{ marginBottom: '12px' }}>
          <h2 style={{ fontSize: '16px' }}>⚡ Quick Actions</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>One-click commands</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {QUICK_ACTIONS.map((action, i) => (
            <button key={i} onClick={() => onExecuteCommand && onExecuteCommand(action.command)} style={{
              padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
              background: `${action.color}08`, border: `1px solid ${action.color}25`,
              display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s',
              textAlign: 'left',
            }}
              onMouseOver={(e) => { e.currentTarget.style.background = `${action.color}15`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 15px ${action.color}15`; }}
              onMouseOut={(e) => { e.currentTarget.style.background = `${action.color}08`; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span style={{ fontSize: '20px' }}>{action.icon}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: action.color }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live Activity Feed */}
      {recentActivity.length > 0 && (
        <div className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
          <div className="section-header" style={{ marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px' }}>📡 Recent Activity</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{recentActivity.length} conversations</span>
          </div>
          {recentActivity.map((conv, i) => (
            <div key={conv.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: i < recentActivity.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.3)',
                }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>
                    {conv.command.length > 50 ? conv.command.slice(0, 50) + '...' : conv.command}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    {(conv.agents_used || []).map(a => (
                      <span key={a} style={{
                        fontSize: '9px', padding: '1px 5px', borderRadius: '3px',
                        background: `${agentColors[a] || '#666'}15`, color: agentColors[a] || '#666',
                        fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase',
                      }}>{a}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                <div>{conv.trace_count} traces</div>
                <div>{conv.duration_ms}ms</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetail
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onExportPDF={(inv) => exportInvoicePDF(inv)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, value, label, color, sub, extra }) {
  return (
    <div className="glass-card" style={{ padding: '18px 20px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        {sub && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{sub}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '8px' }}>
        <div>
          <div style={{ fontSize: '26px', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
        </div>
        {extra && <div>{extra}</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    overdue: { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
    paid: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
    open: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
    draft: { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
    nominal: { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
    high: { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
    medium: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    low: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
  };
  const s = colors[status?.toLowerCase()] || colors.open;
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
      padding: '3px 8px', borderRadius: '5px', fontFamily: 'var(--font-mono)',
      background: s.bg, color: s.color, letterSpacing: '0.5px',
    }}>
      {status}
    </span>
  );
}