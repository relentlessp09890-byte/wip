from services.broker_connector import broker
from services.demo_data import get_demo_account, get_demo_positions
from services.risk_engine import risk_engine
from services.circuit_breaker import circuit_breaker
from services.market_config import get_exchange_market_type, is_market_open
import time


class SessionManager:
    """
    Single point of truth for broker session state.
    All switches go through here — never directly.
    """

    def _session_state(self):
        market_type = get_exchange_market_type(broker.exchange_id or 'binance')
        return market_type.value, is_market_open(market_type)

    async def switch_to_demo(self) -> dict:
        # Step 1: Hard disconnect any real broker
        await broker.disconnect()
        # Step 2: Activate demo
        await broker.connect_demo()
        # Step 3: Get demo state
        account = get_demo_account()
        positions = get_demo_positions()
        risk = risk_engine.score(account, positions)
        market_type, session_open = self._session_state()
        return {
            "type": "SESSION_SWITCH",
            "mode": "demo",
            "demo": True,
            "account": account.dict(),
            "positions": [p.dict() for p in positions],
            "risk": risk,
            "market_type": market_type,
            "session_open": session_open,
            "ts": int(time.time() * 1000),
        }

    async def switch_to_real(
        self, exchange: str, api_key: str, api_secret: str
    ) -> dict:
        # Step 1: Hard disconnect demo
        await broker.disconnect()
        broker.demo_mode = False
        # Step 2: Connect real broker
        await broker.connect(exchange, api_key, api_secret)
        # Step 3: Immediately fetch real state
        account = await broker.get_account_state()
        positions = await broker.get_positions()
        risk = risk_engine.score(account, positions)
        market_type, session_open = self._session_state()
        return {
            "type": "SESSION_SWITCH",
            "mode": "live",
            "exchange": exchange,
            "demo": False,
            "account": account.dict(),
            "positions": [p.dict() for p in positions],
            "risk": risk,
            "market_type": market_type,
            "session_open": session_open,
            "ts": int(time.time() * 1000),
        }

    async def disconnect(self) -> dict:
        await broker.disconnect()
        return {
            "type": "SESSION_SWITCH",
            "mode": "disconnected",
            "ts": int(time.time() * 1000),
        }


session_manager = SessionManager()
