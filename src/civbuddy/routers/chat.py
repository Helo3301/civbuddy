import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse

from civbuddy.database import get_db
from civbuddy.routers.auth import get_current_user
from civbuddy.services.connection_manager import manager
from civbuddy.services import presence_service

router = APIRouter()


@router.get("/api/messages")
async def get_messages(request: Request, before: Optional[int] = None, limit: int = 50):
    user = await get_current_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    limit = min(limit, 100)
    db = await get_db()
    try:
        if before:
            rows = await db.execute_fetchall(
                "SELECT m.id, m.sender_id, u.display_name as sender_name, m.content, m.timestamp "
                "FROM messages m JOIN users u ON m.sender_id = u.id "
                "WHERE m.id < ? ORDER BY m.id DESC LIMIT ?",
                (before, limit),
            )
        else:
            rows = await db.execute_fetchall(
                "SELECT m.id, m.sender_id, u.display_name as sender_name, m.content, m.timestamp "
                "FROM messages m JOIN users u ON m.sender_id = u.id "
                "ORDER BY m.id DESC LIMIT ?",
                (limit,),
            )
        return [dict(r) for r in reversed(rows)]
    finally:
        await db.close()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    # Auth via cookie
    token = ws.cookies.get("session")
    if not token:
        await ws.close(code=4001, reason="Not authenticated")
        return

    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT u.id, u.username, u.display_name FROM sessions s "
            "JOIN users u ON s.user_id = u.id "
            "WHERE s.token = ? AND s.expires_at > ?",
            (token, datetime.now(timezone.utc).isoformat()),
        )
    finally:
        await db.close()

    if not rows:
        await ws.close(code=4001, reason="Invalid session")
        return

    user = dict(rows[0])
    user_id = user["id"]

    await manager.connect(user_id, ws)
    await presence_service.set_status(user_id, "online")
    await manager.broadcast({
        "type": "presence_change",
        "user_id": user_id,
        "username": user["username"],
        "display_name": user["display_name"],
        "status": "online",
    })

    try:
        while True:
            raw = await ws.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type")

            if msg_type == "chat_message":
                content = data.get("content", "").strip()
                if not content:
                    continue
                # Persist
                db = await get_db()
                try:
                    cursor = await db.execute(
                        "INSERT INTO messages (sender_id, content) VALUES (?, ?)",
                        (user_id, content),
                    )
                    msg_id = cursor.lastrowid
                    rows = await db.execute_fetchall(
                        "SELECT timestamp FROM messages WHERE id = ?", (msg_id,)
                    )
                    timestamp = rows[0]["timestamp"]
                    await db.commit()
                finally:
                    await db.close()

                await manager.broadcast({
                    "type": "chat_message",
                    "id": msg_id,
                    "sender_id": user_id,
                    "sender_name": user["display_name"],
                    "content": content,
                    "timestamp": timestamp,
                })

            elif msg_type == "typing_start":
                await manager.broadcast({
                    "type": "buddy_typing",
                    "user_id": user_id,
                    "display_name": user["display_name"],
                    "typing": True,
                }, exclude=user_id)

            elif msg_type == "typing_stop":
                await manager.broadcast({
                    "type": "buddy_typing",
                    "user_id": user_id,
                    "display_name": user["display_name"],
                    "typing": False,
                }, exclude=user_id)

            elif msg_type == "heartbeat":
                await presence_service.heartbeat(user_id)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        manager.disconnect(user_id)
        await presence_service.set_status(user_id, "offline")
        await manager.broadcast({
            "type": "presence_change",
            "user_id": user_id,
            "username": user["username"],
            "display_name": user["display_name"],
            "status": "offline",
        })
