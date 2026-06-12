/**
 * PDF Export utility — generates a styled PDF from invoice data.
 * Uses the browser's print API with a clean formatted document.
 */
export function exportInvoicePDF(invoice) {
    const amount = (invoice.amount / 100).toLocaleString();
    const items = generateItems(invoice);
    const statusColor = {
        overdue: '#ef4444', paid: '#22c55e', open: '#3b82f6', draft: '#a855f7',
    }[invoice.status] || '#64748b';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice - ${invoice.customer}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #1e293b;
      padding: 48px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
    }
    .logo { font-size: 28px; font-weight: 800; color: #0f172a; }
    .logo span { color: #38bdf8; }
    .invoice-title { font-size: 32px; font-weight: 300; color: #64748b; text-align: right; }
    .invoice-id { font-size: 14px; color: #94a3b8; font-family: monospace; text-align: right; margin-top: 4px; }
    .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .detail-block { }
    .detail-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600; margin-bottom: 4px; }
    .detail-value { font-size: 14px; color: #1e293b; font-weight: 500; }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: white;
      background: ${statusColor};
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    th {
      text-align: left; padding: 12px 16px;
      font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
      color: #94a3b8; font-weight: 600;
      border-bottom: 2px solid #e2e8f0;
    }
    th:last-child, td:last-child { text-align: right; }
    th:nth-child(2), td:nth-child(2) { text-align: center; }
    th:nth-child(3), td:nth-child(3) { text-align: right; }
    td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
    .total-row td { border-top: 2px solid #e2e8f0; border-bottom: none; font-weight: 700; font-size: 18px; }
    .total-row td:last-child { color: #0f172a; }
    .footer {
      margin-top: 48px; padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      text-align: center; font-size: 12px; color: #94a3b8;
    }
    .amount-box {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
      padding: 24px; text-align: center; margin-bottom: 32px;
    }
    .amount-box .amount { font-size: 36px; font-weight: 700; color: #0f172a; }
    .amount-box .label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
    @media print {
      body { padding: 24px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">⬠ PENTA<span>GON</span></div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Agentic Workflow Orchestrator</div>
    </div>
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-id">${invoice.id || '#INV-' + Math.random().toString(36).slice(2, 8).toUpperCase()}</div>
    </div>
  </div>

  <div class="details">
    <div class="detail-block">
      <div class="detail-label">Bill To</div>
      <div class="detail-value" style="font-size: 18px; font-weight: 700;">${invoice.customer}</div>
      <div class="detail-value" style="color: #64748b; margin-top: 4px;">accounts@${invoice.customer.toLowerCase().replace(/\s+/g, '')}.com</div>
    </div>
    <div class="detail-block" style="text-align: right;">
      <div class="detail-label">Status</div>
      <div><span class="status">${invoice.status}</span></div>
      <div style="margin-top: 12px;">
        <div class="detail-label">Due Date</div>
        <div class="detail-value">${invoice.due_date || new Date().toLocaleDateString()}</div>
      </div>
      ${invoice.days_overdue > 0 ? `<div style="margin-top: 8px; color: #ef4444; font-size: 12px; font-weight: 600;">${invoice.days_overdue} days overdue</div>` : ''}
    </div>
  </div>

  <div class="amount-box">
    <div class="label">Amount Due</div>
    <div class="amount">$${amount}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td>${item.qty}</td>
          <td>$${item.rate.toLocaleString()}</td>
          <td>$${(item.qty * item.rate).toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3" style="text-align: right;">Total</td>
        <td>$${amount}</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">
    <p>Generated by Ecomind Orchestrator · ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <p style="margin-top: 4px;">This is a system-generated document.</p>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
        printWindow.print();
    };
}

function generateItems(inv) {
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
