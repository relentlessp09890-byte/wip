from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from database import get_db
from models.db_models import JournalEntryDB
from pydantic import BaseModel
from typing import Optional, List
from services.risk_engine import risk_engine
from services.broker_connector import broker
from services.circuit_breaker import circuit_breaker
import time, uuid
import csv
import io
from fastapi.responses import StreamingResponse, JSONResponse

router = APIRouter()

class StressTestRequest(BaseModel):
    shock_pct: float

class SimulateRequest(BaseModel):
    ticker: str
    side: str
    size: float
    entry_price: float
    leverage: float = 1.0

class JournalEntry(BaseModel):
    ticker: str
    side: str
    size: float
    entry_price: float
    exit_price: Optional[float] = None
    pnl: Optional[float] = None
    risk_score_at_entry: float
    gate_overridden: bool = False
    emotional_tag: Optional[str] = None
    notes: Optional[str] = None

class EmotionalTagRequest(BaseModel):
    entry_id: str
    tag: str

class UnlockRequest(BaseModel):
    confirmation_code: str

@router.post("/journal/add")
async def add_journal_entry(
    entry: JournalEntry,
    db: AsyncSession = Depends(get_db)
):
    account = await broker.get_account_state()
    record = JournalEntryDB(
        id=str(uuid.uuid4()),
        timestamp=int(time.time() * 1000),
        ticker=entry.ticker,
        side=entry.side.upper(),
        size=entry.size,
        entry_price=entry.entry_price,
        exit_price=entry.exit_price,
        pnl=entry.pnl,
        margin_at_entry=account.used_margin,
        risk_score_at_entry=entry.risk_score_at_entry,
        gate_overridden=entry.gate_overridden,
        emotional_tag=entry.emotional_tag,
        notes=entry.notes,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return {
        "id": record.id,
        "timestamp": record.timestamp,
        "ticker": record.ticker,
        "side": record.side,
        "size": record.size,
        "entry_price": record.entry_price,
        "exit_price": record.exit_price,
        "pnl": record.pnl,
        "margin_at_entry": record.margin_at_entry,
        "risk_score_at_entry": record.risk_score_at_entry,
        "gate_overridden": record.gate_overridden,
        "emotional_tag": record.emotional_tag,
        "notes": record.notes,
    }

@router.get("/journal")
async def get_journal(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(JournalEntryDB).order_by(desc(JournalEntryDB.timestamp)).limit(500)
    )
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "timestamp": r.timestamp,
            "ticker": r.ticker,
            "side": r.side,
            "size": r.size,
            "entry_price": r.entry_price,
            "exit_price": r.exit_price,
            "pnl": r.pnl,
            "margin_at_entry": r.margin_at_entry,
            "risk_score_at_entry": r.risk_score_at_entry,
            "gate_overridden": r.gate_overridden,
            "emotional_tag": r.emotional_tag,
            "notes": r.notes,
        }
        for r in rows
    ]

