import json
from typing import Dict, Optional
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active: Dict[int, WebSocket] = {}  # user_id -> websocket

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws

    def disconnect(self, user_id: int):
        self.active.pop(user_id, None)

    async def send_to(self, user_id: int, data: dict):
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                self.disconnect(user_id)

    async def broadcast(self, data: dict, exclude: Optional[int] = None):
        for uid, ws in list(self.active.items()):
            if uid == exclude:
                continue
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                self.disconnect(uid)

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active


manager = ConnectionManager()
