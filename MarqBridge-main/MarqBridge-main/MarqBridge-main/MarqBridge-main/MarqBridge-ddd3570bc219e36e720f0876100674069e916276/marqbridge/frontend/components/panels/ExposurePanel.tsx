'use client'
import { useState, useEffect, useRef } from 'react'
import { useMarqStore } from '@/store/useMarqStore'
import { formatCurrency, formatPrice, formatPct } from '@/lib/normalizeSide'

function LiqBar({ pct }: { pct: number }) {
  const safe = pct >= 50
  const warn = pct >= 20 && pct < 50
  const color = safe ? 'bg-risk-safe' : warn ? 'bg-risk-warning' : 'bg-risk-danger'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-terminal-elevated rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`}
             style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-2xs font-mono ${
        safe ? 'text-risk-safe' : warn ? 'text-risk-warning' : 'text-risk-danger'
      }`}>{pct.toFixed(1)}%</span>
    </div>
  )
}

function ExposureBar({ long, short }: { long: number; short: number }) {
  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden bg-terminal-elevated">
        <div className="bg-risk-safe transition-all"
             style={{ width: `${long}%` }} />
        <div className="bg-risk-danger transition-all"
             style={{ width: `${short}%` }} />
      </div>
      <div className="flex justify-between text-2xs">
        <span className="text-risk-safe">Long {long.toFixed(0)}%</span>
        <span className="text-risk-danger">Short {short.toFixed(0)}%</span>
      </div>
    </div>
  )
}

