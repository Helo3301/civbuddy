from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


ALLOWED_PREFIXES = (
    "100.",        # Tailscale
    "192.168.",    # Local network
    "10.",         # Local network
    "127.",        # Loopback
)

class TailscaleOnly(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else ""
        if not any(client_ip.startswith(p) for p in ALLOWED_PREFIXES) and client_ip != "::1":
            return JSONResponse({"error": "Access denied"}, status_code=403)
        return await call_next(request)
