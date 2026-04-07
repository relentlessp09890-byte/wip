from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class RiskLevel(str, Enum):
    SAFE = "SAFE"
    WARNING = "WARNING"
    DANGER = "DANGER"
    CRITICAL = "CRITICAL"

class Side(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"
    UNKNOWN = "UNKNOWN"

class AccountState(BaseModel):
    equity: float
    balance: float
    margin_level: float
    free_margin: float
    used_margin: float
    liquidation_proximity: float
    risk_level: RiskLevel
    heat: str
    last_updated: int

class Position(BaseModel):
    id: str
    ticker: str
    side: Side
    size: float
    entry_price: float
    current_price: float
    pnl: float
    pnl_pct: float
    margin_used: float
    liquidation_price: float
    distance_to_liq: float
    opened_at: int

class DecisionEntry(BaseModel):
    id: str
    timestamp: int
    ticker: str
    side: Side
    size: float
    entry_price: float
    exit_price: Optional[float] = None
    pnl: Optional[float] = None
    margin_at_entry: float
    risk_score_at_entry: float
    gate_overridden: bool = False
    emotional_tag: Optional[str] = None
    notes: Optional[str] = None

class BrokerConnectRequest(BaseModel):
    exchange: str
    api_key: str
    api_secret: str

class ZerodhaLoginRequest(BaseModel):
    api_key: str
    api_secret: str
