from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from database import get_db
from models.prop_models import PropDeskDB, PropTraderDB, PropRiskEventDB
from pydantic import BaseModel
from typing import Optional
import uuid
import time

router = APIRouter()

class CreateDeskRequest(BaseModel):
    name: str
    daily_loss_limit: float = 1000.0
    max_margin_per_acct: float = 50.0
    circuit_breaker_losses: int = 3

class AddTraderRequest(BaseModel):
    desk_id: str
    name: str
    exchange: str
    api_key_hint: str

class RiskRuleUpdate(BaseModel):
    daily_loss_limit: Optional[float] = None
    max_margin_per_acct: Optional[float] = None
    circuit_breaker_losses: Optional[int] = None

@router.post("/desk")
async def create_desk(
    req: CreateDeskRequest,
    db: AsyncSession = Depends(get_db)
):
    desk = PropDeskDB(
        id=str(uuid.uuid4()),
        name=req.name,
        created_at=int(time.time() * 1000),
        daily_loss_limit=req.daily_loss_limit,
        max_margin_per_acct=req.max_margin_per_acct,
        circuit_breaker_losses=req.circuit_breaker_losses,
    )
    db.add(desk)
    await db.commit()
    return {"id": desk.id, "name": desk.name}

@router.get("/desk/{desk_id}")
async def get_desk(desk_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PropDeskDB).where(PropDeskDB.id == desk_id)
    )
    desk = result.scalar_one_or_none()
    if not desk:
        raise HTTPException(status_code=404, detail="Desk not found")

    traders_result = await db.execute(
        select(PropTraderDB).where(PropTraderDB.desk_id == desk_id)
    )
    traders = traders_result.scalars().all()

    return {
        "id": desk.id,
        "name": desk.name,
        "rules": {
            "daily_loss_limit": desk.daily_loss_limit,
            "max_margin_per_acct": desk.max_margin_per_acct,
            "circuit_breaker_losses": desk.circuit_breaker_losses,
        },
        "traders": [
            {"id": t.id, "name": t.name, "exchange": t.exchange,
             "active": t.active, "api_key_hint": t.api_key_hint}
            for t in traders
        ],
        "trader_count": len(traders),
    }

@router.post("/trader")
async def add_trader(
    req: AddTraderRequest,
    db: AsyncSession = Depends(get_db)
):
    trader = PropTraderDB(
        id=str(uuid.uuid4()),
        desk_id=req.desk_id,
        name=req.name,
        exchange=req.exchange,
        api_key_hint=req.api_key_hint,
        active=True,
        created_at=int(time.time() * 1000),
    )
    db.add(trader)
    await db.commit()
    return {"id": trader.id, "name": trader.name}

@router.patch("/desk/{desk_id}/rules")
async def update_rules(
    desk_id: str,
    req: RiskRuleUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PropDeskDB).where(PropDeskDB.id == desk_id)
    )
    desk = result.scalar_one_or_none()
    if not desk:
        raise HTTPException(status_code=404, detail="Desk not found")

    if req.daily_loss_limit is not None:
        desk.daily_loss_limit = req.daily_loss_limit
    if req.max_margin_per_acct is not None:
        desk.max_margin_per_acct = req.max_margin_per_acct
    if req.circuit_breaker_losses is not None:
        desk.circuit_breaker_losses = req.circuit_breaker_losses

    await db.commit()
    return {"updated": True}

@router.get("/desk/{desk_id}/events")
async def get_risk_events(
    desk_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PropRiskEventDB)
        .where(PropRiskEventDB.desk_id == desk_id)
        .order_by(desc(PropRiskEventDB.ts))
        .limit(limit)
    )
    events = result.scalars().all()
    return [
        {"id": e.id, "trader_id": e.trader_id,
         "event_type": e.event_type, "detail": e.detail, "ts": e.ts}
        for e in events
    ]

@router.get("/desk/{desk_id}/compliance")
async def compliance_report(
    desk_id: str,
    db: AsyncSession = Depends(get_db)
):
    desk_result = await db.execute(
        select(PropDeskDB).where(PropDeskDB.id == desk_id)
    )
    desk = desk_result.scalar_one_or_none()
    if not desk:
        raise HTTPException(status_code=404, detail="Desk not found")

    events_result = await db.execute(
        select(PropRiskEventDB).where(PropRiskEventDB.desk_id == desk_id)
    )
    events = events_result.scalars().all()

    return {
        "generated_at": int(time.time() * 1000),
        "desk_name": desk.name,
        "desk_id": desk_id,
        "rules": {
            "daily_loss_limit": desk.daily_loss_limit,
            "max_margin_per_acct": desk.max_margin_per_acct,
            "circuit_breaker_losses": desk.circuit_breaker_losses,
        },
        "total_risk_events": len(events),
        "events": [
            {"trader_id": e.trader_id, "event_type": e.event_type,
             "detail": e.detail, "ts": e.ts}
            for e in events
        ],
    }
