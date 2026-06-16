from pathlib import Path
from typing import Optional

from civbuddy.config import SAVES_DIR
from civbuddy.database import get_db


async def get_other_user_id(game_id: int, uploader_id: int) -> Optional[int]:
    """Get the other player in a 2-person game."""
    db = await get_db()
    try:
        rows = await db.execute_fetchall("SELECT id FROM users")
        all_ids = [r["id"] for r in rows]
        others = [uid for uid in all_ids if uid != uploader_id]
        return others[0] if others else None
    finally:
        await db.close()


async def store_save(game_id: int, user_id: int, filename: str, data: bytes) -> dict:
    db = await get_db()
    try:
        # Get next turn number
        rows = await db.execute_fetchall(
            "SELECT COALESCE(MAX(turn_number), 0) as max_turn FROM save_files WHERE game_id = ?",
            (game_id,),
        )
        turn_number = rows[0]["max_turn"] + 1

        # Store file
        game_dir = SAVES_DIR / str(game_id)
        game_dir.mkdir(parents=True, exist_ok=True)
        stored_name = f"turn{turn_number:04d}_{filename}"
        stored_path = game_dir / stored_name
        stored_path.write_bytes(data)

        # DB record
        cursor = await db.execute(
            "INSERT INTO save_files (game_id, uploaded_by, filename, stored_path, turn_number, file_size) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (game_id, user_id, filename, str(stored_path), turn_number, len(data)),
        )
        save_id = cursor.lastrowid

        # Switch turn to the other player
        other_id = await get_other_user_id(game_id, user_id)
        if other_id:
            await db.execute(
                "UPDATE games SET current_turn_user_id = ? WHERE id = ?",
                (other_id, game_id),
            )

        # Log
        await db.execute(
            "INSERT INTO turn_log (game_id, user_id, turn_number, action) VALUES (?, ?, ?, 'uploaded')",
            (game_id, user_id, turn_number),
        )

        await db.commit()

        # Fetch uploader name
        urows = await db.execute_fetchall("SELECT display_name FROM users WHERE id = ?", (user_id,))
        uploader_name = urows[0]["display_name"] if urows else "Unknown"

        return {
            "id": save_id,
            "game_id": game_id,
            "uploaded_by": user_id,
            "uploader_name": uploader_name,
            "filename": filename,
            "turn_number": turn_number,
            "file_size": len(data),
            "other_user_id": other_id,
        }
    finally:
        await db.close()


def get_save_path(stored_path: str) -> Optional[Path]:
    p = Path(stored_path)
    return p if p.exists() else None
