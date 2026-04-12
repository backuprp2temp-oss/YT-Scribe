"""API routers."""

from app.routers.video import router as video_router
from app.routers.tasks import router as tasks_router

__all__ = ["video_router", "tasks_router"]
