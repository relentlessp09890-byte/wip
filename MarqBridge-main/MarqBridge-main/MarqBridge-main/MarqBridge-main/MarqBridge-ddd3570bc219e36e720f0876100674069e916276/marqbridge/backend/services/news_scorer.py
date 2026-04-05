import httpx
import time
import uuid
import json
from datetime import datetime
from anthropic import AsyncAnthropic
from core.config import settings

client = AsyncAnthropic(api_key=settings.anthropic_api_key)

# Rolling 24h cache
_news_cache: list[dict] = []
_seen_urls: set[str] = set()

MOCK_NEWS = [
    {
        "id": str(uuid.uuid4()),
        "headline": "Fed signals unexpected rate pause — crypto markets surge",
        "source": "Reuters",
        "category": "macro",
        "url": "https://reuters.com/mock-1",
        "published_at": int(time.time() * 1000) - 120000,
    },
    {
        "id": str(uuid.uuid4()),
        "headline": "Binance halts withdrawals for 45-minute scheduled maintenance",
        "source": "Binance",
        "category": "crypto",
        "url": "https://binance.com/mock-2",
        "published_at": int(time.time() * 1000) - 660000,
    },
    {
        "id": str(uuid.uuid4()),
        "headline": "ECB emergency meeting called after eurozone CPI surprise",
        "source": "Bloomberg",
        "category": "macro",
        "url": "https://bloomberg.com/mock-3",
        "published_at": int(time.time() * 1000) - 1800000,
    },
    {
        "id": str(uuid.uuid4()),
        "headline": "Gold demand hits 6-year high as central banks add reserves",
        "source": "FT",
        "category": "macro",
        "url": "https://ft.com/mock-4",
        "published_at": int(time.time() * 1000) - 3600000,
    },
    {
        "id": str(uuid.uuid4()),
        "headline": "New Ethereum EIP proposal for gas fee restructuring",
        "source": "CoinDesk",
        "category": "crypto",
        "url": "https://coindesk.com/mock-5",
        "published_at": int(time.time() * 1000) - 7200000,
    },
]


def _normalize_ticker(ticker: str) -> str:
    return ticker.replace("USDT", "").replace("USD", "").replace("/", "").upper()


def _parse_timestamp(timestamp: str) -> int:
    try:
        ts = timestamp.replace("Z", "+00:00")
        return int(datetime.fromisoformat(ts).timestamp() * 1000)
    except Exception:
        try:
            return int(time.mktime(time.strptime(timestamp, "%Y-%m-%dT%H:%M:%S%z")) * 1000)
        except Exception:
            return int(time.time() * 1000)


def _infer_category(title: str, description: str | None = None) -> str:
    text = f"{title} {description or ''}".lower()
    if any(w in text for w in ["crypto", "bitcoin", "ethereum", "ethereum", "coin", "binance", "eth", "btc"]):
        return "crypto"
    if any(w in text for w in ["fed", "ecb", "cpi", "rate", "inflation", "macro", "economic", "supply"]):
        return "macro"
    if any(w in text for w in ["stock", "equity", "market", "ipo", "earnings"]):
        return "equity"
    return "macro"


async def _fetch_cryptopanic_news() -> list[dict]:
    if not settings.cryptopanic_api_key:
        return []

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                "https://cryptopanic.com/api/v1/posts/",
                params={
                    "auth_token": settings.cryptopanic_api_key,
                    "public": "true",
                    "kind": "news",
                },
            )
            response.raise_for_status()
            payload = response.json()
    except Exception as e:
        print(f"[news_scorer] Cryptopanic fetch failed: {e}")
        return []

    results = []
    for item in payload.get("results", []):
        title = item.get("title", "")
        source = item.get("source", {}).get("title") or item.get("source", {}).get("domain") or "CryptoPanic"
        url = item.get("url")
        published_at = _parse_timestamp(item.get("published_at", ""))
        summary = item.get("body", "")
        results.append({
            "id": str(uuid.uuid4()),
            "headline": title,
            "source": source,
            "category": _infer_category(title, summary),
            "url": url,
            "published_at": published_at,
            "summary": summary,
        })
    return results


