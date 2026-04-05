'use client'
import { useState } from 'react'
import { useMarqStore } from '@/store/useMarqStore'
import { formatCurrency } from '@/lib/normalizeSide'
import { getApiBase } from '@/lib/apiConfig'

function AxisBar({ label, value, color }: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-mono text-gray-400">{value}</span>
      </div>
      <div className="h-1.5 bg-terminal-elevated rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export default function RiskPanel() {
  const { account, positions, riskScore } = useMarqStore()
  const [shock, setShock] = useState(10)
  const [stressResult, setStressResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const apiBase = getApiBase()

  async function runStressTest() {
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/risk/stress-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shock_pct: -Math.abs(shock) }),
      })
      setStressResult(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const axisColor = (v: number) =>
    v < 30 ? 'bg-risk-safe' : v < 60 ? 'bg-risk-warning' : 'bg-risk-danger'

  const overallColor =
    !riskScore ? 'text-gray-600' :
    riskScore.overall < 25 ? 'text-risk-safe' :
    riskScore.overall < 50 ? 'text-risk-warning' : 'text-risk-danger'

  return (
    <div className="space-y-4">
      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="label-caps">Multi-axis risk score</span>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-mono font-medium ${overallColor}`}>
              {riskScore?.overall ?? '—'}
            </span>
            <span className={`text-xs ${overallColor}`}>
              / 100
            </span>
          </div>
        </div>

        {riskScore ? (
          <div className="space-y-3">
            <AxisBar
              label="Margin pressure"
              value={riskScore.axes.margin}
              color={axisColor(riskScore.axes.margin)}
            />
            <AxisBar
              label="Exposure concentration"
              value={riskScore.axes.exposure}
              color={axisColor(riskScore.axes.exposure)}
            />
            <AxisBar
              label="Liquidation proximity"
              value={riskScore.axes.liquidation}
              color={axisColor(riskScore.axes.liquidation)}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-700">
            Connect a broker to see risk score
          </p>
        )}
      </div>

      <div className="bg-terminal-surface border border-terminal-border rounded-xl p-5 space-y-4">
        <div>
          <span className="label-caps">Margin stress test</span>
          <p className="text-xs text-gray-600 mt-1">
            Simulate a price shock across all open positions
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Price shock</span>
            <span className="font-mono text-risk-danger">-{shock}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={shock}
            onChange={(e) => {
              setShock(Number(e.target.value))
              setStressResult(null)
            }}
            className="w-full"
          />
          <div className="flex justify-between text-2xs text-gray-700">
            <span>-1%</span>
            <span>-25%</span>
            <span>-50%</span>
          </div>
        </div>

        <button
          onClick={runStressTest}
          disabled={loading || !account}
          className="w-full py-2 rounded-lg border border-terminal-border text-gray-400 text-xs hover:border-brand-gold/30 hover:text-brand-gold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {loading ? 'Running simulation...' : `Simulate -${shock}% shock`}
        </button>

        {stressResult && (
          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-xs py-1 border-b border-terminal-border">
              <span className="text-gray-600">Projected equity</span>
              <span className={`font-mono ${stressResult.projected_equity < 0 ? 'text-risk-danger' : 'text-white'}`}>
                {formatCurrency(stressResult.projected_equity)}
              </span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-terminal-border">
              <span className="text-gray-600">P&L change</span>
              <span className="font-mono text-risk-danger">
                {formatCurrency(stressResult.projected_pnl_change)}
              </span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-terminal-border">
              <span className="text-gray-600">Margin level after</span>
              <span className={`font-mono ${stressResult.projected_margin_level < 120 ? 'text-risk-danger' : 'text-risk-safe'}`}>
                {Number(stressResult.projected_margin_level).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-gray-600">Survivable</span>
              <span className={stressResult.survivable ? 'text-risk-safe' : 'text-risk-danger'}>
                {stressResult.survivable ? 'Yes' : 'No — liquidation risk'}
              </span>
            </div>

            {stressResult.liquidations_at_risk?.length > 0 && (
              <div className="mt-2 p-3 bg-risk-danger/10 border border-risk-danger/20 rounded-lg">
                <p className="text-xs text-risk-danger font-medium mb-2">
                  Positions at liquidation risk
                </p>
                {stressResult.liquidations_at_risk.map((l: any, i: number) => (
                  <div key={i} className="flex justify-between text-2xs text-risk-danger/70 py-0.5">
                    <span>{l.ticker} {l.side}</span>
                    <span>Liq @ {formatCurrency(l.liquidation_price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
