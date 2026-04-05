'use client'
import { useState, useEffect } from 'react'
import { useMarqStore } from '@/store/useMarqStore'
import { getCurrentTier } from '@/lib/tierGate'
import { startCheckout } from '@/lib/billing'
import BrokerOnboarding from '@/components/onboarding/BrokerOnboarding'

const AI_MODULES = [
  { id: 'news_filter', label: 'AI news filter',
    desc: 'Filters high-impact events only.' },
  { id: 'circuit_breaker', label: 'Revenge trading circuit breaker',
    desc: 'Monitors session heat. Locks execution if tilt is detected.' },
  { id: 'regime_classifier', label: 'Market regime classifier',
    desc: 'Auto-detects trending / ranging / volatile / illiquid states.' },
]

export default function IntegrationsPanel() {
  const { broker, setBroker, setConnected, setAccount, setPositions } = useMarqStore()
  const [showOnboarding, setShowOnboarding] = useState(!broker?.connected)
  const [status, setStatus] = useState<any>(null)
  const currentTier = getCurrentTier()
  const [modules, setModules] = useState<Record<string,boolean>>({
    news_filter: false,
    circuit_breaker: true,
    regime_classifier: false,
  })
  const [sounds, setSounds] = useState({
    tap: true,
    gate: true,
    liq_watch: true,
    liq_danger: true,
    circuit: true,
  })

  useEffect(() => {
    setShowOnboarding(!broker?.connected)
  }, [broker?.connected])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('marq_sounds')
    if (saved) {
      try {
        setSounds(JSON.parse(saved))
      } catch {}
    }
  }, [])

  function toggleSound(key: keyof typeof sounds) {
    setSounds((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      if (typeof window !== 'undefined') {
        localStorage.setItem('marq_sounds', JSON.stringify(next))
      }
      return next
    })
  }

  useEffect(() => {
    fetch('/api/proxy/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setStatus(d) })
      .catch(() => {})
  }, [])

  async function handleDisconnect() {
    await fetch('/api/proxy/api/account/disconnect', { method: 'POST' })
    setBroker({ exchange: 'binance', apiKey: '', apiSecret: '', connected: false, lastSync: null })
    setConnected(false)
    setAccount({
      equity: 0, balance: 0, marginLevel: 0, freeMargin: 0,
      usedMargin: 0, liquidationProximity: 0,
      riskLevel: 'SAFE', heat: 'NORMAL', lastUpdated: Date.now(),
    })
    setPositions([])
    setShowOnboarding(true)
  }

  function toggleModule(id: string) {
    setModules(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="label-caps mb-0.5">Integrations</p>
        <h2 className="text-lg font-medium text-white">Broker & AI modules</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5">
          {broker?.connected && !showOnboarding ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="label-caps">Connected broker</span>
                <span className="flex items-center gap-1.5 text-xs text-risk-safe">
                  <span className="w-1.5 h-1.5 rounded-full bg-risk-safe animate-pulse" />
                  live
                </span>
              </div>
              <div className="bg-terminal-elevated rounded-xl p-4 space-y-2">
                {[
                  ['Exchange',  broker.exchange.toUpperCase()],
                  ['API key',   broker.apiKey],
                  ['Last sync', broker.lastSync ? new Date(broker.lastSync).toLocaleTimeString() : '—'],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-xs py-1 border-b border-terminal-border/40 last:border-0">
                    <span className="text-gray-600">{l}</span>
                    <span className="font-mono text-gray-300">{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleDisconnect}
                className="w-full py-2 rounded-xl border border-risk-danger/30 text-risk-danger text-xs hover:bg-risk-danger/10 transition-colors">
                Disconnect broker
              </button>
            </div>
          ) : (
            <BrokerOnboarding
              onComplete={() => {
                setShowOnboarding(false)
                useMarqStore.getState().setActiveTab('STATE')
              }}
            />
          )}
        </div>

        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="label-caps">AI modules</span>
            <span className="text-2xs text-brand-gold border border-brand-gold/30 rounded px-2 py-0.5">Alpha layer</span>
          </div>
          <div className="space-y-3">
            {AI_MODULES.map(mod => (
              <div key={mod.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-terminal-elevated border border-terminal-border"
              >
                <div className="flex-1">
                  <p className="text-sm text-white font-medium mb-0.5">{mod.label}</p>
                  <p className="text-2xs text-gray-600 leading-relaxed">{mod.desc}</p>
                </div>
                <button onClick={() => toggleModule(mod.id)}
                  className={`relative w-9 h-5 rounded-full border transition-all flex-shrink-0 mt-0.5 ${modules[mod.id]
                    ? 'bg-risk-safe/20 border-risk-safe/40'
                    : 'bg-terminal-muted border-terminal-border'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${modules[mod.id]
                    ? 'left-4 bg-risk-safe'
                    : 'left-0.5 bg-gray-600'}`} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-2xs text-gray-700 leading-relaxed">
            AI modules require an Anthropic API key set in your .env file.
            All analysis runs on your broker data — no data leaves your instance.
          </p>
        </div>

        <div className="bg-terminal-surface border border-brand-gold/15 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="label-caps">Current plan</span>
            <span className="text-2xs text-brand-gold border border-brand-gold/30 rounded px-2 py-0.5 bg-brand-gold/8">
              {currentTier.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-600">
            Pro unlocks: AI news, discipline trends, export,
            loss patterns, regime classifier.
          </p>
          <button
            onClick={() => startCheckout('pro')}
            className="w-full py-2 rounded-xl border border-brand-gold/40 text-brand-gold text-xs bg-brand-gold/8 hover:bg-brand-gold/15 transition-colors">
            Unlock Pro — $29/month
          </button>
        </div>

      </div>

      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="label-caps">Alert sounds</span>
          <span className="text-2xs text-gray-500">Customizable audio feedback</span>
        </div>
        {[
          { id: 'tap', label: 'UI tap feedback' },
          { id: 'gate', label: 'Risk gate decisions' },
          { id: 'liq_watch', label: 'Liquidation proximity watch' },
          { id: 'liq_danger', label: 'Liquidation danger alerts' },
          { id: 'circuit', label: 'Circuit breaker activation' },
        ].map((s) => (
          <div key={s.id} className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{s.label}</span>
            <button onClick={() => toggleSound(s.id as keyof typeof sounds)}
              className={`w-9 h-5 rounded-full border relative transition-all ${
                sounds[s.id as keyof typeof sounds]
                  ? 'bg-risk-safe/20 border-risk-safe/40'
                  : 'bg-terminal-muted border-terminal-border'
              }`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                sounds[s.id as keyof typeof sounds]
                  ? 'left-4 bg-risk-safe'
                  : 'left-0.5 bg-gray-600'
              }`} />
            </button>
          </div>
        ))}
      </div>

      {status && (
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 space-y-3">
          <span className="label-caps">System status</span>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Version',     status.version],
              ['Uptime',      `${Math.floor(status.uptime_seconds / 60)}m ${status.uptime_seconds % 60}s`],
              ['WS clients',  status.ws_clients],
              ['Environment', status.environment],
            ].map(([l, v]) => (
              <div key={l} className="bg-terminal-elevated rounded-xl p-3">
                <p className="label-caps mb-1">{l}</p>
                <p className="text-xs font-mono text-white">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
