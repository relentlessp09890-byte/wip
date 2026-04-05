'use client'
import { useState, useEffect, useRef } from 'react'
import { useMarqStore } from '@/store/useMarqStore'
import { formatCurrency } from '@/lib/normalizeSide'
import { getApiBase } from '@/lib/apiConfig'
import { notifyGateBlocked, notifyDecisionLogged } from '@/lib/riskAlerts'
import { AudioEngine } from '@/lib/audioEngine'

type Side = 'LONG' | 'SHORT'
type GateStatus = 'idle' | 'loading' | 'approved' | 'warning' | 'blocked'

interface SimResult {
  ticker: string
  side: string
  notional: number
  margin_required: number
  margin_impact_pct: number
  projected_margin_level: number
  projected_free_margin: number
  estimated_liquidation: number
  current_risk_score: number
  projected_risk_score: number
  score_delta: number
  can_execute: boolean
  gate_reason: string | null
}

function GateLight({ status }: { status: GateStatus }) {
  const config = {
    idle:     { color: 'bg-gray-700',         label: 'Awaiting input' },
    loading:  { color: 'bg-brand-gold animate-pulse', label: 'Evaluating...' },
    approved: { color: 'bg-risk-safe',         label: 'Gate clear' },
    warning:  { color: 'bg-risk-warning animate-pulse', label: 'Proceed with caution' },
    blocked:  { color: 'bg-risk-danger',       label: 'Gate blocked' },
  }[status]

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className={`text-xs font-medium ${
        status === 'approved' ? 'text-risk-safe' :
        status === 'warning'  ? 'text-risk-warning' :
        status === 'blocked'  ? 'text-risk-danger' :
        'text-gray-600'
      }`}>{config.label}</span>
    </div>
  )
}

