import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse
from passlib.hash import bcrypt

from civbuddy.database import get_db
from civbuddy.config import SESSION_EXPIRE_HOURS
from civbuddy.models import LoginRequest, UserResponse

router = APIRouter(prefix="/api/auth")


async def get_current_user(request: Request) -> Optional[dict]:
    token = request.cookies.get("session")
    if not token:
        return None
    db = await get_db()
    try:
        row = await db.execute_fetchall(
            "SELECT u.id, u.username, u.display_name FROM sessions s "
            "JOIN users u ON s.user_id = u.id "
            "WHERE s.token = ? AND s.expires_at > ?",
            (token, datetime.now(timezone.utc).isoformat()),
        )
        return dict(row[0]) if row else None
    finally:
        await db.close()


@router.post("/login")
async def login(body: LoginRequest, response: Response):
    db = await get_db()
    try:
        rows = await db.execute_fetchall(
            "SELECT id, username, display_name, password_hash FROM users WHERE username = ?",
            (body.username,),
        )
        if not rows or not bcrypt.verify(body.password, rows[0]["password_hash"]):
            return JSONResponse({"error": "Invalid credentials"}, status_code=401)

        user = rows[0]
        token = str(uuid.uuid4())
        expires = datetime.now(timezone.utc) + timedelta(hours=SESSION_EXPIRE_HOURS)
        await db.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user["id"], expires.isoformat()),
        )
        await db.commit()

        resp = JSONResponse({
            "id": user["id"],
            "username": user["username"],
            "display_name": user["display_name"],
        })
        resp.set_cookie("session", token, httponly=True, max_age=SESSION_EXPIRE_HOURS * 3600, samesite="lax")
        return resp
    finally:
        await db.close()


@router.post("/logout")
async def logout(request: Request):
    token = request.cookies.get("session")
    if token:
        db = await get_db()
        try:
            await db.execute("DELETE FROM sessions WHERE token = ?", (token,))
            await db.commit()
        finally:
            await db.close()
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("session")
    return resp


@router.get("/me")
async def me(request: Request):
    user = await get_current_user(request)
    if not user:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)
    return UserResponse(**user)
