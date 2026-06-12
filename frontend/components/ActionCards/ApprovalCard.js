export default function ApprovalCard({ data, toolName, onResolve }) {
    if (!data) return null;

    return (
        <div className="glass-card" style={{
            padding: '16px', marginTop: '12px',
            borderLeft: '4px solid #fbbf24',
            background: 'rgba(251, 191, 36, 0.05)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <h4 style={{ margin: 0, fontSize: '14px', color: '#fbbf24', fontWeight: 600 }}>
                    Approval Required
                </h4>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                Agent wants to execute <strong>{toolName}</strong> with the following parameters:
            </p>

            <pre style={{
                background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px',
                fontSize: '11px', overflowX: 'auto', marginBottom: '16px',
                color: 'var(--text-primary)', fontFamily: 'var(--font-mono)'
            }}>
                {JSON.stringify(data, null, 2)}
            </pre>

            <div style={{ display: 'flex', gap: '12px' }}>
                <button
                    onClick={() => onResolve('approved')}
                    style={{
                        flex: 1, padding: '8px', borderRadius: '6px', border: 'none',
                        background: '#4ade80', color: '#000', fontWeight: 600,
                        cursor: 'pointer', fontSize: '13px'
                    }}>
                    Approve
                </button>
                <button
                    onClick={() => onResolve('rejected')}
                    style={{
                        flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent', color: '#f87171', fontWeight: 600,
                        cursor: 'pointer', fontSize: '13px'
                    }}>
                    Reject
                </button>
            </div>
        </div>
    );
}
