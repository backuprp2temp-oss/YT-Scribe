"""FastAPI application entrypoint."""

import logging
import time
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import APP_NAME, APP_VERSION, ALLOWED_ORIGINS, DEBUG, DOWNLOAD_DIR
from app.database import engine, Base, SessionLocal
from app.routers import video_router, tasks_router
from app.routers.audio import router as audio_router
from app.routers.transcript import router as transcript_router
from app.routers.history import router as history_router
from app.routers.settings import router as settings_router

# Configure structured logging
log_level = logging.DEBUG if DEBUG else logging.INFO
logging.basicConfig(
    level=log_level,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


async def startup_cleanup():
    """Clean up orphaned downloads and reset stuck tasks on startup."""
    db = SessionLocal()
    try:
        # Reset any 'downloading' status to 'failed' (orphaned from crash)
        from app.models.download import DownloadHistory
        from sqlalchemy import update
        result = db.execute(
            update(DownloadHistory)
            .where(DownloadHistory.status == "downloading")
            .values(status="failed", error_message="Task interrupted by server restart")
        )
        reset_count = result.rowcount
        if reset_count > 0:
            db.commit()
            logger.info(f"Reset {reset_count} orphaned 'downloading' tasks to 'failed'")
    except Exception as e:
        logger.error(f"Startup cleanup failed: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info(f"Starting {APP_NAME} v{APP_VERSION}")
    logger.info(f"Download directory: {DOWNLOAD_DIR}")
    logger.info(f"Debug mode: {DEBUG}")

    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")

    # Clean up orphaned tasks
    await startup_cleanup()

    yield

    # Shutdown
    logger.info(f"Shutting down {APP_NAME}")
    logger.info("Graceful shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="Web-based interface for downloading YouTube videos, audio, transcripts, and metadata",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests with response time."""
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    status_code = response.status_code
    
    logger.info(
        f"{request.method} {request.url.path} | "
        f"status={status_code} | "
        f"time={process_time:.3f}s | "
        f"client={request.client.host if request.client else 'unknown'}"
    )
    
    return response


# Include routers
app.include_router(video_router)
app.include_router(audio_router)
app.include_router(transcript_router)
app.include_router(history_router)
app.include_router(settings_router)
app.include_router(tasks_router)


@app.get("/api/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns service status including database and disk space.
    """
    health = {
        "status": "ok",
        "version": APP_VERSION,
        "services": {
            "database": "ok",
        },
    }
    
    # Check database connectivity
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
    except Exception as e:
        health["status"] = "degraded"
        health["services"]["database"] = f"error: {str(e)}"
        logger.warning(f"Database health check failed: {e}")
    
    # Check disk space
    try:
        import shutil
        total, used, free = shutil.disk_usage(str(DOWNLOAD_DIR))
        free_gb = free / (1024 ** 3)
        health["disk"] = {
            "free_gb": round(free_gb, 2),
            "sufficient": free_gb > 0.1,  # 100MB minimum
        }
        if free_gb < 0.1:
            health["status"] = "degraded"
    except Exception as e:
        health["disk"] = {"error": str(e)}
    
    status_code = 200 if health["status"] == "ok" else 503
    return JSONResponse(content=health, status_code=status_code)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}: {exc}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=DEBUG,
        log_level="debug" if DEBUG else "info",
    )
