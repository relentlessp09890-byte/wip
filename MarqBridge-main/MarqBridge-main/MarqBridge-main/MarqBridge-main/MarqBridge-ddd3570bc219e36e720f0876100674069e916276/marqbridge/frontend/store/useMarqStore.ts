import { create } from 'zustand'
import { MarqStore, AccountState, Position, DecisionEntry, NewsItem, BrokerConfig, MarketRegime } from '@/types'

export const useMarqStore = create<MarqStore>((set) => ({
  account: null,
  positions: [],
  decisions: [],
  news: [],
  broker: null,
  connected: false,
  regime: null,
  activeTab: 'STATE',
  sidebarOpen: false,
  latencyMs: null,
  marketType: null,
  sessionOpen: true,
  riskScore: null,
  priceMap: {},

  setAccount: (account: AccountState) => set({ account }),
  setRiskScore: (riskScore) => set({ riskScore }),
  setPositions: (positions: Position[]) => set({ positions }),
  setSidebarOpen: (sidebarOpen: boolean) => set({ sidebarOpen }),
  setMarketType: (marketType: string | null) => set({ marketType: marketType as any }),
  setSessionOpen: (sessionOpen: boolean) => set({ sessionOpen }),
  addDecision: (entry: DecisionEntry) =>
    set((state) => ({ decisions: [entry, ...state.decisions].slice(0, 500) })),
  setDecisions: (decisions: DecisionEntry[]) => set({ decisions }),
  addNews: (item: NewsItem) =>
    set((state) => ({ news: [item, ...state.news].slice(0, 100) })),
  setBroker: (broker: BrokerConfig) => set({ broker }),
  setConnected: (connected: boolean) => set({ connected }),
  setRegime: (regime: MarketRegime) => set({ regime }),
  setActiveTab: (activeTab: string) => set({ activeTab }),
  setLatency: (latencyMs: number | null) => set({ latencyMs }),
  setPriceMap: (priceMap: Record<string, number>) => set({ priceMap }),
}))
