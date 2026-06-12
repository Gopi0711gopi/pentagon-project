"""
Ecomind Background Task Queue — Async queue for long-running agent tasks.
Results are stored in MemoryManager for later retrieval.
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional
from memory.manager import memory_manager

logger = logging.getLogger("ecomind.background")


class BackgroundTask:
    """A single background task."""

    def __init__(self, task_id: str, description: str, agent: str, callback, params: dict = None):
        self.task_id = task_id
        self.description = description
        self.agent = agent
        self.callback = callback
        self.params = params or {}
        self.status = "queued"
        self.created_at = datetime.now()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.result = None
        self.error = None

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "description": self.description,
            "agent": self.agent,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "result": str(self.result)[:300] if self.result else None,
            "error": self.error,
        }


class BackgroundTaskQueue:
    """Manages long-running agent tasks in the background."""

    def __init__(self):
        self._queue: asyncio.Queue = asyncio.Queue()
        self._history: list[BackgroundTask] = []
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._task_counter = 0

    def enqueue(self, description: str, agent: str, callback, params: dict = None) -> str:
        """Add a task to the queue. Returns task_id."""
        self._task_counter += 1
        task_id = f"bg_{self._task_counter}_{int(datetime.now().timestamp())}"
        task = BackgroundTask(task_id, description, agent, callback, params)
        self._history.append(task)
        self._queue.put_nowait(task)
        logger.info(f"📥 Queued background task: {description} (agent: {agent})")
        return task_id

    def start(self):
        """Start the background worker."""
        self._running = True
        self._task = asyncio.create_task(self._worker())
        logger.info("🔄 Background task worker started")

    def stop(self):
        """Stop the worker."""
        self._running = False
        if self._task:
            self._task.cancel()

    def list_tasks(self, limit: int = 20) -> list[dict]:
        """List recent background tasks."""
        return [t.to_dict() for t in reversed(self._history[-limit:])]

    def get_task(self, task_id: str) -> Optional[dict]:
        """Get a specific task by ID."""
        for t in self._history:
            if t.task_id == task_id:
                return t.to_dict()
        return None

    async def _worker(self):
        """Background worker that processes tasks sequentially."""
        while self._running:
            try:
                task = await asyncio.wait_for(self._queue.get(), timeout=5.0)
                task.status = "running"
                task.started_at = datetime.now()
                logger.info(f"⚡ Processing: {task.description}")

                try:
                    if asyncio.iscoroutinefunction(task.callback):
                        task.result = await task.callback(**task.params)
                    else:
                        task.result = task.callback(**task.params)
                    task.status = "completed"
                    task.completed_at = datetime.now()

                    # Store result in memory
                    memory_manager.store(
                        key=task.task_id,
                        value=task.result,
                        context=f"Background task result: {task.description}",
                        metadata={"agent": task.agent, "status": "completed"}
                    )
                    logger.info(f"✅ Background task completed: {task.description}")

                except Exception as e:
                    task.status = "failed"
                    task.error = str(e)
                    task.completed_at = datetime.now()
                    logger.error(f"❌ Background task failed: {task.description} — {e}")

            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker error: {e}")
                await asyncio.sleep(5)


# Singleton
background_queue = BackgroundTaskQueue()
