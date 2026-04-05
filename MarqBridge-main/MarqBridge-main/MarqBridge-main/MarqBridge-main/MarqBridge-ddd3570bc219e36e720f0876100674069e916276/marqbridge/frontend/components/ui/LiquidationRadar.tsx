'use client'

import { useMarqStore } from '@/store/useMarqStore'
import { formatCurrency } from '@/lib/normalizeSide'

function ProximityRing({ pct }: { pct: number }) {
  const radius = 36
  const circ = 2 * Math.PI * radius
  const fill = circ * (1 - Math.min(pct, 100) / 100)
  const color = pct <= 7 ? '#ef4444' : pct <= 15 ? '#f87171' : pct <= 30 ? '#e0b84a' : '#4ade80'
  const pulse = pct <= 7

  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={radius}
        fill="none" stroke="#1e1e1e" strokeWidth="5" />
      <circle cx="44" cy="44" r={radius}
        fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={fill}
        strokeLinecap="round"
        transform="rotate(-90 44 44)"
        style={pulse ? { animation: 'pulse 1s ease-in-out infinite' } : undefined}
      />
      <text x="44" y="40" textAnchor="middle"
        fontSize="12" fontWeight="500" fill={color}
        fontFamily="monospace">
        {pct.toFixed(1)}%
      </text>
      <text x="44" y="54" textAnchor="middle"
        fontSize="9" fill="#444">
        to liq
      </text>
    </svg>
  )
}

export default function LiquidationRadar() {
  const { positions } = useMarqStore()
  const atRisk = positions.filter(p => p.distanceToLiq < 999)
  if (atRisk.length === 0) return null

  return (
    <div className="bg-terminal-surface border border-terminal-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="label-caps">Liquidation radar</span>
        <span className="text-2xs text-gray-600">
          {atRisk.length} position{atRisk.length > 1 ? 's' : ''} tracked
        </span>
      </div>
      <div className="flex gap-4 flex-wrap">
        {atRisk.map(pos => (
          <div key={pos.id} className="flex flex-col items-center gap-1">
            <ProximityRing pct={pos.distanceToLiq} />
            <span className="text-2xs font-mono text-white">{pos.ticker}</span>
            <span className={`text-2xs font-mono ${
              pos.side === 'LONG' ? 'text-risk-safe' : 'text-risk-danger'
            }`}>{pos.side}</span>
            <span className="text-2xs text-gray-700">
              Liq {formatCurrency(pos.liquidationPrice)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