function ScoreDelta({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-gray-600 font-mono text-xs">+0</span>
  const color = delta > 0 ? 'text-risk-danger' : 'text-risk-safe'
  const sign  = delta > 0 ? '+' : ''
  return <span className={`font-mono text-xs ${color}`}>{sign}{delta}</span>
}

function ResultRow({ label, value, highlight }: {
  label: string; value: React.ReactNode; highlight?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-2 border-b border-terminal-border last:border-0 ${
      highlight ? 'bg-terminal-elevated -mx-4 px-4' : ''
    }`}>
      <span className="text-xs text-gray-600">{label}</span>
      <span className="text-xs font-mono text-gray-200">{value}</span>
    </div>
  )
}

export default function DecisionsPanel() {
  const { account, positions, riskScore, addDecision } = useMarqStore()
  const apiBase = getApiBase()

  const [ticker, setTicker] = useState('BTCUSDT')
  const [side, setSide] = useState<Side>('LONG')
  const [size, setSize] = useState('')
  const [entryPrice, setEntryPrice] = useState('')
  const [leverage, setLeverage] = useState('10')
  const [gateStatus, setGateStatus] = useState<GateStatus>('idle')
  const [result, setResult] = useState<SimResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const match = positions.find(p =>
      p.ticker.replace('/','') === ticker.replace('/','').toUpperCase()
    )
    if (match && !entryPrice) {
      setEntryPrice(match.currentPrice.toString())
    }
  }, [ticker, positions, entryPrice])

  useEffect(() => {
    if (!size || !entryPrice || !ticker) {
      setGateStatus('idle')
      setResult(null)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => evaluate(), 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [ticker, side, size, entryPrice, leverage])

  async function evaluate() {
    const sizeNum = parseFloat(size)
    const priceNum = parseFloat(entryPrice)
    const levNum = parseFloat(leverage) || 1

    if (isNaN(sizeNum) || isNaN(priceNum) || sizeNum <= 0 || priceNum <= 0) {
      setGateStatus('idle')
      return
    }

    setGateStatus('loading')
    setError(null)

    try {
      const res = await fetch(`${apiBase}/api/risk/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          side,
          size: sizeNum,
          entry_price: priceNum,
          leverage: levNum,
        }),
      })

      if (!res.ok) throw new Error('Simulation failed')
      const data: SimResult = await res.json()
      setResult(data)

      if (!data.can_execute) {
        setGateStatus('blocked')
      } else if (data.score_delta > 15 || data.projected_margin_level < 150) {
        setGateStatus('warning')
      } else {
        setGateStatus('approved')
      }
    } catch (e: any) {
      setError(e.message)
      setGateStatus('idle')
    }
  }

  const canSubmit = gateStatus === 'approved' || gateStatus === 'warning'
  const blockedNotifiedRef = useRef(false)

  useEffect(() => {
    if (gateStatus === 'approved') {
      AudioEngine.gateApproved()
    }
    if (gateStatus === 'blocked') {
      AudioEngine.gateBlocked()
    }
  }, [gateStatus])

  useEffect(() => {
    if (gateStatus === 'blocked' && !blockedNotifiedRef.current) {
      blockedNotifiedRef.current = true
      notifyGateBlocked(result?.gate_reason || 'Risk gate blocked this trade.')
    }
    if (gateStatus !== 'blocked') {
      blockedNotifiedRef.current = false
    }
  }, [gateStatus, result])

  async function logDecision(overridden: boolean) {
    if (!result) return

    try {
      const res = await fetch(`${apiBase}/api/risk/journal/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: result.ticker,
          side: result.side,
          size: parseFloat(size),
          entry_price: parseFloat(entryPrice),
          risk_score_at_entry: result.projected_risk_score,
          gate_overridden: overridden,
        }),
      })

      if (!res.ok) throw new Error('Journal save failed')
      const entry = await res.json()

      addDecision({
        id: entry.id,
        timestamp: entry.timestamp,
        ticker: entry.ticker,
        side: entry.side,
        size: entry.size,
        entryPrice: entry.entry_price,
        exitPrice: null,
        pnl: null,
        marginAtEntry: entry.margin_at_entry,
        riskScoreAtEntry: entry.risk_score_at_entry,
        gateOverridden: entry.gate_overridden,
        emotionalTag: null,
        notes: null,
      })

      notifyDecisionLogged(entry.ticker, entry.side)
      AudioEngine.notify()

      setSize('')
      setEntryPrice('')
      setGateStatus('idle')
      setResult(null)
    } catch (e: any) {
      console.error('[logDecision]', e)
      setError(e.message || 'Unable to save journal entry')
    }
  }

  return (
    <div className="p-6 space-y-5 w-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-caps mb-0.5">Tactical simulator</p>
          <h2 className="text-lg font-medium text-white">Risk gate evaluation</h2>
        </div>
        <GateLight status={gateStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 space-y-4">
          <span className="label-caps">Position parameters</span>

          <div className="flex rounded-lg overflow-hidden border border-terminal-border">
            {(['LONG','SHORT'] as Side[]).map(s => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  side === s
                    ? s === 'LONG'
                      ? 'bg-risk-safe/15 text-risk-safe'
                      : 'bg-risk-danger/15 text-risk-danger'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
              >{s}</button>
            ))}
          </div>

          <div>
            <label className="label-caps block mb-1">Ticker</label>
            <input
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              placeholder="BTCUSDT"
              className="w-full bg-terminal-elevated border border-terminal-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-gray-700 focus:outline-none focus:border-brand-gold/40 transition-colors"
            />
          </div>

          <div>
            <label className="label-caps block mb-1">Size (contracts)</label>
            <input
              type="number"
              value={size}
              onChange={e => setSize(e.target.value)}
              placeholder="0.01"
              step="0.001"
              min="0"
              className="w-full bg-terminal-elevated border border-terminal-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-gray-700 focus:outline-none focus:border-brand-gold/40 transition-colors"
            />
          </div>

          <div>
            <label className="label-caps block mb-1">Entry price (USD)</label>
            <input
              type="number"
              value={entryPrice}
              onChange={e => setEntryPrice(e.target.value)}
              placeholder="67000"
              min="0"
              className="w-full bg-terminal-elevated border border-terminal-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-gray-700 focus:outline-none focus:border-brand-gold/40 transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="label-caps">Leverage</label>
              <span className="text-xs font-mono text-brand-gold">{leverage}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={125}
              step={1}
              value={leverage}
              onChange={e => setLeverage(e.target.value)}
              className="w-full"
            />
            <div className="flex justify-between text-2xs text-gray-700 mt-1">
              <span>1x</span><span>25x</span><span>50x</span><span>100x</span><span>125x</span>
            </div>
          </div>

          {size && entryPrice && (
            <div className="flex justify-between text-xs py-2 border-t border-terminal-border">
              <span className="text-gray-600">Notional value</span>
              <span className="font-mono text-white">
                {formatCurrency(parseFloat(size) * parseFloat(entryPrice) || 0)}
              </span>
            </div>
          )}

          {error && (
            <p className="text-2xs text-risk-danger bg-risk-danger/10 border border-risk-danger/20 rounded px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className={`rounded-xl border p-5 transition-colors ${
            gateStatus === 'approved' ? 'border-risk-safe/30 bg-risk-safe/5' :
            gateStatus === 'warning'  ? 'border-risk-warning/30 bg-risk-warning/5' :
            gateStatus === 'blocked'  ? 'border-risk-danger/30 bg-risk-danger/5' :
            'border-terminal-border bg-terminal-surface'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="label-caps">Gate verdict</span>
              <GateLight status={gateStatus} />
            </div>

            {gateStatus === 'idle' && (
              <p className="text-sm text-gray-700">
                Enter position parameters to evaluate risk.
              </p>
            )}

            {gateStatus === 'loading' && (
              <div className="space-y-2">
                {['Checking margin impact','Evaluating liquidation risk','Scoring position'].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-1 h-1 rounded-full bg-brand-gold animate-pulse" />
                    {t}...
                  </div>
                ))}
              </div>
            )}

            {result && gateStatus !== 'loading' && (
              <div className="space-y-1">
                <ResultRow label="Margin required" value={formatCurrency(result.margin_required)} />
                <ResultRow
                  label="Margin impact"
                  value={
                    <span className={
                      result.margin_impact_pct > 30 ? 'text-risk-danger' :
                      result.margin_impact_pct > 15 ? 'text-risk-warning' :
                      'text-risk-safe'
                    }>
                      {Number(result.margin_impact_pct).toFixed(1)}% of equity
                    </span>
                  }
                />
                <ResultRow
                  label="Margin level after"
                  value={
                    <span className={
                      result.projected_margin_level < 120 ? 'text-risk-danger' :
                      result.projected_margin_level < 200 ? 'text-risk-warning' :
                      'text-risk-safe'
                    }>
                      {Number(result.projected_margin_level).toFixed(1)}%
                    </span>
                  }
                />
                <ResultRow label="Est. liquidation" value={formatCurrency(result.estimated_liquidation)} />
                <ResultRow
                  label="Risk score impact"
                  value={
                    <span className="flex items-center gap-2">
                      <span className="text-gray-500">{result.current_risk_score}</span>
                      <span className="text-gray-700">→</span>
                      <span>{result.projected_risk_score}</span>
                      <ScoreDelta delta={result.score_delta} />
                    </span>
                  }
                />

                {result.gate_reason && (
                  <div className="mt-3 p-3 bg-risk-danger/10 border border-risk-danger/20 rounded-lg">
                    <p className="text-xs text-risk-danger leading-relaxed">
                      {result.gate_reason}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {account && (
            <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 space-y-2">
              <span className="label-caps">Current account state</span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                {[
                  ['Equity', formatCurrency(account.equity)],
                  ['Free margin', formatCurrency(account.freeMargin)],
                  ['Margin level', Number(account.marginLevel).toFixed(1) + '%'],
                  ['Open pos.', positions.length.toString()],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-xs py-1 border-b border-terminal-border/50">
                    <span className="text-gray-600">{l}</span>
                    <span className="font-mono text-gray-300">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => gateStatus === 'approved'
              ? logDecision(false)
              : gateStatus === 'warning'
              ? logDecision(true)
              : undefined}
            disabled={!canSubmit}
            className={`w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
              gateStatus === 'approved'
                ? 'border border-risk-safe/40 text-risk-safe bg-risk-safe/10 hover:bg-risk-safe/15' :
                gateStatus === 'warning'
                ? 'border border-risk-warning/40 text-risk-warning bg-risk-warning/10 hover:bg-risk-warning/15' :
                'border border-terminal-border text-gray-700 cursor-not-allowed opacity-40'
            }`}
          >
            {gateStatus === 'blocked' ? 'Gate blocked — trade not permitted' :
             gateStatus === 'approved' ? 'Gate clear — log decision' :
             gateStatus === 'warning' ? 'Caution — log decision anyway' :
             gateStatus === 'loading' ? 'Evaluating...' :
             'Enter position to evaluate'}
          </button>

          {gateStatus === 'warning' && (
            <p className="text-2xs text-gray-700 text-center">
              Gate allows this trade but risk score increases significantly.
              Proceed only with conviction.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
