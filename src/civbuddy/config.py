from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
SAVES_DIR = DATA_DIR / "saves"
DB_PATH = DATA_DIR / "civbuddy.db"
STATIC_DIR = BASE_DIR / "static"

HOST = "0.0.0.0"
PORT = 8000

SESSION_EXPIRE_HOURS = 72
HEARTBEAT_TIMEOUT_SECONDS = 90
MAX_UPLOAD_SIZE = 20 * 1024 * 1024  # 20MB
