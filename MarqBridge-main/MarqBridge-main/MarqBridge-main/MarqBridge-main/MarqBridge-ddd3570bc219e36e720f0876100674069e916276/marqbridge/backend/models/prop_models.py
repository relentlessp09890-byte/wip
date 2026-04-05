from sqlalchemy import Column, String, Float, Boolean, Integer, BigInteger, JSON
from database import Base

class PropDeskDB(Base):
    __tablename__ = "prop_desks"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(BigInteger, nullable=False)
    max_traders = Column(Integer, default=10)
    daily_loss_limit = Column(Float, default=1000.0)
    max_margin_per_acct = Column(Float, default=50.0)
    circuit_breaker_losses = Column(Integer, default=3)

class PropTraderDB(Base):
    __tablename__ = "prop_traders"
    id = Column(String, primary_key=True)
    desk_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    exchange = Column(String, nullable=False)
    api_key_hint = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(BigInteger, nullable=False)

class PropRiskEventDB(Base):
    __tablename__ = "prop_risk_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    desk_id = Column(String, nullable=False)
    trader_id = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    detail = Column(JSON, nullable=True)
    ts = Column(BigInteger, nullable=False)
