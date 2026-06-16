from datetime import datetime, timezone
from typing import Optional, List

from civbuddy.database import get_db
from civbuddy.config import HEARTBEAT_TIMEOUT_SECONDS


async def set_status(user_id: int, status: str, away_message: Optional[str] = None):
    db = await get_db()
    try:
        await db.execute(
            "UPDATE presence SET status = ?, away_message = ?, last_seen = ? WHERE user_id = ?",
            (status, away_message, datetime.now(timezone.utc).isoformat(), user_id),
        )
        await db.commit()
    finally:
        await db.close()


async def heartbeat(user_id: int):
    db = await get_db()
    try:
        await db.execute(
            "UPDATE presence SET last_seen = ? WHERE user_id = ?",
            (datetime.now(timezone.utc).isoformat(), user_id),
        )
        await db.commit()
    finally:
        await db.close()


async def get_all_presence() -> list[dict]:
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT u.id as user_id, u.username, u.display_name, "
            "p.status, p.away_message "
            "FROM users u JOIN presence p ON u.id = p.user_id"
        )
        return [dict(r) for r in rows]
    finally:
        await db.close()


async def check_stale():
    """Mark users as offline if heartbeat is stale."""
    db = await get_db()
    try:
        cutoff = datetime.now(timezone.utc).timestamp() - HEARTBEAT_TIMEOUT_SECONDS
        rows = await db.execute_fetchall(
            "SELECT user_id FROM presence WHERE status != 'offline' "
            "AND strftime('%s', last_seen) < ?",
            (str(int(cutoff)),),
        )
        stale_ids = [r["user_id"] for r in rows]
        if stale_ids:
            placeholders = ",".join("?" * len(stale_ids))
            await db.execute(
                f"UPDATE presence SET status = 'offline' WHERE user_id IN ({placeholders})",
                stale_ids,
            )
            await db.commit()
        return stale_ids
    finally:
        await db.close()
