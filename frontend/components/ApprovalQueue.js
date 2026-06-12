'use client';

import { useState, useEffect } from 'react';

export default function ApprovalQueue() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = () => {
    fetch('http://localhost:8000/api/approvals')
      .then((res) => res.json())
      .then((data) => { setApprovals(data.approvals || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchApprovals(); }, []);

  const resolveApproval = async (id, status) => {
    try {
      await fetch(`http://localhost:8000/api/approvals/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolved_by: 'user' }),
      });
      fetchApprovals();
    } catch (err) {
      console.error('Failed to resolve approval:', err);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="section-header"><h2>Approvals</h2></div>
        {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: '120px', marginBottom: '12px' }} />)}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="section-header">
        <h2>Approval Queue</h2>
        <span className="badge">{approvals.length} pending</span>
      </div>

      {approvals.length === 0 ? (
        <div className="empty-state">
          <div className="icon">✅</div>
          <p>No pending approvals. Execute a task to generate approval requests for high-value actions.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {approvals.map((approval) => (
            <div key={approval.id} className="approval-card">
              <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px',
                  background: approval.risk_level === 'high' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                  border: `1px solid ${approval.risk_level === 'high' ? 'rgba(248, 113, 113, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                }}>
                  {approval.agent === 'financier' ? '💰' : approval.agent === 'guardian' ? '🛡️' : '⚙️'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span className={`agent-badge ${approval.agent}`}>
                      {approval.agent}
                    </span>
                    <span className={`risk-badge ${approval.risk_level}`}>
                      {approval.risk_level} risk
                    </span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                    {approval.description}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {approval.action_type} · {approval.timestamp}
                  </div>
                  {approval.details && (
                    <div style={{
                      marginTop: '8px', padding: '8px 12px',
                      background: 'var(--bg-surface)', borderRadius: '8px',
                      fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)',
                    }}>
                      {Object.entries(approval.details).map(([k, v]) => (
                        <div key={k}>{k}: {typeof v === 'number' && k === 'amount' ? `$${(v / 100).toLocaleString()}` : String(v)}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="approval-btn approve" onClick={() => resolveApproval(approval.id, 'approved')}>
                    Approve
                  </button>
                  <button className="approval-btn reject" onClick={() => resolveApproval(approval.id, 'rejected')}>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}