async def _fetch_newsapi_news(position_tickers: list[str]) -> list[dict]:
    if not settings.news_api_key:
        return []

    query_terms = ["crypto", "market", "economy", "bitcoin", "ethereum"]
    if position_tickers:
        query_terms = [
            _normalize_ticker(t) for t in position_tickers if t
        ] + query_terms

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q": " OR ".join(query_terms),
                    "language": "en",
                    "sortBy": "publishedAt",
                    "pageSize": 15,
                },
                headers={"Authorization": settings.news_api_key},
            )
            response.raise_for_status()
            payload = response.json()
    except Exception as e:
        print(f"[news_scorer] NewsAPI fetch failed: {e}")
        return []

    results = []
    for article in payload.get("articles", []):
        title = article.get("title", "")
        source = article.get("source", {}).get("name", "NewsAPI")
        url = article.get("url")
        published_at = _parse_timestamp(article.get("publishedAt", ""))
        description = article.get("description") or article.get("content") or ""
        results.append({
            "id": str(uuid.uuid4()),
            "headline": title,
            "source": source,
            "category": _infer_category(title, description),
            "url": url,
            "published_at": published_at,
            "summary": description,
        })
    return results


async def _load_news(position_tickers: list[str]) -> list[dict]:
    if settings.cryptopanic_api_key:
        news = await _fetch_cryptopanic_news()
        if news:
            return news

    if settings.news_api_key:
        news = await _fetch_newsapi_news(position_tickers)
        if news:
            return news

    return MOCK_NEWS


async def score_article(
    headline: str,
    source: str,
    category: str,
    position_tickers: list[str],
) -> dict:
    """
    Score a news article using Claude.
    Returns scores 1-10 on 3 axes.
    Falls back to heuristic scoring if no API key.
    """
    if not settings.anthropic_api_key:
        return _heuristic_score(headline, category, position_tickers)

    try:
        positions_str = ", ".join(position_tickers) if position_tickers else "none"
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            system="""You are a financial news impact scorer for a professional trader.
Score the article on 3 axes from 1-10:
- market_impact: How likely is this to move markets significantly?
- position_relevance: Given the trader's positions, how directly does this affect them? 0 if no match.
- time_sensitivity: Is this breaking news or already priced in?

Return ONLY valid JSON. No other text.
Example: {"market_impact":8,"position_relevance":9,"time_sensitivity":7,"tickers":["BTCUSDT"]}""",
            messages=[{
                "role": "user",
                "content": f"Headline: {headline}\nCategory: {category}\nTrader holds: {positions_str}\nScore this article."
            }]
        )

        raw = message.content[0].text.strip()
        data = json.loads(raw)

        mi = float(data.get("market_impact", 5))
        pr = float(data.get("position_relevance", 0))
        ts = float(data.get("time_sensitivity", 5))
        combined = round(mi * 0.35 + pr * 0.45 + ts * 0.20)
        tickers = data.get("tickers", [])

        return {
            "market_impact": round(mi),
            "position_relevance": round(pr),
            "time_sensitivity": round(ts),
            "combined": combined,
            "tickers": tickers,
        }
    except Exception as e:
        print(f"[news_scorer] AI scoring failed: {e}")
        return _heuristic_score(headline, category, position_tickers)


def _heuristic_score(
    headline: str,
    category: str,
    position_tickers: list[str],
) -> dict:
    """Fallback scoring without AI."""
    h = headline.lower()
    market_impact = 5
    if any(w in h for w in ["emergency", "halt", "crash", "surge", "ban", "fed", "ecb"]):
        market_impact = 8
    if any(w in h for w in ["minor", "update", "proposal", "meeting"]):
        market_impact = 3

    tickers_mentioned = []
    position_relevance = 0
    for t in position_tickers:
        base = _normalize_ticker(t)
        if base.lower() in h or t.lower() in h:
            tickers_mentioned.append(t)
            position_relevance = 8

    if position_relevance == 0 and category == "macro":
        position_relevance = 4

    time_sensitivity = 7 if any(
        w in h for w in ["breaking", "halt", "emergency", "now", "just"]
    ) else 4

    combined = round(market_impact * 0.35 + position_relevance * 0.45
                     + time_sensitivity * 0.20)

    return {
        "market_impact": market_impact,
        "position_relevance": position_relevance,
        "time_sensitivity": time_sensitivity,
        "combined": combined,
        "tickers": tickers_mentioned,
    }


async def get_scored_news(position_tickers: list[str]) -> list[dict]:
    """Fetch and score news items using live APIs when keys are available."""
    source_news = await _load_news(position_tickers)
    results = []
    for article in source_news:
        scores = await score_article(
            article["headline"],
            article["source"],
            article["category"],
            position_tickers,
        )
        results.append({
            "id": article.get("id") or str(uuid.uuid4()),
            "headline": article["headline"],
            "source": article["source"],
            "category": article["category"],
            "url": article["url"],
            "published_at": article["published_at"],
            "score": scores["combined"],
            "market_impact": scores["market_impact"],
            "position_relevance": scores["position_relevance"],
            "time_sensitivity": scores["time_sensitivity"],
            "tickers": scores["tickers"],
            "summary": article.get("summary", ""),
        })
    results.sort(key=lambda x: x["score"], reverse=True)
    return results
