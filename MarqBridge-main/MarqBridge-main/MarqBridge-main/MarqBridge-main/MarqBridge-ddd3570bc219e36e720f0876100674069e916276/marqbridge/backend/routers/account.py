from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from models.schemas import AccountState, BrokerConnectRequest, ZerodhaLoginRequest
from core.connection_manager import manager as ws_manager
from services.session_manager import session_manager
from services.broker_connector import broker
from services.zerodha_connector import zerodha_auth
import asyncio, json, time as _time
from services.demo_data import DEMO_JOURNAL
from models.db_models import JournalEntryDB
from database import AsyncSessionLocal
from sqlalchemy import select
from core.limiter import limiter

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

@router.post("/zerodha/login")
@limiter.limit("10/minute")
async def zerodha_login(req: ZerodhaLoginRequest):
    try:
        login_url = await zerodha_auth.prepare_login(req.api_key, req.api_secret)
        return {"login_url": login_url}
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/zerodha/callback")
async def zerodha_callback(request: Request):
    request_token = request.query_params.get('request_token')
    if not request_token:
        return HTMLResponse(
            "<h1>Zerodha login failed</h1><p>No request_token received. Please try again.</p>",
            status_code=400,
        )

    try:
        session = await zerodha_auth.complete_login(request_token)
        payload = await session_manager.switch_to_real(
            'zerodha', session['api_key'], session['access_token']
        )
        await ws_manager.broadcast(payload)
        html = """
<html>
  <body style="background:#08111c;color:#f8fafc;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
    <div style="text-align:center;max-width:480px;padding:24px;">
      <h1>Zerodha connected</h1>
      <p>Your Kite Connect session is active. You may close this window.</p>
    </div>
    <script>
      if (window.opener) {
        window.opener.postMessage({type: "zerodha-auth", success: true}, "*");
        window.close();
      }
    </script>
  </body>
</html>
"""
        return HTMLResponse(html)
    except RuntimeError as e:
        html = (
            '<html><body style="background:#08111c;color:#f8fafc;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">'
            '<h1>Zerodha login failed</h1>'
            f'<p>{str(e)}</p>'
            '</body></html>'
        )
        return HTMLResponse(html, status_code=400)

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
