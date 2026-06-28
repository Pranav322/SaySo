"""Lightweight in-memory abuse/cost guards. Fine for a single backend instance
(one DigitalOcean droplet). If you ever run multiple instances, move these to Redis."""
import os
from collections import defaultdict
from datetime import date

# All tunable via env at deploy time.
SESSION_MAX_SECONDS    = int(os.environ.get("SESSION_MAX_SECONDS", "600"))   # auto-close a conversation after N s
MAX_CONCURRENT_PER_SID = int(os.environ.get("MAX_CONCURRENT_PER_SID", "3"))  # simultaneous conversations per session
MAX_ENROLLMENTS_PER_DAY = int(os.environ.get("MAX_ENROLLMENTS_PER_DAY", "20"))  # voice clones per session per day

_active: dict[str, int] = defaultdict(int)
_enroll: dict[str, list] = defaultdict(lambda: ["", 0])


def acquire_ws(sid: str) -> bool:
    if _active[sid] >= MAX_CONCURRENT_PER_SID:
        return False
    _active[sid] += 1
    return True


def release_ws(sid: str) -> None:
    _active[sid] = max(0, _active[sid] - 1)


def allow_enrollment(sid: str) -> bool:
    today = date.today().isoformat()
    rec = _enroll[sid]
    if rec[0] != today:
        rec[0], rec[1] = today, 0
    if rec[1] >= MAX_ENROLLMENTS_PER_DAY:
        return False
    rec[1] += 1
    return True