export function ExposurePanel() {
  const { positions, account, connected, priceMap, marketType } = useMarqStore()
  const [flashMap, setFlashMap] = useState<Record<string, string>>({})
  const prevPrices = useRef<Record<string, number>>({})

  const totalMargin = positions.reduce((s, p) => s + p.marginUsed, 0)
  const longMargin = positions
    .filter(p => p.side === 'LONG')
    .reduce((s, p) => s + p.marginUsed, 0)
  const shortMargin = positions
    .filter(p => p.side === 'SHORT')
    .reduce((s, p) => s + p.marginUsed, 0)
  const longPct = totalMargin > 0 ? longMargin / totalMargin * 100 : 0
  const shortPct = totalMargin > 0 ? shortMargin / totalMargin * 100 : 0
  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0)

  const skew = longPct >= 55 ? 'LONG-BIASED' :
               shortPct >= 55 ? 'SHORT-BIASED' : 'BALANCED'
  const skewColor = skew === 'LONG-BIASED' ? 'text-risk-safe' :
                    skew === 'SHORT-BIASED' ? 'text-risk-danger' :
                    'text-blue-400'

  const withConc = positions.map(p => ({
    ...p,
    concentration: totalMargin > 0
      ? Math.round(p.marginUsed / totalMargin * 100) : 0,
  }))

  useEffect(() => {
    const newFlash: Record<string, string> = {}
    Object.entries(priceMap).forEach(([ticker, price]) => {
      const prev = prevPrices.current[ticker]
      if (prev !== undefined && price !== prev) {
        newFlash[ticker] = price > prev ? 'flash-up' : 'flash-down'
      }
      prevPrices.current[ticker] = price
    })
    if (Object.keys(newFlash).length > 0) {
      setFlashMap(newFlash)
      const timer = setTimeout(() => setFlashMap({}), 700)
      return () => clearTimeout(timer)
    }
  }, [priceMap])

  return (
    <div className="p-6 space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <p className="label-caps mb-0.5">Portfolio exposure</p>
          <h2 className="text-lg font-medium text-white">Open positions</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${skewColor}`}>{skew}</span>
          <span className="text-xs text-gray-600">
            {positions.length} position{positions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total margin used', value: formatCurrency(totalMargin) },
          { label: 'Open P&L',
            value: formatCurrency(totalPnl),
            color: totalPnl >= 0 ? 'text-risk-safe' : 'text-risk-danger' },
          { label: 'Largest position',
            value: withConc.length > 0
              ? `${Math.max(...withConc.map(p => p.concentration))}% of margin`
              : '—' },
          { label: 'Free margin',
            value: account ? formatCurrency(account.freeMargin) : '—' },
        ].map(({ label, value, color }) => (
          <div key={label}
            className="bg-terminal-elevated border border-terminal-border
                       rounded-xl p-3 space-y-1">
            <p className="label-caps">{label}</p>
            <p className={`text-sm font-mono font-medium ${color ?? 'text-white'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {positions.length > 0 && (
        <div className="bg-terminal-surface border border-terminal-border
                        rounded-xl p-4 space-y-3">
          <span className="label-caps">Long / short allocation</span>
          <ExposureBar long={longPct} short={shortPct} />
        </div>
      )}

      <div className="bg-terminal-surface border border-terminal-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-terminal-border flex items-center justify-between">
          <span className="label-caps">Position detail</span>
          {totalPnl !== 0 && (
            <span className={`text-xs font-mono ${
              totalPnl >= 0 ? 'text-risk-safe' : 'text-risk-danger'
            }`}>
              Total P&L: {formatCurrency(totalPnl)}
            </span>
          )}
        </div>

        {positions.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-gray-600">
              {connected ? 'No open positions' : 'Connect a broker to see positions'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[860px]" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '70px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '100px' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-terminal-border">
                  {['Side', 'Ticker', 'Size', 'Entry', 'Mark',
                    'P&L', 'Margin', 'Liq distance', 'Conc.'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left label-caps font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withConc.map(pos => (
                  <tr key={pos.id}
                    className="border-b border-terminal-border/40
                               hover:bg-terminal-elevated transition-colors">
                    <td className="px-3 py-2.5">
                      <span className={`text-2xs px-1.5 py-0.5 rounded
                                        font-mono font-medium ${
                        pos.side === 'LONG'
                          ? 'bg-risk-safe/10 text-risk-safe'
                          : pos.side === 'SHORT'
                          ? 'bg-risk-danger/10 text-risk-danger'
                          : 'bg-terminal-muted text-gray-500'
                      }`}>{pos.side}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-white font-medium">
                      {pos.ticker}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-300">
                      {pos.size}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-400">
                      {formatPrice(pos.entryPrice, marketType)}
                    </td>
                    <td className={`px-3 py-2.5 font-mono text-white transition-colors ${flashMap[pos.ticker] ?? ''}`}>
                      {formatPrice(priceMap[pos.ticker] ?? pos.currentPrice, marketType)}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-medium">
                      {(() => {
                        const mark = priceMap[pos.ticker] ?? pos.currentPrice
                        const livePnl = pos.side === 'SHORT'
                          ? (pos.entryPrice - mark) * pos.size
                          : (mark - pos.entryPrice) * pos.size
                        const displayPnl = Number.isFinite(livePnl) ? livePnl : pos.pnl
                        const pct = pos.marginUsed > 0
                          ? (displayPnl / pos.marginUsed) * 100
                          : pos.pnlPct
                        const colorClass = displayPnl >= 0 ? 'text-risk-safe' : 'text-risk-danger'
                        return (
                          <span className={colorClass}>
                            {displayPnl >= 0 ? '+' : ''}{formatCurrency(displayPnl)}
                            <span className="text-2xs ml-1 opacity-60">
                              ({displayPnl >= 0 ? '+' : ''}{formatPct(pct)})
                            </span>
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-400">
                      {formatCurrency(pos.marginUsed)}
                    </td>
                    <td className="px-3 py-2.5">
                      <LiqBar pct={pos.distanceToLiq} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 bg-brand-gold/60 rounded-full"
                             style={{ width: `${Math.min(pos.concentration, 100)}%`,
                                      maxWidth: '48px', minWidth: '4px' }} />
                        <span className="text-2xs font-mono text-gray-500">
                          {pos.concentration}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {withConc.some(p => p.concentration >= 60) && (
        <div className="flex items-start gap-2 text-xs text-risk-warning
                        bg-risk-warning/5 border border-risk-warning/15
                        rounded-xl px-4 py-3">
          <span className="w-1 h-1 rounded-full bg-risk-warning mt-1.5 flex-shrink-0" />
          One position exceeds 60% of total margin — concentration risk detected.
          Consider reducing size or hedging.
        </div>
      )}

    </div>
  )
}
