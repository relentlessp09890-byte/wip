import time
import math
import uuid
from models.schemas import AccountState, Position, Side, RiskLevel

def _wave(period: float, amplitude: float, offset: float = 0) -> float:
    """Generate a sine wave for realistic demo data oscillation."""
    return amplitude * math.sin((time.time() / period) + offset)

def get_demo_account() -> AccountState:
    """Generate live-simulated account data with oscillating values."""
    equity       = 24500 + _wave(60, 800)
    used_margin  = 6200  + _wave(90, 400)
    margin_level = (equity / used_margin * 100) if used_margin > 0 else 999
    free_margin  = equity - used_margin

    return AccountState(
        equity=round(equity, 2),
        balance=round(equity - _wave(120, 200), 2),
        margin_level=round(margin_level, 2),
        free_margin=round(free_margin, 2),
        used_margin=round(used_margin, 2),
        liquidation_proximity=round(max(0, 100 - (margin_level - 100)), 2),
        risk_level=RiskLevel.WARNING if margin_level < 200 else RiskLevel.SAFE,
        heat="ELEVATED" if margin_level < 200 else "NORMAL",
        last_updated=int(time.time() * 1000),
    )

def get_demo_positions() -> list[Position]:
    """Generate live-simulated positions with oscillating prices."""
    btc_price = 84200 + _wave(45, 1200)
    eth_price = 3180  + _wave(60,  180)
    xau_price = 3020  + _wave(80,   40)

    return [
        Position(
            id="demo-btc-1",
            ticker="BTCUSDT",
            side=Side.LONG,
            size=0.05,
            entry_price=82400.0,
            current_price=round(btc_price, 2),
            pnl=round((btc_price - 82400) * 0.05, 2),
            pnl_pct=round((btc_price - 82400) / 82400 * 100, 2),
            margin_used=round(82400 * 0.05 / 10, 2),
            liquidation_price=round(82400 * 0.91, 2),
            distance_to_liq=round(abs(btc_price - 82400 * 0.91) / btc_price * 100, 2),
            opened_at=int(time.time() * 1000) - 7200000,
        ),
        Position(
            id="demo-eth-1",
            ticker="ETHUSDT",
            side=Side.LONG,
            size=1.2,
            entry_price=3050.0,
            current_price=round(eth_price, 2),
            pnl=round((eth_price - 3050) * 1.2, 2),
            pnl_pct=round((eth_price - 3050) / 3050 * 100, 2),
            margin_used=round(3050 * 1.2 / 10, 2),
            liquidation_price=round(3050 * 0.91, 2),
            distance_to_liq=round(abs(eth_price - 3050 * 0.91) / eth_price * 100, 2),
            opened_at=int(time.time() * 1000) - 3600000,
        ),
        Position(
            id="demo-xau-1",
            ticker="XAUUSD",
            side=Side.SHORT,
            size=0.5,
            entry_price=3045.0,
            current_price=round(xau_price, 2),
            pnl=round((3045 - xau_price) * 0.5, 2),
            pnl_pct=round((3045 - xau_price) / 3045 * 100, 2),
            margin_used=round(3045 * 0.5 / 20, 2),
            liquidation_price=round(3045 * 1.05, 2),
            distance_to_liq=round(abs(xau_price - 3045 * 1.05) / xau_price * 100, 2),
            opened_at=int(time.time() * 1000) - 1800000,
        ),
    ]

DEMO_JOURNAL = [
    {
        "id": str(uuid.uuid4()),
        "timestamp": int(time.time() * 1000) - 86400000,
        "ticker": "BTCUSDT",
        "side": "LONG",
        "size": 0.03,
        "entry_price": 81200.0,
        "exit_price": 83400.0,
        "pnl": 66.0,
        "margin_at_entry": 2436.0,
        "risk_score_at_entry": 28,
        "gate_overridden": False,
        "emotional_tag": "conviction",
        "notes": None,
    },
    {
        "id": str(uuid.uuid4()),
        "timestamp": int(time.time() * 1000) - 172800000,
        "ticker": "ETHUSDT",
        "side": "SHORT",
        "size": 2.0,
        "entry_price": 3280.0,
        "exit_price": 3190.0,
        "pnl": 180.0,
        "margin_at_entry": 656.0,
        "risk_score_at_entry": 35,
        "gate_overridden": False,
        "emotional_tag": "plan",
        "notes": None,
    },
    {
        "id": str(uuid.uuid4()),
        "timestamp": int(time.time() * 1000) - 259200000,
        "ticker": "BTCUSDT",
        "side": "LONG",
        "size": 0.08,
        "entry_price": 79500.0,
        "exit_price": 78200.0,
        "pnl": -104.0,
        "margin_at_entry": 6360.0,
        "risk_score_at_entry": 62,
        "gate_overridden": True,
        "emotional_tag": "fomo",
        "notes": "Ignored gate warning — paid the price",
    },
]
