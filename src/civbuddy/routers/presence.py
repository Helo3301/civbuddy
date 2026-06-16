from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from civbuddy.routers.auth import get_current_user
from civbuddy.services import presence_service
from civbuddy.services.connection_manager import manager
from civbuddy.models import StatusUpdate

router = APIRouter(prefix="/api/presence")


@router.get("")
async def get_presence(request: Request):
    user = await get_current_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    buddies = await presence_service.get_all_presence()
    return buddies


@router.put("/status")
async def update_status(body: StatusUpdate, request: Request):
    user = await get_current_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    await presence_service.set_status(user["id"], body.status, body.away_message)
    await manager.broadcast({
        "type": "presence_change",
        "user_id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"],
        "status": body.status,
        "away_message": body.away_message,
    })
    return {"ok": True}
