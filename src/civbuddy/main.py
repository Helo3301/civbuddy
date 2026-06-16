from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from civbuddy.config import STATIC_DIR
from civbuddy.database import init_db
from civbuddy.middleware.tailscale import TailscaleOnly
from civbuddy.routers import auth, chat, presence, saves


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(TailscaleOnly)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(presence.router)
app.include_router(saves.router)

app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
