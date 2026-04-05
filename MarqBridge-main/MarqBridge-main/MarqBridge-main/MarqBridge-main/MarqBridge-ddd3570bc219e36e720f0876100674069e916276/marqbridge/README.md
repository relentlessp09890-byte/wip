# MarqBridge

> Risk-first trading operating system for professional traders.
> Do less. Do it right.

## What it does

MarqBridge mirrors your broker's exact data and guards every
trade before entry. Not a prediction engine. A risk guard.

- **Pre-trade gate** — evaluates margin impact before every entry
- **Circuit breaker** — locks execution on behavioral drift
- **Decision journal** — logs every trade with full context
- **AI news filter** — position-aware, not general market noise
- **Session heat score** — real-time psychological state monitoring
- **Margin stress test** — simulates price shocks before they happen

## Supported markets & brokers

| Market | Brokers |
|--------|---------|
| Crypto | Binance, Bybit, OKX |
| Indian | Zerodha, Angel One |
| Forex  | OANDA, FOREX.com, IBKR |
| Equities | Interactive Brokers |

## Architecture

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Python FastAPI + WebSockets
- **Database**: SQLite (dev) → PostgreSQL (production)
- **State**: Zustand
- **Broker data**: CCXT (read-only)

## Quick start

### 1. Clone and configure

git clone https://github.com/YOUR_USERNAME/MarqBridge.git
cd MarqBridge
cp backend/.env.example backend/.env
# Fill in your broker API keys (read-only only)

### 2. Start backend

cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000

### 3. Start frontend

cd frontend
npm install
npm run dev
# Runs on http://localhost:3000

### 4. Or use Docker

docker-compose up --build

## Security

- Read-only API keys only — MarqBridge never places trades
- Keys stored in local .env — never transmitted externally
- All AI processing runs in your instance
- No external data collection

## License

MIT
