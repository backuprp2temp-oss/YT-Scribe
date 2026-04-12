"""Task progress endpoints (SSE)."""

import json
import logging
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from app.config import REDIS_URL

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

def get_redis():
    """Lazy Redis client creation."""
    import redis as _redis
    return _redis.from_url(REDIS_URL, decode_responses=True, socket_timeout=2, socket_connect_timeout=2)


async def progress_event_generator(task_id: str):
    """Generate SSE events for task progress."""
    pubsub = get_redis().pubsub()
    channel = f"task_progress:{task_id}"
    
    try:
        await pubsub.subscribe(channel)
        
        # Send initial state if available
        cached_state = get_redis().get(f"task_state:{task_id}")
        if cached_state:
            yield f"data: {cached_state}\n\n"
            
            # If already completed or failed, just send and close
            state = json.loads(cached_state)
            if state.get("status") in ["completed", "failed"]:
                return
        
        # Listen for new events
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("type") == "message":
                data = message.get("data", "")
                yield f"data: {data}\n\n"
                
                # Check if task is complete
                try:
                    event_data = json.loads(data)
                    if event_data.get("status") in ["completed", "failed"]:
                        break
                except json.JSONDecodeError:
                    pass
            
            # Send a keep-alive comment
            yield ": keepalive\n\n"
            
    except asyncio.CancelledError:
        logger.info(f"Client disconnected from SSE stream for task {task_id}")
    except Exception as e:
        logger.error(f"Error in SSE stream: {e}")
        error_data = json.dumps({"status": "error", "error": "Stream interrupted"})
        yield f"data: {error_data}\n\n"
    finally:
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
        except Exception:
            pass


@router.get("/{task_id}/progress")
async def get_task_progress_sse(task_id: str):
    """
    Server-Sent Events endpoint for real-time download progress.
    
    Streams progress updates until task completion or failure.
    """
    return EventSourceResponse(
        progress_event_generator(task_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/{task_id}/status")
async def get_task_status(task_id: str):
    """Get current task status (non-streaming)."""
    cached_state = get_redis().get(f"task_state:{task_id}")
    
    if not cached_state:
        raise HTTPException(status_code=404, detail="Task not found or expired")
    
    return json.loads(cached_state)
