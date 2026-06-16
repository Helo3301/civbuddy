from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: str


class StatusUpdate(BaseModel):
    status: str  # online, away, offline
    away_message: Optional[str] = None


class BuddyPresence(BaseModel):
    user_id: int
    username: str
    display_name: str
    status: str
    away_message: Optional[str] = None


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    sender_name: str
    content: str
    timestamp: str


class GameCreate(BaseModel):
    name: str


class GameResponse(BaseModel):
    id: int
    name: str
    current_turn_user_id: Optional[int]
    current_turn_name: Optional[str] = None
    is_active: bool
    created_at: str


class SaveFileResponse(BaseModel):
    id: int
    game_id: int
    uploaded_by: int
    uploader_name: str
    filename: str
    turn_number: int
    file_size: int
    uploaded_at: str


class TurnLogEntry(BaseModel):
    user_id: int
    username: str
    turn_number: int
    action: str
    timestamp: str
