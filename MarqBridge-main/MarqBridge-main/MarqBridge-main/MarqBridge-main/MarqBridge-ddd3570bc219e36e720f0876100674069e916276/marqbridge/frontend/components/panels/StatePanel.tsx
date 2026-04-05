'use client'
import { useEffect, useState } from 'react'
import { useMarqStore } from '@/store/useMarqStore'
import { formatCurrency, formatPrice } from '@/lib/normalizeSide'
import RiskPanel from '@/components/panels/RiskPanel'
import SessionHeatPanel from '@/components/panels/SessionHeatPanel'
import LiquidationRadar from '@/components/ui/LiquidationRadar'
import { MetricCardSkeleton } from '@/components/ui/Skeleton'

function MetricCard({
  label, value, sub, color, trend
}: {
  label: string
  value: string
  sub?: string
  color?: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="bg-terminal-elevated border border-terminal-border rounded-xl p-4 space-y-1 relative overflow-hidden">
      {trend && trend !== 'neutral' && (
        <div className={`absolute top-0 right-0 w-1 h-full rounded-r-xl ${
          trend === 'up' ? 'bg-risk-safe/40' : 'bg-risk-danger/40'
        }`} />
      )}
      <p className="label-caps text-gray-700">{label}</p>
      <p className={`font-mono text-xl font-medium leading-none ${color ?? 'text-white'}`}>
        {value}
      </p>
      {sub && (
        <p className="text-2xs text-gray-600 mt-1">{sub}</p>
      )}
    </div>
  )
}

function RiskBar({ value }: { value: number }) {
  const color = value < 40 ? 'bg-risk-safe' : value < 70 ? 'bg-risk-warning' : 'bg-risk-danger'
  return (
    <div className="w-full h-1.5 bg-terminal-elevated rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

const riskStyles: Record<string, string> = {
  'risk-safe': 'risk-safe',
  'risk-warning': 'risk-warning',
  'risk-danger': 'risk-danger',
}

export default function StatePanel() {
  const { account, positions, connected, marketType, broker } = useMarqStore()
  const [secondsAgo, setSecondsAgo] = useState(0)

  const isDemo = broker?.exchange === 'demo'

  useEffect(() => {
    const timer = setInterval(() => {
      if (account?.lastUpdated) {
        setSecondsAgo(Math.floor((Date.now() - account.lastUpdated) / 1000))
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [account?.lastUpdated])

  const marginColor = !account
    ? ''
    : account.marginLevel >= 200
    ? 'risk-safe'
    : account.marginLevel >= 120
    ? 'risk-warning'
    : 'risk-danger'

  const riskPct = account
    ? Math.max(0, Math.min(100, 100 - (account.marginLevel - 100)))
    : 0

  return (
    <div className="p-6 space-y-6">
      {isDemo && (
        <div className="mx-0 mb-4 flex items-center gap-2 px-4 py-2
                        rounded-lg border border-brand-gold/20 bg-brand-gold/5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse
                           flex-shrink-0" />
          <span className="text-xs text-brand-gold">
            Demo mode — showing simulated data
          </span>
          <button
            onClick={() => useMarqStore.getState().setActiveTab('INTEGRATIONS')}
            className="ml-auto text-xs text-brand-gold/60 underline
                       hover:text-brand-gold transition-colors">
            Connect real broker →
          </button>
        </div>
      )}

      {!isDemo && broker?.connected && (
        <div className="mx-0 mb-4 flex items-center gap-2 px-4 py-2
                        rounded-lg border border-risk-safe/20 bg-risk-safe/5">
          <span className="w-1.5 h-1.5 rounded-full bg-risk-safe animate-pulse
                           flex-shrink-0" />
          <span className="text-xs text-risk-safe">
            Live — {broker.exchange?.toUpperCase()} connected
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="label-caps mb-0.5">Live risk dashboard</p>
          <h2 className="text-lg font-medium text-white">Account state</h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {account?.lastUpdated && (
            <span className="text-2xs text-gray-700">
              {secondsAgo === 0 ? 'Just updated' :
               secondsAgo < 10 ? `${secondsAgo}s ago` :
               secondsAgo < 60 ? `${secondsAgo}s ago — ` :
               'Stale — reconnect broker'}
            </span>
          )}
          {!connected && (
            <span className="px-2 py-1 rounded border border-terminal-border text-gray-600 text-2xs">
              Connect broker in Integrations
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {account ? (
          <>
            <MetricCard
              label="Equity"
              value={formatCurrency(account.equity)}
              sub="Total portfolio value"
              trend={account.equity > 0 && account.marginLevel > 200 ? 'up' : 'neutral'}
            />
            <MetricCard
              label="Margin level"
              value={account.marginLevel > 0 ? Number(account.marginLevel).toFixed(1) + '%' : '—'}
              sub={account.riskLevel ?? 'No broker'}
              color={marginColor}
              trend="neutral"
            />
            <MetricCard
              label="Free margin"
              value={formatCurrency(account.freeMargin)}
              sub="Available for new positions"
              trend="neutral"
            />
            <MetricCard
              label="Liq proximity"
              value={Number(account.liquidationProximity).toFixed(1) + '%'}
              sub="Distance to liquidation"
              color={account.liquidationProximity > 50 ? 'risk-danger' : undefined}
              trend={account.liquidationProximity > 30 ? 'down' : 'neutral'}
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))
        )}
      </div>

      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="label-caps">Portfolio risk level</span>
          <span className={`text-xs font-medium ${marginColor ? marginColor : 'text-gray-600'}`}>
            {account?.heat ?? 'NORMAL'}
          </span>
        </div>
        <RiskBar value={riskPct} />
        <div className="flex justify-between text-2xs text-gray-700">
          <span>Safe</span>
          <span>Warning</span>
          <span>Critical</span>
        </div>
      </div>

      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="label-caps">Open positions</span>
          <span className="text-xs text-gray-600">{positions.length} active</span>
        </div>
        {positions.length === 0 ? (
          <p className="text-sm text-gray-700 py-4 text-center">
            {connected ? 'No open positions' : 'Connect a broker to see positions'}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {positions.map(pos => (
                <div key={pos.id} className="flex items-center justify-between py-2 border-b border-terminal-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`text-2xs px-1.5 py-0.5 rounded font-mono font-medium ${
                    pos.side === 'LONG'
                      ? 'bg-risk-safe/10 text-risk-safe'
                      : pos.side === 'SHORT'
                      ? 'bg-risk-danger/10 text-risk-danger'
                      : 'bg-terminal-muted text-gray-500'
                  }`}>
                    {pos.side}
                  </span>
                  <span className="text-sm text-white font-mono">{pos.ticker}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-600">
                    {pos.size} @ {formatPrice(pos.entryPrice, marketType)}
                  </span>
                  <span className={pos.pnl >= 0 ? 'text-risk-safe' : 'text-risk-danger'}>
                    {pos.pnl >= 0 ? '+' : ''}{formatCurrency(pos.pnl)}
                  </span>
                  <span className="text-gray-700 font-mono text-2xs">
                    Liq {Number(pos.distanceToLiq).toFixed(1)}% away
                  </span>
                </div>
              </div>
            ))}
          </div>
          <LiquidationRadar />
          </>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RiskPanel />
        <SessionHeatPanel />
      </div>
    </div>
  )
}
