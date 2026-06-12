'use client';

import { useState } from 'react';
import { SparkLine } from './Charts';

/**
 * Invoice Detail Panel — shows full invoice info with payment history,
 * line items, and PDF export button.
 */
export default function InvoiceDetail({ invoice, onClose, onExportPDF }) {
    if (!invoice) return null;

    const statusColor = {
        overdue: '#f87171',
        paid: '#4ade80',
        open: '#60a5fa',
        draft: '#a78bfa',
    }[invoice.status] || '#94a3b8';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        }}
            onClick={onClose}
        >
            <div
                className="glass-card animate-fade-in"
                style={{ width: '680px', maxHeight: '85vh', overflow: 'auto', padding: '32px' }}
                onClick={(e) => e.stopPropagation()}
                id="invoice-detail-content"
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                            INVOICE
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
                            {invoice.id || '#INV-001'}
                        </h2>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {invoice.customer}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => onExportPDF && onExportPDF(invoice)}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.3)',
                                background: 'rgba(56,189,248,0.1)', color: '#38bdf8', cursor: 'pointer',
                                fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(56,189,248,0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(56,189,248,0.1)'}
                        >
                            📄 Export PDF
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', cursor: 'pointer',
                                fontSize: '16px',
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Status & Amount */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>AMOUNT</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#4ade80' }}>
                            ${(invoice.amount / 100).toLocaleString()}
                        </div>
                    </div>
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>STATUS</div>
                        <span style={{
                            display: 'inline-block', padding: '4px 12px', borderRadius: '6px',
                            background: `${statusColor}20`, color: statusColor,
                            fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase',
                        }}>
                            {invoice.status}
                        </span>
                        {invoice.days_overdue > 0 && (
                            <div style={{ fontSize: '11px', color: '#f87171', marginTop: '6px' }}>
                                {invoice.days_overdue} days overdue
                            </div>
                        )}
                    </div>
                    <div className="glass-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>DUE DATE</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {invoice.due_date || 'N/A'}
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div style={{ marginBottom: '28px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Line Items
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <th style={thStyle}>Description</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Qty</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Rate</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(invoice.items || defaultItems(invoice)).map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <td style={tdStyle}>{item.description}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>{item.qty}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }}>${item.rate.toLocaleString()}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', color: '#4ade80', fontWeight: 600 }}>${(item.qty * item.rate).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>Total</td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#4ade80', fontSize: '16px' }}>
                                    ${(invoice.amount / 100).toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Payment Trend */}
                <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Payment History (Last 6 Months)
                    </div>
                    <SparkLine
                        data={[2400, 3100, 2800, 4200, 3500, invoice.amount / 100]}
                        width={600}
                        height={80}
                        color={statusColor}
                    />
                </div>
            </div>
        </div>
    );
}

// Generate mock line items from invoice data
function defaultItems(inv) {
    const amount = inv.amount / 100;
    if (amount > 10000) {
        return [
            { description: 'Enterprise License', qty: 1, rate: Math.round(amount * 0.6) },
            { description: 'Implementation & Setup', qty: 1, rate: Math.round(amount * 0.25) },
            { description: 'Support Package', qty: 1, rate: Math.round(amount * 0.15) },
        ];
    }
    return [
        { description: 'Professional Services', qty: 1, rate: Math.round(amount * 0.7) },
        { description: 'Platform Access', qty: 1, rate: Math.round(amount * 0.3) },
    ];
}

const thStyle = {
    padding: '10px 12px', fontSize: '11px', color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.5px',
    fontWeight: 600, textAlign: 'left',
};

const tdStyle = {
    padding: '12px', fontSize: '13px', color: 'var(--text-secondary)',
};
