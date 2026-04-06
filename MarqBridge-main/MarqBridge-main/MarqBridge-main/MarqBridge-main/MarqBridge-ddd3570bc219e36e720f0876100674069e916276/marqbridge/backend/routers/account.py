from fastapi import APIRouter, HTTPException
from models.schemas import AccountState, BrokerConnectRequest
from core.connection_manager import manager as ws_manager
from services.session_manager import session_manager
from services.broker_connector import broker
import asyncio, json, time as _time
from services.demo_data import DEMO_JOURNAL
from models.db_models import JournalEntryDB
from database import AsyncSessionLocal
from sqlalchemy import select
from core.limiter import limiter
from fastapi import Request

router = APIRouter()

@router.get("/state", response_model=AccountState)
async def get_account_state():
    return await broker.get_account_state()

@router.post("/connect")
@limiter.limit("5/minute")
async def connect_broker(request: Request, req: BrokerConnectRequest):
    try:
        payload = await session_manager.switch_to_real(
            req.exchange, req.api_key, req.api_secret
        )
        # Broadcast to ALL connected WS clients instantly
        await ws_manager.broadcast(payload)
        return {
            "connected": True,
            "exchange": req.exchange,
            "demo": False,
            "equity": payload["account"]["equity"],
        }
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/disconnect")
async def disconnect_broker():
    payload = await session_manager.disconnect()
    await ws_manager.broadcast(payload)
    return {"connected": False}

@router.get("/status")
async def broker_status():
    return {
        "connected": broker.connected,
        "exchange": broker.exchange_id,
        "last_sync": broker.last_sync,
    }

@router.post("/demo")
async def connect_demo():
    """Activate demo mode with simulated live data and pre-populated journal."""
    payload = await session_manager.switch_to_demo()
    await ws_manager.broadcast(payload)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(JournalEntryDB).limit(1))
        if not result.scalar_one_or_none():
            for entry in DEMO_JOURNAL:
                db.add(JournalEntryDB(**entry))
            await db.commit()

    return {"connected": True, "exchange": "demo", "demo": True}

@router.get("/ws-token")
async def get_ws_token():
    from main import WS_TOKEN
    return {"token": WS_TOKEN}
