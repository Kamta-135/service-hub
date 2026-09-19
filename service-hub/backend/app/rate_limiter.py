"""
Rate limiter — Redis-backed when REDIS_URL is set (shared correctly across
every gunicorn worker and every server instance), falls back to a simple
in-memory counter otherwise so local dev needs zero extra setup.

IMPORTANT: the in-memory fallback only limits requests within a single
process. The Procfile runs multiple gunicorn workers by default — each
would get its own counter, silently multiplying the effective limit. Set
REDIS_URL in any real deployment (Render add-on, Upstash free tier, etc.)
so the limit actually holds. This module warns once at import time if
that's not the case.
"""
import logging
import os
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

logger = logging.getLogger("service_hub.rate_limiter")

REDIS_URL = os.getenv("REDIS_URL")
_redis_client = None

if REDIS_URL:
    try:
        import redis  # type: ignore

        _redis_client = redis.from_url(REDIS_URL, decode_responses=True, socket_timeout=2)
        _redis_client.ping()
        logger.info("Rate limiter: using Redis (shared across workers).")
    except Exception as e:  # pragma: no cover - depends on external service
        logger.warning("REDIS_URL set but Redis unreachable (%s) — falling back to in-memory.", e)
        _redis_client = None

if _redis_client is None:
    if os.getenv("ENV") == "production":
        logger.warning(
            "Rate limiter running in-memory in PRODUCTION — each gunicorn "
            "worker has its own counter, so the real limit is roughly "
            "(configured limit x worker count). Set REDIS_URL to fix this."
        )
    _memory_log: dict[str, deque] = defaultdict(deque)


def check_and_record(key: str, max_events: int, window_seconds: int) -> bool:
    """
    Returns True if `key` is still within its limit (and records this
    event), False if the limit is already hit.
    """
    if _redis_client is not None:
        redis_key = f"ratelimit:{key}"
        now_ms = int(time.time() * 1000)
        window_start_ms = now_ms - window_seconds * 1000
        pipe = _redis_client.pipeline()
        pipe.zremrangebyscore(redis_key, 0, window_start_ms)
        pipe.zcard(redis_key)
        pipe.zadd(redis_key, {str(now_ms): now_ms})
        pipe.expire(redis_key, window_seconds)
        _, count, _, _ = pipe.execute()
        return count < max_events

    now = datetime.now(timezone.utc)
    window_start = now - timedelta(seconds=window_seconds)
    log = _memory_log[key]
    while log and log[0] < window_start:
        log.popleft()
    if len(log) >= max_events:
        return False
    log.append(now)
    return True
