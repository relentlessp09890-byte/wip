from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from routers import account, positions, risk, news, prop, billing
from services.broker_connector import broker
from services.risk_engine import risk_engine
from services.circuit_breaker import circuit_breaker
from services.market_config import get_exchange_market_type, is_market_open
from core.config import settings
from core.startup_check import check_environment
from core.connection_manager import manager
from database import init_db
import asyncio
import json
import os
import time as _time
import secrets

check_environment()

WS_TOKEN = os.getenv('WS_SECRET_TOKEN', secrets.token_hex(16))

from core.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

app = FastAPI(
    title="MarqBridge API",
    description="Risk-first trading OS backend",
    version="2.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

app.include_router(account.router, prefix="/api/account", tags=["account"])
app.include_router(positions.router, prefix="/api/positions", tags=["positions"])
app.include_router(risk.router, prefix="/api/risk", tags=["risk"])
app.include_router(news.router, prefix="/api/news", tags=["news"])
app.include_router(prop.router, prefix="/api/prop", tags=["prop"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


_start_time = _time.time()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get('token')
    if token != WS_TOKEN:
        await websocket.close(code=4001)
        return
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.on_event("startup")
async def on_startup():
    await init_db()
    asyncio.create_task(feed_loop())

_last_payload_hash = None
_seq = 0

async def feed_loop():
    global _last_payload_hash, _seq
    while True:
        try:
            # Only fetch if clients are actually connected
            if broker.connected and len(manager.active) > 0:
                account_state = await broker.get_account_state()
                positions = await broker.get_positions()

                # Only broadcast if state materially changed
                key = f"{account_state.equity:.0f}_{account_state.margin_level:.1f}_{len(positions)}"
                if not hasattr(feed_loop, '_last_key') or feed_loop._last_key != key:
                    feed_loop._last_key = key
                    risk_score = risk_engine.score(account_state, positions)
                    cb_state = circuit_breaker.state()
                    market_type = get_exchange_market_type(broker.exchange_id or "binance")
                    session_open = is_market_open(market_type)

                    # Minimal price map — only price + pnl per position
                    price_map = {
                        p.ticker: {
                            "price": p.current_price,
                            "pnl": p.pnl,
                        }
                        for p in positions
                    }

                    _seq += 1
                    await manager.broadcast({
                        "type": "STATE_UPDATE",
                        "account": account_state.dict(),
                        "positions": [p.dict() for p in positions],
                        "risk": risk_score,
                        "circuit_breaker": cb_state,
                        "price_map": price_map,
                        "market_type": market_type.value,
                        "session_open": session_open,
                        "demo": broker.demo_mode,
                        "seq": _seq,
                        "ts": int(_time.time() * 1000),
                    })
        except Exception as e:
            print(f"[feed_loop] error: {e}")
        await asyncio.sleep(1.4)

@app.get("/status")
async def system_status():
    uptime = round(_time.time() - _start_time)
    market_type = get_exchange_market_type(broker.exchange_id or 'binance')
    session_open = is_market_open(market_type)
    return {
        "service": "MarqBridge",
        "version": "1.0.0",
        "uptime_seconds": uptime,
        "broker_connected": broker.connected,
        "broker_exchange": broker.exchange_id,
        "broker_last_sync": broker.last_sync,
        "ws_clients": len(manager.active),
        "circuit_breaker": circuit_breaker.state(),
        "market_type": market_type.value,
        "session_open": session_open,
        "environment": os.getenv("ENVIRONMENT", "development"),
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "MarqBridge",
        "broker_connected": broker.connected,
        "broker_exchange": broker.exchange_id,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.backend_port, reload=True)
