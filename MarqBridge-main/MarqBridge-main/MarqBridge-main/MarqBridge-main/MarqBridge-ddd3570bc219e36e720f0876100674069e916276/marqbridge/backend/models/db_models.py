from sqlalchemy import Column, String, Float, Boolean, Integer, BigInteger
from database import Base

class JournalEntryDB(Base):
    __tablename__ = "journal_entries"
    id                  = Column(String,  primary_key=True)
    timestamp           = Column(BigInteger, nullable=False)
    ticker              = Column(String,  nullable=False)
    side                = Column(String,  nullable=False)
    size                = Column(Float,   nullable=False)
    entry_price         = Column(Float,   nullable=False)
    exit_price          = Column(Float,   nullable=True)
    pnl                 = Column(Float,   nullable=True)
    margin_at_entry     = Column(Float,   default=0.0)
    risk_score_at_entry = Column(Float,   default=0.0)
    gate_overridden     = Column(Boolean, default=False)
    emotional_tag       = Column(String,  nullable=True)
    notes               = Column(String,  nullable=True)

class PositionSnapshotDB(Base):
    __tablename__ = "position_snapshots"
    id            = Column(String,     primary_key=True)
    ticker        = Column(String,     nullable=False)
    side          = Column(String,     nullable=False)
    size          = Column(Float,      nullable=False)
    entry_price   = Column(Float,      nullable=False)
    current_price = Column(Float,      nullable=False)
    pnl           = Column(Float,      nullable=False)
    margin_used   = Column(Float,      nullable=False)
    snapshot_at   = Column(BigInteger, nullable=False)

class AccountSnapshotDB(Base):
    __tablename__ = "account_snapshots"
    id                    = Column(Integer, primary_key=True, autoincrement=True)
    equity                = Column(Float,   nullable=False)
    margin_level          = Column(Float,   nullable=False)
    used_margin           = Column(Float,   nullable=False)
    liquidation_proximity = Column(Float,   nullable=False)
    risk_level            = Column(String,  nullable=False)
    snapshot_at           = Column(BigInteger, nullable=False)
