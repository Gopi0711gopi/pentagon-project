export default function FinanceCard({ data, toolName }) {
    if (!data) return null;

    // Render different views based on the tool executed
    if (toolName === 'get_balance') {
        const available = data.available?.[0]?.amount / 100 || 0;
        const pending = data.pending?.[0]?.amount / 100 || 0;
        const currency = data.available?.[0]?.currency?.toUpperCase() || 'USD';

        return (
            <div className="glass-card" style={{ padding: '16px', marginTop: '12px', borderLeft: '4px solid #4ade80' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', color: '#4ade80' }}>Stripe Balance</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Live Data</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Available</div>
                        <div style={{ fontSize: '20px', fontWeight: 600, color: '#fff' }}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(available)}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Pending</div>
                        <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(pending)}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (toolName === 'list_transactions' || toolName === 'list_invoices') {
        const items = data.data || data.invoices || [];
        return (
            <div className="glass-card" style={{ padding: '0', marginTop: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {toolName === 'list_invoices' ? 'Recent Invoices' : 'Recent Transactions'}
                    </h4>
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {items.map((item, i) => (
                        <div key={item.id || i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                            fontSize: '12px'
                        }}>
                            <div>
                                <div style={{ color: 'var(--text-primary)' }}>{item.description || item.customer_email || 'Payment'}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(item.created * 1000).toLocaleDateString()}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 600, color: item.amount > 0 ? '#4ade80' : 'var(--text-primary)' }}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'usd' }).format(item.amount / 100)}
                                </div>
                                <div style={{ fontSize: '10px', color: item.status === 'paid' ? '#4ade80' : '#fbbf24' }}>
                                    {item.status?.toUpperCase()}
                                </div>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                            No records found.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <pre style={{
            background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px',
            fontSize: '11px', overflowX: 'auto', marginTop: '12px'
        }}>
            {JSON.stringify(data, null, 2)}
        </pre>
    );
}
