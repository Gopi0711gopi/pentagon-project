"""
Ecomind Analytics Service — agent performance tracking, task metrics, response times.
"""
import json
import sqlite3
from datetime import datetime, timedelta


class AnalyticsService:
    """Tracks and computes agent performance analytics for the Ecomind dashboard using SQLite."""

    def __init__(self, db_path: str = "ecomind_history.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        # We don't create tables here, history.py does that. We just ensure we can read.
        pass

    def get_overview(self):
        """Get high-level analytics overview."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        # Total counts
        total = conn.execute("SELECT COUNT(*) FROM conversations").fetchone()[0] or 0
        completed = conn.execute("SELECT COUNT(*) FROM conversations WHERE status = 'complete'").fetchone()[0] or 0
        failed = conn.execute("SELECT COUNT(*) FROM conversations WHERE status = 'failed'").fetchone()[0] or 0
        pending = total - completed - failed
        
        # Duration avg (stored in ms, convert to sec)
        avg_ms = conn.execute("SELECT AVG(duration_ms) FROM conversations").fetchone()[0] or 0
        avg_duration = round(avg_ms / 1000, 2)
        
        now = datetime.now()
        today_str = now.strftime('%Y-%m-%d')
        tasks_today = conn.execute("SELECT COUNT(*) FROM conversations WHERE created_at LIKE ?", (f"{today_str}%",)).fetchone()[0] or 0

        # Tasks per day (last 7 days)
        daily_counts = []
        daily_labels = []
        daily_dates = []
        for i in range(6, -1, -1):
            date_obj = now - timedelta(days=i)
            day_str = date_obj.strftime('%Y-%m-%d')
            count = conn.execute("SELECT COUNT(*) FROM conversations WHERE created_at LIKE ?", (f"{day_str}%",)).fetchone()[0] or 0
            daily_counts.append(count)
            daily_labels.append(date_obj.strftime('%a'))
            daily_dates.append(day_str)

        # Agent usage distribution
        # Need to read all agents_used arrays to count
        rows = conn.execute("SELECT agents_used FROM conversations").fetchall()
        agent_usage = {}
        for r in rows:
            agents = json.loads(r["agents_used"] or "[]")
            for a in agents:
                agent_usage[a] = agent_usage.get(a, 0) + 1
                
        conn.close()

        return {
            'total_tasks': total,
            'completed': completed,
            'failed': failed,
            'pending': pending,
            'success_rate': round((completed / max(total, 1)) * 100, 1),
            'avg_duration_sec': avg_duration,
            'tasks_today': tasks_today,
            'daily_chart': {'labels': daily_labels, 'values': daily_counts, 'dates': daily_dates},
            'agent_usage': agent_usage,
        }

    def get_activity_heatmap(self):
        """Get daily activity counts for the last 6 months (GitHub-style heatmap)."""
        heatmap = {}
        now = datetime.now()
        conn = sqlite3.connect(self.db_path)
        # We'll just query the actual existing data, mapping DATE(created_at) -> count
        # Since SQLite DATE() function works well with ISO format strings
        rows = conn.execute("SELECT SUBSTR(created_at, 1, 10) as dt, COUNT(*) as c FROM conversations GROUP BY dt").fetchall()
        for r in rows:
            heatmap[r[0]] = r[1]
        conn.close()
        
        # Pre-fill empty days to ensure heatmap renders correctly up to today
        # But we only overwrite if not in dict
        for i in range(180):
            date = (now - timedelta(days=i)).strftime('%Y-%m-%d')
            if date not in heatmap:
                heatmap[date] = 0
                
        return heatmap

    def get_agent_metrics(self, agent_name=None):
        """Get per-agent or all agent metrics dynamically computed."""
        agents_list = ['guardian', 'financier', 'scout', 'operator', 'liaison']
        metrics = {}
        now = datetime.now()
        today_str = now.strftime('%Y-%m-%d')
        
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT status, duration_ms, created_at, agents_used FROM conversations ORDER BY id DESC").fetchall()
        conn.close()
        
        for agent in agents_list:
            # Filter rows containing this agent
            agent_tasks = [r for r in rows if agent in json.loads(r["agents_used"] or "[]")]
            tasks_count = len(agent_tasks)
            success_count = sum(1 for r in agent_tasks if r["status"] == "complete")
            error_count = sum(1 for r in agent_tasks if r["status"] == "failed")
            tasks_today = sum(1 for r in agent_tasks if r["created_at"].startswith(today_str))
            
            avg_ms = sum((r["duration_ms"] or 0) for r in agent_tasks) / max(tasks_count, 1)
            avg_time = round(avg_ms / 1000, 2)
            
            # Trend 7d
            trend = []
            for i in range(6, -1, -1):
                day_str = (now - timedelta(days=i)).strftime('%Y-%m-%d')
                trend.append(sum(1 for r in agent_tasks if r["created_at"].startswith(day_str)))
                
            last_active = agent_tasks[0]["created_at"] if agent_tasks else None
            
            metrics[agent] = {
                'agent': agent,
                'tasks_handled': tasks_count,
                'success_rate': round((success_count / max(tasks_count, 1)) * 100, 1),
                'avg_response_time': avg_time,
                'uptime_pct': 100.0, # Static as agents don't strictly "go down"
                'last_active': last_active,
                'errors_this_week': error_count,
                'tasks_today': tasks_today,
                'trend_7d': trend,
            }

        if agent_name:
            return metrics.get(agent_name)
        return metrics

    def get_task_history(self, limit=20, offset=0, agent=None, status=None, date=None):
        """Get paginated task history with optional filters."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        
        # Build query dynamically
        query = "SELECT * FROM conversations WHERE 1=1"
        params = []
        
        if status:
            if status == "completed":
                # map React frontend param "completed" to SQLite "complete"
                query += " AND status = 'complete'"
            else:
                query += " AND status = ?"
                params.append(status)
                
        if date:
            query += " AND created_at LIKE ?"
            params.append(f"{date}%")
            
        # Agent filtering requires JSON matching or post-filtering due to string array
        query += " ORDER BY id DESC"
        
        all_rows = conn.execute(query, params).fetchall()
        conn.close()
        
        # Post-filter for agent
        filtered = []
        for r in all_rows:
            agents = json.loads(r["agents_used"] or "[]")
            if agent and agent not in agents:
                continue
                
            # Convert SQLite row to dictionary shape expected by frontend
            filtered.append({
                'id': f"task-{r['id']:03d}",
                'task': r["command"],
                'agents': agents,
                'duration_sec': round((r["duration_ms"] or 0) / 1000, 2),
                'status': 'completed' if r["status"] == 'complete' else r["status"],
                'timestamp': r["created_at"],
                'date': r["created_at"][:10],
                'user': 'gopi',
            })
            
        total = len(filtered)
        paginated = filtered[offset:offset + limit]

        return {
            'total': total,
            'tasks': paginated,
        }

    def record_task(self, task_data):
        """Tasks are recorded actively by history.py, analytics is read-only for now."""
        pass

    def search(self, query):
        """Search task history."""
        q = query.lower()
        res = self.get_task_history(limit=1000)
        return [t for t in res['tasks'] if q in t['task'].lower() or q in ' '.join(t['agents'])]
