from typing import Optional, Dict, Any
import ccxt.async_support as ccxt
import time
from models.schemas import AccountState, Position, Side, RiskLevel
from core.config import settings
from services.state_cache import state_cache
import uuid

class BrokerConnector:
    def __init__(self):
        self.exchange: Optional[Any] = None
        self.exchange_id: Optional[str] = None
        self.connected: bool = False
        self.last_sync: Optional[int] = None
        self.demo_mode: bool = False

    async def connect(self, exchange_id: str, api_key: str, api_secret: str) -> bool:
        try:
            exchange_class = getattr(ccxt, exchange_id)
            self.exchange = exchange_class({
                'apiKey': api_key,
                'secret': api_secret,
                'enableRateLimit': True,
                'options': {'defaultType': 'future'},
            })
            await self.exchange.fetch_balance()
            self.exchange_id = exchange_id
            self.connected = True
            self.demo_mode = False
            self.last_sync = int(time.time() * 1000)
            return True
        except Exception as e:
            self.connected = False
            raise RuntimeError(f"Broker connection failed: {str(e)}")

    async def connect_demo(self):
        """Activate demo mode with simulated live data."""
        self.demo_mode = True
        self.connected = True
        self.exchange_id = "demo"
        self.last_sync = int(time.time() * 1000)
        return True

    async def get_account_state(self) -> AccountState:
        if self.demo_mode:
            from services.demo_data import get_demo_account
            return get_demo_account()
        cached = state_cache.get_account()
        if cached:
            return cached
        if not self.connected or not self.exchange:
            return self._empty_account()
        try:
            balance = await self.exchange.fetch_balance()
            info = balance.get('info', {}) or {}

            equity = float(balance.get('totalMarginBalance') or 
                          balance.get('equity') or 
                          info.get('totalMarginBalance') or 0)
            free_margin = float(balance.get('free', {}).get('USDT') or
                               info.get('availableBalance') or 0)
            used_margin = float(info.get('totalPositionInitialMargin') or
                               info.get('usedMargin') or 0)
            balance_val = float(info.get('totalWalletBalance') or equity)

            margin_level = round((equity / used_margin * 100), 2) if used_margin > 0 else 999.0
            liq_proximity = max(0, round(100 - margin_level, 2)) if margin_level < 100 else 0.0

            risk_level = self._calc_risk_level(margin_level)
            heat = self._calc_heat(margin_level, liq_proximity)

            self.last_sync = int(time.time() * 1000)
            result = AccountState(
                equity=round(equity, 2),
                balance=round(balance_val, 2),
                margin_level=round(margin_level, 2),
                free_margin=round(free_margin, 2),
                used_margin=round(used_margin, 2),
                liquidation_proximity=round(liq_proximity, 2),
                risk_level=risk_level,
                heat=heat,
                last_updated=self.last_sync,
            )
            state_cache.set_account(result)
            return result
        except Exception as e:
            print(f"[BrokerConnector] get_account_state error: {e}")
            return self._empty_account()

    async def get_positions(self) -> list[Position]:
        if self.demo_mode:
            from services.demo_data import get_demo_positions
            return get_demo_positions()
        cached = state_cache.get_positions()
        if cached:
            return cached
        if not self.connected or not self.exchange:
            return []
        try:
            raw = await self.exchange.fetch_positions()
            positions = []
            for p in raw:
                size = float(p.get('contracts') or p.get('size') or 0)
                if size == 0:
                    continue
                side_raw = str(p.get('side') or '').upper()
                side = Side.LONG if side_raw in ['LONG', 'BUY', '1'] else (
                       Side.SHORT if side_raw in ['SHORT', 'SELL', '-1'] else Side.UNKNOWN)

                entry = float(p.get('entryPrice') or 0)
                mark = float(p.get('markPrice') or p.get('currentPrice') or entry)
                pnl = float(p.get('unrealizedPnl') or p.get('pnl') or 0)
                margin_used = float(p.get('initialMargin') or p.get('margin') or 0)
                liq_price = float(p.get('liquidationPrice') or 0)
                dist_to_liq = round(abs(mark - liq_price) / mark * 100, 2) if mark > 0 and liq_price > 0 else 999.0
                pnl_pct = round(pnl / margin_used * 100, 2) if margin_used > 0 else 0.0

                positions.append(Position(
                    id=str(p.get('id') or uuid.uuid4()),
                    ticker=str(p.get('symbol') or 'UNKNOWN').replace('/', ''),
                    side=side,
                    size=round(size, 6),
                    entry_price=round(entry, 6),
                    current_price=round(mark, 6),
                    pnl=round(pnl, 4),
                    pnl_pct=pnl_pct,
                    margin_used=round(margin_used, 4),
                    liquidation_price=round(liq_price, 6),
                    distance_to_liq=dist_to_liq,
                    opened_at=int(p.get('timestamp') or time.time() * 1000),
                ))
            state_cache.set_positions(positions)
            return positions
        except Exception as e:
            print(f"[BrokerConnector] get_positions error: {e}")
            return []

    def _calc_risk_level(self, margin_level: float) -> RiskLevel:
        if margin_level >= 200:
            return RiskLevel.SAFE
        if margin_level >= 120:
            return RiskLevel.WARNING
        if margin_level >= 110:
            return RiskLevel.DANGER
        return RiskLevel.CRITICAL

    def _calc_heat(self, margin_level: float, liq_proximity: float) -> str:
        if margin_level >= 300:
            return "NORMAL"
        if margin_level >= 150:
            return "ELEVATED"
        if margin_level >= 120:
            return "HIGH"
        return "EXTREME"

    def _empty_account(self) -> AccountState:
        return AccountState(
            equity=0.0,
            balance=0.0,
            margin_level=0.0,
            free_margin=0.0,
            used_margin=0.0,
            liquidation_proximity=0.0,
            risk_level=RiskLevel.SAFE,
            heat="NORMAL",
            last_updated=int(time.time() * 1000),
        )

    async def disconnect(self):
        state_cache.invalidate()
        if self.exchange:
            await self.exchange.close()
        self.connected = False
        self.exchange = None
        self.demo_mode = False


broker = BrokerConnector()
