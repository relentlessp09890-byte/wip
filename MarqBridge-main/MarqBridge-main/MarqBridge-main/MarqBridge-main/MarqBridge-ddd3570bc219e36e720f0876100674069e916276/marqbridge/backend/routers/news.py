from fastapi import APIRouter
from services.news_scorer import get_scored_news
from services.broker_connector import broker

router = APIRouter()

@router.get("/")
async def get_news(min_score: int = 1):
    positions = await broker.get_positions()
    tickers = [p.ticker for p in positions]
    news = await get_scored_news(tickers)
    if min_score > 1:
        news = [n for n in news if n["score"] >= min_score]
    return news
