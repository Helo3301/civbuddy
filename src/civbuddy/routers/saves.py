from fastapi import APIRouter, Request, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse

from civbuddy.routers.auth import get_current_user
from civbuddy.database import get_db
from civbuddy.services.save_service import store_save, get_save_path
from civbuddy.services.connection_manager import manager
from civbuddy.config import MAX_UPLOAD_SIZE
from civbuddy.models import GameCreate

router = APIRouter(prefix="/api/games")


@router.get("")
async def list_games(request: Request):
    user = await get_current_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT g.id, g.name, g.current_turn_user_id, g.is_active, g.created_at, "
            "u.display_name as current_turn_name "
            "FROM games g LEFT JOIN users u ON g.current_turn_user_id = u.id "
            "ORDER BY g.created_at DESC"
        )
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.post("")
async def create_game(body: GameCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO games (name, current_turn_user_id) VALUES (?, ?)",
            (body.name, user["id"]),
        )
        game_id = cursor.lastrowid
        await db.commit()
        return {"id": game_id, "name": body.name, "current_turn_user_id": user["id"]}
    finally:
        await db.close()


@router.put("/{game_id}")
async def update_game(game_id: int, request: Request):
    user = await get_current_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    body = await request.json()
    db = await get_db()
    try:
        sets = []
        vals = []
        if "name" in body:
            sets.append("name = ?")
            vals.append(body["name"])
        if "is_active" in body:
            sets.append("is_active = ?")
            vals.append(1 if body["is_active"] else 0)
        if not sets:
            return {"ok": True}
        vals.append(game_id)
        await db.execute(f"UPDATE games SET {', '.join(sets)} WHERE id = ?", vals)
        await db.commit()
        return {"ok": True}
    finally:
        await db.close()


@router.post("/{game_id}/saves")
async def upload_save(game_id: int, request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    data = await file.read()
    if len(data) > MAX_UPLOAD_SIZE:
        return JSONResponse({"error": "File too large (20MB max)"}, status_code=413)

    result = await store_save(game_id, user["id"], file.filename or "save.CivBeyondSwordSave", data)

    # Notify via WebSocket
    other_id = result.get("other_user_id")
    if other_id:
        await manager.send_to(other_id, {
            "type": "save_uploaded",
            "game_id": game_id,
            "uploader_name": result["uploader_name"],
            "filename": result["filename"],
            "turn_number": result["turn_number"],
        })
        await manager.send_to(other_id, {
            "type": "your_turn",
            "game_id": game_id,
            "game_name": None,  # client can look up
        })

    return result


@router.get("/{game_id}/saves")
async def list_saves(game_id: int, request: Request):
    user = await get_current_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT sf.id, sf.game_id, sf.uploaded_by, u.display_name as uploader_name, "
            "sf.filename, sf.turn_number, sf.file_size, sf.uploaded_at "
            "FROM save_files sf JOIN users u ON sf.uploaded_by = u.id "
            "WHERE sf.game_id = ? ORDER BY sf.turn_number DESC",
            (game_id,),
        )
        return [dict(r) for r in rows]
    finally:
        await db.close()


@router.get("/{game_id}/saves/{save_id}/download")
async def download_save(game_id: int, save_id: int, request: Request):
    user = await get_current_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT filename, stored_path, turn_number FROM save_files WHERE id = ? AND game_id = ?",
            (save_id, game_id),
        )
        if not rows:
            return JSONResponse({"error": "Not found"}, status_code=404)
        save = rows[0]
        path = get_save_path(save["stored_path"])
        if not path:
            return JSONResponse({"error": "File missing"}, status_code=404)

        # Log download
        await db.execute(
            "INSERT INTO turn_log (game_id, user_id, turn_number, action) VALUES (?, ?, ?, 'downloaded')",
            (game_id, user["id"], save["turn_number"]),
        )
        await db.commit()

        return FileResponse(path, filename=save["filename"])
    finally:
        await db.close()


@router.get("/{game_id}/turns")
async def get_turns(game_id: int, request: Request):
    user = await get_current_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT tl.user_id, u.display_name as username, tl.turn_number, tl.action, tl.timestamp "
            "FROM turn_log tl JOIN users u ON tl.user_id = u.id "
            "WHERE tl.game_id = ? ORDER BY tl.timestamp DESC LIMIT 50",
            (game_id,),
        )
        return [dict(r) for r in rows]
    finally:
        await db.close()
