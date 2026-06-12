"""
Ecomind Scheduler Service — Lightweight asyncio-based cron scheduler.
No external dependencies. Uses simple time-based checks.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Callable, Optional

logger = logging.getLogger("ecomind.scheduler")


class ScheduledJob:
    """A single scheduled job."""

    def __init__(self, name: str, interval_seconds: int, callback: Callable,
                 description: str = "", enabled: bool = True):
        self.name = name
        self.interval_seconds = interval_seconds
        self.callback = callback
        self.description = description
        self.enabled = enabled
        self.last_run: Optional[datetime] = None
        self.next_run: datetime = datetime.now() + timedelta(seconds=30)  # First run after 30s warmup
        self.run_count: int = 0
        self.last_result: Optional[str] = None
        self.last_error: Optional[str] = None

    def is_due(self) -> bool:
        return self.enabled and datetime.now() >= self.next_run

    def schedule_next(self):
        self.next_run = datetime.now() + timedelta(seconds=self.interval_seconds)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "enabled": self.enabled,
            "interval_seconds": self.interval_seconds,
            "interval_human": self._humanize(self.interval_seconds),
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "next_run": self.next_run.isoformat(),
            "run_count": self.run_count,
            "last_result": self.last_result,
            "last_error": self.last_error,
        }

    @staticmethod
    def _humanize(seconds: int) -> str:
        if seconds < 60:
            return f"{seconds}s"
        if seconds < 3600:
            return f"{seconds // 60}m"
        if seconds < 86400:
            return f"{seconds // 3600}h"
        return f"{seconds // 86400}d"


class SchedulerService:
    """Manages periodic background jobs for Ecomind agents."""

    def __init__(self):
        self.jobs: dict[str, ScheduledJob] = {}
        self._running = False
        self._task: Optional[asyncio.Task] = None

    def register_job(self, name: str, interval_seconds: int, callback: Callable,
                     description: str = "", enabled: bool = True):
        """Register a new scheduled job."""
        job = ScheduledJob(name, interval_seconds, callback, description, enabled)
        self.jobs[name] = job
        logger.info(f"📅 Registered job: {name} (every {job._humanize(interval_seconds)})")

    def start(self):
        """Start the scheduler background loop."""
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(f"🚀 Scheduler started with {len(self.jobs)} jobs")

    def stop(self):
        """Stop the scheduler."""
        self._running = False
        if self._task:
            self._task.cancel()
        logger.info("⏹️ Scheduler stopped")

    async def trigger(self, job_name: str) -> dict:
        """Manually trigger a job by name."""
        job = self.jobs.get(job_name)
        if not job:
            return {"error": f"Job '{job_name}' not found"}
        return await self._execute_job(job)

    def list_jobs(self) -> list[dict]:
        """List all registered jobs."""
        return [job.to_dict() for job in self.jobs.values()]

    def toggle_job(self, job_name: str, enabled: bool) -> dict:
        """Enable or disable a job."""
        job = self.jobs.get(job_name)
        if not job:
            return {"error": f"Job '{job_name}' not found"}
        job.enabled = enabled
        return {"name": job_name, "enabled": enabled}

    async def _run_loop(self):
        """Main scheduler loop — checks every 10 seconds."""
        logger.info("⏰ Scheduler loop started")
        while self._running:
            try:
                for job in self.jobs.values():
                    if job.is_due():
                        await self._execute_job(job)
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scheduler loop error: {e}")
                await asyncio.sleep(30)

    async def _execute_job(self, job: ScheduledJob) -> dict:
        """Execute a single job."""
        logger.info(f"⚡ Running job: {job.name}")
        job.last_run = datetime.now()
        job.run_count += 1
        try:
            if asyncio.iscoroutinefunction(job.callback):
                result = await job.callback()
            else:
                result = job.callback()
            job.last_result = str(result)[:200] if result else "ok"
            job.last_error = None
            job.schedule_next()
            logger.info(f"✅ Job '{job.name}' completed (run #{job.run_count})")
            return {"name": job.name, "status": "completed", "result": job.last_result}
        except Exception as e:
            job.last_error = str(e)
            job.schedule_next()
            logger.error(f"❌ Job '{job.name}' failed: {e}")
            return {"name": job.name, "status": "failed", "error": str(e)}


# Singleton
scheduler = SchedulerService()
