"""Reusable SSE event hub used to push live "change" events to connected clients.

Supports in-memory broadcast within a single process AND distributed multi-worker
fanout via Redis Pub/Sub (fallback to local in-memory if Redis is unavailable).
"""

import asyncio
import json
import logging
from collections.abc import AsyncIterator
from uuid import uuid4

from fastapi import Request
from fastapi.responses import StreamingResponse

from src.core.cache import get_redis

logger = logging.getLogger(__name__)

# Unique ID per worker process to prevent echoing self-published messages back to local queues
WORKER_ID = str(uuid4())


class EventHub:
    def __init__(self, channel: str | None = None) -> None:
        self._queues: set[asyncio.Queue] = set()
        self._channel = channel
        self._listener_task: asyncio.Task | None = None

    def _publish_to_local(self, payload: dict) -> None:
        for q in list(self._queues):
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                pass

    def _start_redis_listener_if_needed(self) -> None:
        if not self._channel or (self._listener_task and not self._listener_task.done()):
            return
        r = get_redis()
        if r is None:
            return

        async def _listener() -> None:
            pubsub = None
            try:
                pubsub = r.pubsub(ignore_subscribe_messages=True)
                pubsub.subscribe(self._channel)
                while bool(self._queues):
                    msg = await asyncio.to_thread(pubsub.get_message, timeout=1.0)
                    if msg and msg.get("type") == "message" and msg.get("data"):
                        try:
                            raw_data = msg["data"]
                            if isinstance(raw_data, bytes):
                                raw_data = raw_data.decode("utf-8")
                            data = json.loads(raw_data)
                            if isinstance(data, dict) and data.get("_src") != WORKER_ID:
                                clean_data = {k: v for k, v in data.items() if k != "_src"}
                                self._publish_to_local(clean_data)
                        except Exception:
                            pass
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.debug("Redis SSE listener stopped (%s)", e)
            finally:
                if pubsub:
                    try:
                        pubsub.unsubscribe()
                        pubsub.close()
                    except Exception:
                        pass
                self._listener_task = None

        self._listener_task = asyncio.create_task(_listener())

    def broadcast(self, message: dict | None = None) -> None:
        payload = message or {"type": "change"}
        # 1. Local delivery ke worker saat ini
        self._publish_to_local(payload)

        # 2. Redis broadcast ke worker/container lain (jika ada channel)
        if self._channel:
            r = get_redis()
            if r is not None:
                try:
                    wire_payload = {**payload, "_src": WORKER_ID}
                    r.publish(self._channel, json.dumps(wire_payload))
                except Exception as exc:
                    logger.debug("Redis publish skipped: %s", exc)

    async def stream(self, request: Request) -> StreamingResponse:
        queue: asyncio.Queue = asyncio.Queue()

        async def event_generator() -> AsyncIterator[str]:
            self._queues.add(queue)
            self._start_redis_listener_if_needed()
            try:
                while True:
                    if await request.is_disconnected():
                        break
                    try:
                        msg = await asyncio.wait_for(queue.get(), timeout=15)
                        event = msg.get("type", "message")
                        yield f"event: {event}\ndata: {json.dumps(msg)}\n\n"
                    except TimeoutError:
                        yield 'data: {"type": "ping"}\n\n'
            except asyncio.CancelledError:
                pass
            finally:
                self._queues.discard(queue)

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )


companyprofile_hub = EventHub(channel="events:companyprofile")


class UserEventRegistry:
    """Per-user SSE hub registry.

    Every ``EventHub`` keeps its queues in memory only; connections that
    fire before the hub is created simply never receive that message, so a
    fresh hub per user is created lazily on first subscribe.
    """

    def __init__(self) -> None:
        self._hubs: dict[str, EventHub] = {}

    def get(self, user_id: str) -> EventHub:
        hub = self._hubs.get(user_id)
        if hub is None:
            hub = EventHub(channel=f"events:user:{user_id}")
            self._hubs[user_id] = hub
        return hub

    def broadcast(self, user_id: str, message: dict | None = None) -> None:
        hub = self._hubs.get(user_id)
        if hub is not None:
            hub.broadcast(message or {"type": "change"})
        else:
            r = get_redis()
            if r is not None:
                try:
                    payload = dict(message or {"type": "change"})
                    payload["_src"] = WORKER_ID
                    r.publish(f"events:user:{user_id}", json.dumps(payload))
                except Exception:
                    pass


user_hubs = UserEventRegistry()
