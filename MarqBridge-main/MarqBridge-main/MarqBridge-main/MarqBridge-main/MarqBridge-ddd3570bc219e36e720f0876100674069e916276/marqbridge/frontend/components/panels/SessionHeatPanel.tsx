'use client'
import { useState, useEffect } from 'react'
import { useMarqStore } from '@/store/useMarqStore'
import { useNotifStore } from '@/components/ui/NotificationSystem'
import { getApiBase } from '@/lib/apiConfig'

const HEAT_CONFIG = {
  NORMAL:   { color: 'text-risk-safe',    bg: 'bg-risk-safe/10',
               border: 'border-risk-safe/20',    bar: 'bg-risk-safe' },
  ELEVATED: { color: 'text-blue-400',     bg: 'bg-blue-400/10',
               border: 'border-blue-400/20',     bar: 'bg-blue-400' },
  HIGH:     { color: 'text-risk-warning', bg: 'bg-risk-warning/10',
               border: 'border-risk-warning/20', bar: 'bg-risk-warning' },
  EXTREME:  { color: 'text-risk-danger',  bg: 'bg-risk-danger/10',
               border: 'border-risk-danger/30',  bar: 'bg-risk-danger' },
}

export default function SessionHeatPanel() {
  const { account } = useMarqStore()
  const [heat, setHeat]     = useState<any>(null)
  const [cb, setCb]         = useState<any>(null)
  const [code, setCode]     = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [unlockMsg, setUnlockMsg] = useState('')
  const apiBase = getApiBase()

  useEffect(() => {
    let mounted = true
    let timer: ReturnType<typeof setTimeout>

    async function safeRefresh() {
      if (!mounted) return
      await refresh()
      if (mounted) timer = setTimeout(safeRefresh, 10000)
    }

    safeRefresh()

    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [])

  async function refresh() {
    try {
      const [hRes, cRes] = await Promise.all([
        fetch(`${apiBase}/api/risk/session-heat`),
        fetch(`${apiBase}/api/risk/circuit-breaker`),
      ])

      if (hRes.ok) {
        const hData = await hRes.json()
        if (hData && !hData.error) setHeat(hData)
      }

      if (cRes.ok) {
        const cData = await cRes.json()
        if (cData && !cData.error) setCb(cData)
      }
    } catch {
      // Backend not yet available — silently retry on next interval
    }
  }

  async function unlock() {
    if (!code.trim()) return
    setUnlocking(true)
    try {
      const res = await fetch(`${apiBase}/api/risk/circuit-breaker/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation_code: code }),
      })
      const data = await res.json()
      if (data.unlocked) {
        setUnlockMsg('Circuit breaker reset.')
        setCode('')
        useNotifStore.getState().push({
          level: 'success',
          title: 'Circuit breaker unlocked',
          message: 'Session reset. Trade carefully.',
          persistent: false,
        })
        await refresh()
      } else {
        setUnlockMsg('Invalid code. Use OVERRIDE-MARQ.')
      }
    } catch (e) {
      console.error('[SessionHeatPanel] unlock error', e)
      setUnlockMsg('Unable to verify code.')
    } finally {
      setUnlocking(false)
    }
  }

  const level = (heat?.level ?? 'NORMAL') as keyof typeof HEAT_CONFIG
  const cfg   = HEAT_CONFIG[level]
  const score = heat?.score ?? 0

  return (
    <div className="space-y-4">

      <div className={`bg-terminal-surface border rounded-xl p-4
                       space-y-3 ${cfg.border}`}>
        <div className="flex items-center justify-between">
          <span className="label-caps">Session heat</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded
                            ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
            {level}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Heat score</span>
            <span className={`font-mono font-medium ${cfg.color}`}>
              {score}/100
            </span>
          </div>
          <div className="h-2 bg-terminal-elevated rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all
                             duration-700 ${cfg.bar}`}
                 style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }} />
          </div>
        </div>

        {heat?.flags?.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {heat.flags.map((f: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={`w-1 h-1 rounded-full mt-1.5
                                  flex-shrink-0 ${cfg.bar}`} />
                <span className="text-gray-500 leading-relaxed">{f}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`bg-terminal-surface rounded-xl p-4 space-y-3 border ${
        cb?.locked
          ? 'border-risk-danger/40 bg-risk-danger/3'
          : 'border-terminal-border'
      }`}>
        <div className="flex items-center justify-between">
          <span className="label-caps">Circuit breaker</span>
          <span className={`text-xs font-medium flex items-center gap-1.5 ${
            cb?.locked ? 'text-risk-danger' : 'text-risk-safe'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              cb?.locked ? 'bg-risk-danger animate-pulse' : 'bg-risk-safe'
            }`} />
            {cb?.locked ? 'LOCKED' : 'ARMED'}
          </span>
        </div>

        {cb?.locked ? (
          <div className="space-y-3">
            <p className="text-xs text-risk-danger/80 leading-relaxed
                          bg-risk-danger/5 border border-risk-danger/15
                          rounded-lg px-3 py-2">
              {cb.reason}
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter override code"
                className="w-full bg-terminal-elevated border
                           border-terminal-border rounded-lg px-3 py-2
                           text-xs text-white font-mono placeholder:text-gray-700
                           focus:outline-none focus:border-risk-danger/40"
              />
              {unlockMsg && (
                <p className="text-2xs text-gray-600">{unlockMsg}</p>
              )}
              <button
                onClick={unlock}
                disabled={unlocking}
                className="w-full py-2 rounded-lg border border-risk-danger/30
                           text-risk-danger text-xs hover:bg-risk-danger/10
                           transition-colors disabled:opacity-40">
                {unlocking ? 'Verifying...' : 'Override circuit breaker'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-600 leading-relaxed">
              Auto-locks on: 3 consecutive losses, daily loss limit,
              or 2+ gate overrides.
            </p>
            {cb && (
              <div className="flex justify-between text-xs py-1">
                <span className="text-gray-700">Session trades</span>
                <span className="font-mono text-gray-500">
                  {cb.session_trades}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
