from enum import Enum
from typing import Dict, List
from datetime import time as dtime

class MarketType(str, Enum):
    CRYPTO = "crypto"
    FOREX = "forex"
    INDIA = "india"
    EQUITY = "equity"

MARKET_CONFIG: Dict[MarketType, Dict[str, object]] = {
    MarketType.CRYPTO: {
        "name": "Crypto",
        "session_24h": True,
        "session_start": None,
        "session_end": None,
        "timezone": "UTC",
        "tick_size": 0.01,
        "risk_multiplier": 1.4,
        "exchanges": ["binance", "bybit", "okx"],
        "liq_warning_pct": 15.0,
        "margin_warning_pct": 150.0,
    },
    MarketType.FOREX: {
        "name": "Forex",
        "session_24h": True,
        "session_start": None,
        "session_end": None,
        "timezone": "UTC",
        "tick_size": 0.0001,
        "risk_multiplier": 1.2,
        "exchanges": ["oanda", "forex_com", "interactive_brokers"],
        "liq_warning_pct": 20.0,
        "margin_warning_pct": 120.0,
    },
    MarketType.INDIA: {
        "name": "Indian markets",
        "session_24h": False,
        "session_start": dtime(9, 15),
        "session_end": dtime(15, 30),
        "timezone": "Asia/Kolkata",
        "tick_size": 0.05,
        "risk_multiplier": 1.0,
        "exchanges": ["zerodha", "angel"],
        "liq_warning_pct": 25.0,
        "margin_warning_pct": 100.0,
    },
    MarketType.EQUITY: {
        "name": "Global equities",
        "session_24h": False,
        "session_start": dtime(9, 30),
        "session_end": dtime(16, 0),
        "timezone": "America/New_York",
        "tick_size": 0.01,
        "risk_multiplier": 1.0,
        "exchanges": ["interactive_brokers"],
        "liq_warning_pct": 30.0,
        "margin_warning_pct": 100.0,
    },
}

TICKER_PATTERNS: Dict[MarketType, List[str]] = {
    MarketType.CRYPTO: ["USDT", "BTC", "ETH", "BNB", "SOL"],
    MarketType.FOREX: ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "XAU", "XAG"],
    MarketType.INDIA: ["NIFTY", "BANKNIFTY", "NSE:", "BSE:", "SENSEX", "NSEI", "^NSEI"],
}


def detect_market_type(ticker: str) -> MarketType:
    t = ticker.upper()
    for pattern in TICKER_PATTERNS[MarketType.INDIA]:
        if pattern in t:
            return MarketType.INDIA
    for pattern in TICKER_PATTERNS[MarketType.FOREX]:
        if t.endswith(pattern) or t.startswith(pattern):
            return MarketType.FOREX
    for pattern in TICKER_PATTERNS[MarketType.CRYPTO]:
        if pattern in t:
            return MarketType.CRYPTO
    return MarketType.EQUITY


def get_exchange_market_type(exchange_id: str) -> MarketType:
    for mtype, cfg in MARKET_CONFIG.items():
        if exchange_id in cfg["exchanges"]:
            return mtype
    return MarketType.CRYPTO


def is_market_open(market_type: MarketType) -> bool:
    cfg = MARKET_CONFIG[market_type]
    if cfg["session_24h"]:
        return True
    from datetime import datetime
    import pytz
    tz = pytz.timezone(cfg["timezone"])
    now = datetime.now(tz).time()
    return cfg["session_start"] <= now <= cfg["session_end"]
