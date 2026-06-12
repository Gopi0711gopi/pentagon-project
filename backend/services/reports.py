"""
Ecomind Report Generator — generates weekly/monthly summary reports.
"""
from datetime import datetime, timedelta
import json


class ReportGenerator:
    """Generates comprehensive summary reports for the Ecomind system."""

    def __init__(self, analytics_service, daily_brief_service, memory_manager):
        self.analytics = analytics_service
        self.brief = daily_brief_service
        self.memory = memory_manager

    def generate_weekly_report(self):
        """Generate a weekly summary report."""
        overview = self.analytics.get_overview()
        agent_metrics = self.analytics.get_agent_metrics()
        brief_data = self.brief.generate()

        now = datetime.now()
        week_start = (now - timedelta(days=now.weekday())).strftime('%B %d')
        week_end = now.strftime('%B %d, %Y')

        # Top performing agent
        top_agent = max(agent_metrics.values(), key=lambda a: a['success_rate'])
        # Most active agent
        busiest = max(agent_metrics.values(), key=lambda a: a['tasks_handled'])

        fin = brief_data.get('finance', {})
        sec = brief_data.get('security', {})
        ops = brief_data.get('operations', {})
        leads = brief_data.get('leads', {})

        report = {
            'type': 'weekly',
            'period': f'{week_start} – {week_end}',
            'generated_at': now.isoformat(),
            'executive_summary': {
                'title': f'Ecomind Weekly Report — {week_end}',
                'highlights': [
                    f'{overview["total_tasks"]} tasks processed with {overview["success_rate"]}% success rate',
                    f'Average response time: {overview["avg_duration_sec"]}s per task',
                    f'Top performer: {top_agent["agent"].title()} ({top_agent["success_rate"]}% success)',
                    f'{sec.get("threats_blocked", 0)} security threats blocked · {sec.get("compliance_pct", 96)}% compliance',
                    f'Revenue MTD: ${fin.get("total_revenue_mtd", 0)/100:,.0f} · Overdue: ${fin.get("total_overdue", 0)/100:,.0f}',
                ],
            },
            'task_metrics': {
                'total': overview['total_tasks'],
                'completed': overview['completed'],
                'failed': overview['failed'],
                'pending': overview['pending'],
                'success_rate': overview['success_rate'],
                'avg_duration': overview['avg_duration_sec'],
                'daily_breakdown': overview['daily_chart'],
            },
            'agent_performance': [
                {
                    'agent': name,
                    'tasks': m['tasks_handled'],
                    'success_rate': m['success_rate'],
                    'avg_time': m['avg_response_time'],
                    'uptime': m['uptime_pct'],
                    'errors': m['errors_this_week'],
                    'trend': m['trend_7d'],
                }
                for name, m in agent_metrics.items()
            ],
            'finance_summary': {
                'revenue_mtd': fin.get('total_revenue_mtd', 0),
                'total_overdue': fin.get('total_overdue', 0),
                'overdue_count': fin.get('overdue_count', 0),
                'paid_this_week': fin.get('paid_this_week', 0),
                'invoices': fin.get('invoices', []),
            },
            'security_summary': {
                'threats_blocked': sec.get('threats_blocked', 0),
                'incidents_today': sec.get('incidents_today', 0),
                'compliance': sec.get('compliance_pct', 96),
                'level': sec.get('level', 'nominal'),
            },
            'operations_summary': {
                'active_tasks': ops.get('active_tasks', 0),
                'completed_today': ops.get('completed_today', 0),
                'upcoming': ops.get('upcoming', []),
            },
            'leads_summary': {
                'new_leads': leads.get('new_count', 0),
                'qualified': leads.get('qualified', 0),
                'top_prospect': leads.get('top_prospect'),
            },
            'recommendations': [
                f'Follow up on {fin.get("overdue_count", 0)} overdue invoices totaling ${fin.get("total_overdue", 0)/100:,.0f}',
                f'Schedule demo with {leads.get("top_prospect", {}).get("name", "top prospect")}',
                f'{busiest["agent"].title()} handled the most tasks — consider load balancing',
                'Review and approve pending items in the Approval Queue',
            ],
        }
        return report

    def generate_monthly_report(self):
        """Generate a monthly summary report."""
        weekly = self.generate_weekly_report()
        weekly['type'] = 'monthly'
        now = datetime.now()
        weekly['period'] = now.strftime('%B %Y')
        weekly['executive_summary']['title'] = f'Ecomind Monthly Report — {now.strftime("%B %Y")}'
        return weekly

    def generate_report_html(self, report):
        """Generate a print-ready HTML report."""
        highlights = ''.join(f'<li>{h}</li>' for h in report['executive_summary']['highlights'])
        recommendations = ''.join(f'<li>{r}</li>' for r in report['recommendations'])

        agents_rows = ''.join(f'''
            <tr>
                <td style="font-weight:600">{a["agent"].title()}</td>
                <td>{a["tasks"]}</td>
                <td>{a["success_rate"]}%</td>
                <td>{a["avg_time"]}s</td>
                <td>{a["uptime"]}%</td>
                <td style="color:{'#ef4444' if a['errors'] > 0 else '#22c55e'}">{a["errors"]}</td>
            </tr>
        ''' for a in report['agent_performance'])

        invoices_rows = ''.join(f'''
            <tr>
                <td>{inv["customer"]}</td>
                <td>${inv["amount"]/100:,.0f}</td>
                <td><span class="status-{inv['status']}">{inv["status"].upper()}</span></td>
            </tr>
        ''' for inv in report['finance_summary'].get('invoices', []))

        return f'''<!DOCTYPE html>
<html>
<head>
    <title>{report["executive_summary"]["title"]}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: 'Inter', system-ui, sans-serif; 
            color: #1e293b; 
            padding: 40px; 
            max-width: 850px; 
            margin: 0 auto; 
            line-height: 1.5; 
            background: #fff;
        }}
        h1 {{ font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 2px; letter-spacing: -0.5px; }}
        h2 {{ 
            font-size: 14px; 
            font-weight: 700; 
            color: #0f172a; 
            margin: 32px 0 16px; 
            padding-bottom: 8px; 
            border-bottom: 2px solid #e2e8f0; 
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .subtitle {{ font-size: 14px; color: #64748b; margin-bottom: 24px; }}
        .logo {{ font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }} 
        .logo span {{ color: #38bdf8; }}
        .header {{ 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-end; 
            margin-bottom: 40px; 
            padding-bottom: 20px; 
            border-bottom: 3px solid #0f172a; 
        }}
        .stats {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }}
        .stat {{ 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-radius: 8px; 
            padding: 16px; 
            text-align: center; 
        }}
        .stat .value {{ font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }}
        .stat .label {{ font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-top: 4px; font-weight: 600; }}
        ul {{ padding-left: 20px; margin: 8px 0; }}
        li {{ margin: 6px 0; color: #334155; font-size: 13px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }}
        th {{ 
            text-align: left; 
            padding: 8px 12px; 
            font-size: 10px; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
            color: #64748b; 
            border-bottom: 2px solid #e2e8f0; 
            font-weight: 600;
        }}
        td {{ padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }}
        tr:last-child td {{ border-bottom: none; }}
        .font-mono {{ font-family: 'JetBrains Mono', monospace; }}
        .status-overdue {{ background: #fef2f2; color: #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }}
        .status-paid {{ background: #f0fdf4; color: #22c55e; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }}
        .status-open {{ background: #eff6ff; color: #3b82f6; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }}
        .footer {{ 
            margin-top: 60px; 
            padding-top: 20px; 
            border-top: 1px solid #e2e8f0; 
            text-align: center; 
            font-size: 11px; 
            color: #94a3b8; 
            display: flex;
            justify-content: space-between;
        }}
        @media print {{ 
            body {{ padding: 0; max-width: 100%; }} 
            @page {{ margin: 2cm; }} 
            .stat {{ border: 1px solid #ccc; }}
            h2 {{ break-after: avoid; }}
            table {{ break-inside: avoid; }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <div>
            <div class="logo">⬠ PENTA<span>GON</span></div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px">Agentic Workflow Orchestrator</div>
        </div>
        <div style="text-align:right">
            <div style="font-size:24px;font-weight:300;color:#64748b">{report['type'].upper()} REPORT</div>
            <div style="font-size:13px;color:#94a3b8;font-family:monospace">{report['period']}</div>
        </div>
    </div>

    <h2>Executive Summary</h2>
    <ul>{highlights}</ul>

    <h2>Task Metrics</h2>
    <div class="stats">
        <div class="stat"><div class="value">{report['task_metrics']['total']}</div><div class="label">Total Tasks</div></div>
        <div class="stat"><div class="value">{report['task_metrics']['success_rate']}%</div><div class="label">Success Rate</div></div>
        <div class="stat"><div class="value">{report['task_metrics']['avg_duration']}s</div><div class="label">Avg Duration</div></div>
        <div class="stat"><div class="value">{report['task_metrics']['completed']}</div><div class="label">Completed</div></div>
    </div>

    <h2>Agent Performance</h2>
    <table>
        <thead><tr><th>Agent</th><th>Tasks</th><th>Success</th><th>Avg Time</th><th>Uptime</th><th>Errors</th></tr></thead>
        <tbody>{agents_rows}</tbody>
    </table>

    <h2>Finance Overview</h2>
    <div class="stats">
        <div class="stat"><div class="value">${report['finance_summary']['revenue_mtd']/100:,.0f}</div><div class="label">Revenue MTD</div></div>
        <div class="stat"><div class="value">${report['finance_summary']['total_overdue']/100:,.0f}</div><div class="label">Overdue</div></div>
        <div class="stat"><div class="value">{report['finance_summary']['overdue_count']}</div><div class="label">Overdue Count</div></div>
        <div class="stat"><div class="value">{report['finance_summary']['paid_this_week']}</div><div class="label">Paid This Week</div></div>
    </div>
    <table>
        <thead><tr><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>{invoices_rows}</tbody>
    </table>

    <h2>Security</h2>
    <div class="stats">
        <div class="stat"><div class="value">{report['security_summary']['threats_blocked']}</div><div class="label">Threats Blocked</div></div>
        <div class="stat"><div class="value">{report['security_summary']['compliance']}%</div><div class="label">Compliance</div></div>
    </div>

    <h2>Recommendations</h2>
    <ul>{recommendations}</ul>

    <div class="footer">
        <p>Generated by Ecomind Orchestrator · {datetime.now().strftime('%B %d, %Y at %I:%M %p')}</p>
    </div>
</body>
</html>'''
