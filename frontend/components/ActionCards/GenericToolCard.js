export default function GenericToolCard({ data, toolName }) {
    if (!data) return null;

    return (
        <div className="glass-card" style={{ padding: '0', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{
                padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <h4 style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    OUTPUT: {toolName}
                </h4>
            </div>
            <pre style={{
                margin: 0, padding: '12px',
                fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)',
                overflowX: 'auto', whiteSpace: 'pre-wrap'
            }}>
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
}
