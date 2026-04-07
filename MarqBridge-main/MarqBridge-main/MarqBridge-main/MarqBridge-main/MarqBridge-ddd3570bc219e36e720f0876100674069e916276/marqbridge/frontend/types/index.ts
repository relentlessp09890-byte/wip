export type RiskLevel = 'SAFE' | 'WARNING' | 'DANGER' | 'CRITICAL'
export type HeatLevel = 'NORMAL' | 'ELEVATED' | 'HIGH' | 'EXTREME'
export type Side = 'LONG' | 'SHORT' | 'UNKNOWN'
export type MarketRegime = 'TRENDING' | 'RANGING' | 'VOLATILE' | 'ILLIQUID'

export interface AccountState {
  equity: number
  balance: number
  marginLevel: number
  freeMargin: number
  usedMargin: number
  liquidationProximity: number
  riskLevel: RiskLevel
  heat: HeatLevel
  lastUpdated: number
}

export interface Position {
  id: string
  ticker: string
  side: Side
  size: number
  entryPrice: number
  currentPrice: number
  pnl: number
  pnlPct: number
  marginUsed: number
  liquidationPrice: number
  distanceToLiq: number
  openedAt: number
}

export interface DecisionEntry {
  id: string
  timestamp: number
  ticker: string
  side: Side
  size: number
  entryPrice: number
  exitPrice: number | null
  pnl: number | null
  marginAtEntry: number
  riskScoreAtEntry: number
  gateOverridden: boolean
  emotionalTag: string | null
  notes: string | null
}

export interface NewsItem {
  id: string
  headline: string
  source: string
  category: 'crypto' | 'equity' | 'macro' | 'forex'
  tickers: string[]
  score: number
  marketImpact: number
  positionRelevance: number
  timeSensitivity: number
  summary: string
  publishedAt: number
  url: string
}

export interface BrokerConfig {
  exchange: 'binance' | 'bybit' | 'okx' | 'zerodha' | 'demo'
  apiKey: string
  apiSecret: string
  connected: boolean
  lastSync: number | null
}

export interface RiskScore {
  overall: number
  axes: {
    margin: number
    exposure: number
    liquidation: number
  }
  level: RiskLevel
  heat: HeatLevel
  ts: number
}

export interface MarqStore {
  account: AccountState | null
  positions: Position[]
  decisions: DecisionEntry[]
  news: NewsItem[]
  broker: BrokerConfig | null
  connected: boolean
  regime: MarketRegime | null
  activeTab: string
  sidebarOpen: boolean
  latencyMs: number | null
  marketType: 'crypto' | 'forex' | 'india' | 'equity' | null
  sessionOpen: boolean
  riskScore: RiskScore | null
  priceMap: Record<string, number>
  setPriceMap: (map: Record<string, number>) => void
  setSidebarOpen: (sidebarOpen: boolean) => void
  setMarketType: (t: string | null) => void
  setSessionOpen: (v: boolean) => void
  setRiskScore: (score: RiskScore) => void
  setAccount: (account: AccountState) => void
  setPositions: (positions: Position[]) => void
  addDecision: (entry: DecisionEntry) => void
  setDecisions: (decisions: DecisionEntry[]) => void
  addNews: (item: NewsItem) => void
  setBroker: (config: BrokerConfig) => void
  setConnected: (v: boolean) => void
  setRegime: (r: MarketRegime) => void
  setActiveTab: (tab: string) => void
  setLatency: (ms: number | null) => void
}
