import os

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


ALLOWED_PREFIXES = (
    "100.",        # Tailscale
    "192.168.",    # Local network
    "10.",         # Local network
    "127.",        # Loopback
)

# Opt-in public exposure. Tailscale Funnel forwards the visitor's REAL public
# IP (unlike tailnet serve, which presents 100.x), so the IP allow-list below
# rejects every legitimate Funnel visitor. Set CIVBUDDY_ALLOW_FUNNEL=1 only
# when you have intentionally put the app behind a public Funnel. Default
# (unset) keeps the app locked to tailnet/LAN/loopback.
ALLOW_FUNNEL = os.environ.get("CIVBUDDY_ALLOW_FUNNEL", "").strip().lower() in (
    "1", "true", "yes", "on",
)


class TailscaleOnly(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if ALLOW_FUNNEL:
            return await call_next(request)
        client_ip = request.client.host if request.client else ""
        if not any(client_ip.startswith(p) for p in ALLOWED_PREFIXES) and client_ip != "::1":
            return JSONResponse({"error": "Access denied"}, status_code=403)
        return await call_next(request)