@router.patch("/journal/tag")
async def tag_entry(
    req: EmotionalTagRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(JournalEntryDB).where(JournalEntryDB.id == req.entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        return {"error": "entry not found"}
    entry.emotional_tag = req.tag
    await db.commit()
    return {"id": entry.id, "emotional_tag": entry.emotional_tag}

@router.get("/journal/discipline")
async def discipline_score(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(JournalEntryDB).order_by(desc(JournalEntryDB.timestamp))
    )
    journal = result.scalars().all()

    total = len(journal)
    if total == 0:
        return {
            "score": 100,
            "grade": "A",
            "total_trades": 0,
            "gate_respected": 0,
            "gate_overridden": 0,
            "win_rate": 0,
            "patterns": [],
        }

    overrides = [e for e in journal if e.gate_overridden]
    wins = [e for e in journal if (e.pnl or 0) > 0]
    losses = [e for e in journal if (e.pnl or 0) < 0]
    gate_resp = total - len(overrides)
    discipline = round(gate_resp / total * 100)
    win_rate = round(len(wins) / total * 100)

    grade = "A" if discipline >= 90 else \
            "B" if discipline >= 75 else \
            "C" if discipline >= 60 else \
            "D" if discipline >= 45 else "F"

    patterns = []
    if len(overrides) >= 2:
        patterns.append({
            "type": "gate_override",
            "message": f"Risk gate overridden {len(overrides)} times — review discipline."
        })
    recent = [e.pnl or 0 for e in list(journal)[:3]]
    if len(recent) == 3 and all(p < 0 for p in recent):
        patterns.append({
            "type": "consecutive_losses",
            "message": "3 consecutive losses — consider a session break."
        })
    if total >= 5 and win_rate < 40:
        patterns.append({
            "type": "low_win_rate",
            "message": f"Win rate at {win_rate}% — review entry criteria."
        })

    return {
        "score": discipline,
        "grade": grade,
        "total_trades": total,
        "gate_respected": gate_resp,
        "gate_overridden": len(overrides),
        "win_rate": win_rate,
        "patterns": patterns,
    }

@router.get("/score")
async def get_risk_score():
    account = await broker.get_account_state()
    positions = await broker.get_positions()
    return risk_engine.score(account, positions)

@router.post("/stress-test")
async def stress_test(req: StressTestRequest):
    account = await broker.get_account_state()
    positions = await broker.get_positions()
    return risk_engine.stress_test(account, positions, req.shock_pct)

@router.post("/simulate")
async def simulate_trade(req: SimulateRequest):
    account = await broker.get_account_state()
    positions = await broker.get_positions()
    return risk_engine.simulate_trade(
        account, positions,
        req.ticker, req.side, req.size,
        req.entry_price, req.leverage,
    )

@router.get("/session-heat")
async def session_heat(db: AsyncSession = Depends(get_db)):
    today_start = int(time.time() * 1000) - 86400000
    result = await db.execute(
        select(JournalEntryDB)
        .where(JournalEntryDB.timestamp >= today_start)
        .order_by(JournalEntryDB.timestamp)
    )
    today = [
        {"pnl": r.pnl, "gate_overridden": r.gate_overridden}
        for r in result.scalars().all()
    ]
    return risk_engine.session_heat(today)

@router.get("/circuit-breaker")
async def get_circuit_breaker():
    return circuit_breaker.state()

@router.post("/circuit-breaker/unlock")
async def unlock_circuit_breaker(req: UnlockRequest):
    success = circuit_breaker.unlock(req.confirmation_code)
    return {"unlocked": success} if success else {
        "unlocked": False, "message": "Invalid confirmation code."
    }

@router.post("/circuit-breaker/reset")
async def reset_session():
    circuit_breaker.reset_session()
    return {"reset": True}

@router.get("/journal/export/csv")
async def export_journal_csv(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(JournalEntryDB).order_by(desc(JournalEntryDB.timestamp))
    )
    entries = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Time", "Ticker", "Side", "Size",
        "Entry Price", "Exit Price", "P&L", "P&L %",
        "Risk Score", "Gate Overridden", "Emotional Tag", "Notes"
    ])
    for e in entries:
        dt = __import__('datetime').datetime.fromtimestamp(e.timestamp / 1000)
        pnl_pct = round(e.pnl / (e.entry_price * e.size) * 100, 2) if (
            e.pnl and e.entry_price and e.size
        ) else 0
        writer.writerow([
            dt.strftime('%Y-%m-%d'),
            dt.strftime('%H:%M:%S'),
            e.ticker,
            e.side,
            e.size,
            e.entry_price,
            e.exit_price or '',
            e.pnl or '',
            pnl_pct,
            e.risk_score_at_entry,
            'Yes' if e.gate_overridden else 'No',
            e.emotional_tag or '',
            e.notes or '',
        ])

    output.seek(0)
    filename = f"marqbridge_journal_{int(time.time())}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/journal/export/summary")
async def export_summary(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(JournalEntryDB).order_by(desc(JournalEntryDB.timestamp))
    )
    entries = result.scalars().all()
    if not entries:
        return JSONResponse({"error": "No journal entries"}, status_code=404)

    closed = [e for e in entries if e.pnl is not None]
    wins   = [e for e in closed  if e.pnl > 0]
    losses = [e for e in closed  if e.pnl <= 0]
    total_pnl    = sum(e.pnl for e in closed)
    avg_win      = sum(e.pnl for e in wins)   / len(wins)   if wins   else 0
    avg_loss     = sum(e.pnl for e in losses) / len(losses) if losses else 0
    profit_factor = abs(sum(e.pnl for e in wins) / sum(e.pnl for e in losses)) if losses and sum(e.pnl for e in losses) != 0 else 0

    by_tag = {}
    for e in closed:
        tag = e.emotional_tag or 'untagged'
        if tag not in by_tag:
            by_tag[tag] = {'count': 0, 'pnl': 0}
        by_tag[tag]['count'] += 1
        by_tag[tag]['pnl']   += e.pnl or 0

    overrides = [e for e in entries if e.gate_overridden]

    return {
        "generated_at":   int(time.time() * 1000),
        "total_trades":   len(entries),
        "closed_trades":  len(closed),
        "win_rate":       round(len(wins) / len(closed) * 100, 1) if closed else 0,
        "total_pnl":      round(total_pnl, 2),
        "avg_win":        round(avg_win, 2),
        "avg_loss":       round(avg_loss, 2),
        "profit_factor":  round(profit_factor, 2),
        "gate_overrides": len(overrides),
        "discipline_pct": round((len(entries) - len(overrides)) / len(entries) * 100, 1),
        "by_emotion":     {k: {"count": v["count"], "pnl": round(v["pnl"], 2)} for k, v in by_tag.items()},
    }
